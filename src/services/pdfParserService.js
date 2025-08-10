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
    if (!apiKey) {
      throw new Error('Clé API Mistral requise pour l\'OCR');
    }

    try {
      console.log('🔍 Démarrage OCR avec Mistral API (fetch)...');
      
      // Convertir le fichier en base64 data URL
      const dataUrl = await this.fileToBase64(file);
      
      // Appel à l'API Mistral via fetch natif
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2024-09-04',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extrais tout le texte de ce document PDF, notamment :
                  - Le nom et prénom de l'agent (format: COGC PN NOM PRENOM)
                  - Toutes les dates (format JJ/MM/AAAA)
                  - Tous les codes de service (CRC001, ACR002, etc.)
                  - Les codes spéciaux (RP, C, HAB, MA, etc.)
                  - Présente le résultat en format markdown structuré
                  - Conserve EXACTEMENT les codes tels qu'ils apparaissent`
                },
                {
                  type: 'image_url',
                  image_url: dataUrl
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 8000
        })
      });

      if (!response.ok) {
        // Si pixtral échoue, essayer avec mistral-large
        if (response.status === 404 || response.status === 400) {
          console.log('⚠️ Modèle pixtral non disponible, tentative avec mistral-large...');
          return await this.parseWithMistralLarge(file, apiKey);
        }
        
        const error = await response.text();
        throw new Error(`Erreur API Mistral: ${response.status} - ${error}`);
      }

      const data = await response.json();
      console.log('✅ OCR terminé, parsing des résultats...');
      
      // Extraire le contenu de la réponse
      const ocrContent = data.choices[0].message.content;
      
      // Parser les résultats OCR
      return await this.parseOCRContent(ocrContent);
      
    } catch (err) {
      console.error('Erreur Mistral OCR:', err);
      
      // Si pixtral n'existe pas, essayer avec mistral-large
      if (err.message?.includes('pixtral')) {
        return await this.parseWithMistralLarge(file, apiKey);
      }
      
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
              content: 'Tu es un système OCR spécialisé dans l\'extraction de données de bulletins de commande SNCF. Extrais EXACTEMENT le texte tel qu\'il apparaît, sans interprétation.'
            },
            {
              role: 'user',
              content: `Analyse ce document PDF et extrais :
              1. Le nom et prénom de l'agent (format: COGC PN NOM PRENOM)
              2. Toutes les dates au format JJ/MM/AAAA
              3. Tous les codes de service (ex: CRC001, ACR002, CCU003, etc.)
              4. Les codes spéciaux (RP, C, HAB, MA, VISIMED, etc.)
              
              Format de sortie attendu en markdown :
              - Agent: NOM PRENOM
              - Pour chaque date, liste les codes associés
              - Conserve EXACTEMENT les codes comme ils apparaissent
              
              Note: Le document est en base64, traite-le comme un bulletin de commande SNCF.`
            }
          ],
          temperature: 0.1,
          max_tokens: 8000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur API Mistral: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const ocrContent = data.choices[0].message.content;
      return await this.parseOCRContent(ocrContent);
      
    } catch (err) {
      console.error('Erreur avec mistral-large:', err);
      throw new Error(`Impossible d'extraire le PDF: ${err.message}`);
    }
  }

  /**
   * Parse le contenu OCR extrait par Mistral
   */
  async parseOCRContent(ocrContent) {
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    if (!ocrContent) {
      throw new Error('Aucun contenu extrait du PDF');
    }

    console.log('📄 Contenu OCR extrait (extrait):', ocrContent.substring(0, 500) + '...');

    // Extraction du nom de l'agent
    const agentMatch = ocrContent.match(/COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i);
    if (agentMatch) {
      result.agent.nom = agentMatch[1];
      result.agent.prenom = agentMatch[2];
      console.log('👤 Agent détecté:', result.agent.nom, result.agent.prenom);
    } else {
      // Essayer d'autres patterns
      const altAgentMatch = ocrContent.match(/Agent\s*:\s*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i);
      if (altAgentMatch) {
        result.agent.nom = altAgentMatch[1];
        result.agent.prenom = altAgentMatch[2];
        console.log('👤 Agent détecté (format alternatif):', result.agent.nom, result.agent.prenom);
      } else {
        console.warn('⚠️ Agent non détecté dans le document');
      }
    }

    // Extraction des dates et codes
    const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    const lines = ocrContent.split('\n');
    
    // Map pour stocker les codes par date
    const codesByDate = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateMatches = [...line.matchAll(datePattern)];
      
      for (const dateMatch of dateMatches) {
        const [fullDate, day, month, year] = dateMatch;
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        // Chercher les codes sur la même ligne et les lignes suivantes
        const codes = [];
        
        // Extraire les codes de la ligne actuelle
        const lineCodes = this.extractCodesFromLine(line);
        codes.push(...lineCodes);
        
        // Regarder les 2-3 lignes suivantes pour des codes associés
        for (let j = 1; j <= 3 && i + j < lines.length; j++) {
          const nextLine = lines[i + j];
          // Si on trouve une nouvelle date, on arrête
          if (datePattern.test(nextLine)) break;
          
          const nextLineCodes = this.extractCodesFromLine(nextLine);
          codes.push(...nextLineCodes);
        }
        
        if (codes.length > 0) {
          // Éliminer les doublons
          const uniqueCodes = [...new Set(codes)];
          codesByDate.set(formattedDate, uniqueCodes);
        }
      }
    }
    
    // Convertir en format avec mapping
    for (const [date, codes] of codesByDate.entries()) {
      for (const code of codes) {
        const mapping = await mappingService.getPosteFromCode(code);
        
        if (mapping) {
          let targetDate = date;
          
          // Décaler les services de nuit au jour suivant
          if (mapping.service === 'X') {
            const currentDate = new Date(date + 'T12:00:00');
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
        } else if (!this.isNumericCode(code)) {
          // Codes spéciaux sans mapping (RP, C, etc.)
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

    // Trier par date
    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`✅ Extraction terminée: ${result.planning.length} entrées trouvées`);
    
    return result;
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
    
    // Codes spéciaux
    const specialPatterns = [
      { pattern: /\bRPP?\b/i, code: 'RP' },
      { pattern: /\bRepos\s+périodique/i, code: 'RP' },
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
      'RP': 'Repos périodique',
      'RPP': 'Repos périodique prolongé',
      'C': 'Congé',
      'D': 'Disponible',
      'HAB': 'Formation/Habilitation',
      'MA': 'Maladie',
      'I': 'Indisponible',
      'NU': 'Non utilisé',
      'INACTIN': 'Inactivité',
      'VISIMED': 'Visite médicale'
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
      errors.push('Agent non détecté ou incomplet');
    }

    // Vérifier le planning
    if (!data.planning || data.planning.length === 0) {
      errors.push('Aucune entrée de planning trouvée');
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
   * Méthode principale qui détermine quelle API utiliser
   */
  async parsePDF(file, apiKey) {
    // Toujours utiliser Mistral OCR maintenant
    if (!apiKey) {
      throw new Error('Clé API Mistral requise pour l\'extraction PDF');
    }
    
    return await this.parseWithMistralOCR(file, apiKey);
  }
}

// Export singleton
export default new PDFParserService();