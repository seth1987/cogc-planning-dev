/**
 * MistralPDFReaderService.js
 * Service de lecture de PDF SNCF utilisant l'API Mistral OCR
 * Optimisé pour les bulletins de commande COGC Paris Nord
 * 
 * @version 2.4.0
 * @date 2025-12-04
 * @changelog 
 *   - 2.4.0: AJOUT LOGIQUE DÉCALAGE NUITS - Services 22h-06h enregistrés sur J+1
 *   - 2.3.0: FIX CRITIQUE - Distinction codes explicites vs devinés
 *   - 2.3.0: Déduplication améliorée avec priorité aux codes explicites
 *   - 2.3.0: Correction du bug des multiples INCONNU par date
 *   - 2.2.0: Élimination des doublons INCONNU par date
 *   - 2.2.0: Fusion intelligente des entrées de même date
 *   - 2.1.0: Ajout de TOUS les 69 codes SNCF depuis la BDD
 */

import { callMistralOCR, callMistralChat } from './mistralProxyClient';

class MistralPDFReaderService {
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION API MISTRAL
  // ═══════════════════════════════════════════════════════════════

  // Modèles disponibles
  static MODELS = {
    OCR: 'mistral-ocr-latest',
    VISION: 'pixtral-12b-2409'
  };

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION DÉCALAGE SERVICES DE NUIT
  // ═══════════════════════════════════════════════════════════════
  
  // Seuil horaire pour considérer un service comme "service de nuit à décaler"
  // Un service commençant à partir de cette heure sera enregistré sur J+1
  static NIGHT_SHIFT_START_THRESHOLD = 20; // 20h00
  
  // Codes qui sont des services de nuit (suffixe 003 ou X)
  static NIGHT_SERVICE_CODES = new Set([
    'ACR003', 'CAC003', 'CCU003', 'CCU006', 'CENT003', 
    'CRC003', 'RC003', 'RE003', 'REO003', 'RO003', 'SOUF003',
    'X' // Code générique nuit
  ]);

  // ═══════════════════════════════════════════════════════════════
  // MAPPING COMPLET DES 69 CODES SNCF (depuis BDD Supabase)
  // ═══════════════════════════════════════════════════════════════
  
