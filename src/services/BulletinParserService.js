/**
 * BulletinParserService v8.1
 * Service de parsing des bulletins de commande SNCF
 * 
 * Améliorations v8.1 :
 * - Ajout méthodes statiques pour compatibilité ModalUploadPDF
 * - isConfigured(), getStatus(), configure()
 * 
 * Améliorations v8.0 :
 * - Détection ULTRA-ROBUSTE du nom de l'agent (15+ patterns)
 * - Support noms composés (DE LA FONTAINE, LE GOFF, D'AMATO)
 * - Support particules françaises (DE, DU, LE, LA, DES, D')
 * - Normalisation avancée du texte OCR
 * - Validation optionnelle par liste d'agents connus
 * - Gestion casse mixte (Martin DUPONT, MARTIN Jean-Pierre)
 * 
 * @author COGC Planning Team
 * @version 8.1.0
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

// Particules françaises (peuvent faire partie du nom)
const PARTICULES = ['DE', 'DU', 'LE', 'LA', 'DES', "D'", 'DE LA', 'VAN', 'VON', 'DI', 'DA'];

// ============================================================================
// PATTERNS REGEX
// ============================================================================

const PATTERNS = {
  // Dates
  dateComplete: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  dateISO: /(\d{4})-(\d{2})-(\d{2})/,
  
  // Numéro CP
  numeroCP: /N°\s*CP\s*:\s*(\d{7}[A-Z])/i,
  
  // Période
  periode: /Commande\s+allant\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  
  // Edition
  edition: /Edition\s+le\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*,?\s*(\d{1,2}:\d{2})/i,
  
  // Codes de service
  codePosteNum: /\b([A-Z]{2,4})(\d{3})\b/,
  codeSimple: /\b(RP|NU|C|DISPO|INACTIN|HAB|VISIMED|FO|VM|VL|EIA)\b/i,
  
  // Horaires
  horairesTexte: /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/,
  horairesN: /N\d+\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/,
  
  // Jours de semaine
  jourSemaine: /^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)$/i,
  
  // Éléments à ignorer
  ignorer: /^(METRO|RS|TRACTION|SOCIETE|Page|Signature|Fin d'impression|CHEMINS|FER|FRANCAIS)/i
};

// ============================================================================
// PATTERNS SPÉCIFIQUES POUR LES NOMS D'AGENTS (v8)
// ============================================================================

const AGENT_PATTERNS = {
  // Pattern 1: NOM PRÉNOM (tout majuscules, 2 mots minimum)
  toutMajuscules: /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ\s'-]*)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ\s'-]*)$/,
  
  // Pattern 2: NOM Prénom (nom majuscules, prénom CamelCase)
  nomMajPrenom: /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ\s'-]*)\s+([A-ZÀ][a-zàâäéèêëïîôùûüçœæ][a-zàâäéèêëïîôùûüçœæ\s'-]*)$/,
  
  // Pattern 3: Prénom NOM (prénom en minuscules, nom majuscules)
  prenomNom: /^([A-ZÀ][a-zàâäéèêëïîôùûüçœæ][a-zàâäéèêëïîôùûüçœæ\s'-]*)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ\s'-]*)$/,
  
  // Pattern 4: Avec particule (DE LA FONTAINE Jean, LE GOFF Patrick)
  avecParticule: /^((?:DE\s+LA\s+|DE\s+|DU\s+|LE\s+|LA\s+|DES\s+|D')[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ][A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆA-Za-zàâäéèêëïîôùûüçœæ\s'-]*)\s+([A-ZÀ-Ÿa-zà-ÿ][A-Za-zàâäéèêëïîôùûüçœæ\s'-]*)$/i,
  
  // Pattern 5: Nom avec tiret (JEAN-PIERRE MARTIN, MARTIN Jean-Pierre)
  avecTiret: /^([A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ]*(?:-[A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ]*)?)\s+([A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ]*(?:-[A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ]*)?)$/,
  
  // Pattern 6: Nom avec apostrophe (D'AMATO Marco)
  avecApostrophe: /^([A-ZÀ-Ÿ]?'?[A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ\s'-]*)\s+([A-ZÀ-Ÿa-zà-ÿ][A-Za-zàâäéèêëïîôùûüçœæ\s'-]*)$/,
  
  // Pattern 7: Format flexible (2-4 mots, commence par majuscule)
  flexible: /^[A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ'-]*(?:\s+[A-ZÀ-Ÿa-zà-ÿ][A-Za-zàâäéèêëïîôùûüçœæ'-]*){1,3}$/,
  
  // Pattern 8: Ligne après "Agent :" avec nom direct
  agentDirect: /Agent\s*:\s*([A-ZÀ-Ÿ][A-Za-zàâäéèêëïîôùûüçœæ\s'-]+)$/i,
  
  // Pattern 9: 2 mots minimum, lettres uniquement
  deuxMotsSimple: /^[A-Za-zÀ-ÿ'-]+\s+[A-Za-zÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ'-]+)*$/
};

// ============================================================================
// CONFIGURATION STATIQUE (pour compatibilité avec ModalUploadPDF)
// ============================================================================

let _staticConfig = {
  configured: true,
  apiKey: null,
  mode: 'local', // 'local' ou 'api'
  debug: true
};

// ============================================================================
// CLASSE PRINCIPALE
// ============================================================================

class BulletinParserService {
  
  // ==========================================================================
  // MÉTHODES STATIQUES (pour compatibilité ModalUploadPDF)
  // ==========================================================================
  
  /**
   * Vérifie si le service est configuré
   * @returns {boolean}
   */
  static isConfigured() {
    return _staticConfig.configured;
  }
  
  /**
   * Retourne le statut du service
   * @returns {Object}
   */
  static getStatus() {
    return {
      configured: _staticConfig.configured,
      mode: _staticConfig.mode,
      version: '8.1.0',
      features: {
        agentDetection: 'ultra-robust',
        nightShiftSupport: true,
        levenshteinMatching: true
      }
    };
  }
  
  /**
   * Configure le service
   * @param {Object} config - Configuration
   */
  static configure(config = {}) {
    _staticConfig = {
      ..._staticConfig,
      ...config,
      configured: true
    };
    console.log('[BulletinParserService] Configuration mise à jour:', _staticConfig);
  }
  
  /**
   * Parse un bulletin (méthode statique pour compatibilité)
   * @param {string} texte - Texte OCR du bulletin
   * @returns {Object}
   */
  static parse(texte) {
    const instance = new BulletinParserService({ debug: _staticConfig.debug });
    return instance.parseBulletin(texte);
  }
  
  /**
   * Retourne les codes de service disponibles
   * @returns {Object}
   */
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

  /**
   * Configure la liste des agents connus pour la validation
   * @param {Array} agents - Liste des agents {nom, prenom}
   */
  setAgentsConnus(agents) {
    this.agentsConnus = agents || [];
    this.log(`${this.agentsConnus.length} agents connus configurés`, 'info');
  }

  /**
   * Log de debug
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString().substring(11, 19);
    const prefix = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', debug: '🔍' }[type] || 'ℹ️';
    const logEntry = `[${timestamp}] ${prefix} ${message}`;
    
    if (this.debug) {
      console.log(logEntry);
    }
    this.logs.push({ timestamp, type, message });
  }

  /**
   * Normalise le texte OCR pour améliorer la détection
   * @param {string} texte - Texte brut
   * @returns {string} Texte normalisé
   */
  normaliserTexte(texte) {
    if (!texte) return '';
    
    return texte
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .replace(/[''‚]/g, "'")
      .replace(/[""„]/g, '"')
      .replace(/[–—−]/g, '-')
      .replace(/…/g, '...')
      .trim();
  }

  /**
   * Vérifie si un texte ressemble à un nom d'agent
   * @param {string} texte - Texte à vérifier
   * @returns {boolean}
   */
  ressembleANom(texte) {
    if (!texte || texte.length < 4) return false;
    
    const normalise = this.normaliserTexte(texte);
    
    if (!normalise.includes(' ')) return false;
    if (/\d/.test(normalise)) return false;
    
    const motsPrincipaux = normalise.toUpperCase().split(/\s+/);
    for (const mot of motsPrincipaux) {
      if (MOTS_EXCLUS.includes(mot) && !PARTICULES.includes(mot)) {
        return false;
      }
    }
    
    for (const [nomPattern, pattern] of Object.entries(AGENT_PATTERNS)) {
      if (pattern.test(normalise)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Standardise un nom en format "NOM PRÉNOM"
   * @param {string} nom - Nom brut
   * @returns {string} Nom standardisé
   */
  standardiserNom(nom) {
    if (!nom) return null;
    
    let normalise = this.normaliserTexte(nom);
    
    if (normalise === normalise.toLowerCase()) {
      normalise = normalise.toUpperCase();
    }
    
    for (const particule of PARTICULES) {
      const regex = new RegExp(`\\b${particule}\\s+`, 'gi');
      normalise = normalise.replace(regex, particule.toUpperCase() + ' ');
    }
    
    return normalise;
  }

  /**
   * Calcule la distance de Levenshtein entre deux chaînes
   */
  levenshtein(a, b) {
    if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
    
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Valide un nom détecté contre la liste des agents connus
   */
  validerContreListe(nomDetecte) {
    if (!this.agentsConnus.length || !nomDetecte) return null;
    
    const nomNormalise = nomDetecte.toUpperCase().replace(/\s+/g, ' ').trim();
    
    let meilleurMatch = null;
    let meilleureDistance = Infinity;
    
    for (const agent of this.agentsConnus) {
      const nomAgent = `${agent.nom} ${agent.prenom}`.toUpperCase();
      const nomAgentInverse = `${agent.prenom} ${agent.nom}`.toUpperCase();
      
      if (nomAgent === nomNormalise || nomAgentInverse === nomNormalise) {
        this.log(`Correspondance exacte trouvée: ${nomAgent}`, 'success');
        return { exact: true, agent, nom: nomAgent };
      }
      
      const distance1 = this.levenshtein(nomAgent, nomNormalise);
      const distance2 = this.levenshtein(nomAgentInverse, nomNormalise);
      const distance = Math.min(distance1, distance2);
      
      if (distance < meilleureDistance && distance <= 3) {
        meilleureDistance = distance;
        meilleurMatch = { partial: true, agent, distance, nom: nomAgent };
      }
    }
    
    if (meilleurMatch) {
      this.log(`Correspondance partielle: ${meilleurMatch.nom} (distance: ${meilleureDistance})`, 'warning');
    }
    
    return meilleurMatch;
  }

  /**
   * Parse un bulletin complet
   */
  parseBulletin(texte) {
    this.logs = [];
    this.log('=== PARSING BULLETIN v8.1 ===', 'info');
    
    const lignes = this.preparerTexte(texte);
    
    const resultat = {
      agent: null,
      agentValidation: null,
      numeroCP: this.extraireNumeroCP(lignes),
      periode: this.extrairePeriode(lignes),
      edition: this.extraireEdition(lignes),
      services: [],
      servicesNuit: [],
      logs: this.logs
    };
    
    const extractionAgent = this.extraireAgentV8(lignes);
    resultat.agent = extractionAgent.nom;
    resultat.agentConfiance = extractionAgent.confiance;
    resultat.agentMethode = extractionAgent.methode;
    
    if (resultat.agent && this.agentsConnus.length > 0) {
      resultat.agentValidation = this.validerContreListe(resultat.agent);
    }
    
    const servicesExtraits = this.extraireServices(lignes);
    resultat.services = this.postTraitementNuits(servicesExtraits);
    
    this.log(`=== RÉSULTAT: Agent="${resultat.agent}" (${resultat.agentMethode}), ${resultat.services.length} services ===`, 'success');
    
    return resultat;
  }

  /**
   * Prépare le texte en le découpant en lignes propres
   */
  preparerTexte(texte) {
    if (Array.isArray(texte)) {
      return texte.map(l => this.normaliserTexte(l)).filter(l => l.length > 0);
    }
    return texte
      .split(/[\r\n]+/)
      .map(l => this.normaliserTexte(l))
      .filter(l => l.length > 0);
  }

  /**
   * Extraction ULTRA-ROBUSTE du nom de l'agent (v8)
   */
  extraireAgentV8(lignes) {
    this.log('Recherche du nom de l\'agent (v8 - multi-stratégies)...', 'debug');
    
    const candidats = [];
    
    // STRATÉGIE 1: Pattern "Agent :" sur même ligne
    for (const ligne of lignes) {
      const match = ligne.match(AGENT_PATTERNS.agentDirect);
      if (match) {
        const nom = this.standardiserNom(match[1]);
        if (this.ressembleANom(nom)) {
          candidats.push({ nom, confiance: 95, methode: 'agent_direct' });
          this.log(`Stratégie 1 (agent_direct): "${nom}"`, 'debug');
        }
      }
    }
    
    // STRATÉGIE 2: Ligne "Agent :" puis nom dans les 5 lignes suivantes
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      
      if (/^Agent\s*:?\s*$/i.test(ligne)) {
        for (let j = 1; j <= 5 && i + j < lignes.length; j++) {
          const ligneSuivante = lignes[i + j];
          
          if (ligneSuivante === 'COGC PN' || ligneSuivante.length < 4) continue;
          if (/N°\s*CP/i.test(ligneSuivante)) break;
          
          if (this.ressembleANom(ligneSuivante)) {
            const nom = this.standardiserNom(ligneSuivante);
            candidats.push({ nom, confiance: 90, methode: 'apres_agent' });
            this.log(`Stratégie 2 (après "Agent:"): "${nom}"`, 'debug');
            break;
          }
        }
      }
    }
    
    // STRATÉGIE 3: Pattern NOM PRÉNOM dans les 20 premières lignes
    for (let i = 0; i < Math.min(20, lignes.length); i++) {
      const ligne = lignes[i];
      
      if (ligne === 'COGC PN' || MOTS_EXCLUS.some(m => ligne.includes(m))) continue;
      
      for (const [nomPattern, pattern] of Object.entries(AGENT_PATTERNS)) {
        if (nomPattern === 'agentDirect') continue;
        
        if (pattern.test(ligne)) {
          const nom = this.standardiserNom(ligne);
          if (this.ressembleANom(nom)) {
            let confiance = 70;
            if (nomPattern === 'toutMajuscules') confiance = 85;
            if (nomPattern === 'nomMajPrenom') confiance = 80;
            if (nomPattern === 'avecParticule') confiance = 75;
            
            candidats.push({ nom, confiance, methode: `pattern_${nomPattern}` });
            this.log(`Stratégie 3 (${nomPattern}): "${nom}" (confiance: ${confiance})`, 'debug');
          }
        }
      }
    }
    
    // STRATÉGIE 4: Recherche après "COGC PN"
    for (let i = 0; i < lignes.length; i++) {
      if (lignes[i] === 'COGC PN' && i + 1 < lignes.length) {
        const ligneSuivante = lignes[i + 1];
        if (this.ressembleANom(ligneSuivante) && !/N°\s*CP/i.test(ligneSuivante)) {
          const nom = this.standardiserNom(ligneSuivante);
          candidats.push({ nom, confiance: 88, methode: 'apres_cogc_pn' });
          this.log(`Stratégie 4 (après COGC PN): "${nom}"`, 'debug');
        }
      }
    }
    
    // STRATÉGIE 5: Validation par liste d'agents connus
    if (this.agentsConnus.length > 0) {
      for (let i = 0; i < Math.min(25, lignes.length); i++) {
        const ligne = lignes[i];
        const validation = this.validerContreListe(ligne);
        
        if (validation?.exact) {
          candidats.push({ 
            nom: validation.nom, 
            confiance: 100, 
            methode: 'liste_exact' 
          });
          this.log(`Stratégie 5 (liste exacte): "${validation.nom}"`, 'success');
        } else if (validation?.partial && validation.distance <= 2) {
          candidats.push({ 
            nom: validation.nom, 
            confiance: 95 - validation.distance * 5, 
            methode: 'liste_partiel' 
          });
          this.log(`Stratégie 5 (liste partielle): "${validation.nom}" (distance: ${validation.distance})`, 'debug');
        }
      }
    }
    
    // SÉLECTION DU MEILLEUR CANDIDAT
    if (candidats.length === 0) {
      this.log('Aucun nom d\'agent détecté', 'warning');
      return { nom: null, confiance: 0, methode: 'non_detecte' };
    }
    
    candidats.sort((a, b) => b.confiance - a.confiance);
    
    const meilleur = candidats[0];
    this.log(`Agent sélectionné: "${meilleur.nom}" (confiance: ${meilleur.confiance}%, méthode: ${meilleur.methode})`, 'success');
    
    return meilleur;
  }

  /**
   * Extraction du numéro CP
   */
  extraireNumeroCP(lignes) {
    for (const ligne of lignes) {
      const match = ligne.match(PATTERNS.numeroCP);
      if (match) {
        this.log(`N° CP trouvé: ${match[1]}`, 'success');
        return match[1];
      }
    }
    return null;
  }

  /**
   * Extraction de la période de commande
   */
  extrairePeriode(lignes) {
    for (const ligne of lignes) {
      const match = ligne.match(PATTERNS.periode);
      if (match) {
        const result = { debut: match[1], fin: match[2] };
        this.log(`Période trouvée: ${result.debut} → ${result.fin}`, 'success');
        return result;
      }
    }
    return null;
  }

  /**
   * Extraction de la date/heure d'édition
   */
  extraireEdition(lignes) {
    for (const ligne of lignes) {
      const match = ligne.match(PATTERNS.edition);
      if (match) {
        const result = { date: match[1], heure: match[2] };
        this.log(`Édition trouvée: ${result.date} ${result.heure}`, 'success');
        return result;
      }
    }
    return null;
  }

  /**
   * Extraction des services
   */
  extraireServices(lignes) {
    const services = [];
    let indexActuel = 0;
    
    while (indexActuel < lignes.length) {
      if (lignes[indexActuel].includes('pu déjà être notifié') ||
          lignes[indexActuel].includes('Commande allant du')) {
        indexActuel++;
        break;
      }
      indexActuel++;
    }
    
    this.log(`Début des services à l'index: ${indexActuel}`, 'debug');
    
    while (indexActuel < lignes.length) {
      const ligne = lignes[indexActuel];
      
      const matchDate = ligne.match(PATTERNS.dateComplete);
      if (matchDate) {
        const dateStr = `${matchDate[3]}-${matchDate[2].padStart(2, '0')}-${matchDate[1].padStart(2, '0')}`;
        const contexte = lignes.slice(indexActuel, Math.min(indexActuel + 15, lignes.length));
        const serviceExtrait = this.analyserContexteService(dateStr, contexte);
        
        if (serviceExtrait) {
          services.push(serviceExtrait);
          this.log(`Service extrait: ${dateStr} → ${serviceExtrait.code_service} (${serviceExtrait.poste || 'sans poste'})`, 'success');
        }
      }
      
      indexActuel++;
    }
    
    return services;
  }

  /**
   * Analyse le contexte autour d'une date pour extraire le service
   */
  analyserContexteService(date, contexte) {
    let codeService = null;
    let codePoste = null;
    let horaires = null;
    let estNuit = false;
    
    for (const ligne of contexte) {
      if (PATTERNS.ignorer.test(ligne)) continue;
      if (/^du\s+[A-Z]{3}\d{3}/i.test(ligne)) continue;
      
      const matchCode = ligne.match(PATTERNS.codePosteNum);
      if (matchCode && !codeService) {
        const codeComplet = `${matchCode[1]}${matchCode[2]}`;
        const mapping = SERVICE_CODES[codeComplet];
        
        if (mapping) {
          codeService = mapping.service;
          codePoste = mapping.poste;
          estNuit = mapping.type === 'nuit';
          this.log(`  Code ${codeComplet} → service: ${codeService}, poste: ${codePoste}`, 'debug');
        }
      }
      
      const matchSimple = ligne.match(PATTERNS.codeSimple);
      if (matchSimple && !codeService) {
        const code = matchSimple[0].toUpperCase();
        const mapping = SERVICE_CODES[code];
        
        if (mapping) {
          codeService = mapping.service;
          codePoste = mapping.poste;
        }
      }
      
      if (!codeService) {
        if (/Repos\s+périodique/i.test(ligne)) {
          codeService = 'RP';
        } else if (/Utilisable\s+non\s+utilisé/i.test(ligne)) {
          codeService = 'NU';
        } else if (/^Disponible$/i.test(ligne)) {
          codeService = 'D';
        } else if (/INACTIN/i.test(ligne)) {
          codeService = 'I';
        } else if (/VISIMED/i.test(ligne)) {
          codeService = 'VM';
        }
      }
      
      const matchHoraires = ligne.match(PATTERNS.horairesN) || ligne.match(PATTERNS.horairesTexte);
      if (matchHoraires && !horaires) {
        horaires = `${matchHoraires[1]}-${matchHoraires[2]}`;
        
        const heureDebut = parseInt(matchHoraires[1].split(':')[0]);
        const heureFin = parseInt(matchHoraires[2].split(':')[0]);
        if (heureDebut >= 22 || (heureDebut >= 20 && heureFin <= 8)) {
          estNuit = true;
        }
      }
      
      if (codeService) break;
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

  /**
   * Post-traitement des services de nuit
   */
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

  /**
   * Retourne les logs de la dernière exécution
   */
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
// TEST UNITAIRE INTÉGRÉ
// ============================================================================

export function testBulletinParserV8() {
  console.log('\n🧪 TEST BULLETIN PARSER v8.1\n');
  console.log('═'.repeat(70));
  
  // Test méthodes statiques
  console.log('\n📌 Test méthodes statiques:');
  console.log(`  isConfigured(): ${BulletinParserService.isConfigured()}`);
  console.log(`  getStatus():`, BulletinParserService.getStatus());
  
  const parser = new BulletinParserService({ debug: true });
  
  const testsNoms = [
    'GILLON THOMAS',
    'DE LA FONTAINE Jean',
    'LE GOFF Patrick',
    "D'AMATO Marco",
    'Jean-Pierre MARTIN',
    'MARTIN Jean-Pierre',
    'dupont martin',
    'VAN DER BERG Thomas'
  ];
  
  console.log('\n📝 Test des patterns de noms:\n');
  console.log('─'.repeat(70));
  
  for (const nom of testsNoms) {
    const ressemble = parser.ressembleANom(nom);
    const standardise = parser.standardiserNom(nom);
    console.log(`  ${ressemble ? '✅' : '❌'} "${nom}" → "${standardise}"`);
  }
  
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

  console.log('\n\n📋 Test bulletin complet:\n');
  console.log('─'.repeat(70));
  
  const resultat = parser.parseBulletin(texteTest);
  
  console.log(`\n📊 RÉSULTAT:`);
  console.log(`  Agent: ${resultat.agent || '❌ Non détecté'}`);
  console.log(`  Confiance: ${resultat.agentConfiance}%`);
  console.log(`  Méthode: ${resultat.agentMethode}`);
  console.log(`  N° CP: ${resultat.numeroCP || '❌ Non détecté'}`);
  console.log(`  Services: ${resultat.services.length}`);
  
  return resultat;
}
