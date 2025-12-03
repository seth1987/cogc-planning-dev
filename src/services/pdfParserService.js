// Service de parsing des bulletins de commande SNCF - Version ligne par ligne robuste
// Refactorisé pour gérer correctement la structure réelle des PDF SNCF

class PDFParserService {
  // Codes de service valides SNCF (liste complète)
  static VALID_SERVICE_CODES = {
    // Codes CCU (Régulateur)
    CCU001: 'CRC/CCU DENFERT', CCU002: 'CRC/CCU DENFERT', CCU003: 'CRC/CCU DENFERT',
    CCU004: 'Régulateur Table PARC Denfert', CCU005: 'Régulateur Table PARC Denfert',
    CCU006: 'Régulateur Table PARC Denfert',
    // Codes CRC (Coordonnateur)
    CRC001: 'Coordonnateur Régional Circulation', CRC002: 'Coordonnateur Régional Circulation',
    CRC003: 'Coordonnateur Régional Circulation',
    // Codes ACR (Aide Coordonnateur)
    ACR001: 'Aide Coordonnateur Régional', ACR002: 'Aide Coordonnateur Régional',
    ACR003: 'Aide Coordonnateur Régional', ACR004: 'Aide Coordonnateur Régional',
    // Codes Centre Souffleur
    CENT001: 'Centre Souffleur', CENT002: 'Centre Souffleur', CENT003: 'Centre Souffleur',
    // Codes REO (Régulateur OUEST)
    REO001: 'Régulateur OUEST', REO002: 'Régulateur OUEST', REO003: 'Régulateur OUEST',
    REO004: 'Régulateur OUEST', REO005: 'Régulateur OUEST', REO006: 'Régulateur OUEST',
    REO007: 'Régulateur OUEST', REO008: 'Régulateur OUEST', REO009: 'Régulateur OUEST',
    REO010: 'Régulateur OUEST',
    // Codes spéciaux
    RP: 'Repos Périodique', RPP: 'Repos Périodique',
    NU: 'Non Utilisé',
    DISPO: 'Disponible', D: 'Disponible',
    INACTIN: 'Inactif/Formation',
    'HAB-QF': 'Formation/Perfectionnement', HAB: 'Formation/Perfectionnement',
    CA: 'Congé Annuel', CONGE: 'Congé Annuel', C: 'Congé',
    RQ: 'Repos Compensateur', RTT: 'RTT',
    MA: 'Maladie', MAL: 'Maladie',
    VISIMED: 'Visite Médicale', VMT: 'Visite Médicale',
    TRACTION: 'Formation Traction'
  };

  // Jours de la semaine (pour détecter les lignes avec code service)
  static JOURS_SEMAINE = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

  // Regex pour détecter une date au format JJ/MM/AAAA
  static DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

  // Regex pour les codes de service (ordonnés par longueur décroissante pour priorité)
  static CODE_PATTERNS = [
    /\b(CCU00[1-6])\b/i,
    /\b(CRC00[1-3])\b/i,
    /\b(ACR00[1-4])\b/i,
    /\b(CENT00[1-3])\b/i,
    /\b(REO0(?:0[1-9]|10))\b/i,
    /\b(HAB-QF)\b/i,
    /\b(VISIMED)\b/i,
    /\b(VMT)\b/i,
    /\b(INACTIN)\b/i,
    /\b(TRACTION)\b/i,
    /\b(DISPO)\b/i,
    /\b(CONGE)\b/i,
    /\b(RPP)\b/i,
    /\b(RTT)\b/i,
    /\b(MAL)\b/i,
    /\b(HAB)\b/i,
    /\b(RQ)\b/i,
    /\b(NU)\b/i,
    /\b(RP)\b/i,
    /\b(CA)\b/i,
    /\b(MA)\b/i,
    /\b(C)\b/i,
    /\b(D)\b/i
  ];

