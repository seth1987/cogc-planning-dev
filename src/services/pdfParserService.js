// Service de parsing et extraction de PDF avec Mistral API
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
  }

  /**
   * Convertit un PDF en image haute résolution via PDF.js
   * OBLIGATOIRE car Mistral ne peut pas lire les PDF directement
   */
  async pdfToImage(file) {
    try {
      console.log('🔄 Conversion PDF → Image haute résolution...');
      
      // Vérifier que PDF.js est disponible
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) {
        // Charger PDF.js dynamiquement si nécessaire
        await this.loadPDFJS();
      }

      // Convertir le fichier en ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Charger le PDF avec PDF.js
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`📄 PDF chargé: ${pdf.numPages} page(s)`);
      
      // Récupérer la première page
      const page = await pdf.getPage(1);
      
      // Utiliser une échelle élevée pour une meilleure qualité OCR
      const scale = 3.0; // Haute résolution pour meilleure précision
      const viewport = page.getViewport({ scale });
      
      // Créer un canvas pour rendre la page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Rendre la page PDF sur le canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convertir en base64 avec qualité maximale
      const imageData = canvas.toDataURL('image/png', 1.0);
      
      console.log(`✅ PDF converti en image (${canvas.width}x${canvas.height}px)`);
      return imageData;
      
    } catch (error) {
      console.error('❌ Erreur conversion PDF:', error);
      throw new Error('Impossible de convertir le PDF. Vérifiez que le fichier est valide.');
    }
  }

  /**
   * Charge PDF.js dynamiquement si pas présent
   */
  async loadPDFJS() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = () => reject(new Error('Impossible de charger PDF.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Parse le PDF avec Mistral API - Version optimisée
   */
  async parseWithMistralOCR(file, apiKey) {
    if (!apiKey || apiKey === 'sk-proj-default-key' || apiKey.length < 10) {
      throw new Error('Clé API Mistral requise. Configurez REACT_APP_MISTRAL_API_KEY.');
    }

    try {
      // 1. Convertir le PDF en image
      const imageData = await this.pdfToImage(file);
      
      console.log('🤖 Envoi à Mistral pixtral pour extraction OCR...');
      
      // 2. Prompt ultra-optimisé et structuré
      const prompt = `Analyse cette image d'un bulletin de commande SNCF et extrais les données.

STRUCTURE DU DOCUMENT:
- En-tête: "COGC PN" suivi du NOM et PRÉNOM de l'agent
- Titre: Mois et année (ex: "AVRIL 2025")
- Tableau: 31 colonnes (jours 1 à 31) avec codes de service

CODES À IDENTIFIER:
• Numériques simples: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
• Codes services: CRC001, ACR002, CCU003, CENT004, SOUF005, REO006, RC007, RE008, RO009, CAC010
• Codes spéciaux: RH, RP, CA, C, HAB, MA, NU, D, VMT, VISIMED, INACTIN

INSTRUCTIONS:
1. Lis le tableau colonne par colonne (jours 1 à 31)
2. Pour chaque cellule non vide, note le jour et le code exact
3. Conserve les codes EXACTEMENT comme écrits (001 reste 001, pas CRC001)

RETOURNE CE JSON (et RIEN d'autre):
{
  "agent": {"nom": "NOM_EN_MAJUSCULES", "prenom": "Prenom"},
  "mois": "avril",
  "annee": "2025",
  "planning": [
    {"jour": 1, "code": "001"},
    {"jour": 2, "code": "RH"},
    {"jour": 3, "code": "002"},
    {"jour": 15, "code": "CA"},
    {"jour": 20, "code": "005"}
  ]
}`;

      // 3. Appel API Mistral avec le modèle pixtral-12b-2409 (optimisé pour OCR)
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2409', // Modèle spécialisé OCR
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: imageData // Image PNG haute résolution
                }
              ]
            }
          ],
          temperature: 0, // Résultats déterministes
          max_tokens: 4000,
          top_p: 0.1 // Encore plus de précision
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur Mistral:', errorText);
        
        // Si pixtral échoue, essayer avec mistral-large
        if (response.status === 404 || response.status === 400) {
          console.log('⚠️ Fallback sur mistral-large...');
          return await this.fallbackMistralLarge(imageData, apiKey);
        }
        
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }

      const data = await response.json();
      const ocrContent = data.choices[0].message.content;
      
      console.log('📄 Réponse Mistral:', ocrContent);
      
      // 4. Extraire et parser le JSON
      const jsonMatch = ocrContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ Pas de JSON trouvé, parsing manuel...');
        return await this.parseManual(ocrContent);
      }

      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        return await this.formatExtractedData(parsedData);
      } catch (parseError) {
        console.error('❌ JSON invalide:', parseError);
        return await this.parseManual(ocrContent);
      }
      
    } catch (err) {
      console.error('❌ Erreur globale:', err);
      
      if (err.message?.includes('401')) {
        throw new Error('Clé API Mistral invalide');
      } else if (err.message?.includes('429')) {
        throw new Error('Limite API atteinte. Réessayez dans quelques instants.');
      }
      
      throw err;
    }
  }

  /**
   * Fallback avec mistral-large si pixtral échoue
   */
  async fallbackMistralLarge(imageData, apiKey) {
    console.log('🔄 Tentative avec mistral-large...');
    
    const response = await fetch(this.mistralApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en extraction de données de documents SNCF. Extrais toutes les informations du bulletin.'
          },
          {
            role: 'user',
            content: `Analyse ce bulletin SNCF et retourne un JSON avec:
- agent: {nom, prenom} après "COGC PN"
- mois et annee
- planning: [{jour, code}] pour chaque entrée du tableau

Codes possibles: 001-010, CRC001-CAC010, RH, RP, CA, C, HAB, MA, etc.
Retourne UNIQUEMENT le JSON.`
          }
        ],
        temperature: 0,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error('Échec du fallback mistral-large');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return await this.formatExtractedData(parsed);
      } catch (e) {
        // Ignorer et continuer
      }
    }
    
    return await this.parseManual(content);
  }

  /**
   * Formater les données extraites avec mapping et décalage nuit
   */
  async formatExtractedData(data) {
    const result = {
      agent: { 
        nom: (data.agent?.nom || '').toUpperCase(), 
        prenom: data.agent?.prenom || '' 
      },
      planning: []
    };

    console.log('👤 Agent:', result.agent.nom, result.agent.prenom);

    // Déterminer le mois et l'année
    const moisMap = {
      'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
    };
    
    const mois = data.mois || new Date().toLocaleString('fr-FR', { month: 'long' });
    const annee = data.annee || new Date().getFullYear();
    const moisNum = moisMap[mois.toLowerCase()] || String(new Date().getMonth() + 1).padStart(2, '0');

    // Traiter chaque entrée du planning
    if (data.planning && Array.isArray(data.planning)) {
      for (const entry of data.planning) {
        if (!entry.jour || !entry.code) continue;
        
        const jour = String(entry.jour).padStart(2, '0');
        const formattedDate = `${annee}-${moisNum}-${jour}`;
        const code = String(entry.code).trim().toUpperCase();
        
        console.log(`📅 Jour ${jour}: ${code}`);
        
        // Obtenir le mapping depuis la BDD
        const mapping = await mappingService.getPosteFromCode(code);
        
        if (mapping) {
          let targetDate = formattedDate;
          
          // ⭐ IMPORTANT: Décaler les services de nuit (X) au jour suivant
          if (mapping.service === 'X') {
            const date = new Date(formattedDate + 'T12:00:00');
            date.setDate(date.getDate() + 1);
            targetDate = date.toISOString().split('T')[0];
            console.log(`  🌙 Service nuit → décalé au ${targetDate}`);
          }
          
          result.planning.push({
            date: targetDate,
            service_code: mapping.service,
            poste_code: mapping.poste,
            original_code: code,
            description: mapping.description
          });
          
        } else if (this.isSpecialCode(code)) {
          // Codes spéciaux (congés, repos, etc.)
          result.planning.push({
            date: formattedDate,
            service_code: code,
            poste_code: null,
            original_code: code,
            description: this.getSpecialCodeDescription(code)
          });
          
        } else {
          console.warn(`  ⚠️ Code inconnu: ${code}`);
        }
      }
    }

    // Trier par date
    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    
    const stats = {
      total: result.planning.length,
      services: result.planning.filter(e => e.poste_code).length,
      conges: result.planning.filter(e => !e.poste_code).length
    };
    
    console.log(`✅ Extraction terminée: ${stats.total} entrées (${stats.services} services, ${stats.conges} congés/repos)`);
    
    return result;
  }

  /**
   * Parsing manuel de secours si le JSON échoue
   */
  async parseManual(text) {
    console.log('🔧 Parsing manuel du texte...');
    
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    // Chercher l'agent
    const agentMatch = text.match(/COGC\s+PN\s+([A-Z]+)\s+([A-Za-z]+)/i);
    if (agentMatch) {
      result.agent.nom = agentMatch[1].toUpperCase();
      result.agent.prenom = agentMatch[2];
    }

    // Chercher le mois et l'année
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                       'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    let month = new Date().getMonth() + 1;
    let year = new Date().getFullYear();
    
    for (let i = 0; i < monthNames.length; i++) {
      if (text.toLowerCase().includes(monthNames[i])) {
        month = i + 1;
        break;
      }
    }
    
    const yearMatch = text.match(/20\d{2}/);
    if (yearMatch) year = yearMatch[0];

    // Chercher les entrées jour/code
    const patterns = [
      /(\d{1,2})\s*:\s*([A-Z0-9]+)/gi,
      /jour\s+(\d{1,2})\s*[:\-]?\s*([A-Z0-9]+)/gi,
      /^(\d{1,2})\s+([A-Z0-9]+)/gim
    ];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const day = parseInt(match[1]);
        const code = match[2].toUpperCase();
        
        if (day >= 1 && day <= 31 && this.isValidCode(code)) {
          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const mapping = await mappingService.getPosteFromCode(code);
          if (mapping) {
            let targetDate = date;
            if (mapping.service === 'X') {
              const d = new Date(date + 'T12:00:00');
              d.setDate(d.getDate() + 1);
              targetDate = d.toISOString().split('T')[0];
            }
            
            result.planning.push({
              date: targetDate,
              service_code: mapping.service,
              poste_code: mapping.poste,
              original_code: code,
              description: mapping.description
            });
          }
        }
      }
    }

    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    console.log(`✅ Parsing manuel: ${result.planning.length} entrées`);
    
    return result;
  }

  /**
   * Vérifie si un code est valide
   */
  isValidCode(code) {
    // Codes numériques (001-010)
    if (/^0(0[1-9]|10)$/.test(code)) return true;
    // Codes avec préfixe
    if (/^(CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}$/i.test(code)) return true;
    // Codes spéciaux
    if (this.isSpecialCode(code)) return true;
    return false;
  }

  /**
   * Vérifie si c'est un code spécial
   */
  isSpecialCode(code) {
    const specialCodes = ['RH', 'RP', 'RPP', 'CA', 'C', 'D', 'HAB', 'MA', 'I', 'NU', 'INACTIN', 'VISIMED', 'VMT'];
    return specialCodes.includes(code.toUpperCase());
  }

  /**
   * Description des codes spéciaux
   */
  getSpecialCodeDescription(code) {
    const descriptions = {
      'RH': 'RH',
      'RP': 'Repos périodique',
      'RPP': 'Repos périodique prolongé',
      'CA': 'Congé annuel',
      'C': 'Congé',
      'D': 'Disponible',
      'HAB': 'Formation/Habilitation',
      'MA': 'Maladie',
      'I': 'Indisponible',
      'NU': 'Non utilisé',
      'INACTIN': 'Inactivité',
      'VISIMED': 'Visite médicale',
      'VMT': 'Visite médicale'
    };
    
    return descriptions[code] || code;
  }

  /**
   * Validation finale des données
   */
  validateParsedData(data) {
    const errors = [];
    const warnings = [];

    if (!data.agent?.nom || !data.agent?.prenom) {
      warnings.push('Agent non détecté');
    }

    if (!data.planning || data.planning.length === 0) {
      errors.push('Aucune donnée extraite du planning');
    }

    // Vérifier les doublons
    const seen = new Set();
    data.planning.forEach(entry => {
      const key = `${entry.date}_${entry.service_code}`;
      if (seen.has(key)) {
        warnings.push(`Doublon détecté: ${entry.date}`);
      }
      seen.add(key);
    });

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings 
    };
  }

  /**
   * Méthode principale
   */
  async parsePDF(file, apiKey) {
    if (!apiKey || apiKey.length < 20) {
      throw new Error('Clé API Mistral requise (REACT_APP_MISTRAL_API_KEY)');
    }
    
    return await this.parseWithMistralOCR(file, apiKey);
  }
}

export default new PDFParserService();