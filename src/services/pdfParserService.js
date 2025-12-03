// Service de parsing des bulletins de commande SNCF - Version corrigée
class PDFParserService {
  // Codes de service valides SNCF (liste complète étendue)
  static VALID_SERVICE_CODES = {
    // Codes CCU (Centre de Commande Unique)
    CCU001: 'CRC/CCU DENFERT',
    CCU002: 'CRC/CCU DENFERT',
    CCU003: 'CRC/CCU DENFERT',
    CCU004: 'Régulateur Table PARC Denfert',
    CCU005: 'Régulateur Table PARC Denfert',
    CCU006: 'Régulateur Table PARC Denfert',
    
    // Codes CRC (Coordonnateur Régional Circulation)
    CRC001: 'Coordonnateur Régional Circulation',
    CRC002: 'Coordonnateur Régional Circulation',
    CRC003: 'Coordonnateur Régional Circulation',
    
    // Codes ACR (Aide Coordonnateur Régional)
    ACR001: 'Aide Coordonnateur Régional',
    ACR002: 'Aide Coordonnateur Régional',
    ACR003: 'Aide Coordonnateur Régional',
    ACR004: 'Aide Coordonnateur Régional',
    
    // Codes Centre Souffleur
    CENT001: 'Centre Souffleur',
    CENT002: 'Centre Souffleur',
    CENT003: 'Centre Souffleur',
    
    // Codes REO (Régulateur Est/Ouest) - ÉTENDU
    REO001: 'Régulateur OUEST',
    REO002: 'Régulateur OUEST',
    REO003: 'Régulateur OUEST',
    REO004: 'Régulateur OUEST',
    REO005: 'Régulateur OUEST',
    REO006: 'Régulateur OUEST',
    REO007: 'Régulateur OUEST',
    REO008: 'Régulateur OUEST',
    REO009: 'Régulateur OUEST',
    REO010: 'Régulateur OUEST',
    
    // Codes spéciaux
    RP: 'Repos Périodique',
    RPP: 'Repos Périodique',
    NU: 'Non Utilisé',
    DISPO: 'Disponible',
    D: 'Disponible',
    INACTIN: 'Inactif/Formation',
    'HAB-QF': 'Formation/Perfectionnement',
    HAB: 'Formation/Perfectionnement',
    CA: 'Congé Annuel',
    CONGE: 'Congé Annuel',
    C: 'Congé Annuel',
    RQ: 'Repos Compensateur',
    RTT: 'RTT',
    MA: 'Maladie',
    MAL: 'Maladie',
    
    // Codes médicaux/formation
    VISIMED: 'Visite Médicale',
    VMT: 'Visite Médicale',
    TRACTION: 'Formation Traction'
  };

