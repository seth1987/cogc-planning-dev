// Service de parsing et extraction de PDF
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.pdfjsLib = null;
  }

  /**
   * Initialise PDF.js si nécessaire
   */
  async initPDFJS() {
    if (!this.pdfjsLib && window.pdfjsLib) {
      this.pdfjsLib = window.pdfjsLib;
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = 
        '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return this.pdfjsLib;
  }

  /**
   * Extrait le texte d'un fichier PDF
   */
  async extractTextFromPDF(file) {
    await this.initPDFJS();
    
    if (!this.pdfjsLib) {
      throw new Error('PDF.js non disponible');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (err) {
      console.error('Erreur extraction PDF:', err);
      throw new Error('Impossible d\'extraire le texte du PDF');
    }
  }

  /**
   * Parse le texte avec l'API Mistral
   */
  async parseWithMistral(text, apiKey) {
    const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
    
    const prompt = `Analyse ce bulletin de commande SNCF et extrais EXACTEMENT les informations au format JSON.

TEXTE DU BULLETIN:
${text}

INSTRUCTIONS CRITIQUES:

1. AGENT:
   - Cherche "COGC PN" suivi du NOM et PRÉNOM
   - Format: COGC PN [NOM] [PRÉNOM]

2. DATES IMPORTANTES:
   - Format des dates dans le texte: JJ/MM/AAAA
   - Convertir en format ISO: AAAA-MM-JJ

3. CODES À EXTRAIRE:
   - Codes service avec numéro (ex: CRC001, ACR002, CCU003, etc.)
   - Codes spéciaux: RP, RPP, C, NU, DISPO, HAB-QF, INACTIN, VISIMED
   - Pour chaque date, extraire TOUS les codes présents

4. RÈGLE IMPORTANTE:
   - Les services de nuit (codes finissant par 003 ou avec service X) sont décalés au jour suivant
   - Les autres codes restent sur leur date d'origine

FORMAT JSON ATTENDU:
{
  "agent": {
    "nom": "NOM",
    "prenom": "PRENOM"
  },
  "planning": [
    {
      "date": "YYYY-MM-DD",
      "codes": ["CODE1", "CODE2"]
    }
  ]
}

RÉPONDS UNIQUEMENT AVEC LE JSON.`;

    try {
      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur API Mistral:', errorData);
        
        if (response.status === 401) {
          throw new Error('Clé API Mistral invalide');
        } else if (response.status === 429) {
          throw new Error('Limite de requêtes atteinte');
        } else {
          throw new Error(`Erreur API Mistral (${response.status})`);
        }
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Nettoyer la réponse pour ne garder que le JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Format de réponse invalide');
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      
      // Convertir au format attendu avec mapping
      return await this.convertToMappedFormat(parsedResult);
      
    } catch (err) {
      console.error('Erreur Mistral:', err);
      throw err;
    }
  }

  /**
   * Parse manuellement le texte du PDF
   */
  async parseManually(text) {
    console.log('Début du parsing manuel...');
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    // Extraction du nom de l'agent
    const agentMatch = text.match(/COGC\s+PN\s+([A-Z]+)\s+([A-Z]+)/);
    if (agentMatch) {
      result.agent.nom = agentMatch[1];
      result.agent.prenom = agentMatch[2];
      console.log('Agent détecté:', result.agent.nom, result.agent.prenom);
    }

    // Pattern pour les dates
    const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
    const dateMatches = [...text.matchAll(datePattern)];
    
    // Map pour stocker les codes par date
    const codesByDate = new Map();
    
    for (let i = 0; i < dateMatches.length; i++) {
      const match = dateMatches[i];
      const dateStr = match[0];
      const [day, month, year] = dateStr.split('/');
      const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Extraire le contenu entre cette date et la suivante
      const startIndex = match.index;
      const endIndex = (i < dateMatches.length - 1) ? dateMatches[i + 1].index : text.length;
      const dateContent = text.substring(startIndex, endIndex);
      
      // Extraire les codes pour cette date
      const codes = await this.extractCodesFromContent(dateContent, formattedDate);
      
      if (codes.length > 0) {
        codesByDate.set(formattedDate, codes);
      }
    }
    
    // Convertir en format avec mapping
    return await this.convertManualToMappedFormat(result.agent, codesByDate);
  }

  /**
   * Extrait les codes d'un contenu de date
   */
  async extractCodesFromContent(content, date) {
    const codes = [];
    
    // Pattern pour les codes services avec numéros
    const serviceCodePattern = /(CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}/gi;
    const serviceMatches = [...content.matchAll(serviceCodePattern)];
    
    serviceMatches.forEach(match => {
      codes.push(match[0].toUpperCase());
    });
    
    // Codes spéciaux sans numéros
    const specialPatterns = [
      { pattern: /\bRP\b|Repos périodique/i, code: 'RP' },
      { pattern: /\bRPP\b/i, code: 'RPP' },
      { pattern: /\bC\s+Congé|\bCONGE\b/i, code: 'C' },
      { pattern: /\bNU\b.*non utilisé/i, code: 'NU' },
      { pattern: /\bDISPO\b|Disponible/i, code: 'D' },
      { pattern: /HAB-QF|FORMATION/i, code: 'HAB' },
      { pattern: /INACTIN/i, code: 'INACTIN' },
      { pattern: /VISIMED|VMT/i, code: 'VISIMED' }
    ];
    
    specialPatterns.forEach(({ pattern, code }) => {
      if (pattern.test(content)) {
        codes.push(code);
      }
    });
    
    return [...new Set(codes)]; // Éliminer les doublons
  }

  /**
   * Convertit le format parsé avec mapping des codes
   */
  async convertToMappedFormat(parsedData) {
    const result = {
      agent: parsedData.agent,
      planning: []
    };

    for (const entry of parsedData.planning) {
      for (const code of entry.codes) {
        const mapping = await mappingService.getPosteFromCode(code);
        
        if (mapping) {
          let targetDate = entry.date;
          
          // Décaler les services de nuit
          if (mapping.service === 'X') {
            const currentDate = new Date(entry.date + 'T12:00:00');
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
          // Codes sans mapping (RP, C, etc.)
          result.planning.push({
            date: entry.date,
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
    
    return result;
  }

  /**
   * Convertit le parsing manuel avec mapping
   */
  async convertManualToMappedFormat(agent, codesByDate) {
    const result = {
      agent: agent,
      planning: []
    };

    for (const [date, codes] of codesByDate.entries()) {
      for (const code of codes) {
        const mapping = await mappingService.getPosteFromCode(code);
        
        if (mapping) {
          let targetDate = date;
          
          // Décaler les services de nuit
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
        }
      }
    }

    // Trier par date
    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    
    return result;
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

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings 
    };
  }
}

// Export singleton
export default new PDFParserService();
