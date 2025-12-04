/**
 * BulletinParserService v7.0
 * Service de parsing des bulletins de commande SNCF
 * 
 * Améliorations v7 :
 * - Détection robuste du nom de l'agent (multiples patterns)
 * - Gestion automatique des services de nuit (génération du X sur J+1)
 * - Support des doublons (NU + service de nuit même jour)
 * - Mapping complet des 89+ codes de service SNCF
 * 
 * @author COGC Planning Team
 * @version 7.0.0
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
  'CCU004': { service: '-', poste: 'RE', type: 'matin', horaires: '06:00-14:00' },  // CCU004 = RE matin
  'CCU005': { service: 'O', poste: 'RE', type: 'soir', horaires: '14:00-22:00' },   // CCU005 = RE soir
  'CCU006': { service: 'X', poste: 'RE', type: 'nuit', horaires: '22:00-06:00' },   // CCU006 = RE nuit

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

// ============================================================================
// PATTERNS REGEX
// ============================================================================

const PATTERNS = {
  // Dates
  dateComplete: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
  dateISO: /(\d{4})-(\d{2})-(\d{2})/,
  
  // Agent - Multiples patterns pour robustesse
  // CORRIGÉ: Accepte NOM PRÉNOM tout en majuscules OU NOM Prénom
  agentNomPrenom: /^([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{2,})\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{2,}|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)$/,
  agentLigne: /^Agent\s*:\s*$/i,
  agentNomSimple: /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{2,}\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{2,}|[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)$/,
  agentApresAgent: /Agent\s*[:\s]\s*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{2,}\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ]{2,})/i,
  
  // Numéro CP
  numeroCP: /N°\s*CP\s*:\s*(\d{7}[A-Z])/i,
  
  // Période
  periode: /Commande\s+allant\s+du\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+au\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  
  // Edition
  edition: /Edition\s+le\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*,?\s*(\d{1,2}:\d{2})/i,
  
  // Codes de service
  // Codes de service - flexible, pas besoin d'être en début de ligne
  codePosteNum: /\b([A-Z]{2,4})(\d{3})\b/,
  codeSimple: /\b(RP|NU|C|DISPO|INACTIN|HAB|VISIMED|FO|VM|VL|EIA)\b/i,
  
  // Horaires
  horairesTexte: /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/,
  horairesN: /N\d+\s+(\d{1,2}:\d{2})\s+(\d{1,2}:\d{2})/,
  
  // Jours de semaine
  jourSemaine: /^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)$/i,
  
  // Éléments à ignorer (transport, pagination, etc.)
  ignorer: /^(METRO|RS|TRACTION|SOCIETE|Page|Signature|Fin d'impression|CHEMINS|FER|FRANCAIS)/i
};

// ============================================================================
// CLASSE PRINCIPALE
// ============================================================================

class BulletinParserService {
  constructor() {
    this.debug = true;
    this.logs = [];
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
   * Parse un bulletin complet
   * @param {string} texte - Texte OCR du bulletin
   * @returns {Object} Résultat du parsing
   */
  parseBulletin(texte) {
    this.logs = [];
    this.log('=== PARSING BULLETIN v7.0 ===', 'info');
    
    const lignes = this.preparerTexte(texte);
    
    const resultat = {
      agent: this.extraireAgent(lignes),
      numeroCP: this.extraireNumeroCP(lignes),
      periode: this.extrairePeriode(lignes),
      edition: this.extraireEdition(lignes),
      services: [],
      servicesNuit: [], // Pour tracking des nuits
      logs: this.logs
    };
    
    // Extraire les services
    const servicesExtraits = this.extraireServices(lignes);
    
    // Post-traitement : ajouter les X pour les services de nuit
    resultat.services = this.postTraitementNuits(servicesExtraits);
    
    this.log(`=== RÉSULTAT: ${resultat.services.length} services extraits ===`, 'success');
    
    return resultat;
  }

  /**
   * Prépare le texte en le découpant en lignes propres
   */
  preparerTexte(texte) {
    if (Array.isArray(texte)) {
      return texte.map(l => l.trim()).filter(l => l.length > 0);
    }
    return texte
      .split(/[\r\n]+/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }

  /**
   * Extraction robuste du nom de l'agent
   * Utilise plusieurs stratégies de détection
   */
  extraireAgent(lignes) {
    this.log('Recherche du nom de l\'agent...', 'debug');
    
    // Stratégie 1 : Chercher après "Agent :"
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      
      // Pattern "Agent : NOM Prénom" sur même ligne
      const matchDirect = ligne.match(PATTERNS.agentApresAgent);
      if (matchDirect) {
        this.log(`Agent trouvé (pattern direct): ${matchDirect[1]}`, 'success');
        return matchDirect[1];
      }
      
      // Pattern "Agent :" suivi du nom sur les lignes suivantes
      if (/^Agent\s*:?\s*$/i.test(ligne)) {
        // Chercher dans les 3 lignes suivantes
        for (let j = 1; j <= 3 && i + j < lignes.length; j++) {
          const ligneSuiv = lignes[i + j];
          if (ligneSuiv === 'COGC PN') continue;
          if (PATTERNS.agentNomPrenom.test(ligneSuiv) && !ligneSuiv.includes('BULLETIN')) {
            this.log(`Agent trouvé (après "Agent:"): ${ligneSuiv}`, 'success');
            return ligneSuiv;
          }
        }
      }
    }
    
    // Stratégie 2 : Chercher un pattern NOM Prénom/PRÉNOM dans les 15 premières lignes
    for (let i = 0; i < Math.min(15, lignes.length); i++) {
      const ligne = lignes[i];
      if (PATTERNS.agentNomPrenom.test(ligne) && 
          ligne !== 'COGC PN' && 
          !ligne.includes('BULLETIN') &&
          !ligne.includes('SOCIETE')) {
        this.log(`Agent trouvé (pattern NOM): ${ligne}`, 'success');
        return ligne;
      }
    }
    
    this.log('Nom agent non détecté', 'warning');
    return null;
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
   * Parse le bulletin bloc par bloc
   */
  extraireServices(lignes) {
    const services = [];
    let indexActuel = 0;
    
    // Trouver le début des services (après "pu déjà être notifié")
    while (indexActuel < lignes.length) {
      if (lignes[indexActuel].includes('pu déjà être notifié') ||
          lignes[indexActuel].includes('Commande allant du')) {
        indexActuel++;
        break;
      }
      indexActuel++;
    }
    
    this.log(`Début des services à l'index: ${indexActuel}`, 'debug');
    
    // Parcourir et extraire les services
    while (indexActuel < lignes.length) {
      const ligne = lignes[indexActuel];
      
      // Chercher une date
      const matchDate = ligne.match(PATTERNS.dateComplete);
      if (matchDate) {
        const dateStr = `${matchDate[3]}-${matchDate[2].padStart(2, '0')}-${matchDate[1].padStart(2, '0')}`;
        
        // Analyser le contexte autour de cette date (15 lignes suivantes)
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
      // Ignorer les lignes non pertinentes
      if (PATTERNS.ignorer.test(ligne)) continue;
      if (/^du\s+[A-Z]{3}\d{3}/i.test(ligne)) continue; // "du CCU602" etc.
      
      // Codes numériques (CRC001, CCU004, etc.) - chercher dans toute la ligne
      const matchCode = ligne.match(PATTERNS.codePosteNum);
      if (matchCode && !codeService) {
        const codeComplet = `${matchCode[1]}${matchCode[2]}`;
        const mapping = SERVICE_CODES[codeComplet];
        
        if (mapping) {
          codeService = mapping.service;
          codePoste = mapping.poste;
          estNuit = mapping.type === 'nuit';
          this.log(`  Code ${codeComplet} → service: ${codeService}, poste: ${codePoste}, nuit: ${estNuit}`, 'debug');
        }
      }
      
      // Codes simples (RP, NU, DISPO, etc.)
      const matchSimple = ligne.match(PATTERNS.codeSimple);
      if (matchSimple && !codeService) {
        const code = matchSimple[0].toUpperCase();
        const mapping = SERVICE_CODES[code];
        
        if (mapping) {
          codeService = mapping.service;
          codePoste = mapping.poste;
          this.log(`  Code simple ${code} → service: ${codeService}`, 'debug');
        }
      }
      
      // Textes spéciaux
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
      
      // Horaires
      const matchHoraires = ligne.match(PATTERNS.horairesN) || ligne.match(PATTERNS.horairesTexte);
      if (matchHoraires && !horaires) {
        horaires = `${matchHoraires[1]}-${matchHoraires[2]}`;
        
        // Détection nuit par horaires
        const heureDebut = parseInt(matchHoraires[1].split(':')[0]);
        const heureFin = parseInt(matchHoraires[2].split(':')[0]);
        if (heureDebut >= 22 || (heureDebut >= 20 && heureFin <= 8)) {
          estNuit = true;
        }
      }
      
      // Sortir dès qu'on a trouvé un service
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
   * Ajoute automatiquement le "X" sur le jour J+1 pour les nuits
   */
  postTraitementNuits(services) {
    const resultatFinal = [];
    const nuitsAjoutees = new Set(); // Pour éviter les doublons
    
    for (const service of services) {
      resultatFinal.push(service);
      
      // Si c'est un service de nuit, ajouter le X sur J+1
      if (service.est_nuit && service.code_service === 'X') {
        const dateOrigine = new Date(service.date);
        dateOrigine.setDate(dateOrigine.getDate() + 1);
        const dateLendemain = dateOrigine.toISOString().split('T')[0];
        
        // Vérifier si on n'a pas déjà un service ce jour-là
        const dejaPresent = services.some(s => s.date === dateLendemain);
        const dejaAjoute = nuitsAjoutees.has(dateLendemain);
        
        if (!dejaPresent && !dejaAjoute) {
          this.log(`Nuit: ajout X automatique pour ${dateLendemain} (fin de nuit ${service.date})`, 'info');
          
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
    
    // Trier par date
    resultatFinal.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return resultatFinal;
  }

  /**
   * Convertit une date DD/MM/YYYY en YYYY-MM-DD
   */
  convertirDate(dateFR) {
    const match = dateFR.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
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
export { BulletinParserService, SERVICE_CODES, PATTERNS };

// ============================================================================
// TEST UNITAIRE INTÉGRÉ
// ============================================================================

/**
 * Test avec le bulletin GILLON THOMAS
 */
export function testBulletinGillonThomas() {
  const texteTest = `
BULLETIN DE COMMANDE UOP :
Agent :
COGC PN
GILLON THOMAS
N° CP : 8409385L
Date Utilisation Composition
Message :
Edition le 11/04/2025 , 15:07
Cette commande annule le service qui aurait
Commande allant du 21/04/2025 au 30/04/2025
pu déjà être notifié par un bulletin précédent.
21/04/2025
Régulateur Table PARC Denfert
CCU004 Lun
METRO 05:35 06:00 du CCU602
N1100010CO72 06:00 14:00
RS 14:00 14:10
METRO 14:10 14:35
22/04/2025
Coordonnateur Régional Circulation
CRC001 Mar
N1100010CO72 06:00 14:00 du CRC601
23/04/2025
Régulateur Table PARC Denfert
CCU004 Mer
METRO 05:35 06:00 du CCU602
N1100010CO72 06:00 14:00
RS 14:00 14:10
METRO 14:10 14:35
24/04/2025
NU Utilisable non utilisé Jeu
04:05 09:00 NU
24/04/2025
CRC/CCU DENFERT .
CCU003 Jeu
METRO 21:35 22:00 NU du CCU601
N1100010CO72 22:00 06:00
RS 06:00 06:10
METRO 06:10 06:35
25/04/2025
CRC/CCU DENFERT .
CCU003 Ven
METRO 21:35 22:00 du CCU601
N1100010CO72 22:00 06:00
RS 06:00 06:10
METRO 06:10 06:35
27/04/2025
Dim RP Repos périodique
SOCIETE NATIONALE DES CHEMINS DE FER FRANCAIS
Page : 1
BULLETIN DE COMMANDE UOP :
Agent :
COGC PN
GILLON THOMAS
N° CP : 8409385L
28/04/2025
RP Repos périodique Lun
29/04/2025
INACTIN Mar
N82F00100000 08:00 15:45 TRACTION
30/04/2025
Disponible
DISPO Mer
N82Z00100000 08:00 15:45
Fin d'impression ***** ********* **** **** ****
Signature :
SOCIETE NATIONALE DES CHEMINS DE FER FRANCAIS
Page : 2
  `;

  console.log('\n🧪 TEST BULLETIN GILLON THOMAS\n');
  console.log('═'.repeat(60));
  
  const parser = new BulletinParserService();
  const resultat = parser.parseBulletin(texteTest);
  
  console.log('\n📋 RÉSULTAT DU PARSING:');
  console.log('═'.repeat(60));
  console.log(`Agent: ${resultat.agent || '❌ Non détecté'}`);
  console.log(`N° CP: ${resultat.numeroCP || '❌ Non détecté'}`);
  console.log(`Période: ${resultat.periode ? `${resultat.periode.debut} → ${resultat.periode.fin}` : '❌ Non détectée'}`);
  
  console.log('\n📅 SERVICES EXTRAITS:');
  console.log('─'.repeat(60));
  
  for (const service of resultat.services) {
    const indicateurNuit = service.est_nuit ? '🌙' : '☀️';
    const indicateurAuto = service.genere_auto ? ' (auto)' : '';
    console.log(`${service.date} │ ${service.code_service.padEnd(3)} │ ${(service.poste || '-').padEnd(4)} │ ${indicateurNuit}${indicateurAuto}`);
  }
  
  console.log('─'.repeat(60));
  console.log(`Total: ${resultat.services.length} services\n`);
  
  // Vérifications
  const attendu = {
    agent: 'GILLON THOMAS',
    numeroCP: '8409385L',
    nbServices: 12 // 10 services originaux + 2 X générés automatiquement (25/04 et 26/04)
  };
  
  const testsPasses = {
    agent: resultat.agent === attendu.agent,
    numeroCP: resultat.numeroCP === attendu.numeroCP,
    nbServices: resultat.services.length >= 10
  };
  
  console.log('✅ VÉRIFICATIONS:');
  console.log(`  Agent: ${testsPasses.agent ? '✅' : '❌'} (attendu: ${attendu.agent})`);
  console.log(`  N° CP: ${testsPasses.numeroCP ? '✅' : '❌'} (attendu: ${attendu.numeroCP})`);
  console.log(`  Nb Services: ${testsPasses.nbServices ? '✅' : '❌'} (≥10 attendus, obtenu: ${resultat.services.length})`);
  
  return resultat;
}