  /**
   * Parse un PDF avec extraction locale optimisée
   */
  static async parsePDF(file, apiKey = null) {
    try {
      console.log('📄 Début extraction PDF...');
      console.log('📄 Fichier:', file.name, 'Taille:', file.size, 'bytes');
      
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      let extractedText = '';

      try {
        const pdfjsLib = window.pdfjsLib || await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = false;
        
        console.log('📑 Extraction avec PDF.js...');
        
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          disableWorker: true,
          verbosity: 0
        });
        
        const pdf = await loadingTask.promise;
        console.log(`📑 PDF chargé: ${pdf.numPages} pages`);

        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let pageText = '';
            let lastY = null;
            let lastX = null;
            
            textContent.items.forEach(item => {
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
                lastX = null;
              } 
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
        console.log('📝 Texte extrait (200 premiers caractères):', extractedText.substring(0, 200));
      } catch (pdfError) {
        console.log('⚠️ PDF.js non disponible, extraction binaire...');
        extractedText = this.extractTextFromBinary(arrayBuffer);
      }

      if (!extractedText || extractedText.trim().length < 50) {
        console.log('🔍 Extraction alternative...');
        extractedText = this.extractTextFromBinary(arrayBuffer);
      }

      console.log('🔄 Parsing du texte extrait...');
      const result = this.parseBulletinEnhanced(extractedText);
      
      result.extractionMethod = extractedText.includes('BULLETIN DE COMMANDE UOP') ? 
        'Extraction locale réussie' : 'Extraction partielle';
      
      console.log('📊 RÉSULTAT EXTRACTION COMPLÈTE:');
      console.log('   - Méthode:', result.extractionMethod);
      console.log('   - Métadonnées:', result.metadata);
      console.log('   - Nombre d\'entrées:', result.entries ? result.entries.length : 0);
      if (result.entries && result.entries.length > 0) {
        console.log('   - Première entrée:', result.entries[0]);
        console.log('   - Toutes les entrées:');
        result.entries.forEach((entry, i) => {
          console.log(`     ${i+1}. ${entry.dateDisplay} - ${entry.serviceCode} (${entry.serviceLabel})`);
        });
      }
      console.log('   - Erreurs:', result.errors);
      
      return result;
      
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error);
      return {
        metadata: { agent: null, numeroCP: null, periode: null, dateEdition: null },
        entries: [],
        errors: [`Erreur extraction: ${error.message}`],
        extractionMethod: 'Erreur'
      };
    }
  }

  /**
   * Parse le texte brut d'un bulletin SNCF - VERSION CORRIGÉE
   * Évite les doublons et améliore l'association horaires/entrées
   */
  static parseBulletinEnhanced(rawText) {
    console.log('🔍 Début parsing bulletin...');
    console.log('   Longueur texte:', rawText.length);
    
    const result = {
      metadata: this.extractMetadata(rawText),
      entries: [],
      errors: []
    };

    console.log('📝 Métadonnées extraites:', result.metadata);

    try {
      const normalizedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ');

      const lines = normalizedText.split('\n');
      console.log(`📄 Nombre de lignes à analyser: ${lines.length}`);
      
      // Map pour éviter les doublons : clé = "date|serviceCode"
      const entriesMap = new Map();
      let currentDate = null;
      let currentDateDisplay = null;
      let lastProcessedLineIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Détecter une date (formats: JJ/MM/AAAA)
        const dateMatch = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        
        if (dateMatch && !line.includes('Edition le') && !line.includes('Commande')) {
          const jour = dateMatch[1].padStart(2, '0');
          const mois = dateMatch[2].padStart(2, '0');
          const annee = dateMatch[3];
          
          currentDate = `${annee}-${mois}-${jour}`;
          currentDateDisplay = `${jour}/${mois}/${annee}`;
          
          console.log(`   📅 Date trouvée: ${currentDateDisplay}`);
          
          // Regarder les lignes suivantes pour trouver le code service
          // MAIS ne pas dépasser la prochaine date
          const contextLines = [];
          for (let k = 0; k <= 5 && i + k < lines.length; k++) {
            const nextLine = lines[i + k].trim();
            // Stop si on trouve une autre date (sauf la ligne courante)
            if (k > 0 && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(nextLine)) {
              break;
            }
            contextLines.push(nextLine);
          }
          
          const contextText = contextLines.join(' ');
          
          // Chercher le code de service UNIQUEMENT dans ce contexte limité
          const serviceCode = this.extractServiceCodeStrict(contextText, contextLines);
          
          if (serviceCode) {
            const entryKey = `${currentDate}|${serviceCode}`;
            
            // Vérifier si cette entrée existe déjà
            if (!entriesMap.has(entryKey)) {
              const entry = {
                date: currentDate,
                dateDisplay: currentDateDisplay,
                dayOfWeek: this.extractDayOfWeek(contextText),
                serviceCode: serviceCode,
                serviceLabel: this.VALID_SERVICE_CODES[serviceCode] || serviceCode,
                horaires: [],
                isValid: true,
                hasError: false,
                errorMessage: null
              };
              
              // Extraire les horaires du contexte
              entry.horaires = this.extractHorairesFromContext(contextLines);
              
              entriesMap.set(entryKey, entry);
              console.log(`      Code service trouvé: ${serviceCode}`);
              if (entry.horaires.length > 0) {
                entry.horaires.forEach(h => {
                  console.log(`      Horaire trouvé: ${h.debut} - ${h.fin}`);
                });
              }
            } else {
              // Entrée existe déjà, juste ajouter les horaires si nouveaux
              const existingEntry = entriesMap.get(entryKey);
              const newHoraires = this.extractHorairesFromContext(contextLines);
              newHoraires.forEach(h => {
                const exists = existingEntry.horaires.some(
                  eh => eh.debut === h.debut && eh.fin === h.fin
                );
                if (!exists) {
                  existingEntry.horaires.push(h);
                  console.log(`      Horaire ajouté à entrée existante: ${h.debut} - ${h.fin}`);
                }
              });
            }
          } else {
            console.log(`      ⚠️ Aucun code service trouvé dans le contexte`);
          }
          
          lastProcessedLineIndex = i;
        }
      }

      // Convertir la Map en tableau, trié par date
      result.entries = Array.from(entriesMap.values()).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        // Pour une même date, services de nuit en dernier
        const aIsNight = a.horaires.some(h => parseInt(h.debut.split(':')[0]) >= 20);
        const bIsNight = b.horaires.some(h => parseInt(h.debut.split(':')[0]) >= 20);
        return aIsNight - bIsNight;
      });

      console.log(`📊 Total entrées trouvées: ${result.entries.length}`);

      // Valider les entrées
      result.entries = result.entries.map(entry => this.validateEntry(entry));

      // Si aucune entrée, extraction permissive
      if (result.entries.length === 0) {
        console.log('🔄 Aucune entrée trouvée, tentative extraction permissive...');
        result.entries = this.extractPermissive(rawText);
        console.log(`   Extraction permissive: ${result.entries.length} entrées trouvées`);
      }

    } catch (error) {
      console.error('❌ Erreur parsing:', error);
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * Extraction STRICTE du code de service - évite la confusion entre dates
   */
  static extractServiceCodeStrict(contextText, contextLines) {
    if (!contextText) return null;
    
    const upperText = contextText.toUpperCase();
    
    // Liste complète des codes avec priorité (codes spécifiques d'abord)
    const priorityCodes = [
      // Codes avec numéros complets (priorité haute)
      'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005', 'CCU006',
      'CRC001', 'CRC002', 'CRC003',
      'ACR001', 'ACR002', 'ACR003', 'ACR004',
      'CENT001', 'CENT002', 'CENT003',
      'REO001', 'REO002', 'REO003', 'REO004', 'REO005', 
      'REO006', 'REO007', 'REO008', 'REO009', 'REO010',
      // Codes spéciaux avec tiret
      'HAB-QF',
    ];
    
    // Codes simples (priorité basse - recherchés seulement si pas de code numéroté)
    const simpleCodes = [
      'VISIMED', 'VMT', 'TRACTION',
      'INACTIN', 'DISPO', 'CONGE',
      'RPP', 'RP', 'NU', 'CA', 'RTT', 'RQ', 'MA', 'MAL', 'HAB'
    ];
    
    // D'abord chercher les codes prioritaires (avec numéros)
    for (const code of priorityCodes) {
      // Chercher le code en tant que mot complet ou suivi d'espace/fin de ligne
      const regex = new RegExp(`\\b${code}\\b`, 'i');
      if (regex.test(upperText)) {
        // Vérifier que ce n'est pas un code d'une ligne "du XXX" (référence)
        // Le code doit apparaître sur une ligne qui commence par la date OU qui contient le titre du service
        for (const line of contextLines) {
          const upperLine = line.toUpperCase();
          if (upperLine.includes(code)) {
            // Exclure les lignes qui sont juste des références "du ACR601"
            if (/^\s*DU\s+[A-Z]{2,4}\d{3}/i.test(line)) {
              continue;
            }
            return code;
          }
        }
      }
    }
    
    // Ensuite chercher les codes simples
    for (const code of simpleCodes) {
      const regex = new RegExp(`\\b${code}\\b`, 'i');
      if (regex.test(upperText)) {
        // Vérifier que c'est bien un code de service et pas juste du texte
        for (const line of contextLines) {
          const upperLine = line.toUpperCase();
          // Le code doit être sur la même ligne que la date OU sur une ligne de titre
          if (upperLine.includes(code)) {
            // Pour VISIMED, VMT : accepter sur n'importe quelle ligne
            if (['VISIMED', 'VMT', 'TRACTION'].includes(code)) {
              return code;
            }
            // Pour RP, NU, etc. : vérifier que c'est sur la ligne de date ou titre
            if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || 
                /REPOS|DISPONIBLE|CONG|UTILIS/i.test(line)) {
              return code;
            }
          }
        }
      }
    }
    
    // Recherche par patterns descriptifs
    const patterns = [
      { pattern: /REPOS\s+P[EÉ]RIODIQUE/i, code: 'RP' },
      { pattern: /\bRPP\b/i, code: 'RP' },
      { pattern: /NON\s+UTILIS[EÉ]/i, code: 'NU' },
      { pattern: /DISPONIBLE/i, code: 'DISPO' },
      { pattern: /VISITE\s+M[EÉ]DICALE/i, code: 'VISIMED' },
      { pattern: /INACTI[FV]/i, code: 'INACTIN' },
      { pattern: /FORMATION/i, code: 'HAB-QF' },
      { pattern: /PERFECTIONNEMENT/i, code: 'HAB-QF' },
      { pattern: /CONG[EÉ]\s+ANNUEL/i, code: 'CA' },
    ];
    
    for (const { pattern, code } of patterns) {
      if (pattern.test(upperText)) {
        return code;
      }
    }
    
    return null;
  }

  /**
   * Extrait les horaires d'un contexte de lignes
   */
  static extractHorairesFromContext(contextLines) {
    const horaires = [];
    const seenHoraires = new Set();
    
    for (const line of contextLines) {
      // Pattern pour horaires avec ou sans espaces
      const patterns = [
        /((\d{1,2}):(\d{2}))\s+((\d{1,2}):(\d{2}))/g,  // "HH:MM HH:MM"
        /((\d{1,2}):(\d{2}))\s*[-–]\s*((\d{1,2}):(\d{2}))/g,  // "HH:MM - HH:MM"
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const debut = match[1];
          const fin = match[4];
          const key = `${debut}-${fin}`;
          
          if (!seenHoraires.has(key)) {
            seenHoraires.add(key);
            horaires.push({
              debut: debut,
              fin: fin,
              code: this.extractTimeCode(line),
              type: this.extractHoraireType(line)
            });
          }
        }
      }
    }
    
    return horaires;
  }

  /**
   * Extraction permissive pour PDF mal formatés
   */
  static extractPermissive(rawText) {
    console.log('🔍 Extraction permissive...');
    const entries = [];
    const entriesMap = new Map();
    const text = rawText.replace(/\s+/g, ' ');
    
    const dateRegex = /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/g;
    let dateMatch;
    
    while ((dateMatch = dateRegex.exec(text)) !== null) {
      if (text.substring(dateMatch.index - 20, dateMatch.index).includes('Edition le')) {
        continue;
      }
      
      const date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      const dateDisplay = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
      
      const contextStart = Math.max(0, dateMatch.index - 50);
      const contextEnd = Math.min(text.length, dateMatch.index + 150);
      const context = text.substring(contextStart, contextEnd);
      
      const serviceCode = this.extractServiceCodeStrict(context, [context]) || 'INCONNU';
      const entryKey = `${date}|${serviceCode}`;
      
      if (!entriesMap.has(entryKey)) {
        const entry = {
          date: date,
          dateDisplay: dateDisplay,
          dayOfWeek: this.extractDayOfWeek(context),
          serviceCode: serviceCode,
          serviceLabel: this.VALID_SERVICE_CODES[serviceCode] || 'À vérifier',
          horaires: [],
          isValid: serviceCode !== 'INCONNU',
          hasError: serviceCode === 'INCONNU',
          errorMessage: serviceCode === 'INCONNU' ? 'Extraction automatique - À vérifier' : null
        };
        
        const horaireMatches = context.match(/(\d{1,2}:\d{2})/g);
        if (horaireMatches && horaireMatches.length >= 2) {
          entry.horaires.push({
            debut: horaireMatches[0],
            fin: horaireMatches[1],
            code: null,
            type: 'SERVICE'
          });
        }
        
        entriesMap.set(entryKey, entry);
        console.log(`   📅 Entrée permissive: ${dateDisplay} - ${serviceCode}`);
      }
    }
    
    return Array.from(entriesMap.values());
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

    const agentPatterns = [
      /Agent\s*:?\s*COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)/i,
      /Agent\s*:?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)\s+N[°o]?\s*CP/i,
      /COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)\s+N[°o]?\s*CP/i,
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

    const cpMatch = rawText.match(/N[°o]?\s*CP\s*:?\s*([A-Z0-9]+)/i);
    if (cpMatch) {
      metadata.numeroCP = cpMatch[1];
    }

    const periodeMatch = rawText.match(/Commande\s+allant?\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (periodeMatch) {
      metadata.periode = {
        debut: periodeMatch[1],
        fin: periodeMatch[2]
      };
    }

    const editionMatch = rawText.match(/Edition\s+le\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (editionMatch) {
      metadata.dateEdition = editionMatch[1];
    }

    return metadata;
  }

  /**
   * Extraction de texte depuis le binaire du PDF
   */
  static extractTextFromBinary(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let extractedText = '';
    
    console.log('🔧 Extraction binaire du PDF...');
    
    for (let i = 0; i < uint8Array.length - 1; i++) {
      if (uint8Array[i] === 0x28) {
        let j = i + 1;
        let textBytes = [];
        
        while (j < uint8Array.length && j - i < 1000) {
          if (uint8Array[j] === 0x29) {
            if (textBytes.length > 0) {
              try {
                let text = decoder.decode(new Uint8Array(textBytes));
                text = text
                  .replace(/\\(\d{3})/g, (match, oct) => String.fromCharCode(parseInt(oct, 8)))
                  .replace(/\\n/g, '\n')
                  .trim();
                
                if (text.length > 2 && text.length < 500) {
                  extractedText += text + ' ';
                }
              } catch (e) {
                // Ignorer
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
    console.log('🔍 Validation des données parsées...');
    
    const validation = {
      errors: [],
      warnings: [],
      isValid: true
    };

    if (parsedData.extractionMethod) {
      validation.warnings.push(`📋 Méthode: ${parsedData.extractionMethod}`);
    }

    if (!parsedData.metadata?.agent) {
      validation.warnings.push('Nom agent manquant');
    } else {
      validation.warnings.push(`✅ Agent: ${parsedData.metadata.agent}`);
    }
    
    if (!parsedData.metadata?.numeroCP) {
      validation.warnings.push('Numéro CP manquant');
    } else {
      validation.warnings.push(`✅ CP: ${parsedData.metadata.numeroCP}`);
    }

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

    console.log('📋 Résultat validation:', validation);
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
}

export default PDFParserService;
