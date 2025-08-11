// Service de parsing et extraction de PDF avec Mistral API (via fetch)
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
  }

  /**
   * Convertit un fichier en base64
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Retourner l'URL data complète pour Mistral
        resolve(reader.result);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Parse le PDF avec Mistral API (via fetch natif, sans SDK)
   */
  async parseWithMistralOCR(file, apiKey) {
    if (!apiKey || apiKey === 'sk-proj-default-key' || apiKey.length < 10) {
      throw new Error('Clé API Mistral requise. Veuillez configurer votre clé API dans les variables d\'environnement.');
    }

    try {
      console.log('🔍 Démarrage OCR avec Mistral API (pixtral)...');
      
      // Convertir le fichier en base64 data URL
      const dataUrl = await this.fileToBase64(file);
      
      // Prompt ultra-précis et structuré pour Mistral
      const prompt = `Analyse cette image d'un bulletin de commande SNCF et retourne UNIQUEMENT un JSON structuré.

STRUCTURE ATTENDUE:
{
  "agent": {
    "nom": "NOM_AGENT",
    "prenom": "PRENOM_AGENT"
  },
  "mois": "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre",
  "annee": "2025",
  "planning": [
    {"jour": 1, "code": "001"},
    {"jour": 2, "code": "RH"},
    {"jour": 3, "code": "002"},
    ...
  ]
}

INSTRUCTIONS D'EXTRACTION:
1. AGENT: Cherche "COGC PN" suivi du NOM et PRÉNOM
2. MOIS/ANNÉE: Cherche dans l'en-tête du document
3. TABLEAU: 
   - Les colonnes représentent les jours (1 à 31)
   - Chaque cellule contient un code ou est vide
   - Extrais UNIQUEMENT les cellules non vides

CODES POSSIBLES:
- Numériques: 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
- Avec préfixe: CRC001, ACR002, CCU003, CENT004, SOUF005, REO006, RC007, RE008, RO009, CAC010
- Spéciaux: RH, RP, CA, C, HAB, MA, NU, D, VMT, VISIMED, INACTIN

RÈGLES IMPORTANTES:
- Si le code est juste "001", garde "001" (ne pas ajouter de préfixe)
- Si le code est "CRC001", garde "CRC001" tel quel
- Ignore les cellules vides
- Retourne UNIQUEMENT le JSON, sans texte avant ou après`;

      // Appel à l'API Mistral avec le modèle pixtral pour l'OCR
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-large-latest', // Utiliser pixtral-large pour une meilleure extraction
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
                  image_url: dataUrl
                }
              ]
            }
          ],
          temperature: 0, // 0 pour des résultats déterministes
          max_tokens: 8000,
          response_format: { type: "json_object" } // Forcer la réponse en JSON
        })
      });

      if (!response.ok) {
        // Si pixtral échoue, essayer avec un autre modèle
        if (response.status === 404 || response.status === 400) {
          console.log('⚠️ Modèle pixtral-large non disponible, tentative avec pixtral-12b...');
          return await this.parseWithPixtralFallback(file, apiKey);
        }
        
        const error = await response.text();
        console.error('Erreur Mistral:', error);
        throw new Error(`Erreur API Mistral: ${response.status} - ${error}`);
      }

      const data = await response.json();
      console.log('✅ Réponse Mistral reçue');
      
      // Extraire le contenu de la réponse
      const ocrContent = data.choices[0].message.content;
      
      // Log pour debug
      console.log('📄 Réponse OCR brute:', ocrContent);
      
      // Parser directement le JSON
      try {
        const parsedData = JSON.parse(ocrContent);
        return await this.formatExtractedData(parsedData);
      } catch (parseError) {
        console.error('Erreur parsing JSON:', parseError);
        // Si ce n'est pas du JSON valide, essayer l'ancienne méthode
        return await this.parseOCRContent(ocrContent);
      }
      
    } catch (err) {
      console.error('Erreur Mistral OCR:', err);
      
      // Gestion des erreurs spécifiques
      if (err.message?.includes('401')) {
        throw new Error('Clé API Mistral invalide. Vérifiez votre configuration.');
      } else if (err.message?.includes('429')) {
        throw new Error('Limite de requêtes Mistral atteinte. Réessayez plus tard.');
      } else if (err.message?.includes('413')) {
        throw new Error('Fichier PDF trop volumineux (max 50MB)');
      } else {
        throw new Error(`Erreur OCR: ${err.message || 'Erreur inconnue'}`);
      }
    }
  }

  /**
   * Fallback avec pixtral-12b si pixtral-large n'est pas disponible
   */
  async parseWithPixtralFallback(file, apiKey) {
    try {
      console.log('🔄 Utilisation de pixtral-12b comme fallback...');
      
      const dataUrl = await this.fileToBase64(file);
      
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2409', // Nom exact du modèle
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extrais les données de ce bulletin SNCF. Retourne un JSON avec cette structure:
{
  "agent": {"nom": "NOM", "prenom": "PRENOM"},
  "mois": "nom_du_mois",
  "annee": "AAAA",
  "planning": [
    {"jour": 1, "code": "001"},
    {"jour": 2, "code": "RH"}
  ]
}

Cherche:
1. L'agent après "COGC PN"
2. Le tableau avec les jours (1-31) et les codes
3. Les codes peuvent être: 001-010, CRC001-CAC010, RH, RP, CA, C, etc.

Retourne UNIQUEMENT le JSON.`
                },
                {
                  type: 'image_url',
                  image_url: dataUrl
                }
              ]
            }
          ],
          temperature: 0,
          max_tokens: 8000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur API Mistral: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const ocrContent = data.choices[0].message.content;
      
      console.log('📄 Contenu OCR (pixtral-12b):', ocrContent);
      
      // Essayer d'extraire le JSON
      const jsonMatch = ocrContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[0]);
          return await this.formatExtractedData(parsedData);
        } catch (e) {
          console.error('JSON invalide, parsing manuel...');
        }
      }
      
      return await this.parseOCRContent(ocrContent);
      
    } catch (err) {
      console.error('Erreur avec pixtral-12b:', err);
      // En dernier recours, essayer mistral-large sans image
      return await this.parseWithMistralLarge(file, apiKey);
    }
  }

  /**
   * Formater les données extraites du JSON
   */
  async formatExtractedData(data) {
    const result = {
      agent: { 
        nom: data.agent?.nom || '', 
        prenom: data.agent?.prenom || '' 
      },
      planning: []
    };

    console.log('👤 Agent extrait:', result.agent.nom, result.agent.prenom);

    // Obtenir le mois et l'année
    const mois = data.mois || new Date().toLocaleString('fr-FR', { month: 'long' });
    const annee = data.annee || new Date().getFullYear();
    
    // Convertir le nom du mois en numéro
    const moisMap = {
      'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
    };
    
    const moisNum = moisMap[mois.toLowerCase()] || String(new Date().getMonth() + 1).padStart(2, '0');

    // Traiter le planning
    if (data.planning && Array.isArray(data.planning)) {
      for (const entry of data.planning) {
        if (entry.jour && entry.code) {
          const jour = String(entry.jour).padStart(2, '0');
          const formattedDate = `${annee}-${moisNum}-${jour}`;
          const code = String(entry.code).trim().toUpperCase();
          
          console.log(`📅 Date: ${formattedDate}, Code: ${code}`);
          
          // Mapper le code
          const mapping = await mappingService.getPosteFromCode(code);
          
          if (mapping) {
            let targetDate = formattedDate;
            
            // Décaler les services de nuit au jour suivant
            if (mapping.service === 'X') {
              const currentDate = new Date(formattedDate + 'T12:00:00');
              currentDate.setDate(currentDate.getDate() + 1);
              targetDate = currentDate.toISOString().split('T')[0];
            }
            
            result.planning.push({
              date: targetDate,
              service_code: mapping.service,
              poste_code: mapping.poste,
              original_code: code,
              description: mapping.description
            });
          } else if (this.isSpecialCode(code)) {
            // Codes spéciaux sans mapping
            result.planning.push({
              date: formattedDate,
              service_code: code,
              poste_code: null,
              original_code: code,
              description: this.getSpecialCodeDescription(code)
            });
          } else {
            console.log(`⚠️ Code non reconnu: ${code}`);
          }
        }
      }
    }

    // Trier par date
    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`✅ Extraction terminée: ${result.planning.length} entrées trouvées`);
    
    return result;
  }

  /**
   * Fallback: Parse avec Mistral Large si pixtral n'est pas disponible
   */
  async parseWithMistralLarge(file, apiKey) {
    try {
      console.log('🔄 Utilisation de mistral-large-latest comme fallback...');
      
      // Convertir le fichier en base64
      const dataUrl = await this.fileToBase64(file);
      
      // Utiliser mistral-large avec le prompt OCR
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
              content: 'Tu es un système OCR expert dans l\'extraction de données de bulletins de commande SNCF. Tu dois extraire TOUTES les données du document, même celles qui semblent vides ou répétitives.'
            },
            {
              role: 'user',
              content: `ANALYSE CE BULLETIN DE COMMANDE SNCF ET EXTRAIS TOUT :

              1. L'AGENT : Cherche "COGC PN" suivi du NOM et PRÉNOM
              
              2. LE TABLEAU DE PLANNING : 
                 - Chaque colonne représente un jour du mois (1 à 31)
                 - Chaque cellule contient un code service ou est vide
                 - Les codes peuvent être : CRC001, ACR002, CCU003, RP, C, HAB, MA, etc.
              
              3. EXTRACTION LIGNE PAR LIGNE :
                 Pour CHAQUE jour du mois, indique le code trouvé
                 Même si c'est vide, mentionne-le
              
              RETOURNE LE RÉSULTAT SOUS CETTE FORME :
              Agent: [NOM] [PRÉNOM]
              
              01/MM/AAAA: [code ou "vide"]
              02/MM/AAAA: [code ou "vide"]
              03/MM/AAAA: [code ou "vide"]
              ... (continue pour tous les jours)
              
              CONSERVE EXACTEMENT les codes tels qu'ils apparaissent dans le document.`
            }
          ],
          temperature: 0.1,
          max_tokens: 16000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur API Mistral: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const ocrContent = data.choices[0].message.content;
      
      console.log('📄 Contenu OCR brut (mistral-large):', ocrContent);
      
      return await this.parseOCRContent(ocrContent);
      
    } catch (err) {
      console.error('Erreur avec mistral-large:', err);
      throw new Error(`Impossible d'extraire le PDF avec l'API Mistral: ${err.message}`);
    }
  }

  /**
   * Parse le contenu OCR extrait par Mistral (méthode de secours)
   */
  async parseOCRContent(ocrContent) {
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    if (!ocrContent) {
      throw new Error('Aucun contenu extrait du PDF');
    }

    console.log('📄 Début du parsing du contenu OCR...');

    // Extraction du nom de l'agent - patterns multiples
    const agentPatterns = [
      /COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i,
      /Agent\s*:\s*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i,
      /([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)\s*(?:COGC|PN)/i
    ];

    for (const pattern of agentPatterns) {
      const match = ocrContent.match(pattern);
      if (match) {
        result.agent.nom = match[1];
        result.agent.prenom = match[2];
        console.log('👤 Agent détecté:', result.agent.nom, result.agent.prenom);
        break;
      }
    }

    // Extraction des dates et codes - amélioration des patterns
    // Pattern pour dates complètes ou partielles
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*:?\s*([A-Z0-9]+)/gi,  // 01/01/2025: CODE
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\s*:?\s*([A-Z0-9]+)/gi,    // 01/01/25: CODE
      /(\d{1,2})[\/\-](\d{1,2})\s*:?\s*([A-Z0-9]+)/gi,                 // 01/01: CODE
      /jour\s+(\d{1,2})\s*:?\s*([A-Z0-9]+)/gi,                         // jour 1: CODE
      /^(\d{1,2})\s*:?\s*([A-Z0-9]+)/gim                               // 1: CODE (début de ligne)
    ];

    // Si on trouve une année dans le document, on l'utilise par défaut
    const yearMatch = ocrContent.match(/20\d{2}/);
    const defaultYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
    
    // Si on trouve un mois dans le document
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    let defaultMonth = new Date().getMonth() + 1;
    
    for (let i = 0; i < monthNames.length; i++) {
      if (ocrContent.toLowerCase().includes(monthNames[i])) {
        defaultMonth = i + 1;
        break;
      }
    }

    // Recherche dans tout le contenu
    const lines = ocrContent.split('\n');
    
    for (const line of lines) {
      // Ignorer les lignes vides ou qui ne contiennent que des espaces
      if (!line.trim()) continue;

      // Chercher les patterns date + code
      for (const pattern of datePatterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          let day, month, year, code;
          
          if (match.length === 5) { // Format avec année complète
            [, day, month, year, code] = match;
          } else if (match.length === 4) { // Format avec mois ou année courte
            [, day, month, code] = match;
            year = defaultYear;
            if (month.length === 2 && parseInt(month) > 12) {
              // C'est probablement une année courte
              year = '20' + month;
              month = defaultMonth.toString();
            }
          } else if (match.length === 3) { // Format jour + code
            [, day, code] = match;
            month = defaultMonth.toString();
            year = defaultYear;
          }

          // Vérifier que les valeurs sont valides
          if (day && code && parseInt(day) >= 1 && parseInt(day) <= 31) {
            const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            
            // Nettoyer le code
            code = code.trim().toUpperCase();
            
            // Vérifier si c'est un code valide
            if (this.isValidCode(code)) {
              console.log(`📅 Date: ${formattedDate}, Code: ${code}`);
              
              // Mapper le code
              const mapping = await mappingService.getPosteFromCode(code);
              
              if (mapping) {
                let targetDate = formattedDate;
                
                // Décaler les services de nuit au jour suivant
                if (mapping.service === 'X') {
                  const currentDate = new Date(formattedDate + 'T12:00:00');
                  currentDate.setDate(currentDate.getDate() + 1);
                  targetDate = currentDate.toISOString().split('T')[0];
                }
                
                result.planning.push({
                  date: targetDate,
                  service_code: mapping.service,
                  poste_code: mapping.poste,
                  original_code: code,
                  description: mapping.description
                });
              } else if (this.isSpecialCode(code)) {
                // Codes spéciaux sans mapping
                result.planning.push({
                  date: formattedDate,
                  service_code: code,
                  poste_code: null,
                  original_code: code,
                  description: this.getSpecialCodeDescription(code)
                });
              }
            }
          }
        }
      }

      // Si aucun pattern n'a matché, essayer d'extraire les codes seuls de la ligne
      const codes = this.extractCodesFromLine(line);
      if (codes.length > 0 && !datePatterns.some(p => p.test(line))) {
        // On a des codes mais pas de date claire, essayer de deviner
        console.log('⚠️ Codes sans date claire:', codes.join(', '));
      }
    }

    // Trier par date
    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`✅ Extraction terminée: ${result.planning.length} entrées trouvées`);
    
    return result;
  }

  /**
   * Vérifie si un code est valide
   */
  isValidCode(code) {
    // Code service avec numéros
    if (/^(CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}$/i.test(code)) return true;
    // Code numérique seul
    if (/^\d{3}$/.test(code)) return true;
    // Code spécial
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
   * Extrait les codes d'une ligne de texte
   */
  extractCodesFromLine(line) {
    const codes = [];
    
    // Pattern pour les codes services avec numéros (CRC001, ACR002, etc.)
    const serviceCodePattern = /(CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}/gi;
    const serviceMatches = [...line.matchAll(serviceCodePattern)];
    serviceMatches.forEach(match => codes.push(match[0].toUpperCase()));
    
    // Pattern pour les codes numériques seuls (001, 002, etc.)
    const numericPattern = /\b\d{3}\b/g;
    const numericMatches = [...line.matchAll(numericPattern)];
    numericMatches.forEach(match => codes.push(match[0]));
    
    // Codes spéciaux
    const specialPatterns = [
      { pattern: /\bRH\b/i, code: 'RH' },
      { pattern: /\bRPP?\b/i, code: 'RP' },
      { pattern: /\bRepos\s+périodique/i, code: 'RP' },
      { pattern: /\bCA\b/i, code: 'CA' },
      { pattern: /\bC\b(?!\d)/i, code: 'C' },
      { pattern: /\bCongé/i, code: 'C' },
      { pattern: /\bCONGE\b/i, code: 'C' },
      { pattern: /\bNU\b/i, code: 'NU' },
      { pattern: /\bNon\s+utilisé/i, code: 'NU' },
      { pattern: /\bDISPO\b/i, code: 'D' },
      { pattern: /\bDisponible/i, code: 'D' },
      { pattern: /\bHAB(?:-QF)?\b/i, code: 'HAB' },
      { pattern: /\bFORMATION\b/i, code: 'HAB' },
      { pattern: /\bINACTIN\b/i, code: 'INACTIN' },
      { pattern: /\bVISIMED\b/i, code: 'VISIMED' },
      { pattern: /\bVMT\b/i, code: 'VISIMED' },
      { pattern: /\bMA\b/i, code: 'MA' },
      { pattern: /\bMALADIE\b/i, code: 'MA' },
      { pattern: /\bI\b(?!\d)/i, code: 'I' }
    ];
    
    specialPatterns.forEach(({ pattern, code }) => {
      if (pattern.test(line) && !codes.includes(code)) {
        codes.push(code);
      }
    });
    
    return codes;
  }

  /**
   * Obtient la description d'un code spécial
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
   * Vérifie si un code contient des chiffres
   */
  isNumericCode(code) {
    return /\d/.test(code);
  }

  /**
   * Valide les données parsées
   */
  validateParsedData(data) {
    const errors = [];
    const warnings = [];

    // Vérifier l'agent
    if (!data.agent || !data.agent.nom || !data.agent.prenom) {
      warnings.push('Agent non détecté dans le document');
    }

    // Vérifier le planning
    if (!data.planning || data.planning.length === 0) {
      errors.push('Aucune entrée de planning trouvée dans le PDF');
    }

    // Détection des doublons
    const dateCounts = {};
    data.planning.forEach(entry => {
      const key = `${entry.date}_${entry.service_code}_${entry.poste_code}`;
      dateCounts[key] = (dateCounts[key] || 0) + 1;
    });

    const duplicates = Object.entries(dateCounts)
      .filter(([key, count]) => count > 1)
      .map(([key]) => key);

    if (duplicates.length > 0) {
      warnings.push(`Doublons détectés: ${duplicates.join(', ')}`);
    }

    // Vérifier la cohérence des dates
    if (data.planning && data.planning.length > 0) {
      const dates = data.planning.map(e => new Date(e.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const daysDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 45) {
        warnings.push('Période de planning supérieure à 45 jours');
      }
    }

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings 
    };
  }

  /**
   * Méthode principale qui requiert TOUJOURS une clé API valide
   */
  async parsePDF(file, apiKey) {
    // Vérification stricte de la clé API
    if (!apiKey || apiKey === 'sk-proj-default-key' || apiKey.length < 10) {
      throw new Error('Module PDF désactivé : Clé API Mistral requise. Configurez REACT_APP_MISTRAL_API_KEY dans vos variables d\'environnement.');
    }
    
    // Utiliser uniquement l'API Mistral
    return await this.parseWithMistralOCR(file, apiKey);
  }
}

// Export singleton
export default new PDFParserService();