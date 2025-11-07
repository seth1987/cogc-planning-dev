// Service de parsing des bulletins de commande SNCF avec Mistral OCR
class PDFParserService {
  // Codes de service valides SNCF
  static VALID_SERVICE_CODES = {
    // Codes CCU (Centre de Commande Unique)
    CCU001: 'CRC/CCU DENFERT',
    CCU002: 'CRC/CCU DENFERT',
    CCU003: 'CRC/CCU DENFERT',
    CCU004: 'Régulateur Table PARC Denfert',
    
    // Codes CRC (Coordonnateur Régional Circulation)
    CRC001: 'Coordonnateur Régional Circulation',
    CRC002: 'Coordonnateur Régional Circulation',
    
    // Codes ACR
    ACR: 'Agent Circulation Rail',
    
    // Codes REO
    REO001: 'Référent Équipe Opérationnelle',
    REO002: 'Référent Équipe Opérationnelle',
    
    // Codes spéciaux
    RP: 'Repos Périodique',
    NU: 'Non Utilisé',
    DISPO: 'Disponible',
    INACTIN: 'Inactif/Formation',
    CA: 'Congé Annuel',
    RQ: 'Repos Compensateur',
    RTT: 'RTT'
  };

  // Éléments à filtrer (ne sont pas des codes de service)
  static FILTER_ELEMENTS = ['METRO', 'RS', 'du', 'au', 'TRACTION'];

  /**
   * Méthode unique pour parser un PDF avec Mistral OCR
   * @param {File} file - Fichier PDF à parser
   * @param {string} apiKey - Clé API Mistral
   * @returns {Object} Données parsées et structurées
   */
  static async parsePDF(file, apiKey) {
    try {
      console.log('🚀 Début extraction Mistral OCR...');
      
      // 1. Convertir le fichier en base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Appel API Mistral avec pixtral pour OCR
      let response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2409',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extrais TOUT le texte de ce bulletin SNCF. Format attendu:
                       - Chaque date sur une nouvelle ligne
                       - Format date: JJ/MM/AAAA suivi du jour (Lun, Mar, etc.)
                       - Codes service: CCU001, CCU002, CRC001, RP, DISPO, etc.
                       - Horaires au format HH:MM HH:MM
                       - Conserve TOUS les éléments: Agent, N° CP, périodes, codes
                       Retourne le texte EXACT sans modification.`
              },
              {
                type: 'image_url',
                image_url: { url: `data:application/pdf;base64,${base64}` }
              }
            ]
          }],
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      // 3. Si pixtral échoue, fallback sur mistral-large
      if (!response.ok) {
        console.log('⚠️ Pixtral indisponible, fallback sur mistral-large...');
        
        response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'mistral-large-latest',
            messages: [{
              role: 'user',
              content: `Tu reçois un PDF de bulletin de commande SNCF. Analyse et retourne:
                       BULLETIN DE COMMANDE UOP:
                       Agent: [NOM PRENOM]
                       N° CP: [NUMERO]
                       Commande allant du [DATE] au [DATE]
                       
                       [DATE] [CODE_SERVICE] [JOUR]
                       [HORAIRES si présents]
                       
                       Utilise ces codes service valides: CCU001-004, CRC001-002, RP, DISPO, NU, INACTIN, CA, RTT
                       Format dates: JJ/MM/AAAA
                       Conserve TOUT le contenu important.`
            }],
            temperature: 0.1,
            max_tokens: 4000
          })
        });
      }

      if (!response.ok) {
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }

      const data = await response.json();
      const ocrText = data.choices[0]?.message?.content || '';
      
      console.log('✅ Texte extrait avec succès');
      
      // 4. Parser le texte extrait
      return this.parseBulletin(ocrText);
      
    } catch (error) {
      console.error('❌ Erreur parsing PDF:', error);
      throw new Error(`Échec extraction PDF: ${error.message}`);
    }
  }

  /**
   * Valider les données parsées
   * @param {Object} parsedData - Données parsées
   * @returns {Object} Résultat de validation
   */
  static validateParsedData(parsedData) {
    const validation = {
      errors: [],
      warnings: [],
      isValid: true
    };

    // Vérifier métadonnées
    if (!parsedData.metadata?.agent) {
      validation.errors.push('Nom agent manquant');
      validation.isValid = false;
    }
    if (!parsedData.metadata?.numeroCP) {
      validation.warnings.push('Numéro CP manquant');
    }

    // Vérifier entrées
    if (!parsedData.entries?.length) {
      validation.errors.push('Aucune entrée trouvée');
      validation.isValid = false;
    } else {
      parsedData.entries.forEach((entry, i) => {
        if (!entry.date) validation.errors.push(`Ligne ${i+1}: Date manquante`);
        if (!entry.serviceCode) validation.warnings.push(`Ligne ${i+1}: Code service manquant`);
      });
    }

    return validation;
  }

  /**
   * Parse le texte brut d'un bulletin SNCF
   * @param {string} rawText - Texte extrait du PDF
   * @returns {Object} Données structurées du bulletin
   */
  static parseBulletin(rawText) {
    const result = {
      metadata: this.extractMetadata(rawText),
      entries: [],
      errors: []
    };

    try {
      // Extraire les entrées jour par jour
      const lines = rawText.split('\n');
      let currentDate = null;
      let currentEntry = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Détecter une date (format: JJ/MM/AAAA)
        const dateMatch = line.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateMatch) {
          // Sauvegarder l'entrée précédente si elle existe
          if (currentEntry && currentEntry.serviceCode) {
            result.entries.push(currentEntry);
          }

          // Créer une nouvelle entrée
          currentDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`; // Format ISO
          currentEntry = {
            date: currentDate,
            dateDisplay: `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`,
            dayOfWeek: this.extractDayOfWeek(lines[i]),
            serviceCode: null,
            serviceLabel: null,
            horaires: [],
            isValid: false,
            hasError: false,
            errorMessage: null
          };
        }

        // Extraire le code de service
        if (currentEntry && !currentEntry.serviceCode) {
          const serviceCode = this.extractServiceCode(line);
          if (serviceCode) {
            currentEntry.serviceCode = serviceCode;
            currentEntry.serviceLabel = this.VALID_SERVICE_CODES[serviceCode] || serviceCode;
            currentEntry.isValid = true;
          }
        }

        // Extraire les horaires (format: HH:MM HH:MM)
        if (currentEntry) {
          const horaireMatch = line.match(/(\d{2}:\d{2})\s+(\d{2}:\d{2})/);
          if (horaireMatch) {
            currentEntry.horaires.push({
              debut: horaireMatch[1],
              fin: horaireMatch[2],
              code: this.extractTimeCode(line)
            });
          }
        }
      }