  static async parsePDF(file, apiKey = null) {
    try {
      console.log('📄 === DÉBUT PARSING PDF ===');
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
            
            // Reconstruction intelligente du texte avec gestion des lignes
            let pageText = '';
            let lastY = null;
            let lastX = null;
            
            textContent.items.forEach(item => {
              // Nouvelle ligne si Y change significativement
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
                lastX = null;
              } else if (lastX !== null && item.transform[4] - lastX > 10) {
                // Espace si X avance significativement
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

      if (!extractedText || extractedText.trim().length < 50) {
        extractedText = this.extractTextFromBinary(arrayBuffer);
      }

      // Afficher le texte brut pour debug
      console.log('📝 ===== TEXTE BRUT EXTRAIT =====');
      console.log(extractedText);
      console.log('📝 ===== FIN TEXTE BRUT =====');

      console.log('🔄 Parsing du texte extrait...');
      const result = this.parseTextLineByLine(extractedText);
      
      result.extractionMethod = extractedText.includes('BULLETIN DE COMMANDE UOP') ? 
        'Extraction locale réussie' : 'Extraction partielle';
      
      console.log('📊 === RÉSULTAT FINAL ===');
      console.log('   - Méthode:', result.extractionMethod);
      console.log('   - Agent:', result.metadata?.agent);
      console.log('   - Nombre d\'entrées:', result.entries?.length || 0);
      if (result.entries && result.entries.length > 0) {
        console.log('   - Entrées extraites:');
        result.entries.forEach((entry, i) => {
          console.log(`     ${i+1}. ${entry.dateDisplay} - ${entry.serviceCode} (${entry.dayOfWeek || '?'}) - ${entry.horaires?.length || 0} horaires`);
        });
      }
      
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
   * NOUVEAU PARSER LIGNE PAR LIGNE
   * Stratégie :
   * 1. Découper en lignes
   * 2. Identifier les lignes de date (JJ/MM/AAAA en début)
   * 3. Pour chaque date, chercher le code service dans les lignes suivantes
   * 4. Le code service est souvent sur une ligne avec un jour (LUN, MAR, etc.)
   */
  static parseTextLineByLine(rawText) {
    console.log('🔍 === PARSING LIGNE PAR LIGNE ===');
    
    const result = {
      metadata: this.extractMetadata(rawText),
      entries: [],
      errors: []
    };

    console.log('📝 Métadonnées:', result.metadata);

    try {
      // Normaliser et découper en lignes
      const lines = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      console.log(`📋 ${lines.length} lignes à analyser`);

      // Identifier les index des lignes de date
      const dateLineIndexes = [];
      const dateLineData = [];
      
      for (let i = 0; i < lines.length; i++) {
        const dateMatch = this.extractDateFromLine(lines[i]);
        if (dateMatch) {
          // Vérifier que ce n'est pas une date d'édition ou de période
          const prevContext = lines.slice(Math.max(0, i-2), i).join(' ').toLowerCase();
          if (!prevContext.includes('edition') && !prevContext.includes('commande') && !prevContext.includes('allant')) {
            dateLineIndexes.push(i);
            dateLineData.push(dateMatch);
            console.log(`   📅 Ligne ${i}: DATE ${dateMatch.display}`);
          }
        }
      }

      console.log(`📅 ${dateLineIndexes.length} dates de service identifiées`);

      // Pour chaque date, extraire le bloc jusqu'à la prochaine date
      const entriesMap = new Map(); // Éviter doublons

      for (let d = 0; d < dateLineIndexes.length; d++) {
        const startIndex = dateLineIndexes[d];
        const endIndex = d + 1 < dateLineIndexes.length ? dateLineIndexes[d + 1] : lines.length;
        const dateInfo = dateLineData[d];

        // Extraire les lignes du bloc
        const blockLines = lines.slice(startIndex, endIndex);
        console.log(`\n   🔲 Bloc ${dateInfo.display} (lignes ${startIndex}-${endIndex-1}):`);
        blockLines.forEach((l, i) => console.log(`      ${i}: "${l}"`));

        // Chercher le code service dans ce bloc
        const serviceInfo = this.findServiceCodeInBlock(blockLines);
        
        if (serviceInfo.code) {
          const entryKey = `${dateInfo.iso}|${serviceInfo.code}`;
          
          if (!entriesMap.has(entryKey)) {
            // Extraire les horaires
            const horaires = this.extractHorairesFromLines(blockLines);
            
            const entry = {
              date: dateInfo.iso,
              dateDisplay: dateInfo.display,
              dayOfWeek: serviceInfo.dayOfWeek || this.getDayOfWeekFromLines(blockLines),
              serviceCode: serviceInfo.code,
              serviceLabel: this.VALID_SERVICE_CODES[serviceInfo.code] || serviceInfo.code,
              horaires: horaires,
              isValid: true,
              hasError: false,
              errorMessage: null
            };
            
            entriesMap.set(entryKey, entry);
            console.log(`      ✅ ENTRÉE: ${serviceInfo.code} (${entry.dayOfWeek}) - ${horaires.length} horaires`);
          } else {
            // Même date + même code = ajouter horaires si nouveaux
            const existing = entriesMap.get(entryKey);
            const newHoraires = this.extractHorairesFromLines(blockLines);
            newHoraires.forEach(h => {
              const exists = existing.horaires.some(eh => eh.debut === h.debut && eh.fin === h.fin);
              if (!exists) existing.horaires.push(h);
            });
            console.log(`      ➕ Horaires ajoutés à entrée existante`);
          }
        } else {
          console.log(`      ⚠️ Aucun code service trouvé dans ce bloc`);
        }
      }

      // Convertir en tableau trié
      result.entries = Array.from(entriesMap.values()).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aHour = a.horaires.length > 0 ? parseInt(a.horaires[0].debut.split(':')[0]) : 0;
        const bHour = b.horaires.length > 0 ? parseInt(b.horaires[0].debut.split(':')[0]) : 0;
        return aHour - bHour;
      });

      console.log(`\n📊 Total: ${result.entries.length} entrées uniques`);

      // Valider
      result.entries = result.entries.map(e => this.validateEntry(e));

    } catch (error) {
      console.error('❌ Erreur parsing:', error);
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * Extrait la date d'une ligne si elle commence par JJ/MM/AAAA
   */
  static extractDateFromLine(line) {
    if (!line) return null;
    
    // Chercher une date au début de la ligne ou seule sur la ligne
    const match = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return {
        iso: `${year}-${month}-${day}`,
        display: `${day}/${month}/${year}`,
        day: parseInt(match[1]),
        month: parseInt(match[2]),
        year: parseInt(match[3])
      };
    }
    return null;
  }

  /**
   * Trouve le code service dans un bloc de lignes
   * Stratégie : chercher une ligne avec CODE + JOUR (ex: "CCU004 Lun")
   * ou une ligne contenant un code connu
   */
  static findServiceCodeInBlock(lines) {
    // D'abord, chercher une ligne avec CODE + JOUR DE SEMAINE
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      // Pattern: CODE JOUR (ex: "CCU004 Lun", "RP Mar", "ACR002 Ven")
      for (const jour of this.JOURS_SEMAINE) {
        if (upperLine.includes(jour)) {
          // Il y a un jour sur cette ligne, chercher le code
          for (const pattern of this.CODE_PATTERNS) {
            const match = line.match(pattern);
            if (match) {
              const code = match[1].toUpperCase();
              // Vérifier que ce n'est pas une référence "du CCU601"
              if (!new RegExp(`DU\\s+${code}`, 'i').test(line)) {
                return { code, dayOfWeek: this.normalizeDayOfWeek(jour) };
              }
            }
          }
        }
      }
    }

    // Sinon, chercher n'importe quel code valide (pas dans une référence)
    for (const line of lines) {
      // Ignorer les lignes de métro/RS qui contiennent des références
      if (/^(METRO|RS)\s/i.test(line)) continue;
      // Ignorer les lignes avec "du CCU" etc.
      if (/\bdu\s+(CCU|CRC|ACR)/i.test(line)) continue;
      
      for (const pattern of this.CODE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const code = match[1].toUpperCase();
          // Double vérification : pas une référence
          if (!new RegExp(`DU\\s+${code}`, 'i').test(line)) {
            return { code, dayOfWeek: null };
          }
        }
      }
    }

    // Cas spéciaux pour codes courts (RP, NU, C) qui nécessitent plus de contexte
    const blockText = lines.join(' ').toUpperCase();
    
    // RP : Repos périodique
    if (/\bRP\b/.test(blockText) && /REPOS|PÉRIODIQUE|RP\s+(LUN|MAR|MER|JEU|VEN|SAM|DIM)/.test(blockText)) {
      return { code: 'RP', dayOfWeek: this.getDayOfWeekFromLines(lines) };
    }
    
    // NU : Non utilisé
    if (/\bNU\b/.test(blockText) && /UTILIS|NON\s+UTILIS|NU\s+(LUN|MAR|MER|JEU|VEN|SAM|DIM)/.test(blockText)) {
      return { code: 'NU', dayOfWeek: this.getDayOfWeekFromLines(lines) };
    }
    
    // C/CA : Congé
    if ((/\bCA\b/.test(blockText) || /\bC\b/.test(blockText)) && /CONG/.test(blockText)) {
      return { code: 'CA', dayOfWeek: this.getDayOfWeekFromLines(lines) };
    }

    return { code: null, dayOfWeek: null };
  }

  /**
   * Extrait les horaires des lignes d'un bloc
   */
  static extractHorairesFromLines(lines) {
    const horaires = [];
    const seen = new Set();

    for (const line of lines) {
      // Pattern HH:MM HH:MM ou HH:MM-HH:MM
      const patterns = [
        /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/g,
        /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/g
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const debut = this.normalizeTime(match[1]);
          const fin = this.normalizeTime(match[2]);
          const key = `${debut}-${fin}`;

          if (!seen.has(key)) {
            seen.add(key);
            
            // Déterminer le type
            let type = 'SERVICE';
            const lineUpper = line.toUpperCase();
            if (lineUpper.includes('METRO')) type = 'METRO';
            else if (lineUpper.includes('RS')) type = 'RS';

            horaires.push({ debut, fin, type });
          }
        }
      }
    }

    return horaires;
  }