  static CODES_MAPPING = {
    // Services de base
    '-': { poste: null, service: '-', desc: 'Service matin (06h-14h)' },
    'O': { poste: null, service: 'O', desc: 'Service soir (14h-22h)' },
    'X': { poste: null, service: 'X', desc: 'Service nuit (22h-06h)' },
    
    // ACR - Aide Coordonnateur Régional
    'ACR001': { poste: 'ACR', service: '-', desc: 'Aide Coordonnateur matin' },
    'ACR002': { poste: 'ACR', service: 'O', desc: 'Aide Coordonnateur Régional - soirée' },
    'ACR003': { poste: 'ACR', service: 'X', desc: 'Aide Coordonnateur Régional - nuit' },
    
    // CAC - Cadre Appui Circulation
    'CAC001': { poste: 'CAC', service: '-', desc: 'Cadre Appui Circulation matin' },
    'CAC002': { poste: 'CAC', service: 'O', desc: 'Cadre Appui Circulation soir' },
    'CAC003': { poste: 'CAC', service: 'X', desc: 'Cadre Appui Circulation nuit' },
    
    // CCU - Centre Commande Unique
    'CCU001': { poste: 'CCU', service: '-', desc: 'CCU Denfert matin' },
    'CCU002': { poste: 'CCU', service: 'O', desc: 'CCU Denfert soir' },
    'CCU003': { poste: 'CCU', service: 'X', desc: 'CCU Denfert nuit' },
    'CCU004': { poste: 'RE', service: '-', desc: 'Régulateur Parc matin' },
    'CCU005': { poste: 'RE', service: 'O', desc: 'Régulateur Table PARC Denfert' },
    'CCU006': { poste: 'RE', service: 'X', desc: 'Régulateur Parc nuit' },
    
    // CENT - Centre Souffleur / Régulateur Centre
    'CENT001': { poste: 'RC', service: '-', desc: 'Centre Souffleur' },
    'CENT002': { poste: 'RC', service: 'O', desc: 'Régulateur Centre soirée' },
    'CENT003': { poste: 'RC', service: 'X', desc: 'Régulateur Centre nuit' },
    
    // CRC - Coordonnateur Régional Circulation
    'CRC001': { poste: 'CRC', service: '-', desc: 'Coordonnateur matin' },
    'CRC002': { poste: 'CRC', service: 'O', desc: 'Coordonnateur soir' },
    'CRC003': { poste: 'CRC', service: 'X', desc: 'Coordonnateur nuit' },
    
    // RC - Régulateur Centre
    'RC001': { poste: 'RC', service: '-', desc: 'Régulateur Centre matin' },
    'RC002': { poste: 'RC', service: 'O', desc: 'Régulateur Centre soir' },
    'RC003': { poste: 'RC', service: 'X', desc: 'Régulateur Centre nuit' },
    
    // RE - Régulateur Est
    'RE001': { poste: 'RE', service: '-', desc: 'Régulateur Est matin' },
    'RE002': { poste: 'RE', service: 'O', desc: 'Régulateur Est soir' },
    'RE003': { poste: 'RE', service: 'X', desc: 'Régulateur Est nuit' },
    
    // REO - Régulateur Est/Ouest
    'REO001': { poste: 'RE', service: '-', desc: 'Régulateur Est/Ouest - Matin' },
    'REO002': { poste: 'RE', service: 'O', desc: 'Régulateur Est/Ouest - Soir' },
    'REO003': { poste: 'RE', service: 'X', desc: 'Régulateur Est/Ouest - Nuit' },
    'REO004': { poste: 'RE', service: '-', desc: 'Régulateur Est/Ouest - Matin spécial' },
    'REO005': { poste: 'RE', service: 'O', desc: 'Régulateur Est/Ouest - Soir spécial' },
    'REO006': { poste: 'RE', service: 'O', desc: 'Régulateur Est/Ouest - Soir tardif' },
    'REO007': { poste: 'RO', service: '-', desc: 'Régulateur Ouest matin' },
    'REO008': { poste: 'RO', service: 'O', desc: 'Régulateur OUEST' },
    
    // RO - Régulateur Ouest
    'RO001': { poste: 'RO', service: '-', desc: 'Régulateur Ouest matin' },
    'RO002': { poste: 'RO', service: 'O', desc: 'Régulateur Ouest soir' },
    'RO003': { poste: 'RO', service: 'X', desc: 'Régulateur Ouest nuit' },
    
    // SOUF - Souffleur
    'SOUF001': { poste: 'S/S', service: '-', desc: 'Souffleur matin' },
    'SOUF002': { poste: 'S/S', service: 'O', desc: 'Souffleur soir' },
    'SOUF003': { poste: 'SOUF', service: 'X', desc: 'Souffleur - Nuit (22h-06h)' },
    
    // Absences et congés
    'C': { poste: null, service: 'C', desc: 'Congé annuel' },
    'CA': { poste: null, service: 'CA', desc: 'Congés annuels' },
    'CONGE': { poste: null, service: 'C', desc: 'Congé' },
    'RTT': { poste: null, service: 'RU', desc: 'RTT' },
    'RU': { poste: null, service: 'RU', desc: 'RTT - Récupération temps de travail' },
    'VT': { poste: null, service: 'VT', desc: 'Congé temps partiel' },
    
    // Repos
    'RP': { poste: null, service: 'RP', desc: 'Repos périodique' },
    'RPP': { poste: null, service: 'RP', desc: 'Repos Périodique' },
    'RQ': { poste: null, service: 'RQ', desc: 'Repos qualifié' },
    
    // Disponibilité
    'D': { poste: null, service: 'D', desc: 'Disponible' },
    'DISPO': { poste: null, service: 'D', desc: 'Disponible' },
    'DN': { poste: null, service: 'DN', desc: 'Disponible Paris Nord' },
    'DR': { poste: null, service: 'DR', desc: 'Disponible Denfert-Rochereau' },
    
    // Non utilisé / Non commandé
    'NU': { poste: null, service: 'NU', desc: 'Non Utilisé' },
    'NP': { poste: null, service: 'NP', desc: 'Non commandé au COGC' },
    
    // Inaction / Formation
    'I': { poste: null, service: 'I', desc: 'Inaction' },
    'INACT': { poste: null, service: 'I', desc: 'Inaction' },
    'INACTIN': { poste: null, service: 'I', desc: 'Inaction' },
    'FO': { poste: null, service: 'FO', desc: 'Formation' },
    'FORM': { poste: null, service: 'FO', desc: 'Formation' },
    'HAB': { poste: null, service: 'HAB', desc: 'Habilitation' },
    'HAB-QF': { poste: null, service: 'HAB', desc: 'Formation (temporaire)' },
    
    // Médical
    'MA': { poste: null, service: 'MA', desc: 'Maladie' },
    'MAL': { poste: null, service: 'MA', desc: 'Maladie' },
    'VM': { poste: null, service: 'VM', desc: 'Visite médicale' },
    'VMT': { poste: null, service: 'I', desc: 'Visite médicale' },
    'VISIMED': { poste: null, service: 'VM', desc: 'Visite Médicale' },
    
    // Autres
    'EAC': { poste: null, service: 'EAC', desc: 'Service extérieur aide CCU/RE' },
    'EIA': { poste: null, service: 'EIA', desc: 'Entretien individuel annuel' },
    'F': { poste: null, service: 'F', desc: 'Jour férié' },
    'JF': { poste: null, service: 'JF', desc: 'Jour férié' },
    'PCD': { poste: null, service: 'PCD', desc: 'Poste Circulation Dionysien' },
    'VL': { poste: null, service: 'VL', desc: 'Visite ligne' }
  };

  // Set des codes valides pour validation rapide
  static VALID_SERVICE_CODES = new Set(Object.keys(this.CODES_MAPPING));

  // Codes qui sont des codes "spécifiques" (pas des codes génériques comme -, O, X)
  static SPECIFIC_CODES = new Set([
    'ACR001', 'ACR002', 'ACR003',
    'CAC001', 'CAC002', 'CAC003',
    'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005', 'CCU006',
    'CENT001', 'CENT002', 'CENT003',
    'CRC001', 'CRC002', 'CRC003',
    'RC001', 'RC002', 'RC003',
    'RE001', 'RE002', 'RE003',
    'REO001', 'REO002', 'REO003', 'REO004', 'REO005', 'REO006', 'REO007', 'REO008',
    'RO001', 'RO002', 'RO003',
    'SOUF001', 'SOUF002', 'SOUF003',
    'RP', 'RPP', 'RQ', 'C', 'CA', 'CONGE', 'RTT', 'RU', 'VT',
    'D', 'DISPO', 'DN', 'DR', 'NU', 'NP',
    'I', 'INACT', 'INACTIN', 'FO', 'FORM', 'HAB', 'HAB-QF',
    'MA', 'MAL', 'VM', 'VMT', 'VISIMED',
    'EAC', 'EIA', 'F', 'JF', 'PCD', 'VL'
  ]);

