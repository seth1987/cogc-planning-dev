// Service de parsing et extraction de PDF avec Mistral OCR
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.mistralOCRUrl = 'https://api.mistral.ai/v1/ocr';
  }

  /**
   * Convertit un fichier en base64
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Enlever le préfixe "data:application/pdf;base64,"
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Parse le PDF avec Mistral OCR API
   */
  async parseWithMistralOCR(file, apiKey) {
    if (!apiKey) {
      throw new Error('Clé API Mistral requise pour l\'OCR');
    }

    try {
      console.log('🔍 Démarrage OCR avec Mistral OCR...');
      
      // Convertir le fichier en base64
      const base64PDF = await this.fileToBase64(file);
      
      // Appel à l'API Mistral OCR
      const response = await fetch(this.mistralOCRUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-ocr-latest',
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${base64PDF}`
          },
          include_image_base64: false // Pas besoin des images pour les bulletins
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur API Mistral OCR:', errorData);
        
        if (response.status === 401) {
          throw new Error('Clé API Mistral invalide');
        } else if (response.status === 429) {
          throw new Error('Limite de requêtes atteinte');
        } else {
          throw new Error(`Erreur OCR (${response.status}): ${errorData.message || 'Erreur inconnue'}`);
        }
      }

      const ocrResult = await response.json();
      console.log('✅ OCR terminé, parsing des résultats...');
      
      // Parser les résultats OCR
      return await this.parseOCRResult(ocrResult);
      
    } catch (err) {
      console.error('Erreur Mistral OCR:', err);
      throw err;
    }
  }

  /**
   * Parse les résultats de Mistral OCR
   */
  async parseOCRResult(ocrData) {
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    if (!ocrData.pages || ocrData.pages.length === 0) {
      throw new Error('Aucune page détectée dans le PDF');
    }

    // Combiner le contenu de toutes les pages
    const fullContent = ocrData.pages
      .map(page => page.markdown || page.content || '')
      .join('\n');

    console.log('📄 Contenu extrait:', fullContent.substring(0, 500) + '...');

    // Extraction du nom de l'agent (pattern: COGC PN NOM PRENOM)
    const agentMatch = fullContent.match(/COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i);
    if (agentMatch) {
      result.agent.nom = agentMatch[1];
      result.agent.prenom = agentMatch[2];
      console.log('👤 Agent détecté:', result.agent.nom, result.agent.prenom);
    }

    // Extraction des dates et codes
    // Pattern pour les dates françaises JJ/MM/AAAA
    const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    const lines = fullContent.split('\n');
    
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
    const dates = data.planning.map(e => new Date(e.date));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const daysDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 45) {
      warnings.push('Période de planning supérieure à 45 jours');
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