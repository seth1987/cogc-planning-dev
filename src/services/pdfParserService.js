// Service de parsing des bulletins de commande SNCF - Version 2.1 CORRIGÉE
// CORRECTIONS v2.1 :
// - ✅ NUITS: Le code X est enregistré sur J+1 (pas sur J)
// - ✅ Exemple: 21/04 ACR003 → 22/04 X (poste ACR)
// - ✅ Si J a NU + nuit → J=NU, J+1=X
//
// CORRECTIONS v2.0 :
// - Gestion des entrées multiples sur la même date
// - Priorisation des codes longs sur codes courts
// - Meilleure exclusion des références "NU du CCU601"
// 
// @author COGC Planning Team
// @version 2.1.0

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
    TRACTION: 'Formation Traction',
    X: 'Service de Nuit' // Code résultant après décalage J+1
  };

  // Codes de nuit (génèrent X sur J+1)
  static CODES_NUIT = ['CRC003', 'ACR003', 'CCU003', 'CCU006', 'CENT003', 'REO003', 'REO006', 'RC003', 'RE003'];

  // Jours de la semaine
  static JOURS_SEMAINE = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

  // Regex pour détecter une date au format JJ/MM/AAAA
  static DATE_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

  // ===== CORRECTION v2.0 : Patterns séparés par PRIORITÉ =====
  // HAUTE PRIORITÉ : Codes longs (3+ chiffres)
  static LONG_CODE_PATTERNS = [
    /\b(CCU00[1-6])\b/i,
    /\b(CRC00[1-3])\b/i,
    /\b(ACR00[1-4])\b/i,
    /\b(CENT00[1-3])\b/i,
    /\b(REO0(?:0[1-9]|10))\b/i,
    /\b(HAB-QF)\b/i,
    /\b(VISIMED)\b/i,
    /\b(INACTIN)\b/i,
    /\b(TRACTION)\b/i,
  ];

  // BASSE PRIORITÉ : Codes courts (1-2 lettres)
  static SHORT_CODE_PATTERNS = [
    /\b(DISPO)\b/i,
    /\b(CONGE)\b/i,
    /\b(RPP)\b/i,
    /\b(RTT)\b/i,
    /\b(MAL)\b/i,
    /\b(HAB)\b/i,
    /\b(VMT)\b/i,
    /\b(RQ)\b/i,
    /\b(NU)\b/i,
    /\b(RP)\b/i,
    /\b(CA)\b/i,
    /\b(MA)\b/i,
    /\b(C)\b/i,
    /\b(D)\b/i
  ];

  // Tous les patterns combinés (pour compatibilité)
  static CODE_PATTERNS = [...this.LONG_CODE_PATTERNS, ...this.SHORT_CODE_PATTERNS];

  static async parsePDF(file, apiKey = null) {
    try {
      console.log('📄 === DÉBUT PARSING PDF v2.1 ===');
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
              } else if (lastX !== null && item.transform[4] - lastX > 10) {
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

      console.log('📝 ===== TEXTE BRUT EXTRAIT =====');
      console.log(extractedText);
      console.log('📝 ===== FIN TEXTE BRUT =====');

      console.log('🔄 Parsing du texte extrait (v2.1)...');
      const result = this.parseTextLineByLine(extractedText);
      
      result.extractionMethod = extractedText.includes('BULLETIN DE COMMANDE UOP') ? 
        'Extraction locale réussie (v2.1)' : 'Extraction partielle';
      
      console.log('📊 === RÉSULTAT FINAL ===');
      console.log('   - Méthode:', result.extractionMethod);
      console.log('   - Agent:', result.metadata?.agent);
      console.log('   - Nombre d\'entrées:', result.entries?.length || 0);
      if (result.entries && result.entries.length > 0) {
        console.log('   - Entrées extraites:');
        result.entries.forEach((entry, i) => {
          const nuitSrc = entry.sourceNight ? ` (nuit du ${entry.sourceNight})` : '';
          console.log(`     ${i+1}. ${entry.dateDisplay} - ${entry.serviceCode}${nuitSrc}`);
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
   * PARSER LIGNE PAR LIGNE v2.1
   * CORRECTION : Nuits décalées à J+1
   */
  static parseTextLineByLine(rawText) {
    console.log('🔍 === PARSING LIGNE PAR LIGNE v2.1 ===');
    
    const result = {
      metadata: this.extractMetadata(rawText),
      entries: [],
      errors: []
    };

    console.log('📝 Métadonnées:', result.metadata);

    try {
      const lines = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      console.log(`📋 ${lines.length} lignes à analyser`);

      // ===== Identifier TOUTES les occurrences de dates =====
      const dateOccurrences = [];
      
      for (let i = 0; i < lines.length; i++) {
        const dateMatch = this.extractDateFromLine(lines[i]);
        if (dateMatch) {
          const prevContext = lines.slice(Math.max(0, i-2), i).join(' ').toLowerCase();
          if (!prevContext.includes('edition') && !prevContext.includes('commande') && !prevContext.includes('allant')) {
            dateOccurrences.push({ index: i, date: dateMatch });
            console.log(`   📅 Ligne ${i}: DATE ${dateMatch.display}`);
          }
        }
      }

      console.log(`📅 ${dateOccurrences.length} occurrences de dates identifiées`);

      // ===== Traiter CHAQUE bloc date séparément =====
      const entriesRaw = [];

      for (let d = 0; d < dateOccurrences.length; d++) {
        const startIndex = dateOccurrences[d].index;
        const endIndex = d + 1 < dateOccurrences.length ? dateOccurrences[d + 1].index : lines.length;
        const dateInfo = dateOccurrences[d].date;

        const blockLines = lines.slice(startIndex, endIndex);
        console.log(`\n   🔲 Bloc ${dateInfo.display} (lignes ${startIndex}-${endIndex-1}):`);

        // Trouver le code service avec PRIORISATION
        const serviceInfo = this.findServiceCodeInBlockV2(blockLines);
        
        if (serviceInfo.code) {
          const horaires = this.extractHorairesFromLines(blockLines);
          
          const entry = {
            date: dateInfo.iso,
            dateDisplay: dateInfo.display,
            dayOfWeek: this.getDayOfWeekFromLines(blockLines),
            serviceCode: serviceInfo.code,
            codeOriginal: serviceInfo.codeOriginal,
            serviceLabel: this.VALID_SERVICE_CODES[serviceInfo.code] || 'Inconnu',
            horaires: horaires,
            isNightShift: serviceInfo.isNight || false,
            poste: serviceInfo.poste || '',
            rawLines: blockLines,
            isValid: true,
            hasError: false
          };
          
          entriesRaw.push(entry);
          console.log(`      ✅ Service: ${serviceInfo.code}${serviceInfo.isNight ? ' [NUIT→J+1]' : ''}`);
        } else {
          console.log(`      ⚠️ Aucun code service trouvé dans ce bloc`);
        }
      }

      // ===== POST-TRAITEMENT NUITS v2.1 =====
      result.entries = this.postProcessNightsV21(entriesRaw);
      
      console.log(`\n✅ ${result.entries.length} entrées finales (après décalage nuits)`);

    } catch (error) {
      console.error('❌ Erreur parsing:', error);
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * POST-TRAITEMENT NUITS v2.1
   * Décale les services de nuit de J vers J+1 avec code X
   */
  static postProcessNightsV21(entriesRaw) {
    console.log('\n🌙 Post-traitement nuits v2.1 (décalage J→J+1)...');
    
    const result = [];
    const entriesMap = new Map(); // Pour éviter les doublons
    
    for (const entry of entriesRaw) {
      if (entry.isNightShift) {
        // Service de nuit → décaler à J+1 avec code X
        const dateOrigine = new Date(entry.date + 'T12:00:00');
        dateOrigine.setDate(dateOrigine.getDate() + 1);
        const dateLendemain = dateOrigine.toISOString().split('T')[0];
        const displayLendemain = dateLendemain.split('-').reverse().join('/');
        
        console.log(`   🌙 ${entry.dateDisplay} ${entry.codeOriginal || entry.serviceCode} → ${displayLendemain} X`);
        
        const key = `${dateLendemain}|X`;
        if (!entriesMap.has(key)) {
          entriesMap.set(key, {
            date: dateLendemain,
            dateDisplay: displayLendemain,
            dayOfWeek: entry.dayOfWeek, // Sera peut-être incorrect mais c'est ok
            serviceCode: 'X',
            codeOriginal: entry.codeOriginal || entry.serviceCode,
            serviceLabel: 'Service de Nuit',
            horaires: [{ debut: '00:00', fin: '06:00', type: 'NUIT' }],
            isNightShift: true,
            sourceNight: entry.date, // Date originale du bulletin
            poste: entry.poste,
            isValid: true,
            hasError: false
          });
        }
      } else {
        // Service de jour → garder tel quel
        const key = `${entry.date}|${entry.serviceCode}`;
        if (!entriesMap.has(key)) {
          entriesMap.set(key, this.validateEntry(entry));
        }
      }
    }
    
    // Convertir en array et trier par date
    const entries = Array.from(entriesMap.values());
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return entries;
  }

  /**
   * CORRECTION v2.0 : Recherche de code service avec PRIORISATION
   */
  static findServiceCodeInBlockV2(blockLines) {
    const blockText = blockLines.join(' ');
    
    // ===== PASSE 1 : Codes LONGS (priorité haute) =====
    for (const pattern of this.LONG_CODE_PATTERNS) {
      for (const line of blockLines) {
        // Ignorer les lignes METRO/RS
        if (/^(METRO|RS)\s/i.test(line)) continue;
        
        // Ignorer les références "du CCU601"
        if (/du\s+(CCU|CRC|ACR)\d{3}/i.test(line)) continue;
        
        const match = line.match(pattern);
        if (match) {
          const code = match[1].toUpperCase();
          
          // Vérifier que ce n'est pas une référence
          if (!new RegExp(`du\\s+${code}`, 'i').test(line)) {
            const isNight = this.CODES_NUIT.includes(code) || this.isNightShiftByHours(blockLines);
            const poste = this.extractPosteFromCode(code);
            return { 
              code: isNight ? 'X' : code, // Si nuit, le code devient X (sera traité en post-process)
              codeOriginal: code,
              priority: 'LONG', 
              isNight,
              poste
            };
          }
        }
      }
    }

    // ===== PASSE 2 : Codes COURTS (priorité basse) =====
    // RP : Repos périodique (vérifier le contexte)
    if (/\bRP\b/i.test(blockText) && /Repos\s+périodique/i.test(blockText)) {
      return { code: 'RP', codeOriginal: 'RP', priority: 'COURT', isNight: false, poste: '' };
    }
    
    // NU : Non utilisé (attention aux références !)
    if (/Utilisable\s+non\s+utilisé/i.test(blockText) || /^\s*NU\s+/im.test(blockText)) {
      // Vérifier que ce n'est pas "NU du CCU"
      if (!/NU\s+du\s/i.test(blockText)) {
        return { code: 'NU', codeOriginal: 'NU', priority: 'COURT', isNight: false, poste: '' };
      }
    }
    
    // DISPO : Disponible
    if (/^Disponible$/im.test(blockText) || /\bDISPO\b/i.test(blockText)) {
      return { code: 'DISPO', codeOriginal: 'DISPO', priority: 'COURT', isNight: false, poste: '' };
    }
    
    // VISIMED
    if (/\bVISIMED\b/i.test(blockText)) {
      return { code: 'VISIMED', codeOriginal: 'VISIMED', priority: 'COURT', isNight: false, poste: '' };
    }
    
    // Autres codes courts
    for (const pattern of this.SHORT_CODE_PATTERNS) {
      const match = blockText.match(pattern);
      if (match) {
        const code = match[1].toUpperCase();
        // Éviter les faux positifs
        if (code !== 'NU' && code !== 'RP' && code !== 'DISPO') {
          return { code, codeOriginal: code, priority: 'COURT', isNight: false, poste: '' };
        }
      }
    }

    return { code: null, codeOriginal: null, priority: null, isNight: false, poste: '' };
  }

  /**
   * Extrait le poste depuis le code
   */
  static extractPosteFromCode(code) {
    if (!code) return '';
    if (code.startsWith('CCU')) return code.endsWith('3') || code.endsWith('6') ? 'RE' : 'CCU';
    if (code.startsWith('CRC')) return 'CRC';
    if (code.startsWith('ACR')) return 'ACR';
    if (code.startsWith('CENT')) return 'S/S';
    if (code.startsWith('REO')) return 'RO';
    if (code.startsWith('RC')) return 'RC';
    if (code.startsWith('RE')) return 'RE';
    return '';
  }

  /**
   * Détecte si c'est un service de nuit par les horaires
   */
  static isNightShiftByHours(blockLines) {
    for (const line of blockLines) {
      const match = line.match(/(\d{1,2}):(\d{2})\s+(\d{1,2}):(\d{2})/);
      if (match) {
        const heureDebut = parseInt(match[1]);
        const heureFin = parseInt(match[3]);
        if ((heureDebut >= 22 || heureDebut <= 2) && heureFin <= 8) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extrait la date d'une ligne
   */
  static extractDateFromLine(line) {
    if (!line) return null;
    
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
   * Extrait les horaires des lignes d'un bloc
   */
  static extractHorairesFromLines(lines) {
    const horaires = [];
    const seen = new Set();

    for (const line of lines) {
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
   * Normalise une heure
   */
  static normalizeTime(time) {
    const [h, m] = time.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  /**
   * Trouve le jour de la semaine
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
   * Extrait les métadonnées
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
      /COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÔÙÛÜ]+\s+[A-ZÀÂÄÉÈÊËÏÔÙÛÜ]+)/i,
    ];
    
    for (const pattern of agentPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        metadata.agent = match[1].trim().split('\n')[0].toUpperCase();
        break;
      }
    }

    const cpMatch = rawText.match(/N[°o]?\s*CP\s*:?\s*([A-Z0-9]+)/i);
    if (cpMatch) metadata.numeroCP = cpMatch[1];

    const periodeMatch = rawText.match(/Commande\s+allant?\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (periodeMatch) {
      metadata.periode = { debut: periodeMatch[1], fin: periodeMatch[2] };
    }

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
    } else if (!this.VALID_SERVICE_CODES[entry.serviceCode] && entry.serviceCode !== 'INCONNU' && entry.serviceCode !== 'X') {
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
      const nightCount = parsedData.entries.filter(e => e.sourceNight).length;
      validation.warnings.unshift(`📊 ${validCount}/${parsedData.entries.length} entrées valides`);
      if (nightCount > 0) {
        validation.warnings.push(`🌙 ${nightCount} nuits décalées à J+1`);
      }
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
        poste_code: entry.poste || (entry.horaires.length > 0 ? entry.horaires[0].code : null),
        horaires: entry.horaires.map(h => `${h.debut}-${h.fin}`).join(', '),
        is_night_shift: entry.isNightShift || false,
        source_night: entry.sourceNight || null,
        statut: 'actif'
      }));
  }
}

export default PDFParserService;