  // Patterns de description pour détecter le code
  static DESCRIPTION_PATTERNS = [
    { pattern: /Aide\s+Coordonnateur.*matin/i, code: 'ACR001' },
    { pattern: /Aide\s+Coordonnateur.*soir/i, code: 'ACR002' },
    { pattern: /Aide\s+Coordonnateur.*nuit/i, code: 'ACR003' },
    { pattern: /Aide\s+Coordonnateur/i, code: 'ACR' },
    { pattern: /Cadre\s+Appui.*matin/i, code: 'CAC001' },
    { pattern: /Cadre\s+Appui.*soir/i, code: 'CAC002' },
    { pattern: /Cadre\s+Appui.*nuit/i, code: 'CAC003' },
    { pattern: /CRC\/CCU\s+DENFERT/i, code: 'CCU' },
    { pattern: /Régulateur\s+Table\s+PARC/i, code: 'CCU004' },
    { pattern: /Régulateur\s+Parc/i, code: 'CCU004' },
    { pattern: /Coordonnateur\s+Régional.*matin/i, code: 'CRC001' },
    { pattern: /Coordonnateur\s+Régional.*soir/i, code: 'CRC002' },
    { pattern: /Coordonnateur\s+Régional.*nuit/i, code: 'CRC003' },
    { pattern: /Coordonnateur\s+Régional/i, code: 'CRC001' },
    { pattern: /Centre\s+Souffleur/i, code: 'CENT001' },
    { pattern: /Régulateur\s+Centre/i, code: 'RC' },
    { pattern: /Régulateur\s+Est.*Ouest/i, code: 'REO' },
    { pattern: /Régulateur\s+Est/i, code: 'RE' },
    { pattern: /Régulateur\s+Ouest/i, code: 'RO' },
    { pattern: /Souffleur/i, code: 'SOUF' },
    { pattern: /Repos\s+périodique/i, code: 'RP' },
    { pattern: /Non\s+Utilisé|Utilisable\s+non\s+utilisé/i, code: 'NU' },
    { pattern: /Disponible/i, code: 'DISPO' },
    { pattern: /Inactif|INACTIN/i, code: 'INACTIN' },
    { pattern: /Formation|TRACTION/i, code: 'INACTIN' },
    { pattern: /Maladie/i, code: 'MA' },
    { pattern: /Visite\s+médicale/i, code: 'VM' },
    { pattern: /Congé/i, code: 'CA' },
    { pattern: /Habilitation/i, code: 'HAB' },
    { pattern: /Entretien\s+individuel/i, code: 'EIA' }
  ];

  // Éléments à ignorer (non-services)
  static IGNORE_PATTERNS = ['METRO', 'RS', 'TRACTION', 'du CCU', 'du CRC', 'N1100010CO72', 'N82'];

  // ═══════════════════════════════════════════════════════════════
  // MÉTHODE PRINCIPALE - LECTURE PDF
  // ═══════════════════════════════════════════════════════════════

  static async readPDF(file) {
    const startTime = Date.now();
    console.log('📄 MistralPDFReader v2.4: Début lecture PDF', file.name);

    try {
      const base64Data = await this.fileToBase64(file);
      console.log('✅ Conversion base64 réussie:', Math.round(base64Data.length / 1024), 'KB');

      let result = await this.processWithOCR(base64Data);
      
      if (!result.success) {
        console.log('⚠️ OCR échoué, tentative avec Vision Pixtral...');
        result = await this.processWithVision(base64Data);
      }

      const processingTime = Date.now() - startTime;
      result.stats = {
        ...result.stats,
        processingTimeMs: processingTime,
        fileName: file.name,
        fileSize: file.size
      };

      console.log(`✅ Extraction terminée en ${processingTime}ms:`, result.stats);
      return result;

    } catch (error) {
      console.error('❌ Erreur lecture PDF:', error);
      return {
        success: false,
        error: error.message,
        metadata: {},
        entries: [],
        stats: { total: 0, valid: 0, errors: 1 }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // API OCR DÉDIÉE
  // ═══════════════════════════════════════════════════════════════

  static async processWithOCR(base64Data) {
    console.log('🔍 Traitement avec API OCR (mistral-ocr-latest)...');

    try {
      const ocrResult = await callMistralOCR({
        model: this.MODELS.OCR,
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${base64Data}`
        },
        include_image_base64: false
      });
      console.log('✅ Réponse OCR reçue:', ocrResult.pages?.length, 'page(s)');

      let fullMarkdown = '';
      if (ocrResult.pages) {
        for (const page of ocrResult.pages) {
          if (page.markdown) {
            fullMarkdown += page.markdown + '\n\n';
          }
        }
      }

      return this.parseMarkdownToSNCF(fullMarkdown, 'mistral-ocr-latest');

    } catch (error) {
      console.error('❌ Erreur processWithOCR:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FALLBACK VISION
  // ═══════════════════════════════════════════════════════════════

  static async processWithVision(base64Data) {
    console.log('🔍 Traitement avec Vision Pixtral (fallback)...');

    const prompt = this.createExtractionPrompt();

    try {
      const visionResult = await callMistralChat({
        model: this.MODELS.VISION,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:application/pdf;base64,${base64Data}` }
            }
          ]
        }],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });
      const content = visionResult.choices?.[0]?.message?.content;

      if (!content) {
        return { success: false, error: 'Réponse Vision vide' };
      }

