// Service de parsing des bulletins de commande SNCF avec intégration Mistral OCR
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
   * Méthode principale pour parser un PDF avec Mistral OCR
   * @param {File} file - Fichier PDF à parser
   * @param {string} apiKey - Clé API Mistral
   * @returns {Object} Données parsées et structurées
   */
  static async parsePDF(file, apiKey) {
    try {
      // 1. Extraire le texte du PDF
      const text = await this.extractTextFromPDF(file);
      
      // 2. Si extraction directe échouée, utiliser Mistral OCR
      if (!text || text.trim().length < 100) {
        console.log('📄 Texte insuffisant, utilisation de Mistral OCR...');
        const ocrText = await this.callMistralOCR(file, apiKey);
        return this.parseMistralOCR(ocrText);
      }
      
      // 3. Parser le texte extrait
      return this.parseBulletin(text);
      
    } catch (error) {
      console.error('Erreur lors du parsing PDF:', error);
      throw new Error(`Échec du parsing PDF: ${error.message}`);
    }
  }

  /**
   * Extraire le texte d'un PDF
   * @param {File} file - Fichier PDF
   * @returns {string} Texte extrait
   */
  static async extractTextFromPDF(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          // Tentative d'extraction basique du texte
          // Note: En production, on utiliserait PDF.js pour une extraction plus robuste
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convertir en texte (méthode simplifiée)
          let text = '';
          const decoder = new TextDecoder('utf-8');
          
          // Rechercher les sections de texte dans le PDF
          for (let i = 0; i < uint8Array.length - 100; i++) {
            // Rechercher les marqueurs de flux de texte PDF
            if (uint8Array[i] === 66 && uint8Array[i+1] === 84) { // "BT"
              let j = i + 2;
              let chunk = [];
              
              // Lire jusqu'à "ET"
              while (j < uint8Array.length - 1 && 
                     !(uint8Array[j] === 69 && uint8Array[j+1] === 84)) {
                chunk.push(uint8Array[j]);
                j++;
              }
              
              // Tenter de décoder le chunk
              try {
                const chunkText = decoder.decode(new Uint8Array(chunk));
                text += chunkText + ' ';
              } catch (e) {
                // Ignorer les erreurs de décodage
              }
            }
          }
          
          resolve(text);
        } catch (error) {
          resolve(''); // Retourner une chaîne vide si l'extraction échoue
        }
      };
      
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Appeler l'API Mistral pour l'OCR
   * @param {File} file - Fichier PDF
   * @param {string} apiKey - Clé API Mistral
   * @returns {string} Texte extrait par OCR
   */
  static async callMistralOCR(file, apiKey) {
    try {
      // Convertir le fichier en base64
      const base64 = await this.fileToBase64(file);
      
      // Appel à l'API Mistral
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2409',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extrais le texte complet de ce bulletin de commande SNCF. 
                         Retourne UNIQUEMENT le texte brut sans formatage, en conservant la structure originale.
                         Inclus TOUS les éléments : dates, codes service, horaires, noms d'agents, numéros CP.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur Mistral API:', errorData);
        
        // Fallback vers mistral-large si pixtral échoue
        if (response.status === 400 || response.status === 422) {
          console.log('Fallback vers mistral-large-latest...');
          return await this.callMistralOCRFallback(file, apiKey);
        }
        
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
      
    } catch (error) {
      console.error('Erreur lors de l\'appel Mistral OCR:', error);
      throw error;
    }
  }

  /**
   * Fallback vers mistral-large pour l'extraction de texte
   */
  static async callMistralOCRFallback(file, apiKey) {
    const text = await this.extractTextFromPDF(file);
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
            content: `Voici le texte extrait d'un bulletin de commande SNCF (peut contenir des erreurs).
                     Nettoie et restructure ce texte pour qu'il soit lisible et bien formaté.
                     Conserve TOUS les éléments importants : dates, codes service, horaires, noms, numéros CP.
                     
                     Texte brut:
                     ${text}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API Mistral (fallback): ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Convertir un fichier en base64
   */
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Valider les données parsées
   * @param {Object} parsedData - Données parsées
   * @returns {Object} Résultat de validation avec erreurs et warnings
   */
  static validateParsedData(parsedData) {
    const validation = {
      errors: [],
      warnings: [],
      isValid: true
    };

    // Vérifier la présence des métadonnées
    if (!parsedData.metadata) {
      validation.errors.push('Métadonnées manquantes');
      validation.isValid = false;
    } else {
      if (!parsedData.metadata.agent) {
        validation.errors.push('Nom de l\'agent manquant');
        validation.isValid = false;
      }
      if (!parsedData.metadata.numeroCP) {
        validation.warnings.push('Numéro CP manquant');
      }
      if (!parsedData.metadata.periode) {
        validation.warnings.push('Période non définie');
      }
    }

    // Vérifier les entrées
    if (!parsedData.entries || parsedData.entries.length === 0) {
      validation.errors.push('Aucune entrée de planning trouvée');
      validation.isValid = false;
    } else {
      // Vérifier chaque entrée
      parsedData.entries.forEach((entry, index) => {
        if (!entry.date) {
          validation.errors.push(`Entrée ${index + 1}: Date manquante`);
          validation.isValid = false;
        }
        if (!entry.serviceCode) {
          validation.warnings.push(`Entrée ${index + 1}: Code service manquant`);
        } else if (!this.VALID_SERVICE_CODES[entry.serviceCode]) {
          validation.warnings.push(`Entrée ${index + 1}: Code service inconnu (${entry.serviceCode})`);
        }
      });

      // Statistiques
      const validEntries = parsedData.entries.filter(e => e.isValid).length;
      const totalEntries = parsedData.entries.length;
      
      if (validEntries < totalEntries) {
        validation.warnings.push(`${totalEntries - validEntries} entrées sur ${totalEntries} nécessitent une vérification`);
      }
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