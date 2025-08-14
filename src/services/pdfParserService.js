// Service de parsing et extraction de PDF avec Mistral API - Version améliorée
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
    
    // Liste étendue des éléments à ignorer lors du parsing
    this.ignoredElements = [
      'METRO',          // Trajets métro
      'RS',             // Repos/pauses  
      'TRAIN',          // Mentions train
      'TGV',            // Mentions TGV
      'PAUSE',          // Pauses
      'TRAJET',         // Trajets
      'N[0-9A-Z]+',     // Codes techniques SNCF (N1100010CO72, etc.)
      'du [A-Z]+',      // Codes sites (du SOUCEN, du ACR601, etc.)
    ];

    // Codes de services valides
    this.validServicePatterns = [
      // Services avec numéros
      /^(CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}$/,
      // Codes simples
      /^(RP|RPP|CA|RU|MA|DISPO|HAB|HAB-QF|NU|INACTIN|JF|I|C|D|F|FO|VM|VL|VISIMED|VMT)$/
    ];
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
      
      // IMPORTANT: Traiter TOUTES les pages du PDF
      const images = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`📄 Traitement page ${pageNum}/${pdf.numPages}...`);
        
        // Récupérer la page
        const page = await pdf.getPage(pageNum);
        
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
        images.push(imageData);
        
        console.log(`✅ Page ${pageNum} convertie en image (${canvas.width}x${canvas.height}px)`);
      }
      
      return images;
      
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
   * Parse le PDF avec Mistral API - Version améliorée
   */
  async analyzePDF(file, apiKey) {
    // Utiliser directement la clé API si fournie, sinon utiliser celle intégrée dans le code
    const mistralKey = apiKey || 'duQZd7M1SHUuJtUe0KyMLGr5ROhBiLM6';
    
    if (!mistralKey || mistralKey.length < 10) {
      throw new Error('Clé API Mistral requise.');
    }

    try {
      // 1. Convertir TOUTES les pages du PDF en images
      const images = await this.pdfToImage(file);
      
      console.log('🤖 Envoi à Mistral pixtral pour extraction OCR...');
      
      // 2. Prompt amélioré pour extraction précise
      const prompt = `Analyse cette/ces image(s) d'un bulletin de commande SNCF et extrais UNIQUEMENT les informations pertinentes.

FORMAT DU DOCUMENT:
- En-tête: "COGC PN" suivi du NOM et PRÉNOM de l'agent
- Commande allant du JJ/MM/AAAA au JJ/MM/AAAA
- Liste chronologique des services jour par jour

ÉLÉMENTS À IGNORER ABSOLUMENT:
- Lignes contenant "METRO" (trajets)
- Lignes contenant uniquement "RS" suivies d'horaires (repos/pauses)
- Codes techniques commençant par N (ex: N1100010CO72)
- Codes sites après "du" (ex: du SOUCEN, du ACR601)
- Numéros de CP
- Heures isolées (09:35, 14:00, etc.)
- Messages, éditions et signatures
- "SOCIETE NATIONALE DES CHEMINS DE FER FRANCAIS"
- Numéros de page

CODES DE SERVICES VALIDES À EXTRAIRE:
- Services avec numéros: CRC001-003, ACR001-003, CCU001-006, CENT001-003, SOUF001-002, REO007-008
- Repos/Congés: RP, RPP, CA, RU, MA, DISPO, JF
- Formation: HAB-QF, HAB, FO
- Autres: NU, INACTIN, I, C, D, F, VM, VISIMED

RÈGLES D'EXTRACTION:
1. AGENT: Le nom complet après "COGC PN" (format: NOM PRENOM)
2. Pour CHAQUE DATE du bulletin:
   - Extraire la date au format JJ/MM/AAAA
   - Extraire UNIQUEMENT le code service principal (pas les codes techniques)
   - Si plusieurs lignes pour une date, prendre le service principal (pas NU)
   - Les services avec horaires 22:00-06:00 sont des services de nuit

RETOURNE CE JSON:
{
  "agent": {"nom": "NOM", "prenom": "Prenom"},
  "planning": [
    {
      "date": "JJ/MM/AAAA",
      "code": "CODE_SERVICE",
      "isNuit": false
    }
  ]
}

IMPORTANT: 
- Une seule entrée par date
- Extraire TOUTES les dates du bulletin
- Ne pas inclure RS, METRO ou codes techniques`;

      // 3. Construire le contenu pour l'API avec toutes les images
      const messageContent = [
        {
          type: 'text',
          text: prompt
        }
      ];
      
      // Ajouter toutes les images
      for (const image of images) {
        messageContent.push({
          type: 'image_url',
          image_url: image
        });
      }

      // 4. Appel API Mistral avec le modèle pixtral-12b-2409
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mistralKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2409', // Modèle spécialisé OCR
          messages: [
            {
              role: 'user',
              content: messageContent
            }
          ],
          temperature: 0, // Résultats déterministes
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur Mistral:', errorText);
        
        // Si pixtral échoue, essayer avec extraction manuelle
        if (response.status === 404 || response.status === 400) {
          console.log('⚠️ Fallback sur extraction manuelle...');
          return await this.extractBasicInfo(file);
        }
        
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }

      const data = await response.json();
      const ocrContent = data.choices[0].message.content;
      
      console.log('📄 Réponse Mistral:', ocrContent);
      
      // 5. Extraire et parser le JSON
      const jsonMatch = ocrContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ Pas de JSON trouvé, parsing manuel...');
        return await this.parseManual(ocrContent);
      }

      try {
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Filtrer et nettoyer les données
        const cleanedData = this.cleanExtractedData(parsedData);
        
        // Vérifier que toutes les dates ont été extraites
        if (cleanedData.planning && cleanedData.planning.length > 0) {
          const dates = cleanedData.planning.map(e => e.date).sort();
          console.log(`📅 Dates extraites: du ${dates[0]} au ${dates[dates.length - 1]}`);
          console.log(`📊 Total: ${dates.length} entrées`);
        }
        
        return await this.formatExtractedData(cleanedData);
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
   * Nettoie les données extraites - Version améliorée
   */
  cleanExtractedData(data) {
    if (!data.planning) return data;

    // Filtrer les entrées invalides et les doublons
    const cleanedPlanning = [];
    const seenDates = new Map();

    data.planning.forEach(entry => {
      if (!entry.date || !entry.code) return;

      // Ignorer les codes non pertinents
      if (this.shouldIgnoreCode(entry.code)) {
        console.log(`🚫 Code ignoré: ${entry.code}`);
        return;
      }

      // Vérifier que le code est valide
      if (!this.isValidServiceCode(entry.code)) {
        console.log(`⚠️ Code invalide ignoré: ${entry.code}`);
        return;
      }

      const date = entry.date;
      
      // Gérer les services multiples par jour
      if (seenDates.has(date)) {
        const existing = seenDates.get(date);
        
        // Préférer les services principaux sur NU
        if (existing.code === 'NU' && entry.code !== 'NU') {
          seenDates.set(date, entry);
          return;
        }
        
        // Pour le même jour, préférer le service de nuit
        if (entry.isNuit && !existing.isNuit) {
          seenDates.set(date, entry);
          return;
        }
        
        // Sinon, garder l'existant
        return;
      }

      seenDates.set(date, entry);
    });

    // Convertir en tableau
    seenDates.forEach(entry => {
      cleanedPlanning.push(entry);
    });

    // Trier par date
    cleanedPlanning.sort((a, b) => {
      const dateA = this.parseDate(a.date);
      const dateB = this.parseDate(b.date);
      return dateA.localeCompare(dateB);
    });

    return {
      ...data,
      planning: cleanedPlanning
    };
  }

  /**
   * Vérifie si un code doit être ignoré
   */
  shouldIgnoreCode(code) {
    const upperCode = code.toUpperCase();
    
    // Ignorer RS seul (mais pas RP)
    if (upperCode === 'RS') return true;
    
    // Ignorer METRO, TRAIN, TGV
    if (['METRO', 'TRAIN', 'TGV'].includes(upperCode)) return true;
    
    // Ignorer les codes techniques SNCF
    if (/^N[0-9A-Z]+/.test(upperCode)) return true;
    
    return false;
  }

  /**
   * Vérifie si un code est valide
   */
  isValidServiceCode(code) {
    const upperCode = code.toUpperCase();
    
    // Vérifier contre les patterns valides
    return this.validServicePatterns.some(pattern => pattern.test(upperCode));
  }

  /**
   * Parse une date JJ/MM/AAAA en AAAA-MM-JJ
   */
  parseDate(dateStr) {
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [jour, mois, annee] = parts;
        return `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
      }
    }
    return dateStr;
  }

  /**
   * Extraction basique de secours
   */
  async extractBasicInfo(file) {
    console.log('🔧 Extraction basique de secours...');
    
    // Retourner une structure vide mais valide
    return {
      agent: { 
        nom: 'EXTRACTION', 
        prenom: 'Manuelle requise' 
      },
      planning: [],
      warnings: ['Extraction automatique échouée. Veuillez saisir manuellement les données.']
    };
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
        
        // Parser la date
        const formattedDate = this.parseDate(entry.date);
        const code = String(entry.code).trim().toUpperCase();
        const isNuit = entry.isNuit === true;
        
        console.log(`📅 Date: ${formattedDate}, Code: ${code}${isNuit ? ' (NUIT)' : ''}`);
        
        // Obtenir le mapping depuis la BDD
        const mapping = await mappingService.getPosteFromCode(code);
        
        if (mapping) {
          let targetDate = formattedDate;
          
          // Décaler les services de nuit (service === 'X')
          if (mapping.service === 'X' || isNuit) {
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
   * Parsing manuel de secours si le JSON échoue - Version améliorée
   */
  async parseManual(text) {
    console.log('🔧 Parsing manuel du texte...');
    
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    // Chercher l'agent
    const agentMatch = text.match(/COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i);
    if (agentMatch) {
      result.agent.nom = agentMatch[1].toUpperCase();
      result.agent.prenom = agentMatch[2];
      console.log('👤 Agent trouvé:', result.agent.nom, result.agent.prenom);
    }

    // Pattern amélioré pour extraire les dates et codes
    // Format: JJ/MM/AAAA ... CODE_SERVICE
    const lines = text.split('\n');
    let currentDate = null;

    for (const line of lines) {
      // Ignorer les lignes non pertinentes
      if (this.ignoredElements.some(pattern => new RegExp(pattern, 'i').test(line))) {
        continue;
      }

      // Chercher une date
      const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        currentDate = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      }

      // Si on a une date, chercher un code service valide
      if (currentDate) {
        // Chercher les codes services dans la ligne
        const codeMatches = line.match(/(CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}|RP|RPP|CA|RU|MA|DISPO|HAB-QF|HAB|FO|NU|INACTIN|JF|I|C|D|F|VM|VISIMED/gi);
        
        if (codeMatches) {
          for (const code of codeMatches) {
            const codeUpper = code.toUpperCase();
            
            // Vérifier que c'est un code valide
            if (!this.isValidServiceCode(codeUpper)) continue;
            
            // Vérifier si c'est un service de nuit
            const isNuit = line.includes('22:00') && line.includes('06:00');
            
            const mapping = await mappingService.getPosteFromCode(codeUpper);
            if (mapping) {
              let targetDate = currentDate;
              if (mapping.service === 'X' || isNuit) {
                const d = new Date(currentDate + 'T12:00:00');
                d.setDate(d.getDate() + 1);
                targetDate = d.toISOString().split('T')[0];
              }
              
              result.planning.push({
                date: targetDate,
                service_code: mapping.service,
                poste_code: mapping.poste,
                original_code: codeUpper,
                description: mapping.description
              });
              
              // On a trouvé le code pour cette date, passer à la suivante
              currentDate = null;
              break;
            } else if (this.isSpecialCode(codeUpper)) {
              result.planning.push({
                date: currentDate,
                service_code: codeUpper,
                poste_code: null,
                original_code: codeUpper,
                description: this.getSpecialCodeDescription(codeUpper)
              });
              currentDate = null;
              break;
            }
          }
        }
      }
    }

    // Nettoyer les doublons
    const cleanedData = this.cleanExtractedData(result);
    
    console.log(`✅ Parsing manuel: ${cleanedData.planning.length} entrées`);
    
    return cleanedData;
  }

  /**
   * Vérifie si c'est un code spécial
   */
  isSpecialCode(code) {
    const specialCodes = ['RH', 'RP', 'RPP', 'CA', 'C', 'D', 'DISPO', 'HAB', 'HAB-QF', 'MA', 'I', 'NU', 'INACTIN', 'VISIMED', 'VMT', 'RU', 'JF', 'F', 'FO', 'VM', 'VL'];
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
      'HAB-QF': 'Formation/Perfectionnement',
      'MA': 'Maladie',
      'I': 'Inaction',
      'NU': 'Non utilisé',
      'INACTIN': 'Inactivité',
      'VISIMED': 'Visite médicale',
      'VMT': 'Visite médicale',
      'RU': 'RTT',
      'JF': 'Jour férié',
      'F': 'Jour férié',
      'FO': 'Formation',
      'VM': 'Visite médicale',
      'VL': 'Visite ligne'
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
    const dateCount = {};
    data.planning.forEach(entry => {
      const date = entry.date;
      dateCount[date] = (dateCount[date] || 0) + 1;
      if (dateCount[date] > 1) {
        warnings.push(`Date en double: ${date}`);
      }
    });

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings 
    };
  }

  /**
   * Méthode principale - renommée pour correspondre à l'appel dans ModalUploadPDF
   */
  async parsePDF(file, apiKey) {
    // Utiliser analyzePDF qui contient toute la logique
    return await this.analyzePDF(file, apiKey);
  }
}

export default new PDFParserService();