  /**
   * Normalise une heure au format HH:MM
   */
  static normalizeTime(time) {
    const [h, m] = time.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  /**
   * Trouve le jour de la semaine dans les lignes
   */
  static getDayOfWeekFromLines(lines) {
    for (const line of lines) {
      for (const jour of this.JOURS_SEMAINE) {
        if (line.toUpperCase().includes(jour)) {
          return this.normalizeDayOfWeek(jour);
        }
      }
    }
    return null;
  }

  /**
   * Normalise le jour de la semaine
   */
  static normalizeDayOfWeek(jour) {
    const map = {
      'LUN': 'Lun', 'MAR': 'Mar', 'MER': 'Mer', 
      'JEU': 'Jeu', 'VEN': 'Ven', 'SAM': 'Sam', 'DIM': 'Dim'
    };
    return map[jour.toUpperCase()] || jour;
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

    // Agent : plusieurs patterns possibles
    const agentPatterns = [
      /Agent\s*:?\s*COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÔÙÛÜ\s]+)/i,
      /COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÔÙÛÜ]+\s+[A-ZÀÂÄÉÈÊËÏÔÙÛÜ]+)/i,
    ];
    
    for (const pattern of agentPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        metadata.agent = match[1].trim().split('\n')[0].toUpperCase();
        break;
      }
    }

    // Numéro CP
    const cpMatch = rawText.match(/N[°o]?\s*CP\s*:?\s*([A-Z0-9]+)/i);
    if (cpMatch) metadata.numeroCP = cpMatch[1];

    // Période
    const periodeMatch = rawText.match(/Commande\s+allant?\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (periodeMatch) {
      metadata.periode = { debut: periodeMatch[1], fin: periodeMatch[2] };
    }

    // Date d'édition
    const editionMatch = rawText.match(/Edition\s+le\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (editionMatch) metadata.dateEdition = editionMatch[1];

    return metadata;
  }

  /**
   * Extraction binaire de secours
   */
  static extractTextFromBinary(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let extractedText = '';
    
    for (let i = 0; i < uint8Array.length - 1; i++) {
      if (uint8Array[i] === 0x28) {
        let j = i + 1;
        let textBytes = [];
        
        while (j < uint8Array.length && j - i < 1000) {
          if (uint8Array[j] === 0x29) {
            if (textBytes.length > 0) {
              try {
                let text = decoder.decode(new Uint8Array(textBytes));
                text = text.replace(/\\(\d{3})/g, (m, oct) => String.fromCharCode(parseInt(oct, 8)))
                  .replace(/\\n/g, '\n').trim();
                if (text.length > 2 && text.length < 500) {
                  extractedText += text + ' ';
                }
              } catch (e) {}
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
   * Validation d'une entrée
   */
  static validateEntry(entry) {
    if (!entry.serviceCode) {
      entry.hasError = true;
      entry.errorMessage = 'Code de service manquant';
      entry.isValid = false;
    } else if (!this.VALID_SERVICE_CODES[entry.serviceCode] && entry.serviceCode !== 'INCONNU') {
      entry.hasError = true;
      entry.errorMessage = `Code inconnu: ${entry.serviceCode}`;
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
   * Validation globale
   */
  static validateParsedData(parsedData) {
    const validation = { errors: [], warnings: [], isValid: true };
    
    if (parsedData.extractionMethod) {
      validation.warnings.push(`📋 Méthode: ${parsedData.extractionMethod}`);
    }
    if (parsedData.metadata?.agent) {
      validation.warnings.push(`✅ Agent: ${parsedData.metadata.agent}`);
    }
    if (parsedData.metadata?.numeroCP) {
      validation.warnings.push(`✅ CP: ${parsedData.metadata.numeroCP}`);
    }
    if (!parsedData.entries?.length) {
      validation.errors.push('Aucune entrée trouvée');
      validation.isValid = false;
    } else {
      const validCount = parsedData.entries.filter(e => e.isValid).length;
      validation.warnings.unshift(`📊 ${validCount}/${parsedData.entries.length} entrées valides`);
    }
    
    return validation;
  }

  /**
   * Formatage pour import
   */
  static formatForImport(entries, agentId) {
    return entries
      .filter(entry => entry.isValid)
      .map(entry => ({
        agent_id: agentId,
        date: entry.date,
        service_code: entry.serviceCode,
        poste_code: entry.horaires.length > 0 ? entry.horaires[0].code : null,
        horaires: entry.horaires.map(h => `${h.debut}-${h.fin}`).join(', '),
        statut: 'actif'
      }));
  }
}

export default PDFParserService;