      // Ajouter la dernière entrée
      if (currentEntry && currentEntry.serviceCode) {
        result.entries.push(currentEntry);
      }

      // Valider les entrées
      result.entries = result.entries.map(entry => this.validateEntry(entry));

    } catch (error) {
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * Extrait les métadonnées du bulletin
   */
  static extractMetadata(rawText) {
    const metadata = {
      agent: null,
      numeroCP: null,
      periode: null,
      dateEdition: null
    };

    // Extraire nom agent
    const agentMatch = rawText.match(/Agent\s*:\s*([A-Z\s]+)/);
    if (agentMatch) {
      // Nettoyer et formater le nom (enlever "COGC PN" si présent)
      metadata.agent = agentMatch[1]
        .replace(/COGC\s+PN/g, '')
        .trim();
    }

    // Extraire numéro CP
    const cpMatch = rawText.match(/N°\s*CP\s*:\s*([A-Z0-9]+)/);
    if (cpMatch) {
      metadata.numeroCP = cpMatch[1];
    }

    // Extraire période
    const periodeMatch = rawText.match(/Commande allant du (\d{2}\/\d{2}\/\d{4}) au (\d{2}\/\d{2}\/\d{4})/);
    if (periodeMatch) {
      metadata.periode = {
        debut: periodeMatch[1],
        fin: periodeMatch[2]
      };
    }

    // Extraire date d'édition
    const editionMatch = rawText.match(/Edition le (\d{2}\/\d{2}\/\d{4})/);
    if (editionMatch) {
      metadata.dateEdition = editionMatch[1];
    }

    return metadata;
  }

  /**
   * Extrait le code de service d'une ligne
   */
  static extractServiceCode(line) {
    // Chercher les codes de service valides
    for (const code of Object.keys(this.VALID_SERVICE_CODES)) {
      if (line.includes(code)) {
        return code;
      }
    }

    // Cas spéciaux pour les codes sans numéro
    if (line.includes('RP') || line.includes('Repos périodique')) return 'RP';
    if (line.includes('NU') || line.includes('Utilisable non utilisé')) return 'NU';
    if (line.includes('DISPO') || line.includes('Disponible')) return 'DISPO';
    if (line.includes('INACTIN')) return 'INACTIN';
    if (line.includes('CA') || line.includes('Congé')) return 'CA';
    if (line.includes('RTT')) return 'RTT';

    return null;
  }

  /**
   * Extrait le jour de la semaine
   */
  static extractDayOfWeek(line) {
    const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    for (const jour of jours) {
      if (line.includes(jour)) {
        return jour;
      }
    }
    return null;
  }

  /**
   * Extrait le code horaire (N1100010CO72, etc.)
   */
  static extractTimeCode(line) {
    const codeMatch = line.match(/[A-Z]\d{10}[A-Z]{2}\d{2}/);
    return codeMatch ? codeMatch[0] : null;
  }

  /**
   * Valide une entrée
   */
  static validateEntry(entry) {
    // Vérifier si le code de service est valide
    if (!entry.serviceCode) {
      entry.hasError = true;
      entry.errorMessage = 'Code de service manquant';
      entry.isValid = false;
    } else if (!this.VALID_SERVICE_CODES[entry.serviceCode]) {
      entry.hasError = true;
      entry.errorMessage = `Code de service inconnu: ${entry.serviceCode}`;
      entry.isValid = false;
    }

    // Vérifier la date
    if (!entry.date) {
      entry.hasError = true;
      entry.errorMessage = 'Date manquante';
      entry.isValid = false;
    }

    return entry;
  }

  /**
   * Formate les données pour l'import en base
   */
  static formatForImport(entries, agentId) {
    return entries
      .filter(entry => entry.isValid && !entry.hasError)
      .map(entry => ({
        agent_id: agentId,
        date: entry.date,
        service_code: entry.serviceCode,
        poste_code: entry.horaires.length > 0 ? entry.horaires[0].code : null,
        horaires: entry.horaires.map(h => `${h.debut}-${h.fin}`).join(', '),
        statut: 'actif'
      }));
  }

  /**
   * Parse le texte OCR de Mistral
   */
  static parseMistralOCR(ocrText) {
    // Nettoyer le texte OCR
    const cleanedText = ocrText
      .replace(/\|/g, '\n')  // Remplacer les pipes par des sauts de ligne
      .replace(/\s+/g, ' ')  // Normaliser les espaces
      .trim();

    return this.parseBulletin(cleanedText);
  }
}

export default PDFParserService;