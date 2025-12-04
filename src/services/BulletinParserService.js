/**
 * BulletinParserService v9.0
 * Service de parsing des bulletins de commande SNCF - VERSION CORRIGÉE
 * 
 * CORRECTIONS v9.0 :
 * - ✅ Gestion des entrées MULTIPLES sur la MÊME date (ex: 24/04 NU + CCU003)
 * - ✅ Priorisation codes longs (CCU, CRC) sur codes courts (NU, RP)
 * - ✅ Meilleure exclusion des références "NU du CCU601"
 * - ✅ Support complet services de nuit
 * - ✅ Séparation parsing par BLOC au lieu de recherche globale
 * 
 * @author COGC Planning Team
 * @version 9.0.0
 */

// ============================================================================
// CONSTANTES ET MAPPINGS
// ============================================================================

const SERVICE_CODES = {
  // CRC - Coordonnateur Régional Circulation
  'CRC001': { service: '-', poste: 'CRC', type: 'matin', horaires: '06:00-14:00' },
  'CRC002': { service: 'O', poste: 'CRC', type: 'soir', horaires: '14:00-22:00' },
  'CRC003': { service: 'X', poste: 'CRC', type: 'nuit', horaires: '22:00-06:00' },

  // ACR - Agent Circulation Régional
  'ACR001': { service: '-', poste: 'ACR', type: 'matin', horaires: '06:00-14:00' },
  'ACR002': { service: 'O', poste: 'ACR', type: 'soir', horaires: '14:00-22:00' },
  'ACR003': { service: 'X', poste: 'ACR', type: 'nuit', horaires: '22:00-06:00' },
  'ACR004': { service: '-', poste: 'ACR', type: 'matin', horaires: '06:00-14:00' },

  // CCU - Régulateur Table PARC (Denfert)
  'CCU001': { service: '-', poste: 'CCU', type: 'matin', horaires: '06:00-14:00' },
  'CCU002': { service: 'O', poste: 'CCU', type: 'soir', horaires: '14:00-22:00' },
  'CCU003': { service: 'X', poste: 'CCU', type: 'nuit', horaires: '22:00-06:00' },
  'CCU004': { service: '-', poste: 'RE', type: 'matin', horaires: '06:00-14:00' },
  'CCU005': { service: 'O', poste: 'RE', type: 'soir', horaires: '14:00-22:00' },
  'CCU006': { service: 'X', poste: 'RE', type: 'nuit', horaires: '22:00-06:00' },

  // CENT - Services Centraux/Sous-Station
  'CENT001': { service: '-', poste: 'S/S', type: 'matin', horaires: '06:00-14:00' },
  'CENT002': { service: 'O', poste: 'S/S', type: 'soir', horaires: '14:00-22:00' },
  'CENT003': { service: 'X', poste: 'S/S', type: 'nuit', horaires: '22:00-06:00' },

  // REO - Régulateur Exploitation
  'REO001': { service: '-', poste: 'RO', type: 'matin', horaires: '06:00-14:00' },
  'REO002': { service: 'O', poste: 'RO', type: 'soir', horaires: '14:00-22:00' },
  'REO003': { service: 'X', poste: 'RO', type: 'nuit', horaires: '22:00-06:00' },
  'REO004': { service: '-', poste: 'RO', type: 'matin', horaires: '06:00-14:00' },
  'REO005': { service: 'O', poste: 'RO', type: 'soir', horaires: '14:00-22:00' },
  'REO006': { service: 'X', poste: 'RO', type: 'nuit', horaires: '22:00-06:00' },
  'REO007': { service: '-', poste: 'RO', type: 'matin', horaires: '06:00-14:00' },
  'REO008': { service: 'O', poste: 'RO', type: 'soir', horaires: '13:25-21:10' },

  // RC - Régulateur Circulation
  'RC001': { service: '-', poste: 'RC', type: 'matin', horaires: '06:00-14:00' },
  'RC002': { service: 'O', poste: 'RC', type: 'soir', horaires: '14:00-22:00' },
  'RC003': { service: 'X', poste: 'RC', type: 'nuit', horaires: '22:00-06:00' },

  // RE - Régulateur Énergie
  'RE001': { service: '-', poste: 'RE', type: 'matin', horaires: '06:00-14:00' },
  'RE002': { service: 'O', poste: 'RE', type: 'soir', horaires: '14:00-22:00' },
  'RE003': { service: 'X', poste: 'RE', type: 'nuit', horaires: '22:00-06:00' },

  // RO - Régulateur Opérationnel  
  'RO001': { service: '-', poste: 'RO', type: 'matin', horaires: '06:00-14:00' },
  'RO002': { service: 'O', poste: 'RO', type: 'soir', horaires: '14:00-22:00' },

  // CAC - Centre Appui Circulation
  'CAC001': { service: '-', poste: 'CAC', type: 'matin', horaires: '06:00-14:00' },
  'CAC002': { service: 'O', poste: 'CAC', type: 'soir', horaires: '14:00-22:00' },

  // Codes spéciaux (sans poste)
  'RP': { service: 'RP', poste: '', type: 'repos', horaires: null },
  'RU': { service: 'RU', poste: '', type: 'repos', horaires: null },
  'NU': { service: 'NU', poste: '', type: 'disponibilité', horaires: null },
  'DISPO': { service: 'D', poste: '', type: 'disponibilité', horaires: '08:00-15:45' },
  'INACTIN': { service: 'I', poste: '', type: 'indisponibilité', horaires: '08:00-15:45' },
  'VISIMED': { service: 'VM', poste: '', type: 'visite_medicale', horaires: '08:00-15:45' },
  'C': { service: 'C', poste: '', type: 'conge', horaires: null },
  'HAB': { service: 'HAB', poste: '', type: 'formation', horaires: null },
  'HAB-QF': { service: 'HAB', poste: '', type: 'formation', horaires: null },
  'FO': { service: 'FO', poste: '', type: 'formation', horaires: null },
  'VM': { service: 'VM', poste: '', type: 'visite_medicale', horaires: null },
  'VL': { service: 'VL', poste: '', type: 'visite_medicale', horaires: null },
  'EIA': { service: 'EIA', poste: '', type: 'special', horaires: null }
};

