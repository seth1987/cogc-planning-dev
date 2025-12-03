// Service de parsing des bulletins de commande SNCF - Version bloc par bloc
class PDFParserService {
  // Codes de service valides SNCF (liste complète)
  static VALID_SERVICE_CODES = {
    // Codes CCU
    CCU001: 'CRC/CCU DENFERT', CCU002: 'CRC/CCU DENFERT', CCU003: 'CRC/CCU DENFERT',
    CCU004: 'Régulateur Table PARC Denfert', CCU005: 'Régulateur Table PARC Denfert',
    CCU006: 'Régulateur Table PARC Denfert',
    // Codes CRC
    CRC001: 'Coordonnateur Régional Circulation', CRC002: 'Coordonnateur Régional Circulation',
    CRC003: 'Coordonnateur Régional Circulation',
    // Codes ACR
    ACR001: 'Aide Coordonnateur Régional', ACR002: 'Aide Coordonnateur Régional',
    ACR003: 'Aide Coordonnateur Régional', ACR004: 'Aide Coordonnateur Régional',
    // Codes Centre Souffleur
    CENT001: 'Centre Souffleur', CENT002: 'Centre Souffleur', CENT003: 'Centre Souffleur',
    // Codes REO (Régulateur OUEST) - Étendu
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
    CA: 'Congé Annuel', CONGE: 'Congé Annuel', C: 'Congé Annuel',
    RQ: 'Repos Compensateur', RTT: 'RTT',
    MA: 'Maladie', MAL: 'Maladie',
    VISIMED: 'Visite Médicale', VMT: 'Visite Médicale',
    TRACTION: 'Formation Traction'
  };

