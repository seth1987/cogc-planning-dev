// Service de parsing des bulletins de commande SNCF - Version optimisée extraction locale
class PDFParserService {
  // Codes de service valides SNCF (liste complète)
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
   * Parse un PDF avec extraction locale optimisée
   * @param {File} file - Fichier PDF à parser
   * @param {string} apiKey - Paramètre gardé pour compatibilité mais non utilisé
   * @returns {Object} Données parsées et structurées
   */
  static async parsePDF(file, apiKey = null) {
    try {
      console.log('📄 Début extraction PDF...');
      
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

        // Extraire le texte de toutes les pages avec amélioration de la reconstruction
        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Reconstruire le texte avec positionnement intelligent
            let pageText = '';
            let lastY = null;
            let lastX = null;
            
            textContent.items.forEach(item => {
              // Nouvelle ligne si changement significatif de Y
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
                lastX = null;
              } 
              // Espace si décalage horizontal significatif
              else if (lastX !== null && item.transform[4] - lastX > 10) {
                pageText += ' ';
              }
              
              pageText += item.str;
              lastY = item.transform[5];
              lastX = item.transform[4] + (item.width || 0);
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

      // 3. Si pas assez de texte extrait, utiliser l'extraction binaire
      if (!extractedText || extractedText.trim().length < 50) {
        console.log('🔍 Extraction alternative...');
        extractedText = this.extractTextFromBinary(arrayBuffer);
      }

      // 4. Si toujours pas de texte, utiliser le template de démonstration
      if (!extractedText || extractedText.trim().length < 50) {
        console.log('📝 Mode démonstration activé');
        extractedText = this.getDemoTemplate();
      }

      console.log('✅ Texte extrait:', extractedText.substring(0, 200) + '...');
      
      // 5. Parser le texte extrait avec méthode améliorée
      const result = this.parseBulletinEnhanced(extractedText);
      
      // Ajouter un flag pour indiquer la méthode utilisée
      result.extractionMethod = extractedText.includes('BULLETIN DE COMMANDE UOP') ? 
        'Extraction locale réussie' : 'Template démonstration';
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      // Retourner un template de démonstration en cas d'erreur
      const demoResult = this.parseBulletinEnhanced(this.getDemoTemplate());
      demoResult.extractionMethod = 'Template démonstration (erreur)';
      return demoResult;
    }
  }

  /**
   * Extraction de texte depuis le binaire du PDF (améliorée)
   */
  static extractTextFromBinary(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let extractedText = '';
    let foundData = false;
    
    console.log('🔧 Extraction binaire du PDF...');
    
    // Stratégie 1: Rechercher les patterns de texte entre parenthèses
    for (let i = 0; i < uint8Array.length - 1; i++) {
      // Rechercher les parenthèses ouvrantes
      if (uint8Array[i] === 0x28) { // '(' en ASCII
        let j = i + 1;
        let textBytes = [];
        
        // Lire jusqu'à la parenthèse fermante
        while (j < uint8Array.length && j - i < 1000) {
          if (uint8Array[j] === 0x29) { // ')' en ASCII
            // On a trouvé une chaîne complète
            if (textBytes.length > 0) {
              try {
                let text = decoder.decode(new Uint8Array(textBytes));
                // Nettoyer le texte
                text = text
                  .replace(/\\(\d{3})/g, (match, oct) => String.fromCharCode(parseInt(oct, 8)))
                  .replace(/\\n/g, '\n')
                  .replace(/\\r/g, '\r')
                  .replace(/\\t/g, '\t')
                  .replace(/\\/g, '')
                  .trim();
                
                // Garder seulement le texte pertinent
                if (text.length > 2 && text.length < 500) {
                  extractedText += text + ' ';
                  foundData = true;
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
    
    // Organiser le texte extrait
    if (foundData && extractedText.length > 0) {
      console.log('✅ Données extraites du PDF');
      return extractedText;
    }
    
    console.log('⚠️ Extraction limitée du PDF');
    return extractedText;
  }

  /**
   * Parse le texte brut d'un bulletin SNCF (méthode améliorée)
   */
  static parseBulletinEnhanced(rawText) {
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

      // Extraire les entrées jour par jour avec méthode améliorée
      const lines = normalizedText.split('\n');
      let currentDate = null;
      let currentEntry = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Détecter une date (formats: JJ/MM/AAAA)
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
            dayOfWeek: null,
            serviceCode: null,
            serviceLabel: null,
            horaires: [],
            isValid: false,
            hasError: false,
            errorMessage: null
          };
          
          // Extraction améliorée du jour de la semaine et du code service
          // Regarder sur la même ligne et les lignes suivantes
          const contextLines = [line];
          for (let k = 1; k <= 3 && i + k < lines.length; k++) {
            contextLines.push(lines[i + k]);
          }
          
          const contextText = contextLines.join(' ');
          
          // Chercher le jour de la semaine
          currentEntry.dayOfWeek = this.extractDayOfWeek(contextText);
          
          // Chercher le code de service avec priorité
          currentEntry.serviceCode = this.extractServiceCodeEnhanced(contextText);
          if (currentEntry.serviceCode) {
            currentEntry.serviceLabel = this.VALID_SERVICE_CODES[currentEntry.serviceCode] || currentEntry.serviceCode;
            currentEntry.isValid = true;
          }
        }

        // Extraire les horaires avec pattern amélioré
        if (currentEntry) {
          // Pattern pour horaires avec ou sans espaces
          const horairePatterns = [
            /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/,  // avec tiret
            /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/,          // avec espace
            /(\d{2}h\d{2})\s*[-–]\s*(\d{2}h\d{2})/        // format avec h
          ];
          
          for (const pattern of horairePatterns) {
            const horaireMatch = line.match(pattern);
            if (horaireMatch) {
              let debut = horaireMatch[1];
              let fin = horaireMatch[2];
              
              // Convertir format 00h00 en 00:00
              debut = debut.replace('h', ':');
              fin = fin.replace('h', ':');
              
              currentEntry.horaires.push({
                debut: debut,
                fin: fin,
                code: this.extractTimeCode(line),
                type: this.extractHoraireType(line)
              });
              break;
            }
          }
        }
      }

      // Ajouter la dernière entrée
      if (currentEntry && currentEntry.serviceCode) {
        result.entries.push(currentEntry);
      }

      // Valider les entrées
      result.entries = result.entries.map(entry => this.validateEntry(entry));

      // Si aucune entrée, extraction permissive
      if (result.entries.length === 0) {
        console.log('🔄 Extraction permissive...');
        result.entries = this.extractPermissive(rawText);
      }

    } catch (error) {
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * Extraction améliorée du code de service
   */
  static extractServiceCodeEnhanced(text) {
    if (!text) return null;
    
    const upperText = text.toUpperCase();
    
    // Liste complète des codes avec priorité
    const allCodes = [
      // Codes avec numéros (priorité haute)
      'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005',
      'CRC001', 'CRC002',
      'ACR001', 'ACR002', 'ACR003',
      'CENT001', 'CENT002', 'CENT003',
      'REO001', 'REO002',
      // Codes spéciaux
      'HAB-QF', 'HAB QF',
      // Codes simples
      'RP', 'NU', 'DISPO', 'INACTIN', 'CA', 'CONGE', 'RTT', 'RQ', 'C'
    ];
    
    // Recherche directe des codes
    for (const code of allCodes) {
      const normalizedCode = code.replace('-', ' ');
      if (upperText.includes(code) || upperText.includes(normalizedCode)) {
        return code.replace(' ', '-');  // Normaliser avec tiret
      }
    }
    
    // Recherche par patterns
    const patterns = [
      { pattern: /REPOS\s+P[EÉ]RIODIQUE/i, code: 'RP' },
      { pattern: /NON\s+UTILIS[EÉ]/i, code: 'NU' },
      { pattern: /DISPONIBLE/i, code: 'DISPO' },
      { pattern: /INACTI[FV]/i, code: 'INACTIN' },
      { pattern: /FORMATION/i, code: 'HAB-QF' },
      { pattern: /PERFECTIONNEMENT/i, code: 'HAB-QF' },
      { pattern: /CONG[EÉ]/i, code: 'CA' },
      { pattern: /\bC\b.*CONG[EÉ]/i, code: 'CA' },
      { pattern: /AIDE\s+COORDONNATEUR/i, code: 'ACR002' },
      { pattern: /CENTRE\s+SOUFFLEUR/i, code: 'CENT003' }
    ];
    
    for (const { pattern, code } of patterns) {
      if (pattern.test(upperText)) {
        return code;
      }
    }
    
    return null;
  }

  /**
   * Extraction permissive pour PDF mal formatés
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
      
      // Chercher un code de service proche
      const contextStart = Math.max(0, dateMatch.index - 50);
      const contextEnd = Math.min(text.length, dateMatch.index + 150);
      const context = text.substring(contextStart, contextEnd);
      
      const serviceCode = this.extractServiceCodeEnhanced(context);
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
          code: null,
          type: 'SERVICE'
        });
      }
      
      // Chercher le jour de la semaine
      entry.dayOfWeek = this.extractDayOfWeek(context);
      
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

    // Extraire nom agent (patterns améliorés)
    const agentPatterns = [
      /Agent\s*:?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)/i,
      /COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)/i,
      /^([A-ZÀÂÄÉÈÊËÏÔÙÛÜ]+\s+[A-ZÀÂÄÉÈÊËÏÔÙÛÜ]+)\s+N[°o]?\s*CP/im
    ];
    
    for (const pattern of agentPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        metadata.agent = match[1]
          .replace(/COGC\s+PN/gi, '')
          .replace(/Agent\s*:?/gi, '')
          .trim()
          .toUpperCase();
        break;
      }
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
   * Extrait le jour de la semaine
   */
  static extractDayOfWeek(text) {
    if (!text) return null;
    
    const jours = {
      'LUN': 'Lun', 'LUNDI': 'Lun',
      'MAR': 'Mar', 'MARDI': 'Mar',
      'MER': 'Mer', 'MERCREDI': 'Mer',
      'JEU': 'Jeu', 'JEUDI': 'Jeu',
      'VEN': 'Ven', 'VENDREDI': 'Ven',
      'SAM': 'Sam', 'SAMEDI': 'Sam',
      'DIM': 'Dim', 'DIMANCHE': 'Dim'
    };
    
    const upperText = text.toUpperCase();
    
    for (const [key, value] of Object.entries(jours)) {
      if (upperText.includes(key)) {
        return value;
      }
    }
    
    return null;
  }

  /**
   * Extrait le type d'horaire
   */
  static extractHoraireType(line) {
    const upperLine = line.toUpperCase();
    if (upperLine.includes('METRO')) return 'METRO';
    if (upperLine.includes('RS')) return 'RS';
    if (/N\d{10}[A-Z]{2}\d{2}/.test(upperLine)) return 'SERVICE';
    return 'SERVICE';
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
   * Template de démonstration
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
      } else {
        validation.warnings.push('✅ Extraction locale réussie');
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
    return this.parseBulletinEnhanced(ocrText);
  }
}

export default PDFParserService;
