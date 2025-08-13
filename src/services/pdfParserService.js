// Service de parsing et extraction de PDF avec Mistral API - Version améliorée
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
    
    // Liste des éléments à ignorer lors du parsing
    this.ignoredElements = [
      'METRO',      // Trajets métro
      'RS',         // Repos/pauses
      'N[0-9A-Z]+', // Codes techniques SNCF (N1100010CO72, etc.)
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
- Liste chronologique des services

ÉLÉMENTS À IGNORER ABSOLUMENT:
- Lignes contenant "METRO" (trajets)
- Lignes contenant "RS" (repos/pauses)
- Codes techniques commençant par N (ex: N1100010CO72)
- Numéros de CP
- Heures isolées (09:35, 14:00, etc.)
- Messages et éditions

ÉLÉMENTS À EXTRAIRE:
1. AGENT: Le nom après "COGC PN" (format: NOM PRENOM)
2. Pour CHAQUE DATE:
   - Date au format JJ/MM/AAAA
   - Le CODE SERVICE principal (ex: ACR002, CCU005, CENT003)
   - Si la ligne contient "Repos périodique" → code "RP"
   - Si la ligne contient "Congé" → code "C"
   - Si la ligne contient "Disponible" ou "DISPO" → code "D"
   - Si la ligne contient "FORMATION" ou "HAB" → code "HAB"
   - Si la ligne contient "Utilisable non utilisé" ou "NU" → code "NU"

SERVICES MULTIPLES PAR JOUR:
- Si une date apparaît plusieurs fois (ex: 18/05 avec NU puis CCU003), extraire SEULEMENT le service principal (pas NU)
- Pour le 30/05 si deux services: prendre celui avec horaires 22:00-06:00 (service de nuit)

SERVICES DE NUIT:
- Les services avec horaires 22:00 à 06:00 sont des services de nuit
- Noter avec "isNuit": true

RETOURNE CE JSON avec UNIQUEMENT les services pertinents:
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
- NE PAS inclure les lignes METRO, RS ou codes techniques
- Extraire TOUTES les dates du début à la fin
- Une seule entrée par date (sauf si vraiment deux services distincts)`;

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
   * Nettoie les données extraites
   */
  cleanExtractedData(data) {
    if (!data.planning) return data;

    // Filtrer les entrées invalides et les doublons
    const cleanedPlanning = [];
    const seenDates = new Map();

    data.planning.forEach(entry => {
      if (!entry.date || !entry.code) return;

      // Ignorer les codes non pertinents
      if (this.shouldIgnoreCode(entry.code)) return;

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
    
    // Ignorer RS, METRO
    if (upperCode === 'RS' || upperCode === 'METRO') return true;
    
    // Ignorer les codes techniques SNCF
    if (/^N[0-9A-Z]+/.test(upperCode)) return true;
    
    return false;
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
   * Parsing manuel de secours si le JSON échoue
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
    // Recherche date + description + code
    const servicePattern = /(\d{2})\/(\d{2})\/(\d{4})\s+.*?((?:CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}|RP|RPP|NU|DISPO|HAB|C|D|MA|I|VISIMED|INACTIN)/gi;
    const matches = [...text.matchAll(servicePattern)];
    
    for (const match of matches) {
      const [fullMatch, jour, mois, annee, code] = match;
      
      if (jour && mois && annee && code) {
        // Ignorer les codes non pertinents
        if (this.shouldIgnoreCode(code)) continue;
        
        const date = `${annee}-${mois.padStart(2, '0')}-${jour.padStart(2, '0')}`;
        const codeUpper = code.toUpperCase();
        
        // Vérifier si c'est un service de nuit
        const isNuit = fullMatch.includes('22:00') && fullMatch.includes('06:00');
        
        const mapping = await mappingService.getPosteFromCode(codeUpper);
        if (mapping) {
          let targetDate = date;
          if (mapping.service === 'X' || isNuit) {
            const d = new Date(date + 'T12:00:00');
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
        } else if (this.isSpecialCode(codeUpper)) {
          result.planning.push({
            date: date,
            service_code: codeUpper,
            poste_code: null,
            original_code: codeUpper,
            description: this.getSpecialCodeDescription(codeUpper)
          });
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
    const specialCodes = ['RH', 'RP', 'RPP', 'CA', 'C', 'D', 'DISPO', 'HAB', 'HAB-QF', 'MA', 'I', 'NU', 'INACTIN', 'VISIMED', 'VMT'];
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