// Mots à exclure de la détection de noms
const MOTS_EXCLUS = [
  'BULLETIN', 'COMMANDE', 'AGENT', 'COGC', 'SNCF', 'SOCIETE', 'NATIONALE',
  'CHEMINS', 'FER', 'FRANCAIS', 'PAGE', 'DATE', 'EDITION', 'SIGNATURE',
  'MESSAGE', 'UTILISATION', 'COMPOSITION', 'UOP', 'METRO', 'TRACTION',
  'IMPRESSION', 'COMMANDE', 'NOTIFIE', 'BULLETIN', 'PARC', 'DENFERT'
];

// Particules françaises
const PARTICULES = ['DE', 'DU', 'LE', 'LA', 'DES', "D'", 'DE LA', 'VAN', 'VON', 'DI', 'DA'];

// ============================================================================
// PATTERNS REGEX - SÉPARÉS PAR PRIORITÉ (v9.0)
// ============================================================================

const PATTERNS = {
  dateComplete: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  dateISO: /(\d{4})-(\d{2})-(\d{2})/,
  numeroCP: /N°\s*CP\s*:\s*(\d{7}[A-Z])/i,
  periode: /Commande\s+allant\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  edition: /Edition\s+le\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*,?\s*(\d{1,2}:\d{2})/i,
  
  // v9.0 : Codes LONGS (haute priorité)
  codesLongs: /\b(CCU00[1-6]|CRC00[1-3]|ACR00[1-4]|CENT00[1-3]|REO0(?:0[1-9]|10)|HAB-QF|VISIMED|INACTIN)\b/i,
  
  // v9.0 : Codes COURTS (basse priorité)
  codesCourts: /\b(RP|NU|C|DISPO|HAB|FO|VM|VL|EIA)\b/i,
  
  horairesTexte: /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/,
  horairesN: /N\d+\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/,
  jourSemaine: /^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)$/i,
  ignorer: /^(METRO|RS|TRACTION|SOCIETE|Page|Signature|Fin d'impression|CHEMINS|FER|FRANCAIS)/i
};