  // Regex pour tous les codes de service (triés par longueur décroissante)
  static SERVICE_CODE_REGEX = /\b(CCU00[1-6]|CRC00[1-3]|ACR00[1-4]|CENT00[1-3]|REO0(?:0[1-9]|10)|HAB-QF|VISIMED|INACTIN|TRACTION|DISPO|CONGE|RPP|RP|NU|CA|RTT|RQ|MA|MAL|HAB|C|D)\b/i;

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
        console.log('📝 Texte extrait (200 premiers caractères):', extractedText.substring(0, 200));
      } catch (pdfError) {
        console.log('⚠️ PDF.js non disponible, extraction binaire...');
        extractedText = this.extractTextFromBinary(arrayBuffer);
      }

      if (!extractedText || extractedText.trim().length < 50) {
        extractedText = this.extractTextFromBinary(arrayBuffer);
      }

      console.log('🔄 Parsing du texte extrait...');
      const result = this.parseBulletinByBlocks(extractedText);
      
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
   * Parse le bulletin par BLOCS - chaque bloc = une date
   * Approche : découper le texte en blocs entre les dates
   */
  static parseBulletinByBlocks(rawText) {
    console.log('🔍 Début parsing bulletin par blocs...');
    console.log('   Longueur texte:', rawText.length);
    
    const result = {
      metadata: this.extractMetadata(rawText),
      entries: [],
      errors: []
    };

    console.log('📝 Métadonnées extraites:', result.metadata);

    try {
      // Normaliser le texte
      const normalizedText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ');

      // Trouver toutes les positions des dates (format JJ/MM/AAAA au début de ligne ou après newline)
      const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
      const datePositions = [];
      let match;
      
      while ((match = dateRegex.exec(normalizedText)) !== null) {
        // Ignorer les dates d'édition et de période
        const before = normalizedText.substring(Math.max(0, match.index - 30), match.index);
        if (before.includes('Edition le') || before.includes('Commande') || before.includes('allant')) {
          continue;
        }
        
        datePositions.push({
          index: match.index,
          date: `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`,
          dateDisplay: `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`
        });
      }

      console.log(`📅 ${datePositions.length} dates trouvées dans le document`);

      // Map pour éviter les doublons : clé = "date|serviceCode"
      const entriesMap = new Map();

      // Pour chaque date, extraire le bloc de texte jusqu'à la prochaine date
      for (let i = 0; i < datePositions.length; i++) {
        const currentDate = datePositions[i];
        const nextDateIndex = (i + 1 < datePositions.length) 
          ? datePositions[i + 1].index 
          : normalizedText.length;
        
        // Extraire le bloc de texte pour cette date
        const blockText = normalizedText.substring(currentDate.index, nextDateIndex);
        
        console.log(`   📅 Bloc ${currentDate.dateDisplay}:`, blockText.substring(0, 100).replace(/\n/g, ' '));

        // Chercher le code de service dans ce bloc
        const serviceCode = this.extractServiceCodeFromBlock(blockText);
        
        if (serviceCode) {
          const entryKey = `${currentDate.date}|${serviceCode}`;
          
          if (!entriesMap.has(entryKey)) {
            const entry = {
              date: currentDate.date,
              dateDisplay: currentDate.dateDisplay,
              dayOfWeek: this.extractDayOfWeek(blockText),
              serviceCode: serviceCode,
              serviceLabel: this.VALID_SERVICE_CODES[serviceCode] || serviceCode,
              horaires: this.extractHorairesFromBlock(blockText),
              isValid: true,
              hasError: false,
              errorMessage: null
            };
            
            entriesMap.set(entryKey, entry);
            console.log(`      ✅ Code: ${serviceCode}, Horaires: ${entry.horaires.length}`);
          } else {
            // Ajouter les horaires à l'entrée existante si nouveaux
            const existingEntry = entriesMap.get(entryKey);
            const newHoraires = this.extractHorairesFromBlock(blockText);
            newHoraires.forEach(h => {
              const exists = existingEntry.horaires.some(
                eh => eh.debut === h.debut && eh.fin === h.fin
              );
              if (!exists) {
                existingEntry.horaires.push(h);
              }
            });
            console.log(`      ➕ Horaires ajoutés à ${serviceCode}`);
          }
        } else {
          console.log(`      ⚠️ Aucun code service trouvé`);
        }
      }

      // Convertir la Map en tableau, trié par date puis par heure de début
      result.entries = Array.from(entriesMap.values()).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        // Pour une même date, trier par heure de début
        const aStart = a.horaires.length > 0 ? parseInt(a.horaires[0].debut.split(':')[0]) : 0;
        const bStart = b.horaires.length > 0 ? parseInt(b.horaires[0].debut.split(':')[0]) : 0;
        return aStart - bStart;
      });

      console.log(`📊 Total entrées uniques: ${result.entries.length}`);

      // Valider les entrées
      result.entries = result.entries.map(entry => this.validateEntry(entry));

    } catch (error) {
      console.error('❌ Erreur parsing:', error);
      result.errors.push(`Erreur parsing: ${error.message}`);
    }

    return result;
  }

  /**
   * Extrait le code de service d'un bloc de texte
   * Priorité aux codes spécifiques (CCU005, ACR002) sur les codes simples (C, RP)
   */
  static extractServiceCodeFromBlock(blockText) {
    if (!blockText) return null;
    
    const upperBlock = blockText.toUpperCase();
    
    // Liste ordonnée par spécificité (codes longs d'abord)
    const codePatterns = [
      // Codes avec numéros - TRÈS spécifiques
      /\b(CCU00[1-6])\b/i,
      /\b(CRC00[1-3])\b/i,
      /\b(ACR00[1-4])\b/i,
      /\b(CENT00[1-3])\b/i,
      /\b(REO0(?:0[1-9]|10))\b/i,
      // Codes moyens
      /\b(HAB-QF)\b/i,
      /\b(VISIMED)\b/i,
      /\b(VMT)\b/i,
      /\b(INACTIN)\b/i,
      /\b(TRACTION)\b/i,
      /\b(DISPO)\b/i,
      /\b(CONGE)\b/i,
      // Codes courts - vérifier qu'ils ne sont pas dans un contexte de référence
      /\b(RPP)\b/i,
      /\b(RTT)\b/i,
      /\b(MAL)\b/i,
      /\b(HAB)\b/i,
    ];
    
    // Chercher les codes spécifiques d'abord
    for (const pattern of codePatterns) {
      const match = upperBlock.match(pattern);
      if (match) {
        const code = match[1].toUpperCase();
        // Vérifier que ce n'est pas juste une référence "du CCU601"
        const refPattern = new RegExp(`DU\\s+${code}`, 'i');
        if (!refPattern.test(blockText)) {
          return code;
        }
      }
    }
    
    // Codes très courts - besoin de plus de contexte
    // RP : chercher "Repos" ou "RP" isolé
    if (/\bRP\b/i.test(upperBlock) && !upperBlock.includes('DU RP')) {
      // Vérifier que c'est bien un repos et pas une référence
      if (/REPOS|RP\s+(LUN|MAR|MER|JEU|VEN|SAM|DIM)/i.test(blockText)) {
        return 'RP';
      }
      // Si RP est sur la même ligne que la date
      const lines = blockText.split('\n');
      for (const line of lines) {
        if (/^\d{1,2}\/\d{1,2}\/\d{4}.*\bRP\b/i.test(line)) {
          return 'RP';
        }
      }
    }
    
    // NU : Non Utilisé
    if (/\bNU\b/i.test(upperBlock) && /UTILIS|NU\s+(LUN|MAR|MER|JEU|VEN|SAM|DIM)/i.test(blockText)) {
      return 'NU';
    }
    
    // CA ou C : Congé
    if (/\bCA\b/i.test(upperBlock) || (/\bC\b/i.test(upperBlock) && /CONG/i.test(blockText))) {
      return 'CA';
    }
    
    // RQ : Repos Compensateur
    if (/\bRQ\b/i.test(upperBlock)) {
      return 'RQ';
    }
    
    // MA : Maladie
    if (/\bMA\b/i.test(upperBlock) && /MALAD/i.test(blockText)) {
      return 'MA';
    }
    
    // D : Disponible (si pas de DISPO trouvé)
    if (/\bD\b/i.test(upperBlock) && /DISPONIBLE/i.test(blockText)) {
      return 'DISPO';
    }
    
    return null;
  }

  /**
   * Extrait les horaires d'un bloc de texte
   */
  static extractHorairesFromBlock(blockText) {
    const horaires = [];
    const seenHoraires = new Set();
    
    // Pattern pour "HH:MM HH:MM" ou "HH:MM - HH:MM"
    const patterns = [
      /(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/g,
      /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/g,
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(blockText)) !== null) {
        const debut = match[1];
        const fin = match[2];
        const key = `${debut}-${fin}`;
        
        if (!seenHoraires.has(key)) {
          seenHoraires.add(key);
          
          // Déterminer le type d'horaire
          const lineContext = blockText.substring(
            Math.max(0, match.index - 20),
            Math.min(blockText.length, match.index + 30)
          );
          
          horaires.push({
            debut: debut,
            fin: fin,
            code: this.extractTimeCode(lineContext),
            type: this.extractHoraireType(lineContext)
          });
        }
      }
    }
    
    return horaires;
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
    if (cpMatch) {
      metadata.numeroCP = cpMatch[1];
    }

    const periodeMatch = rawText.match(/Commande\s+allant?\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (periodeMatch) {
      metadata.periode = { debut: periodeMatch[1], fin: periodeMatch[2] };
    }

    const editionMatch = rawText.match(/Edition\s+le\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (editionMatch) {
      metadata.dateEdition = editionMatch[1];
    }

    return metadata;
  }

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

  static extractDayOfWeek(text) {
    if (!text) return null;
    const jours = {
      'LUN': 'Lun', 'LUNDI': 'Lun', 'MAR': 'Mar', 'MARDI': 'Mar',
      'MER': 'Mer', 'MERCREDI': 'Mer', 'JEU': 'Jeu', 'JEUDI': 'Jeu',
      'VEN': 'Ven', 'VENDREDI': 'Ven', 'SAM': 'Sam', 'SAMEDI': 'Sam',
      'DIM': 'Dim', 'DIMANCHE': 'Dim'
    };
    const upperText = text.toUpperCase();
    for (const [key, value] of Object.entries(jours)) {
      if (upperText.includes(key)) return value;
    }
    return null;
  }

  static extractHoraireType(line) {
    const upperLine = line.toUpperCase();
    if (upperLine.includes('METRO')) return 'METRO';
    if (upperLine.includes('RS')) return 'RS';
    return 'SERVICE';
  }

  static extractTimeCode(line) {
    const codeMatch = line.match(/[A-Z]\d{10}[A-Z]{2}\d{2}/);
    return codeMatch ? codeMatch[0] : null;
  }

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
