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
   * Parse le PDF avec Mistral API - Version adaptée au format liste SNCF
   */
  async parseWithMistralOCR(file, apiKey) {
    if (!apiKey || apiKey === 'sk-proj-default-key' || apiKey.length < 10) {
      throw new Error('Clé API Mistral requise. Configurez REACT_APP_MISTRAL_API_KEY.');
    }

    try {
      // 1. Convertir le PDF en image
      const imageData = await this.pdfToImage(file);
      
      console.log('🤖 Envoi à Mistral pixtral pour extraction OCR...');
      
      // 2. Prompt adapté au format LISTE de bulletin SNCF
      const prompt = `Analyse cette image d'un bulletin de commande SNCF et extrais TOUTES les données.

FORMAT DU DOCUMENT:
- En-tête: "COGC PN" suivi du NOM et PRÉNOM de l'agent
- Liste chronologique avec pour chaque entrée:
  * Date au format JJ/MM/AAAA
  * Code service (ACR002, CCU005, REO008, CENT001, etc.)
  * Description et horaires
  * Services spéciaux: RP, RPP, NU, DISPO, VISIMED, VMT

EXTRACTION REQUISE:
1. L'AGENT après "COGC PN"
2. Pour CHAQUE DATE dans le document:
   - Extraire la date (JJ/MM/AAAA)
   - Extraire le CODE principal (ACR002, CCU005, etc.)
   - Si c'est "RP Repos périodique" → code "RP"
   - Si c'est "RPP" → code "RPP"
   - Si c'est "NU" ou "non utilisé" → code "NU"
   - Si c'est "DISPO" ou "Disponible" → code "DISPO"
   - Si c'est "VISIMED" ou "VMT" → code "VISIMED"

ATTENTION SERVICES DE NUIT:
- Si un service ACR003 a des horaires 22:00 à 06:00, c'est une NUIT
- Marque ces services avec le flag "isNuit": true

DATES MULTIPLES:
- Si une même date apparaît 2 fois (ex: 21/04/2025 avec NU puis ACR003), extraire LES DEUX

RETOURNE CE JSON EXACT:
{
  "agent": {"nom": "NOM_EN_MAJUSCULES", "prenom": "Prenom"},
  "planning": [
    {"date": "15/04/2025", "code": "ACR002"},
    {"date": "16/04/2025", "code": "CCU005"},
    {"date": "17/04/2025", "code": "CCU005"},
    {"date": "18/04/2025", "code": "REO008"},
    {"date": "19/04/2025", "code": "RPP"},
    {"date": "20/04/2025", "code": "RPP"},
    {"date": "21/04/2025", "code": "NU"},
    {"date": "21/04/2025", "code": "ACR003", "isNuit": true},
    {"date": "22/04/2025", "code": "ACR003", "isNuit": true},
    {"date": "23/04/2025", "code": "ACR003", "isNuit": true},
    {"date": "25/04/2025", "code": "RP"},
    {"date": "26/04/2025", "code": "RP"},
    {"date": "27/04/2025", "code": "CENT001"},
    {"date": "28/04/2025", "code": "CENT001"},
    {"date": "29/04/2025", "code": "DISPO"},
    {"date": "30/04/2025", "code": "VISIMED"}
  ]
}

IMPORTANT: Extraire TOUTES les dates visibles, même si certaines apparaissent plusieurs fois.`;

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
            content: 'Tu es un expert en extraction de données de bulletins SNCF. Extrais toutes les dates et codes de service.'
          },
          {
            role: 'user',
            content: `Analyse ce bulletin SNCF au format LISTE et retourne un JSON avec:
- agent: {nom, prenom} après "COGC PN"
- planning: tableau avec pour chaque ligne:
  * date: "JJ/MM/AAAA"
  * code: le code service (ACR002, CCU005, etc.)
  * isNuit: true si horaires 22:00-06:00

Codes spéciaux: RP, RPP, NU, DISPO, VISIMED
Si une date apparaît 2 fois, extraire les 2 entrées.
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

    // Traiter chaque entrée du planning
    if (data.planning && Array.isArray(data.planning)) {
      for (const entry of data.planning) {
        if (!entry.date || !entry.code) continue;
        
        // Parser la date au format JJ/MM/AAAA
        let dateStr = entry.date;
        let formattedDate;
        
        // Gérer différents formats de date
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // Format JJ/MM/AAAA
            const [jour, mois, annee] = parts;
            formattedDate = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
          } else if (parts.length === 2) {
            // Format JJ/MM (prendre l'année courante)
            const [jour, mois] = parts;
            const annee = new Date().getFullYear();
            formattedDate = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
          }
        } else {
          // Si pas de format reconnu, essayer tel quel
          formattedDate = dateStr;
        }
        
        const code = String(entry.code).trim().toUpperCase();
        const isNuit = entry.isNuit === true;
        
        console.log(`📅 Date: ${formattedDate}, Code: ${code}${isNuit ? ' (NUIT)' : ''}`);
        
        // Obtenir le mapping depuis la BDD
        const mapping = await mappingService.getPosteFromCode(code);
        
        if (mapping) {
          let targetDate = formattedDate;
          
          // ⭐ IMPORTANT: Décaler les services de nuit au jour suivant
          // Services ACR003 avec flag isNuit OU service === 'X'
          if (isNuit || mapping.service === 'X') {
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
          // Ajouter quand même avec le code tel quel
          result.planning.push({
            date: formattedDate,
            service_code: code,
            poste_code: null,
            original_code: code,
            description: code
          });
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

    // Pattern pour extraire les dates au format JJ/MM/AAAA et le code
    const patterns = [
      /(\d{2})\/(\d{2})\/(\d{4})\s+([A-Z0-9]+)/gi,          // 15/04/2025 ACR002
      /(\d{2})\/(\d{2})\/(\d{4})\s+\w+\s+([A-Z0-9]+)/gi,    // 15/04/2025 AIDE ACR002
      /(\d{2})\/(\d{2})\/(\d{4})\s+.*?(RP|RPP|NU|DISPO|VISIMED)/gi, // Codes spéciaux
    ];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        let jour, mois, annee, code;
        
        if (match.length === 5) {
          [, jour, mois, annee, code] = match;
        }
        
        if (jour && mois && annee && code) {
          const date = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
          code = code.toUpperCase();
          
          // Vérifier si c'est un service de nuit (ACR003 généralement)
          const isNuit = code === 'ACR003' && text.includes('22:00') && text.includes('06:00');
          
          const mapping = await mappingService.getPosteFromCode(code);
          if (mapping) {
            let targetDate = date;
            if (isNuit || mapping.service === 'X') {
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
          } else if (this.isSpecialCode(code)) {
            result.planning.push({
              date: date,
              service_code: code,
              poste_code: null,
              original_code: code,
              description: this.getSpecialCodeDescription(code)
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
    const specialCodes = ['RH', 'RP', 'RPP', 'CA', 'C', 'D', 'DISPO', 'HAB', 'MA', 'I', 'NU', 'INACTIN', 'VISIMED', 'VMT'];
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
      'DISPO': 'Disponible',
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

    // Vérifier les doublons (sauf s'ils sont légitimes comme NU + ACR003 le même jour)
    const dateCodeMap = {};
    data.planning.forEach(entry => {
      const key = `${entry.date}_${entry.service_code}`;
      if (dateCodeMap[key]) {
        // C'est OK si c'est NU + service ou deux services différents le même jour
        if (entry.service_code !== 'NU' && dateCodeMap[key] !== 'NU') {
          warnings.push(`Possible doublon: ${entry.date} - ${entry.service_code}`);
        }
      }
      dateCodeMap[key] = entry.service_code;
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