// Patterns pour noms d'agents
const AGENT_PATTERNS = {
  toutMajuscules: /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ\s'-]*)$/,
  agentDirect: /Agent\s*:\s*([A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ\s'-]+)$/i,
  deuxMotsSimple: /^[A-Za-zÀ-ÿ'-]+\s+[A-Za-zÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ'-]+)*$/
};

// ============================================================================
// CONFIGURATION STATIQUE
// ============================================================================

let _staticConfig = {
  configured: true,
  apiKey: null,
  mode: 'local',
  debug: true
};

// ============================================================================
// CLASSE PRINCIPALE - VERSION 9.0
// ============================================================================

class BulletinParserService {
  
  // ==========================================================================
  // MÉTHODES STATIQUES
  // ==========================================================================
  
  static isConfigured() {
    return _staticConfig.configured;
  }
  
  static getStatus() {
    return {
      configured: _staticConfig.configured,
      mode: _staticConfig.mode,
      version: '9.0.0',
      features: {
        multiServicePerDate: true, // v9.0 NEW
        agentDetection: 'ultra-robust',
        nightShiftSupport: true,
        codePrioritization: true // v9.0 NEW
      }
    };
  }
  
  static configure(config = {}) {
    _staticConfig = { ..._staticConfig, ...config, configured: true };
    console.log('[BulletinParserService] Configuration v9.0:', _staticConfig);
  }
  
  static parse(texte) {
    const instance = new BulletinParserService({ debug: _staticConfig.debug });
    return instance.parseBulletin(texte);
  }
  
  static getServiceCodes() {
    return SERVICE_CODES;
  }

  // ==========================================================================
  // CONSTRUCTEUR ET MÉTHODES D'INSTANCE
  // ==========================================================================
  
  constructor(options = {}) {
    this.debug = options.debug !== false;
    this.logs = [];
    this.agentsConnus = options.agents || [];
  }

  setAgentsConnus(agents) {
    this.agentsConnus = agents || [];
    this.log(`${this.agentsConnus.length} agents connus configurés`, 'info');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().substring(11, 19);
    const prefix = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', debug: '🔍' }[type] || 'ℹ️';
    const logEntry = `[${timestamp}] ${prefix} ${message}`;
    
    if (this.debug) console.log(logEntry);
    this.logs.push({ timestamp, type, message });
  }

  normaliserTexte(texte) {
    if (!texte) return '';
    return texte
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  // ==========================================================================
  // EXTRACTION NOM AGENT (ULTRA-ROBUSTE)
  // ==========================================================================

  extraireNomAgent(texte) {
    this.log('🔍 Extraction nom agent (ultra-robuste)...', 'debug');
    
    // Méthode 1: Pattern "Agent : COGC PN NOM PRENOM"
    const patternCOGC = /Agent\s*:?\s*COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ'-]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ'-]+)+)/i;
    const matchCOGC = texte.match(patternCOGC);
    if (matchCOGC) {
      const nom = this.nettoyerNom(matchCOGC[1]);
      if (nom) {
        this.log(`✅ Agent trouvé (pattern COGC): "${nom}"`, 'success');
        return nom;
      }
    }

    // Méthode 2: Analyse ligne par ligne après "COGC PN"
    const lignes = texte.split(/[\n\r]+/).map(l => l.trim()).filter(l => l);
    let indexCOGC = -1;
    
    for (let i = 0; i < lignes.length; i++) {
      if (/COGC\s*PN/i.test(lignes[i])) {
        indexCOGC = i;
        break;
      }
    }
    
    if (indexCOGC >= 0 && indexCOGC + 1 < lignes.length) {
      const ligneSuivante = lignes[indexCOGC + 1];
      if (this.ressembleAUnNom(ligneSuivante)) {
        const nom = this.nettoyerNom(ligneSuivante);
        if (nom) {
          this.log(`✅ Agent trouvé (ligne après COGC PN): "${nom}"`, 'success');
          return nom;
        }
      }
    }

    // Méthode 3: Recherche dans les agents connus
    for (const agent of this.agentsConnus) {
      const nomComplet = `${agent.nom} ${agent.prenom}`.toUpperCase();
      if (texte.toUpperCase().includes(nomComplet)) {
        this.log(`✅ Agent trouvé (liste connue): "${nomComplet}"`, 'success');
        return nomComplet;
      }
    }

    // Méthode 4: Pattern générique NOM PRENOM en majuscules
    const patternNomPrenom = /\b([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ'-]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ'-]+)\b/g;
    let match;
    while ((match = patternNomPrenom.exec(texte)) !== null) {
      const candidat = `${match[1]} ${match[2]}`;
      if (this.ressembleAUnNom(candidat)) {
        const nom = this.nettoyerNom(candidat);
        if (nom) {
          this.log(`✅ Agent trouvé (pattern générique): "${nom}"`, 'success');
          return nom;
        }
      }
    }

    this.log('⚠️ Aucun nom d\'agent détecté', 'warning');
    return null;
  }

  ressembleAUnNom(texte) {
    if (!texte || texte.length < 3) return false;
    
    const texteUpper = texte.toUpperCase().trim();
    
    // Exclure les mots-clés
    for (const mot of MOTS_EXCLUS) {
      if (texteUpper === mot || texteUpper.startsWith(mot + ' ')) return false;
    }
    
    // Doit contenir au moins 2 "mots"
    const mots = texteUpper.split(/\s+/).filter(m => m.length > 1);
    if (mots.length < 2) return false;
    
    // Ne doit pas contenir de chiffres
    if (/\d/.test(texte)) return false;
    
    // Ne doit pas être trop long (> 50 caractères suspect)
    if (texte.length > 50) return false;
    
    return true;
  }

  nettoyerNom(nom) {
    if (!nom) return null;
    
    let resultat = nom
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .toUpperCase();
    
    // Supprimer les mots parasites en fin
    const motsParasites = ['N°', 'CP', 'DATE', 'PAGE', 'EDITION', 'BULLETIN', 'MESSAGE'];
    for (const mot of motsParasites) {
      const index = resultat.indexOf(mot);
      if (index > 0) {
        resultat = resultat.substring(0, index).trim();
      }
    }
    
    return resultat.length >= 3 ? resultat : null;
  }

  // ==========================================================================
  // EXTRACTION NUMÉRO CP
  // ==========================================================================

  extraireNumeroCP(texte) {
    const match = texte.match(PATTERNS.numeroCP);
    if (match) {
      this.log(`✅ N° CP trouvé: ${match[1]}`, 'success');
      return match[1];
    }
    
    // Fallback: pattern plus souple
    const fallback = texte.match(/N[°o]?\s*CP\s*:?\s*(\d{7}[A-Z]?)/i);
    if (fallback) {
      this.log(`✅ N° CP trouvé (fallback): ${fallback[1]}`, 'success');
      return fallback[1];
    }
    
    return null;
  }

  // ==========================================================================
  // EXTRACTION PÉRIODE
  // ==========================================================================

  extrairePeriode(texte) {
    const match = texte.match(PATTERNS.periode);
    if (match) {
      return { debut: match[1], fin: match[2] };
    }
    return null;
  }

  // ==========================================================================
  // MÉTHODE PRINCIPALE DE PARSING v9.0
  // ==========================================================================

  parseBulletin(texte) {
    this.log('\n═══════════════════════════════════════════════════════', 'info');
    this.log('🚀 DÉMARRAGE PARSING BULLETIN v9.0 (multi-service)', 'info');
    this.log('═══════════════════════════════════════════════════════\n', 'info');
    
    if (!texte || texte.trim().length === 0) {
      this.log('❌ Texte vide reçu', 'error');
      return { agent: null, numeroCP: null, periode: null, services: [], errors: ['Texte vide'] };
    }

    this.log(`📄 Taille du texte: ${texte.length} caractères`, 'info');
    
    // Extraction des métadonnées
    const agent = this.extraireNomAgent(texte);
    const numeroCP = this.extraireNumeroCP(texte);
    const periode = this.extrairePeriode(texte);
    
    this.log(`📋 Agent: ${agent || 'Non détecté'}`, 'info');
    this.log(`📋 N° CP: ${numeroCP || 'Non détecté'}`, 'info');
    this.log(`📋 Période: ${periode ? `${periode.debut} - ${periode.fin}` : 'Non détectée'}`, 'info');
    
    // ===== EXTRACTION SERVICES v9.0 =====
    const services = this.extraireServicesV9(texte);
    
    // Post-traitement: ajout des nuits
    const servicesFinaux = this.postTraitementNuits(services);
    
    this.log(`\n📊 RÉSULTAT FINAL: ${servicesFinaux.length} services extraits`, 'success');
    
    // Stats multi-service
    const dateCount = new Map();
    servicesFinaux.forEach(s => {
      const count = dateCount.get(s.date) || 0;
      dateCount.set(s.date, count + 1);
    });
    const multiDates = Array.from(dateCount.entries()).filter(([_, c]) => c > 1);
    if (multiDates.length > 0) {
      this.log(`   Dates avec multi-services: ${multiDates.map(([d,c]) => `${d.substring(5)}(${c})`).join(', ')}`, 'info');
    }
    
    return {
      agent,
      numeroCP,
      periode,
      services: servicesFinaux,
      logs: this.logs
    };
  }

  // ==========================================================================
  // EXTRACTION SERVICES v9.0 - PAR BLOCS
  // ==========================================================================

  extraireServicesV9(texte) {
    this.log('\n🔍 Extraction services v9.0 (par blocs)...', 'info');
    
    const lignes = texte.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
    const services = [];
    
    // Identifier toutes les dates et leurs positions
    const datesPositions = [];
    
    for (let i = 0; i < lignes.length; i++) {
      const matchDate = lignes[i].match(PATTERNS.dateComplete);
      if (matchDate) {
        // Vérifier que ce n'est pas une date "Edition" ou "Commande"
        const contexte = lignes.slice(Math.max(0, i-2), i).join(' ').toLowerCase();
        if (!contexte.includes('edition') && !contexte.includes('commande') && !contexte.includes('allant')) {
          const jour = matchDate[1].padStart(2, '0');
          const mois = matchDate[2].padStart(2, '0');
          const annee = matchDate[3];
          const dateISO = `${annee}-${mois}-${jour}`;
          
          datesPositions.push({ index: i, date: dateISO, display: `${jour}/${mois}/${annee}` });
        }
      }
    }
    
    this.log(`   📅 ${datesPositions.length} blocs de dates identifiés`, 'info');
    
    // Traiter chaque bloc
    const entriesMap = new Map(); // Clé: date|code pour éviter doublons
    
    for (let d = 0; d < datesPositions.length; d++) {
      const { index, date, display } = datesPositions[d];
      const finBloc = d + 1 < datesPositions.length ? datesPositions[d + 1].index : lignes.length;
      
      const blocLignes = lignes.slice(index, finBloc);
      this.log(`\n   📅 Bloc ${display} (lignes ${index}-${finBloc-1}):`, 'debug');
      
      // Analyser le contexte du bloc
      const serviceInfo = this.analyserContexteServiceV9(blocLignes, date);
      
      if (serviceInfo) {
        const key = `${date}|${serviceInfo.code_service}`;
        if (!entriesMap.has(key)) {
          entriesMap.set(key, serviceInfo);
          this.log(`      ✅ Service: ${serviceInfo.code_service} (${serviceInfo.poste || 'sans poste'})`, 'success');
        }
      }
    }
    
    return Array.from(entriesMap.values());
  }

  // ==========================================================================
  // ANALYSE CONTEXTE SERVICE v9.0 - PRIORISATION CODES
  // ==========================================================================

  analyserContexteServiceV9(contexte, date) {
    let codeService = null;
    let codePoste = '';
    let horaires = null;
    let estNuit = false;
    
    // ===== PASSE 1 : Chercher d'abord les codes LONGS (prioritaires) =====
    for (const ligne of contexte) {
      // Ignorer les lignes METRO/RS
      if (PATTERNS.ignorer.test(ligne)) continue;
      
      // Ignorer les références "du CCU601"
      if (/du\s+(CCU|CRC|ACR)\d{3}/i.test(ligne)) continue;
      
      const matchLong = ligne.match(PATTERNS.codesLongs);
      if (matchLong) {
        const codeComplet = matchLong[1].toUpperCase();
        
        // Vérifier que ce n'est pas une référence
        if (!new RegExp(`du\\s+${codeComplet}`, 'i').test(ligne)) {
          const mapping = SERVICE_CODES[codeComplet];
          if (mapping) {
            codeService = mapping.service;
            codePoste = mapping.poste;
            estNuit = mapping.type === 'nuit';
            this.log(`      Code LONG: ${codeComplet} → ${codeService}/${codePoste}`, 'debug');
            break; // Code long trouvé, on arrête
          }
        }
      }
    }
    
    // ===== PASSE 2 : Si pas de code long, chercher codes COURTS =====
    if (!codeService) {
      const texteBloc = contexte.join(' ');
      
      // RP : Repos périodique
      if (/\bRP\b/i.test(texteBloc) && /Repos\s+périodique/i.test(texteBloc)) {
        codeService = 'RP';
        this.log(`      Code COURT: RP (repos périodique)`, 'debug');
      }
      // NU : Non utilisé (attention aux références !)
      else if (/Utilisable\s+non\s+utilisé/i.test(texteBloc) || /^\s*NU\s+/im.test(texteBloc)) {
        // Vérifier que ce n'est pas "NU du CCU"
        if (!/NU\s+du\s/i.test(texteBloc)) {
          codeService = 'NU';
          this.log(`      Code COURT: NU (non utilisé)`, 'debug');
        }
      }
      // DISPO : Disponible
      else if (/^Disponible$/im.test(texteBloc) || /\bDISPO\b/i.test(texteBloc)) {
        codeService = 'D';
        this.log(`      Code COURT: DISPO`, 'debug');
      }
      // INACTIN
      else if (/\bINACTIN\b/i.test(texteBloc)) {
        codeService = 'I';
        this.log(`      Code COURT: INACTIN`, 'debug');
      }
      // VISIMED
      else if (/\bVISIMED\b/i.test(texteBloc)) {
        codeService = 'VM';
        this.log(`      Code COURT: VISIMED`, 'debug');
      }
    }
    
    // ===== Extraction horaires =====
    for (const ligne of contexte) {
      const matchHoraires = ligne.match(PATTERNS.horairesN) || ligne.match(PATTERNS.horairesTexte);
      if (matchHoraires && !horaires) {
        horaires = `${matchHoraires[1]}-${matchHoraires[2]}`;
        
        const heureDebut = parseInt(matchHoraires[1].split(':')[0]);
        const heureFin = parseInt(matchHoraires[2].split(':')[0]);
        if (heureDebut >= 22 || (heureDebut >= 20 && heureFin <= 8)) {
          estNuit = true;
        }
      }
    }
    
    if (!codeService) return null;
    
    return {
      date,
      code_service: codeService,
      poste: codePoste || '',
      horaires: horaires || null,
      est_nuit: estNuit
    };
  }

  // ==========================================================================
  // POST-TRAITEMENT NUITS
  // ==========================================================================
  
  postTraitementNuits(services) {
    const resultatFinal = [];
    const nuitsAjoutees = new Set();
    
    for (const service of services) {
      resultatFinal.push(service);
      
      if (service.est_nuit && service.code_service === 'X') {
        const dateOrigine = new Date(service.date);
        dateOrigine.setDate(dateOrigine.getDate() + 1);
        const dateLendemain = dateOrigine.toISOString().split('T')[0];
        
        const dejaPresent = services.some(s => s.date === dateLendemain);
        const dejaAjoute = nuitsAjoutees.has(dateLendemain);
        
        if (!dejaPresent && !dejaAjoute) {
          this.log(`Nuit: ajout X automatique pour ${dateLendemain}`, 'info');
          resultatFinal.push({
            date: dateLendemain,
            code_service: 'X',
            poste: service.poste,
            horaires: '00:00-06:00',
            est_nuit: true,
            genere_auto: true,
            source_nuit: service.date
          });
          nuitsAjoutees.add(dateLendemain);
        }
      }
    }
    
    resultatFinal.sort((a, b) => new Date(a.date) - new Date(b.date));
    return resultatFinal;
  }

  getLogs() {
    return this.logs;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BulletinParserService;
export { BulletinParserService, SERVICE_CODES, PATTERNS, AGENT_PATTERNS };

// ============================================================================
// TEST UNITAIRE v9.0
// ============================================================================

export function testBulletinParserV9() {
  console.log('\n🧪 TEST BULLETIN PARSER v9.0 (multi-service)\n');
  console.log('═'.repeat(70));
  
  const parser = new BulletinParserService({ debug: true });
  
  // Test avec le bulletin de l'utilisateur (24/04 avec NU + CCU003)
  const texteTest = `
BULLETIN DE COMMANDE UOP :
Agent :
COGC PN
GILLON THOMAS
N° CP : 8409385L
Date Utilisation Composition
Message :
Edition le 11/04/2025 , 15:07
Commande allant du 21/04/2025 au 30/04/2025
pu déjà être notifié par un bulletin précédent.
21/04/2025
Régulateur Table PARC Denfert
CCU004 Lun
METRO 05:35 06:00 du CCU602
N1100010CO72 06:00 14:00
22/04/2025
Coordonnateur Régional Circulation
CRC001 Mar
N1100010CO72 06:00 14:00 du CRC601
24/04/2025
NU Utilisable non utilisé Jeu
04:05 09:00 NU
24/04/2025
CRC/CCU DENFERT .
CCU003 Jeu
METRO 21:35 22:00 NU du CCU601
N1100010CO72 22:00 06:00
27/04/2025
Dim RP Repos périodique
28/04/2025
RP Repos périodique Lun
29/04/2025
INACTIN Mar
30/04/2025
Disponible
DISPO Mer
`;

  console.log('\n📋 Test bulletin avec MULTI-SERVICE (24/04):\n');
  console.log('─'.repeat(70));
  
  const resultat = parser.parseBulletin(texteTest);
  
  console.log(`\n📊 RÉSULTAT v9.0:`);
  console.log(`  Agent: ${resultat.agent || '❌ Non détecté'}`);
  console.log(`  N° CP: ${resultat.numeroCP || '❌ Non détecté'}`);
  console.log(`  Total Services: ${resultat.services.length}`);
  
  console.log(`\n📅 Détail des services:`);
  resultat.services.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.date} → ${s.code_service} | Poste: ${s.poste || '-'} | Nuit: ${s.est_nuit ? '✓' : '✗'}`);
  });
  
  // Vérification spécifique pour le 24/04
  const services24 = resultat.services.filter(s => s.date === '2025-04-24');
  console.log(`\n🎯 TEST CRITIQUE - 24/04/2025:`);
  console.log(`  Attendu: 2 services (NU + CCU003/X)`);
  console.log(`  Obtenu: ${services24.length} services`);
  services24.forEach(s => console.log(`    - ${s.code_service} (${s.poste || 'sans poste'})`));
  
  if (services24.length === 2) {
    console.log(`  ✅ TEST RÉUSSI!`);
  } else {
    console.log(`  ❌ TEST ÉCHOUÉ - multi-service non détecté`);
  }
  
  return resultat;
}
