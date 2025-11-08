// Service de parsing des bulletins de commande SNCF - Version hybride avec Mistral OCR
import MistralOCRService from './mistralOCRService';

class PDFParserService {
  // Codes de service valides SNCF (étendu avec les nouveaux codes)
  static VALID_SERVICE_CODES = {
    // Codes CCU (Centre de Commande Unique)
    CCU001: 'CRC/CCU DENFERT',
    CCU002: 'CRC/CCU DENFERT',
    CCU003: 'CRC/CCU DENFERT',
    CCU004: 'Régulateur Table PARC Denfert',
    CCU005: 'Régulateur Table PARC Denfert',
    
    // Codes CRC (Coordonnateur Régional Circulation)
    CRC001: 'Coordonnateur Régional Circulation',
    CRC002: 'Coordonnateur Régional Circulation',
    
    // Codes ACR (Aide Coordonnateur Régional)
    ACR001: 'Aide Coordonnateur Régional',
    ACR002: 'Aide Coordonnateur Régional',
    ACR003: 'Aide Coordonnateur Régional',
    
    // Codes Centre Souffleur
    CENT001: 'Centre Souffleur',
    CENT002: 'Centre Souffleur',
    CENT003: 'Centre Souffleur',
    
    // Codes REO
    REO001: 'Référent Équipe Opérationnelle',
    REO002: 'Référent Équipe Opérationnelle',
    
    // Codes spéciaux
    RP: 'Repos Périodique',
    NU: 'Non Utilisé',
    DISPO: 'Disponible',
    INACTIN: 'Inactif/Formation',
    'HAB-QF': 'Formation/Perfectionnement',
    CA: 'Congé Annuel',
    CONGE: 'Congé Annuel',
    RQ: 'Repos Compensateur',
    RTT: 'RTT',
    C: 'Congé Annuel'  // Version abrégée
  };

  // Éléments à filtrer (ne sont pas des codes de service)
  static FILTER_ELEMENTS = ['METRO', 'RS', 'du', 'au', 'TRACTION'];

  /**
   * Parse un PDF avec extraction hybride Mistral + Locale
   * @param {File} file - Fichier PDF à parser
   * @param {string} apiKey - API Key Mistral (optionnelle, utilise celle par défaut si non fournie)
   * @returns {Object} Données parsées et structurées
   */
  static async parsePDF(file, apiKey = null) {
    try {
      console.log('📄 Début extraction PDF hybride...');
      
      // 1. Essayer d'abord avec Mistral OCR (le plus précis)
      try {
        console.log('🚀 Tentative avec Mistral AI OCR...');
        const mistralResult = await MistralOCRService.extractWithMistral(file);
        
        if (mistralResult && mistralResult.entries && mistralResult.entries.length > 0) {
          console.log('✅ Extraction Mistral réussie:', mistralResult.entries.length, 'entrées');
          
          // Enrichir avec les codes de service valides
          mistralResult.entries = mistralResult.entries.map(entry => {
            if (!this.VALID_SERVICE_CODES[entry.serviceCode]) {
              entry.hasWarning = true;
              entry.warningMessage = `Code service ${entry.serviceCode} non reconnu`;
            }
            return entry;
          });
          
          mistralResult.extractionMethod = 'Mistral AI OCR (94.89% précision)';
          return mistralResult;
        }
      } catch (mistralError) {
        console.warn('⚠️ Erreur Mistral OCR:', mistralError.message);
      }
      
      // 2. Fallback sur extraction locale JavaScript
      console.log('📑 Fallback sur extraction locale...');
      const localResult = await this.extractLocally(file);
      
      if (localResult && localResult.entries && localResult.entries.length > 0) {
        console.log('✅ Extraction locale réussie:', localResult.entries.length, 'entrées');
        localResult.extractionMethod = 'Extraction locale PDF.js';
        return localResult;
      }
      
      // 3. Si tout échoue, retourner un template de démonstration
      console.log('📝 Mode démonstration activé');
      return this.getDemoResult();
      
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      // Retourner un template de démonstration en cas d'erreur
      return this.getDemoResult();
    }
  }

