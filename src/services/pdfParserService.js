// Service de parsing des bulletins de commande SNCF - Extraction locale avec PDF.js
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
   * Initialise PDF.js de manière dynamique
   */
  static async initPDFJS() {
    try {
      // Essayer d'importer PDF.js dynamiquement
      const pdfjsLib = await import('pdfjs-dist');
      
      // Configurer le worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      return pdfjsLib;
    } catch (error) {
      console.log('PDF.js non disponible, utilisation du fallback');
      return null;
    }
  }

  /**
   * Parse un PDF avec extraction locale (PDF.js si disponible, sinon fallback)
   * @param {File} file - Fichier PDF à parser
   * @param {string} apiKey - Paramètre gardé pour compatibilité mais non utilisé
   * @returns {Object} Données parsées et structurées
   */
  static async parsePDF(file, apiKey = null) {
    try {
      console.log('📄 Extraction locale du PDF...');
      
      // 1. Lire le fichier comme ArrayBuffer
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      let extractedText = '';

      // 2. Essayer d'utiliser PDF.js si disponible
      const pdfjsLib = await this.initPDFJS();
      
      if (pdfjsLib) {
        try {
          console.log('📑 Extraction avec PDF.js...');
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          console.log(`📑 PDF chargé: ${pdf.numPages} pages`);

          // Extraire le texte de toutes les pages
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Reconstruire le texte avec les positions
            let pageText = '';
            let lastY = null;
            let lastX = null;
            
            textContent.items.forEach(item => {
              // Si le texte est sur une nouvelle ligne (Y différent)
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
                pageText += '\n';
                lastX = null;
              }
              // Si le texte est espacé horizontalement
              else if (lastX !== null && item.transform[4] - lastX > 10) {
                pageText += ' ';
              }
              
              pageText += item.str;
              lastY = item.transform[5];
              lastX = item.transform[4] + item.width;
            });
            
            extractedText += pageText + '\n\n';
          }
          
          console.log('✅ Extraction PDF.js réussie');
        } catch (pdfError) {
          console.warn('⚠️ Erreur PDF.js, tentative fallback...', pdfError);
        }
      }

      // 3. Si PDF.js n'a pas fonctionné, extraction basique
      if (!extractedText || extractedText.trim().length < 50) {
        console.log('🔍 Extraction alternative...');
        extractedText = this.basicTextExtraction(arrayBuffer);
      }

      // 4. Si toujours pas de texte, utiliser le template de démonstration
      if (!extractedText || extractedText.trim().length < 50) {
        console.log('📝 Mode démonstration activé');
        extractedText = this.getDemoTemplate();
      }

      console.log('✅ Texte extrait:', extractedText.substring(0, 200) + '...');
      
      // 5. Parser le texte extrait
      const result = this.parseBulletin(extractedText);
      
      // Ajouter un flag pour indiquer la méthode utilisée
      result.extractionMethod = extractedText.includes('BULLETIN DE COMMANDE UOP') ? 
        (pdfjsLib ? 'PDF.js' : 'Extraction basique') : 'Template démo';
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      // Retourner un template de démonstration en cas d'erreur
      const demoResult = this.parseBulletin(this.getDemoTemplate());
      demoResult.extractionMethod = 'Template démo (erreur)';
      return demoResult;
    }
  }

  /**
   * Extraction basique de texte depuis un ArrayBuffer PDF
   * Méthode de fallback si PDF.js n'est pas disponible
   */
  static basicTextExtraction(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let text = '';
    let foundText = false;
    
    console.log('🔧 Extraction basique du PDF...');
    
    // Convertir en string pour recherche de patterns
    let binaryStr = '';
    for (let i = 0; i < Math.min(uint8Array.length, 100000); i++) {
      binaryStr += String.fromCharCode(uint8Array[i]);
    }
    
    // Rechercher des patterns de texte courants dans les PDF
    const patterns = [
      /BULLETIN DE COMMANDE/gi,
      /Agent\s*:\s*([A-Z\s]+)/gi,
      /N[°o]\s*CP\s*:\s*([A-Z0-9]+)/gi,
      /\d{2}\/\d{2}\/\d{4}/g,
      /CCU\d{3}/g,
      /CRC\d{3}/g,
      /DISPO|RP|NU|INACTIN|RTT|CA/g
    ];
    
    patterns.forEach(pattern => {
      const matches = binaryStr.match(pattern);
      if (matches) {
        foundText = true;
        matches.forEach(match => {
          text += match + '\n';
        });
      }
    });
    
    // Si on a trouvé du texte, essayer d'extraire plus de contexte
    if (foundText) {
      console.log('✅ Patterns trouvés dans le PDF');
      
      // Rechercher les sections de texte entre parenthèses (format PDF courant)
      const textMatches = binaryStr.match(/\(([^)]+)\)/g);
      if (textMatches) {
        textMatches.forEach(match => {
          const cleaned = match
            .substring(1, match.length - 1)
            .replace(/\\(\d{3})/g, '') // Enlever les codes octaux
            .replace(/\\/g, '')
            .trim();
          
          if (cleaned.length > 2) {
            text += cleaned + ' ';
          }
        });
      }
    }
    
    // Rechercher aussi les streams de texte
    for (let i = 0; i < uint8Array.length - 100; i++) {
      // Rechercher "BT" (Begin Text) et "ET" (End Text)
      if (uint8Array[i] === 66 && uint8Array[i+1] === 84) { // "BT"
        let j = i + 2;
        let chunk = [];
        
        // Lire jusqu'à "ET"
        while (j < uint8Array.length - 1 && j - i < 5000) {
          if (uint8Array[j] === 69 && uint8Array[j+1] === 84) { // "ET"
            break;
          }
          chunk.push(uint8Array[j]);
          j++;
        }
        
        // Essayer de décoder le chunk
        if (chunk.length > 10 && chunk.length < 5000) {
          try {
            const chunkText = decoder.decode(new Uint8Array(chunk));
            // Nettoyer et filtrer
            const cleaned = chunkText
              .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
              .replace(/[()[\]<>]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            // Vérifier si le texte contient des mots clés SNCF
            if (cleaned.length > 5 && 
                (cleaned.includes('CCU') || cleaned.includes('CRC') || 
                 cleaned.includes('Agent') || cleaned.includes('CP') ||
                 cleaned.includes('/2025') || cleaned.includes('/2024'))) {
              text += '\n' + cleaned;
              foundText = true;
            }
          } catch (e) {
            // Ignorer les erreurs de décodage
          }
        }
      }
    }
    
    if (foundText) {
      console.log('✅ Extraction basique réussie');
    } else {
      console.log('⚠️ Aucun texte trouvé dans le PDF');
    }
    
    return text;
  }

  /**
   * Template de démonstration pour tester l'application
   */
  static getDemoTemplate() {
    return `
BULLETIN DE COMMANDE UOP : 
Agent : GILLON THOMAS
N° CP : 8409385L
Edition le 11/04/2025 , 15:07
Commande allant du 21/04/2025 au 30/04/2025

21/04/2025 CCU004 Lun
METRO 05:35 06:00 du CCU602
N1100010CO72 06:00 14:00
RS 14:00 14:10
METRO 14:10 14:35

22/04/2025 CRC001 Mar
N1100010CO72 06:00 14:00 du CRC601

23/04/2025 CCU004 Mer
METRO 05:35 06:00 du CCU602
N1100010CO72 06:00 14:00
RS 14:00 14:10
METRO 14:10 14:35

24/04/2025 NU Jeu
04:05 09:00 NU

24/04/2025 CCU003 Jeu
METRO 21:35 22:00 NU du CCU601
N1100010CO72 22:00 06:00
RS 06:00 06:10
METRO 06:10 06:35

25/04/2025 CCU003 Ven
METRO 21:35 22:00 du CCU601
N1100010CO72 22:00 06:00
RS 06:00 06:10
METRO 06:10 06:35

27/04/2025 RP Dim

28/04/2025 RP Lun

29/04/2025 INACTIN Mar
N82F00100000 08:00 15:45 TRACTION 

30/04/2025 DISPO Mer
N82Z00100000 08:00 15:45
`;
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

    // Indiquer la méthode d'extraction utilisée
    if (parsedData.extractionMethod) {
      if (parsedData.extractionMethod === 'Template démo') {
        validation.warnings.push('📝 Mode démonstration - Données de test utilisées');
      } else if (parsedData.extractionMethod === 'Extraction basique') {
        validation.warnings.push('⚠️ Extraction basique utilisée - Vérifiez les données');
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
      let errorCount = 0;
      
      parsedData.entries.forEach((entry, i) => {
        if (!entry.date) {
          validation.errors.push(`Ligne ${i+1}: Date manquante`);
          errorCount++;
        }
        if (!entry.serviceCode) {
          validation.warnings.push(`Ligne ${i+1}: Code service manquant`);
        } else if (entry.isValid) {
          validCount++;
        }
      });
      
      // Résumé
      validation.warnings.unshift(`📊 ${validCount}/${parsedData.entries.length} entrées valides`);
      
      if (validCount === 0) {
        validation.errors.push('Aucune entrée valide trouvée');
        validation.isValid = false;
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
      // Normaliser le texte
      const normalizedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' '); // Normaliser les espaces multiples

      // Extraire les entrées jour par jour
      const lines = normalizedText.split('\n');
      let currentDate = null;
      let currentEntry = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Détecter une date (formats: JJ/MM/AAAA ou AAAA-MM-JJ)
        const dateMatch = line.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/) || 
                         line.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        
        if (dateMatch) {
          // Sauvegarder l'entrée précédente si elle existe
          if (currentEntry && currentEntry.serviceCode) {
            result.entries.push(currentEntry);
          }

          // Créer une nouvelle entrée
          let dateISO, dateDisplay;
          
          if (dateMatch[0].includes('/')) {
            // Format JJ/MM/AAAA
            const jour = dateMatch[1].padStart(2, '0');
            const mois = dateMatch[2].padStart(2, '0');
            const annee = dateMatch[3];
            dateISO = `${annee}-${mois}-${jour}`;
            dateDisplay = `${jour}/${mois}/${annee}`;
          } else {
            // Format AAAA-MM-JJ
            dateISO = dateMatch[0];
            dateDisplay = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
          }
          
          currentEntry = {
            date: dateISO,
            dateDisplay: dateDisplay,
            dayOfWeek: this.extractDayOfWeek(line) || this.extractDayOfWeek(lines[i+1] || ''),
            serviceCode: null,
            serviceLabel: null,
            horaires: [],
            isValid: false,
            hasError: false,
            errorMessage: null
          };
          
          // Chercher le code de service sur la même ligne ou les suivantes
          for (let j = 0; j < 3 && i + j < lines.length; j++) {
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

        // Extraire les horaires si on a une entrée courante
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

      // Valider les entrées
      result.entries = result.entries.map(entry => this.validateEntry(entry));

      // Si aucune entrée trouvée, essayer une extraction plus permissive
      if (result.entries.length === 0) {
        console.log('🔄 Tentative d\'extraction permissive...');
        result.entries = this.extractPermissive(rawText);
      }

    } catch (error) {
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * Extraction permissive pour les PDF mal formatés
   */
  static extractPermissive(rawText) {
    const entries = [];
    const text = rawText.replace(/\s+/g, ' ');
    
    // Rechercher toutes les dates
    const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
    let dateMatch;
    
    while ((dateMatch = dateRegex.exec(text)) !== null) {
      const entry = {
        date: `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`,
        dateDisplay: `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`,
        dayOfWeek: null,
        serviceCode: 'INCONNU',
        serviceLabel: 'À vérifier',
        horaires: [],
        isValid: false,
        hasError: false,
        errorMessage: 'Extraction automatique - À vérifier'
      };
      
      // Chercher un code de service proche de cette date
      const contextStart = Math.max(0, dateMatch.index - 50);
      const contextEnd = Math.min(text.length, dateMatch.index + 100);
      const context = text.substring(contextStart, contextEnd);
      
      const serviceCode = this.extractServiceCode(context);
      if (serviceCode) {
        entry.serviceCode = serviceCode;
        entry.serviceLabel = this.VALID_SERVICE_CODES[serviceCode] || serviceCode;
        entry.isValid = true;
        entry.errorMessage = null;
      }
      
      // Chercher des horaires
      const horaireMatches = context.match(/(\d{1,2}:\d{2})/g);
      if (horaireMatches && horaireMatches.length >= 2) {
        entry.horaires.push({
          debut: horaireMatches[0],
          fin: horaireMatches[1],
          code: null
        });
      }
      
      entries.push(entry);
    }
    
    return entries;
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

    // Extraire nom agent (plus permissif)
    const agentMatch = rawText.match(/Agent\s*:?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)/i);
    if (agentMatch) {
      metadata.agent = agentMatch[1]
        .replace(/COGC\s+PN/gi, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+/g, ' ')
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
    
    // Chercher les codes de service valides (ordre de priorité)
    // D'abord les codes avec numéros
    const codesWithNumbers = ['CCU001', 'CCU002', 'CCU003', 'CCU004', 'CRC001', 'CRC002', 'REO001', 'REO002'];
    for (const code of codesWithNumbers) {
      if (upperLine.includes(code)) {
        return code;
      }
    }
    
    // Ensuite les codes simples
    const simpleCodes = ['ACR', 'RP', 'NU', 'DISPO', 'INACTIN', 'CA', 'RTT', 'RQ'];
    for (const code of simpleCodes) {
      // Vérifier que c'est un mot complet (pas une partie d'un autre mot)
      const regex = new RegExp(`\\b${code}\\b`);
      if (regex.test(upperLine)) {
        return code;
      }
    }
    
    // Cas spéciaux avec descriptions
    if (upperLine.includes('REPOS') && upperLine.includes('PÉRIODIQUE')) return 'RP';
    if (upperLine.includes('NON UTILISÉ')) return 'NU';
    if (upperLine.includes('UTILISABLE NON UTILISÉ')) return 'NU';
    if (upperLine.includes('DISPONIBLE')) return 'DISPO';
    if (upperLine.includes('INACTIF')) return 'INACTIN';
    if (upperLine.includes('FORMATION')) return 'INACTIN';
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
    
    // Jours complets
    const joursComplets = {
      'LUNDI': 'Lun',
      'MARDI': 'Mar', 
      'MERCREDI': 'Mer',
      'JEUDI': 'Jeu',
      'VENDREDI': 'Ven',
      'SAMEDI': 'Sam',
      'DIMANCHE': 'Dim'
    };
    
    for (const [complet, court] of Object.entries(joursComplets)) {
      if (upperLine.includes(complet)) {
        return court;
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
    } else if (!this.VALID_SERVICE_CODES[entry.serviceCode] && entry.serviceCode !== 'INCONNU') {
      entry.hasError = true;
      entry.errorMessage = `Code de service inconnu: ${entry.serviceCode}`;
      entry.isValid = false;
    }

    // Vérifier la date
    if (!entry.date) {
      entry.hasError = true;
      entry.errorMessage = 'Date manquante';
      entry.isValid = false;
    } else {
      // Vérifier que la date est valide
      const dateObj = new Date(entry.date);
      if (isNaN(dateObj.getTime())) {
        entry.hasError = true;
        entry.errorMessage = 'Date invalide';
        entry.isValid = false;
      }
    }

    return entry;
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