      return this.parseVisionResponse(content);

    } catch (error) {
      console.error('❌ Erreur processWithVision:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSING DU MARKDOWN OCR - v2.4 avec décalage nuits
  // ═══════════════════════════════════════════════════════════════

  static parseMarkdownToSNCF(markdown, method) {
    console.log('📊 Parsing du markdown v2.4 (avec décalage nuits)...');

    const result = {
      success: true,
      method: method,
      metadata: {},
      entries: [],
      stats: { total: 0, valid: 0, errors: 0, nightShifted: 0 }
    };

    try {
      result.metadata = this.extractAgentMetadata(markdown);
      
      // Extraire les entrées brutes
      let rawEntries = this.extractPlanningEntries(markdown);
      
      // v2.3 : Déduplication améliorée avec priorité aux codes explicites
      let dedupedEntries = this.deduplicateAndMergeEntriesV2(rawEntries);
      
      // *** v2.4 : NOUVEAU - Appliquer le décalage des services de nuit ***
      const { entries: shiftedEntries, nightShiftedCount } = this.applyNightShiftDateOffset(dedupedEntries);
      result.entries = shiftedEntries;
      result.stats.nightShifted = nightShiftedCount;

      result.stats.total = result.entries.length;
      result.stats.valid = result.entries.filter(e => e.isValid).length;
      result.stats.errors = result.entries.filter(e => e.hasError).length;

      // Log des codes non reconnus pour debug
      const unknownCodes = result.entries.filter(e => e.serviceCode === 'INCONNU');
      if (unknownCodes.length > 0) {
        console.warn('⚠️ Codes non reconnus après fusion:', unknownCodes.map(e => ({
          date: e.dateDisplay,
          rawText: e.rawText?.substring(0, 100)
        })));
      }

      console.log('✅ Parsing terminé:', result.stats);
      return result;

    } catch (error) {
      console.error('❌ Erreur parsing:', error);
      result.success = false;
      result.error = error.message;
      return result;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // *** v2.4 - LOGIQUE DE DÉCALAGE DES SERVICES DE NUIT ***
  // ═══════════════════════════════════════════════════════════════

  /**
   * Applique le décalage de date pour les services de nuit
   * Les services commençant après 20h sont enregistrés sur le jour suivant (J+1)
   * 
   * Exemple:
   * - CCU003 le 24/04/2025 (22:00-06:00) → enregistré le 25/04/2025
   * - CCU003 le 25/04/2025 (22:00-06:00) → enregistré le 26/04/2025
   * 
   * @param {Array} entries - Entrées dédupliquées
   * @returns {Object} { entries: Array, nightShiftedCount: number }
   */
  static applyNightShiftDateOffset(entries) {
    console.log('🌙 Application du décalage des services de nuit...');
    
    let nightShiftedCount = 0;
    const shiftedEntries = [];
    
    for (const entry of entries) {
      // Vérifier si c'est un service de nuit qui doit être décalé
      const shouldShift = this.shouldShiftToNextDay(entry);
      
      if (shouldShift) {
        // Calculer la nouvelle date (J+1)
        const newDate = this.addOneDay(entry.date);
        const newDateDisplay = this.formatDateDisplay(newDate);
        const newDayOfWeek = this.getDayOfWeek(newDate);
        
        console.log(`   🌙 ${entry.dateDisplay} ${entry.serviceCode} → décalé au ${newDateDisplay} (service de nuit)`);
        
        shiftedEntries.push({
          ...entry,
          date: newDate,
          dateDisplay: newDateDisplay,
          dayOfWeek: newDayOfWeek,
          dateShiftedFromNight: true,
          originalDate: entry.date,
          originalDateDisplay: entry.dateDisplay
        });
        
        nightShiftedCount++;
      } else {
        // Conserver l'entrée telle quelle
        shiftedEntries.push({
          ...entry,
          dateShiftedFromNight: false
        });
      }
    }
    
    // Trier par nouvelle date
    shiftedEntries.sort((a, b) => a.date.localeCompare(b.date));
    
    // Re-déduplication après décalage (au cas où deux services tombent sur la même date)
    const finalEntries = this.deduplicateAfterShift(shiftedEntries);
    
    console.log(`✅ Décalage nuits terminé: ${nightShiftedCount} service(s) décalé(s)`);
    
    return {
      entries: finalEntries,
      nightShiftedCount
    };
  }

  /**
   * Détermine si une entrée doit être décalée au jour suivant
   */
  static shouldShiftToNextDay(entry) {
    // Critère 1: Le code est explicitement un service de nuit
    if (this.NIGHT_SERVICE_CODES.has(entry.serviceCode)) {
      return true;
    }
    
    // Critère 2: Flag isNightService ET horaires commençant après le seuil
    if (entry.isNightService && entry.horaires && entry.horaires.length > 0) {
      const firstHoraire = entry.horaires[0];
      const debutHeure = parseInt(firstHoraire.debut?.split(':')[0] || 0);
      
      if (debutHeure >= this.NIGHT_SHIFT_START_THRESHOLD) {
        return true;
      }
    }
    
    // Critère 3: Code se terminant par 003 (convention SNCF pour nuit)
    if (entry.serviceCode && entry.serviceCode.match(/003$/)) {
      return true;
    }
    
    // Critère 4: Horaires traversant minuit (début > 20h ET fin < 10h)
    if (entry.horaires && entry.horaires.length > 0) {
      for (const h of entry.horaires) {
        const debut = parseInt(h.debut?.split(':')[0] || 0);
        const fin = parseInt(h.fin?.split(':')[0] || 24);
        
        // Service qui commence tard et finit tôt = traverse minuit
        if (debut >= this.NIGHT_SHIFT_START_THRESHOLD && fin <= 10) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Ajoute un jour à une date ISO (YYYY-MM-DD)
   */
  static addOneDay(dateISO) {
    const date = new Date(dateISO + 'T12:00:00'); // Midi pour éviter problèmes de timezone
    date.setDate(date.getDate() + 1);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Formate une date ISO en format d'affichage JJ/MM/YYYY
   */
  static formatDateDisplay(dateISO) {
    const parts = dateISO.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /**
   * Obtient le jour de la semaine pour une date ISO
   */
  static getDayOfWeek(dateISO) {
    const date = new Date(dateISO + 'T12:00:00');
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  }

  /**
   * Re-déduplique après le décalage des nuits
   * Si deux services tombent sur la même date, garder les deux (cas normal)
   * sauf si c'est le même code service
   */
  static deduplicateAfterShift(entries) {
    const byDateAndCode = new Map();
    
    for (const entry of entries) {
      const key = `${entry.date}_${entry.serviceCode}`;
      
      if (!byDateAndCode.has(key)) {
        byDateAndCode.set(key, entry);
      } else {
        // Fusionner si même date ET même code
        const existing = byDateAndCode.get(key);
        // Préférer l'entrée non décalée si conflit
        if (entry.dateShiftedFromNight && !existing.dateShiftedFromNight) {
          // Garder l'existante
        } else if (!entry.dateShiftedFromNight && existing.dateShiftedFromNight) {
          byDateAndCode.set(key, entry);
        }
        // Sinon garder la première
      }
    }
    
    return Array.from(byDateAndCode.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // ═══════════════════════════════════════════════════════════════
  // DÉDUPLICATION v2.3 (conservée)
  // ═══════════════════════════════════════════════════════════════

  /**
   * *** v2.3 - Déduplication AMÉLIORÉE ***
   * Priorité: 
   * 1. Entrées avec code SPÉCIFIQUE explicitement trouvé (ACR002, CCU003, etc.)
   * 2. Entrées avec code trouvé par description (RP, DISPO, etc.)
   * 3. Entrées avec code deviné par horaires (-, O, X)
   * 4. Entrées INCONNU (en dernier recours)
   */
  static deduplicateAndMergeEntriesV2(entries) {
    console.log(`🔄 Déduplication v2.3 de ${entries.length} entrées...`);
    
    // Grouper par date
    const byDate = new Map();
    
    for (const entry of entries) {
      const date = entry.date;
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date).push(entry);
    }
    
    const result = [];
    
    for (const [date, dateEntries] of byDate) {
      // Classer les entrées par priorité
      const explicitSpecific = []; // Code spécifique trouvé explicitement (ACR002, CCU003...)
      const explicitGeneric = [];  // Code trouvé par description (RP, DISPO...)
      const guessedByHoraires = []; // Code deviné (-, O, X)
      const unknown = [];          // INCONNU
      
      for (const entry of dateEntries) {
        if (entry.serviceCode === 'INCONNU') {
          unknown.push(entry);
        } else if (entry.codeFoundExplicitly && this.SPECIFIC_CODES.has(entry.serviceCode)) {
          // Code spécifique trouvé dans le texte
          explicitSpecific.push(entry);
        } else if (entry.codeFoundExplicitly) {
          // Code trouvé mais générique
          explicitGeneric.push(entry);
        } else if (entry.guessedByHoraires || ['-', 'O', 'X'].includes(entry.serviceCode)) {
          // Code deviné par les horaires
          guessedByHoraires.push(entry);
        } else {
          // Autres cas - traiter comme explicite générique
          explicitGeneric.push(entry);
        }
      }
      
      // Choisir les meilleures entrées
      let selectedEntries = [];
      
      if (explicitSpecific.length > 0) {
        // Priorité 1: codes spécifiques explicites
        selectedEntries = explicitSpecific;
        console.log(`   📅 ${date}: ${explicitSpecific.length} code(s) spécifique(s) → ${explicitSpecific.map(e => e.serviceCode).join(', ')}`);
      } else if (explicitGeneric.length > 0) {
        // Priorité 2: codes génériques explicites
        selectedEntries = explicitGeneric;
        console.log(`   📅 ${date}: ${explicitGeneric.length} code(s) générique(s) → ${explicitGeneric.map(e => e.serviceCode).join(', ')}`);
      } else if (guessedByHoraires.length > 0) {
        // Priorité 3: codes devinés - n'en garder qu'un seul
        // Fusionner les horaires et prendre le meilleur
        const merged = this.mergeGuessedEntries(guessedByHoraires);
        selectedEntries = [merged];
        console.log(`   📅 ${date}: code deviné par horaires → ${merged.serviceCode}`);
      } else if (unknown.length > 0) {
        // Priorité 4: INCONNU - essayer de récupérer, sinon n'en garder qu'un
        const recovered = this.tryRecoverUnknownEntries(date, unknown);
        selectedEntries = [recovered];
        console.log(`   📅 ${date}: ${unknown.length} INCONNU → ${recovered.serviceCode}`);
      }
      
      // Dédupliquer par code service au sein des entrées sélectionnées
      const byServiceCode = new Map();
      for (const entry of selectedEntries) {
        const key = entry.serviceCode;
        if (byServiceCode.has(key)) {
          // Fusionner les horaires
          const existing = byServiceCode.get(key);
          if (entry.horaires && entry.horaires.length > 0) {
            existing.horaires = [...(existing.horaires || []), ...entry.horaires];
          }
        } else {
          byServiceCode.set(key, { ...entry });
        }
      }
      
      result.push(...byServiceCode.values());
    }
    
    // Trier par date
    result.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`✅ Déduplication terminée: ${entries.length} → ${result.length} entrées`);
    return result;
  }

  /**
   * Fusionne les entrées devinées par horaires en une seule
   */
  static mergeGuessedEntries(entries) {
    if (entries.length === 1) return entries[0];
    
    // Fusionner tous les horaires
    const allHoraires = [];
    let bestEntry = entries[0];
    
    for (const entry of entries) {
      if (entry.horaires) {
        allHoraires.push(...entry.horaires);
      }
      // Préférer l'entrée avec le plus d'info
      if (entry.rawText && entry.rawText.length > (bestEntry.rawText?.length || 0)) {
        bestEntry = entry;
      }
    }
    
    // Re-deviner le code avec tous les horaires fusionnés
    const guessedCode = this.guessCodeByHoraires(allHoraires) || bestEntry.serviceCode;
    
    return {
      ...bestEntry,
      serviceCode: guessedCode,
      serviceLabel: this.getServiceLabel(guessedCode),
      horaires: allHoraires,
      isNightService: this.isNightService(allHoraires),
      isValid: this.VALID_SERVICE_CODES.has(guessedCode),
      hasError: false,
      guessedByHoraires: true,
      mergedFrom: entries.length
    };
  }

  /**
   * Tente de récupérer des entrées INCONNU
   */
  static tryRecoverUnknownEntries(date, unknownEntries) {
    // Fusionner tous les horaires et textes
    const allHoraires = [];
    const allRawText = [];
    let bestDayOfWeek = null;
    let bestDateDisplay = unknownEntries[0]?.dateDisplay;
    
    for (const entry of unknownEntries) {
      if (entry.horaires) allHoraires.push(...entry.horaires);
      if (entry.rawText) allRawText.push(entry.rawText);
      if (entry.dayOfWeek) bestDayOfWeek = entry.dayOfWeek;
    }
    
    // Tenter de deviner le code
    let guessedCode = this.guessCodeByHoraires(allHoraires);
    
    // Tenter aussi par description dans le texte fusionné
    if (!guessedCode) {
      const fullText = allRawText.join(' ');
      guessedCode = this.findCodeByDescription(fullText);
    }
    
    if (guessedCode) {
      return {
        date: date,
        dateDisplay: bestDateDisplay,
        dayOfWeek: bestDayOfWeek,
        serviceCode: guessedCode,
        serviceLabel: this.getServiceLabel(guessedCode),
        horaires: allHoraires,
        isNightService: this.isNightService(allHoraires),
        isValid: this.VALID_SERVICE_CODES.has(guessedCode),
        hasError: false,
        rawText: allRawText.join(' | '),
        recoveredFrom: unknownEntries.length,
        guessedByHoraires: true
      };
    }
    
    // Impossible de récupérer - garder une seule entrée INCONNU
    return {
      ...unknownEntries[0],
      rawText: allRawText.join(' | ').substring(0, 200)
    };
  }

  static extractAgentMetadata(text) {
    const metadata = {
      agent: null,
      numeroCP: null,
      dateEdition: null,
      periodeDebut: null,
      periodeFin: null
    };

    // Nom de l'agent - patterns améliorés
    const agentPatterns = [
      /Agent\s*:?\s*\n?\s*COGC\s+PN\s*\n?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ\-\s]+)/i,
      /COGC\s+PN\s*\n?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ\-\s]+)/i,
      /Agent\s*:?\s*\n?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ\-\s]+)/i
    ];
    
    for (const pattern of agentPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Nettoyer le nom (enlever les N° CP qui suivent parfois)
        let agent = match[1].trim();
        agent = agent.replace(/N°.*$/i, '').trim();
        metadata.agent = agent;
        break;
      }
    }

    // Numéro CP
    const cpMatch = text.match(/N°\s*CP\s*:?\s*([A-Z0-9]+)/i);
    if (cpMatch) {
      metadata.numeroCP = cpMatch[1];
    }

    // Date d'édition
    const editionMatch = text.match(/Edition\s+le\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (editionMatch) {
      metadata.dateEdition = editionMatch[1];
    }

    // Période de commande
    const periodeMatch = text.match(/Commande\s+allant\s+du\s+(\d{2}\/\d{2}\/\d{4})\s+au\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (periodeMatch) {
      metadata.periodeDebut = periodeMatch[1];
      metadata.periodeFin = periodeMatch[2];
    }

    console.log('📋 Métadonnées extraites:', metadata);
    return metadata;
  }

  static extractPlanningEntries(text) {
    const entries = [];
    const lines = text.split('\n');
    
    let currentEntry = null;
    let contextLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Ignorer les lignes de transport/logistique
      if (this.shouldIgnoreLine(line)) continue;

      const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      
      if (dateMatch) {
        // Sauvegarder l'entrée précédente
        if (currentEntry) {
          currentEntry = this.finalizeEntry(currentEntry, contextLines);
          entries.push(currentEntry);
        }

        const day = dateMatch[1];
        const month = dateMatch[2];
        const year = dateMatch[3];
        const currentDate = `${year}-${month}-${day}`;
        const dateDisplay = `${day}/${month}/${year}`;

        const dayMatch = line.match(/(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)/i);
        const dayOfWeek = dayMatch ? dayMatch[1] : null;

        // Chercher le code service
        let serviceCode = this.findServiceCode(line);
        let codeFoundExplicitly = !!serviceCode;
        
        // Si pas trouvé, chercher dans les lignes suivantes
        if (!serviceCode) {
          for (let j = 1; j <= 3 && i + j < lines.length; j++) {
            const nextLine = lines[i + j].trim();
            if (nextLine.match(/(\d{2})\/(\d{2})\/(\d{4})/)) break;
            serviceCode = this.findServiceCode(nextLine);
            if (serviceCode) {
              codeFoundExplicitly = true;
              break;
            }
          }
        }

        // Chercher par description si toujours pas trouvé
        if (!serviceCode) {
          serviceCode = this.findCodeByDescription(line);
          if (serviceCode) codeFoundExplicitly = true;
        }

        const horaires = this.extractHoraires(line);
        const isNightService = this.isNightService(horaires);

        currentEntry = {
          date: currentDate,
          dateDisplay: dateDisplay,
          dayOfWeek: dayOfWeek,
          serviceCode: serviceCode || 'INCONNU',
          serviceLabel: this.getServiceLabel(serviceCode),
          horaires: horaires,
          isNightService: isNightService,
          isValid: serviceCode ? this.VALID_SERVICE_CODES.has(serviceCode) : false,
          hasError: !serviceCode,
          rawText: line,
          codeFoundExplicitly: codeFoundExplicitly,
          guessedByHoraires: false
        };

        contextLines = [line];

      } else if (currentEntry) {
        // Ligne de continuation
        contextLines.push(line);

        // Chercher un code service si pas encore trouvé explicitement
        if (!currentEntry.codeFoundExplicitly) {
          let serviceCode = this.findServiceCode(line);
          if (!serviceCode) {
            serviceCode = this.findCodeByDescription(line);
          }
          if (serviceCode) {
            currentEntry.serviceCode = serviceCode;
            currentEntry.serviceLabel = this.getServiceLabel(serviceCode);
            currentEntry.isValid = this.VALID_SERVICE_CODES.has(serviceCode);
            currentEntry.hasError = false;
            currentEntry.codeFoundExplicitly = true;
          }
        }

        // Chercher des horaires supplémentaires
        const additionalHoraires = this.extractHoraires(line);
        if (additionalHoraires.length > 0) {
          currentEntry.horaires = [...currentEntry.horaires, ...additionalHoraires];
          currentEntry.isNightService = this.isNightService(currentEntry.horaires);
        }

        currentEntry.rawText += ' ' + line;
      }
    }

    // Ne pas oublier la dernière entrée
    if (currentEntry) {
      currentEntry = this.finalizeEntry(currentEntry, contextLines);
      entries.push(currentEntry);
    }

    return entries.map(entry => this.cleanEntry(entry));
  }

  /**
   * Vérifie si une ligne doit être ignorée
   */
  static shouldIgnoreLine(line) {
    return this.IGNORE_PATTERNS.some(p => line.includes(p)) && 
           !line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  }

  /**
   * Finalise une entrée avec les données de contexte
   */
  static finalizeEntry(entry, contextLines) {
    // Si pas de code trouvé explicitement, essayer de deviner par les horaires
    if (!entry.codeFoundExplicitly && entry.horaires.length > 0) {
      const guessedCode = this.guessCodeByHoraires(entry.horaires);
      if (guessedCode) {
        entry.serviceCode = guessedCode;
        entry.serviceLabel = this.getServiceLabel(guessedCode);
        entry.isValid = true;
        entry.hasError = false;
        entry.guessedByHoraires = true;
        console.log(`🔮 Code deviné par horaires: ${entry.dateDisplay} → ${guessedCode}`);
      }
    }

    // Chercher dans tout le contexte si toujours INCONNU
    if (entry.serviceCode === 'INCONNU') {
      const fullContext = contextLines.join(' ');
      const contextCode = this.findCodeByDescription(fullContext);
      if (contextCode) {
        entry.serviceCode = contextCode;
        entry.serviceLabel = this.getServiceLabel(contextCode);
        entry.isValid = this.VALID_SERVICE_CODES.has(contextCode);
        entry.hasError = false;
        entry.codeFoundExplicitly = true;
      }
    }

    return entry;
  }

  /**
   * Cherche un code service dans une ligne de texte
   */
  static findServiceCode(line) {
    // Pattern pour les codes services structurés - ordre par spécificité
    const codePatterns = [
      // Codes composés spécifiques d'abord
      /\b(CCU00[1-6])\b/i,
      /\b(CRC00[1-3])\b/i,
      /\b(ACR00[1-3])\b/i,
      /\b(CAC00[1-3])\b/i,
      /\b(CENT00[1-3])\b/i,
      /\b(RC00[1-3])\b/i,
      /\b(RE00[1-3])\b/i,
      /\b(REO00[1-8])\b/i,
      /\b(RO00[1-3])\b/i,
      /\b(SOUF00[1-3])\b/i,
      // Codes simples
      /\b(HAB-QF)\b/i,
      /\b(INACTIN)\b/i,
      /\b(VISIMED)\b/i,
      /\b(DISPO)\b/i,
      /\b(CONGE)\b/i,
      /\b(INACT)\b/i,
      /\b(FORM)\b/i,
      /\b(RPP)\b/i,
      /\b(VMT)\b/i,
      /\b(HAB)\b/i,
      /\b(MAL)\b/i,
      /\b(EAC)\b/i,
      /\b(EIA)\b/i,
      /\b(PCD)\b/i,
      // Codes très courts - attention aux faux positifs
      /\b(RP)\b(?!\s*[:/])/,
      /\b(NU)\b(?!\s*[:/])/,
      /\b(CA)\b(?=\s|$)/,
      /\b(MA)\b(?=\s|$)/,
      /\b(VM)\b(?=\s|$)/,
      /\b(VL)\b(?=\s|$)/,
      /\b(VT)\b(?=\s|$)/,
      /\b(FO)\b(?=\s|$)/,
      /\b(RU)\b(?=\s|$)/,
      /\b(DN)\b(?=\s|$)/,
      /\b(DR)\b(?=\s|$)/,
      /\b(NP)\b(?=\s|$)/,
      /\b(JF)\b(?=\s|$)/
    ];

    for (const pattern of codePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    return null;
  }

  /**
   * Trouve un code par description textuelle
   */
  static findCodeByDescription(text) {
    for (const { pattern, code } of this.DESCRIPTION_PATTERNS) {
      if (pattern.test(text)) {
        return code;
      }
    }
    return null;
  }

  /**
   * Devine le code service basé sur les horaires
   */
  static guessCodeByHoraires(horaires) {
    if (!horaires || horaires.length === 0) return null;

    const firstHoraire = horaires[0];
    const debut = parseInt(firstHoraire.debut?.split(':')[0] || 0);
    const fin = parseInt(firstHoraire.fin?.split(':')[0] || 0);

    // Service de nuit (22h-06h)
    if (debut >= 20 || (debut >= 18 && fin <= 8)) {
      return 'X';
    }
    
    // Service du soir (14h-22h)
    if (debut >= 12 && debut < 20) {
      return 'O';
    }
    
    // Service du matin (06h-14h)
    if (debut >= 4 && debut < 12) {
      return '-';
    }

    return null;
  }

  /**
   * Récupère le label d'un code service
   */
  static getServiceLabel(code) {
    if (!code) return 'À vérifier';
    const mapping = this.CODES_MAPPING[code.toUpperCase()];
    return mapping?.desc || code;
  }

  /**
   * Extrait les horaires d'une ligne
   */
  static extractHoraires(line) {
    const horaires = [];
    const timePattern = /(\d{2}:\d{2})\s+(\d{2}:\d{2})/g;
    let match;

    while ((match = timePattern.exec(line)) !== null) {
      const context = line.substring(Math.max(0, match.index - 20), match.index);
      const isIgnored = this.IGNORE_PATTERNS.some(p => context.includes(p));

      if (!isIgnored) {
        horaires.push({
          debut: match[1],
          fin: match[2]
        });
      }
    }

    return horaires;
  }

  /**
   * Détermine si c'est un service de nuit
   */
  static isNightService(horaires) {
    if (!horaires || horaires.length === 0) return false;
    
    for (const h of horaires) {
      const debut = parseInt(h.debut.split(':')[0]);
      const fin = parseInt(h.fin.split(':')[0]);
      
      if (debut >= 20 || (debut > 12 && fin < 8)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Nettoie et valide une entrée
   */
  static cleanEntry(entry) {
    // Conserver rawText pour debug mais limiter la taille
    if (entry.rawText && entry.rawText.length > 200) {
      entry.rawText = entry.rawText.substring(0, 200) + '...';
    }

    if (entry.serviceCode) {
      entry.serviceCode = entry.serviceCode.toUpperCase();
    }

    entry.isValid = this.VALID_SERVICE_CODES.has(entry.serviceCode);

    return entry;
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSING RÉPONSE VISION (JSON)
  // ═══════════════════════════════════════════════════════════════

  static parseVisionResponse(jsonString) {
    try {
      let cleanJson = jsonString
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const data = JSON.parse(cleanJson);

      const result = {
        success: true,
        method: 'pixtral-12b-2409',
        metadata: data.metadata || {},
        entries: [],
        stats: { total: 0, valid: 0, errors: 0, nightShifted: 0 }
      };

      if (data.entries && Array.isArray(data.entries)) {
        result.entries = data.entries.map(entry => {
          const serviceCode = entry.serviceCode?.toUpperCase();
          return {
            date: this.convertDateToISO(entry.date),
            dateDisplay: entry.date,
            dayOfWeek: entry.dayOfWeek,
            serviceCode: serviceCode || 'INCONNU',
            serviceLabel: this.getServiceLabel(serviceCode),
            horaires: entry.horaires || [],
            isNightService: this.isNightService(entry.horaires),
            isValid: this.VALID_SERVICE_CODES.has(serviceCode),
            hasError: !serviceCode,
            codeFoundExplicitly: !!serviceCode,
            guessedByHoraires: false
          };
        });
      }

      // v2.3 : Appliquer la déduplication améliorée
      let dedupedEntries = this.deduplicateAndMergeEntriesV2(result.entries);
      
      // *** v2.4 : Appliquer le décalage des services de nuit ***
      const { entries: shiftedEntries, nightShiftedCount } = this.applyNightShiftDateOffset(dedupedEntries);
      result.entries = shiftedEntries;
      result.stats.nightShifted = nightShiftedCount;

      result.stats.total = result.entries.length;
      result.stats.valid = result.entries.filter(e => e.isValid).length;
      result.stats.errors = result.entries.filter(e => e.hasError).length;

      return result;

    } catch (error) {
      console.error('❌ Erreur parsing JSON Vision:', error);
      return {
        success: false,
        error: `Parsing JSON: ${error.message}`,
        method: 'pixtral-12b-2409',
        metadata: {},
        entries: [],
        stats: { total: 0, valid: 0, errors: 1, nightShifted: 0 }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════

  static async fileToBase64(file) {
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

  static convertDateToISO(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  static createExtractionPrompt() {
    return `Tu es un expert en extraction de données pour les bulletins de commande SNCF.

INSTRUCTIONS CRITIQUES :
1. Extrais TOUTES les informations du bulletin
2. Retourne UNIQUEMENT un JSON valide, sans texte autour
3. Ignore les lignes METRO et RS (ce ne sont pas des services)

CODES DE SERVICE VALIDES (69 codes) :
- ACR001-003 : Aide Coordonnateur Régional
- CAC001-003 : Cadre Appui Circulation
- CCU001-006 : Centre Commande Unique / Régulateur Parc
- CENT001-003 : Centre Souffleur
- CRC001-003 : Coordonnateur Régional
- RC001-003 : Régulateur Centre
- RE001-003 : Régulateur Est
- REO001-008 : Régulateur Est/Ouest
- RO001-003 : Régulateur Ouest
- SOUF001-003 : Souffleur
- RP, RPP : Repos Périodique
- NU : Non Utilisé
- DISPO, D, DN, DR : Disponible
- INACTIN, I, INACT : Inaction
- CA, C, CONGE : Congé
- MA, MAL : Maladie
- HAB, HAB-QF : Habilitation
- VM, VMT, VISIMED : Visite Médicale
- FO, FORM : Formation
- EAC, EIA, NP, PCD, VL, VT, RU, JF, F

FORMAT JSON ATTENDU :
{
  "metadata": {
    "agent": "NOM PRENOM",
    "numeroCP": "XXXXXXXX",
    "periodeDebut": "JJ/MM/AAAA",
    "periodeFin": "JJ/MM/AAAA"
  },
  "entries": [
    {
      "date": "JJ/MM/AAAA",
      "dayOfWeek": "Lun",
      "serviceCode": "CCU003",
      "serviceLabel": "Description",
      "horaires": [{"debut": "HH:MM", "fin": "HH:MM"}]
    }
  ]
}`;
  }

  static async testExtraction(file) {
    console.log('🧪 Test d\'extraction Mistral PDF Reader v2.4.0 (avec décalage nuits)');
    console.log('═'.repeat(60));
    
    const result = await this.readPDF(file);
    
    console.log('\n📊 RÉSULTAT:');
    console.log('Succès:', result.success);
    console.log('Méthode:', result.method);
    console.log('Agent:', result.metadata?.agent);
    console.log('Période:', result.metadata?.periodeDebut, '-', result.metadata?.periodeFin);
    console.log('\n📅 ENTRÉES:');
    
    result.entries.forEach((entry, i) => {
      const status = entry.codeFoundExplicitly ? '✅' : (entry.guessedByHoraires ? '🔮' : '❌');
      const nightShift = entry.dateShiftedFromNight ? ` 🌙(de ${entry.originalDateDisplay})` : '';
      console.log(`  ${i + 1}. ${entry.dateDisplay} (${entry.dayOfWeek}) - ${entry.serviceCode} ${status}${nightShift}`);
    });
    
    console.log('\n📈 STATS:', result.stats);
    console.log('═'.repeat(60));
    
    return result;
  }
}

export default MistralPDFReaderService;