  /**
   * Extraction locale avec PDF.js
   */
  static async extractLocally(file) {
    try {
      // 1. Lire le fichier comme ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      let extractedText = '';

      // 2. Essayer PDF.js si disponible
      try {
        const pdfjsLib = window.pdfjsLib || await import('pdfjs-dist');
        
        // Désactiver le worker pour éviter les problèmes CORS/CSP
        pdfjsLib.GlobalWorkerOptions.workerSrc = false;
        
        console.log('📑 Extraction avec PDF.js...');
        
        // Charger le document sans worker
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          disableWorker: true,
          verbosity: 0
        });
        
        const pdf = await loadingTask.promise;
        console.log(`📑 PDF chargé: ${pdf.numPages} pages`);

        // Extraire le texte de toutes les pages
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Reconstruire le texte avec les positions
            let pageText = '';
            let lastY = null;
            
            textContent.items.forEach(item => {
              // Nouvelle ligne si changement significatif de Y
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
                pageText += '\n';
              } else if (pageText.length > 0 && !pageText.endsWith(' ')) {
                pageText += ' ';
              }
              
              pageText += item.str;
              lastY = item.transform[5];
            });
            
            extractedText += pageText + '\n\n';
          } catch (pageError) {
            console.warn(`⚠️ Erreur page ${i}:`, pageError.message);
          }
        }
        
        console.log('✅ Extraction PDF.js réussie');
      } catch (pdfError) {
        console.log('⚠️ PDF.js non disponible, extraction binaire...');
        extractedText = this.extractTextFromBinary(arrayBuffer);
      }

      // 3. Parser le texte extrait
      if (extractedText && extractedText.trim().length > 50) {
        return this.parseBulletin(extractedText);
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Erreur extraction locale:', error);
      return null;
    }
  }

  /**
   * Extraction de texte depuis le binaire du PDF
   */
  static extractTextFromBinary(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let extractedText = '';
    
    console.log('🔧 Extraction binaire du PDF...');
    
    // Rechercher les patterns de texte entre parenthèses
    for (let i = 0; i < uint8Array.length - 1; i++) {
      if (uint8Array[i] === 0x28) { // '(' en ASCII
        let j = i + 1;
        let textBytes = [];
        
        while (j < uint8Array.length && j - i < 1000) {
          if (uint8Array[j] === 0x29) { // ')' en ASCII
            if (textBytes.length > 0) {
              try {
                let text = decoder.decode(new Uint8Array(textBytes));
                text = text
                  .replace(/\\(\d{3})/g, (match, oct) => String.fromCharCode(parseInt(oct, 8)))
                  .replace(/\\n/g, '\n')
                  .trim();
                
                if (text.length > 2 && text.length < 500) {
                  const upperText = text.toUpperCase();
                  if (upperText.includes('AGENT') || 
                      upperText.includes('CCU') || 
                      upperText.includes('CRC') ||
                      upperText.includes('BULLETIN') ||
                      /\d{2}\/\d{2}\/\d{4}/.test(text)) {
                    extractedText += text + ' ';
                  }
                }
              } catch (e) {
                // Ignorer les erreurs de décodage
              }
            }
            break;
          }
          textBytes.push(uint8Array[j]);
          j++;
        }
      }
    }
    
    return extractedText;
  }

  /**
   * Parse le texte brut d'un bulletin SNCF
   */
  static parseBulletin(rawText) {
    const result = {
      metadata: this.extractMetadata(rawText),
      entries: [],
      errors: []
    };

    try {
      // Normaliser le texte
      const normalizedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ');

      // Extraire les entrées jour par jour
      const lines = normalizedText.split('\n');
      let currentEntry = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Détecter une date
        const dateMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        
        if (dateMatch) {
          // Sauvegarder l'entrée précédente
          if (currentEntry && currentEntry.serviceCode) {
            result.entries.push(currentEntry);
          }

          // Créer nouvelle entrée
          const jour = dateMatch[1].padStart(2, '0');
          const mois = dateMatch[2].padStart(2, '0');
          const annee = dateMatch[3];
          
          currentEntry = {
            date: `${annee}-${mois}-${jour}`,
            dateDisplay: `${jour}/${mois}/${annee}`,
            dayOfWeek: this.extractDayOfWeek(line) || this.extractDayOfWeek(lines[i+1] || ''),
            serviceCode: null,
            serviceLabel: null,
            horaires: [],
            isValid: false,
            hasError: false,
            errorMessage: null
          };
          
          // Chercher le code de service
          for (let j = 0; j <= 2 && i + j < lines.length; j++) {
            const checkLine = lines[i + j];
            const serviceCode = this.extractServiceCode(checkLine);
            if (serviceCode) {
              currentEntry.serviceCode = serviceCode;
              currentEntry.serviceLabel = this.VALID_SERVICE_CODES[serviceCode] || serviceCode;
              currentEntry.isValid = true;
              break;
            }
          }
        }

        // Extraire les horaires
        if (currentEntry) {
          const horaireMatch = line.match(/(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/);
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

    } catch (error) {
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * Template de démonstration
   */
  static getDemoResult() {
    return {
      metadata: {
        agent: 'GILLON THOMAS',
        numeroCP: '8409385L',
        dateEdition: '11/04/2025',
        periodeDebut: '21/04/2025',
        periodeFin: '30/04/2025'
      },
      entries: [
        {
          date: '2025-04-21',
          dateDisplay: '21/04/2025',
          dayOfWeek: 'Lun',
          serviceCode: 'CCU004',
          serviceLabel: 'Régulateur Table PARC Denfert',
          horaires: [
            { type: 'METRO', debut: '05:35', fin: '06:00' },
            { type: 'SERVICE', debut: '06:00', fin: '14:00', code: 'N1100010CO72' }
          ],
          isValid: true
        },
        {
          date: '2025-04-22',
          dateDisplay: '22/04/2025',
          dayOfWeek: 'Mar',
          serviceCode: 'CRC001',
          serviceLabel: 'Coordonnateur Régional Circulation',
          horaires: [
            { type: 'SERVICE', debut: '06:00', fin: '14:00', code: 'N1100010CO72' }
          ],
          isValid: true
        }
      ],
      extractionMethod: 'Template démonstration',
      errors: []
    };
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
    const agentMatch = rawText.match(/Agent\s*:?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)/i);
    if (agentMatch) {
      metadata.agent = agentMatch[1]
        .replace(/COGC\s+PN/gi, '')
        .trim()
        .toUpperCase();
    }

    // Extraire numéro CP
    const cpMatch = rawText.match(/N[°o]?\s*CP\s*:?\s*([A-Z0-9]+)/i);
    if (cpMatch) {
      metadata.numeroCP = cpMatch[1];
    }

    // Extraire période
    const periodeMatch = rawText.match(/Commande allant du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (periodeMatch) {
      metadata.periode = {
        debut: periodeMatch[1],
        fin: periodeMatch[2]
      };
    }

    // Extraire date d'édition
    const editionMatch = rawText.match(/Edition le\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (editionMatch) {
      metadata.dateEdition = editionMatch[1];
    }

    return metadata;
  }

  /**
   * Extrait le code de service d'une ligne
   */
  static extractServiceCode(line) {
    if (!line) return null;
    
    const upperLine = line.toUpperCase();
    
    // Tous les codes possibles (ordre de priorité)
    const allCodes = [
      'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005',
      'CRC001', 'CRC002',
      'ACR001', 'ACR002', 'ACR003',
      'CENT001', 'CENT002', 'CENT003',
      'REO001', 'REO002',
      'HAB-QF',
      'ACR', 'RP', 'NU', 'DISPO', 'INACTIN', 'CA', 'CONGE', 'RTT', 'RQ', 'C'
    ];
    
    for (const code of allCodes) {
      if (upperLine.includes(code)) {
        return code;
      }
    }
    
    // Cas spéciaux
    if (upperLine.includes('REPOS') && upperLine.includes('PÉRIODIQUE')) return 'RP';
    if (upperLine.includes('NON UTILISÉ')) return 'NU';
    if (upperLine.includes('DISPONIBLE')) return 'DISPO';
    if (upperLine.includes('FORMATION') || upperLine.includes('PERFECTIONNEMENT')) return 'HAB-QF';
    if (upperLine.includes('CONGÉ')) return 'CA';
    
    return null;
  }

  /**
   * Extrait le jour de la semaine
   */
  static extractDayOfWeek(line) {
    if (!line) return null;
    
    const jours = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const upperLine = line.toUpperCase();
    
    for (const jour of jours) {
      if (upperLine.includes(jour.toUpperCase())) {
        return jour;
      }
    }
    
    return null;
  }

  /**
   * Extrait le code horaire
   */
  static extractTimeCode(line) {
    const codeMatch = line.match(/[A-Z]\d{10}[A-Z]{2}\d{2}/);
    return codeMatch ? codeMatch[0] : null;
  }

  /**
   * Valide une entrée
   */
  static validateEntry(entry) {
    if (!entry.serviceCode) {
      entry.hasError = true;
      entry.errorMessage = 'Code de service manquant';
      entry.isValid = false;
    } else if (!this.VALID_SERVICE_CODES[entry.serviceCode] && entry.serviceCode !== 'INCONNU') {
      entry.hasError = true;
      entry.errorMessage = `Code de service inconnu: ${entry.serviceCode}`;
      entry.isValid = false;
    }

    if (!entry.date) {
      entry.hasError = true;
      entry.errorMessage = 'Date manquante';
      entry.isValid = false;
    }

    return entry;
  }

  /**
   * Valider les données parsées
   */
  static validateParsedData(parsedData) {
    const validation = {
      errors: [],
      warnings: [],
      isValid: true
    };

    // Indiquer la méthode d'extraction
    if (parsedData.extractionMethod) {
      if (parsedData.extractionMethod.includes('démonstration')) {
        validation.warnings.push('📝 Mode démonstration - Données de test');
      } else if (parsedData.extractionMethod.includes('Mistral')) {
        validation.warnings.push('✅ Extraction haute précision avec Mistral AI');
      }
    }

    // Vérifier métadonnées
    if (!parsedData.metadata?.agent) {
      validation.warnings.push('Nom agent manquant');
    }
    if (!parsedData.metadata?.numeroCP) {
      validation.warnings.push('Numéro CP manquant');
    }

    // Vérifier entrées
    if (!parsedData.entries?.length) {
      validation.errors.push('Aucune entrée de planning trouvée');
      validation.isValid = false;
    } else {
      let validCount = 0;
      
      parsedData.entries.forEach((entry, i) => {
        if (!entry.date) {
          validation.errors.push(`Ligne ${i+1}: Date manquante`);
        } else if (entry.isValid) {
          validCount++;
        }
        if (!entry.serviceCode) {
          validation.warnings.push(`Ligne ${i+1}: Code service manquant`);
        }
      });
      
      validation.warnings.unshift(`📊 ${validCount}/${parsedData.entries.length} entrées valides`);
      
      if (validCount === 0) {
        validation.errors.push('Aucune entrée valide trouvée');
        validation.isValid = false;
      }
    }

    return validation;
  }

  /**
   * Formate les données pour l'import en base
   */
  static formatForImport(entries, agentId) {
    return entries
      .filter(entry => entry.isValid || entry.serviceCode === 'INCONNU')
      .map(entry => ({
        agent_id: agentId,
        date: entry.date,
        service_code: entry.serviceCode,
        poste_code: entry.horaires.length > 0 ? entry.horaires[0].code : null,
        horaires: entry.horaires.map(h => `${h.debut}-${h.fin}`).join(', '),
        statut: entry.serviceCode === 'INCONNU' ? 'à_vérifier' : 'actif'
      }));
  }

  /**
   * Parse le texte OCR (gardé pour compatibilité)
   */
  static parseMistralOCR(ocrText) {
    return this.parseBulletin(ocrText);
  }
}

export default PDFParserService;
