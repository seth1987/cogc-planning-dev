// Constants pour l'application COGC Planning

export const MONTHS = [
  'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'
];

// Année courante du planning
export const ANNEE_PLANNING = 2026;
export const CURRENT_YEAR = 2026;

// Jours fériés français 2026
// Pâques 2026 = 5 avril
export const JOURS_FERIES_2026 = {
  JANVIER: [1],           // Nouvel An (Jeudi)
  FEVRIER: [],
  MARS: [],
  AVRIL: [6],             // Lundi de Pâques (Pâques = 5 avril 2026)
  MAI: [1, 8, 14, 25],    // Fête du Travail (Ven), Victoire 1945 (Ven), Ascension (Jeu), Lundi Pentecôte (Lun)
  JUIN: [],
  JUILLET: [14],          // Fête Nationale (Mar)
  AOÛT: [15],             // Assomption (Sam)
  SEPTEMBRE: [],
  OCTOBRE: [],
  NOVEMBRE: [1, 11],      // Toussaint (Dim), Armistice (Mer)
  DECEMBRE: [25]          // Noël (Ven)
};

// Export principal utilisé par planningService
export const JOURS_FERIES = JOURS_FERIES_2026;

// Alias pour compatibilité descendante
export const JOURS_FERIES_2025 = JOURS_FERIES_2026;

export const CODE_COLORS = {
  // === SERVICES (-, O, X) : PAS DE COULEUR ===
  '-': '',
  'O': '', 
  'X': '',
  
  // === REPOS ===
  'RP': 'bg-green-100 text-green-700',
  'RU': 'bg-green-100 text-green-700',
  
  // === CONGES : JAUNE/OR ===
  'C': 'bg-yellow-400 text-yellow-900 font-semibold',
  'C?': 'bg-yellow-200 text-yellow-800 font-semibold',
  'CNA': 'bg-red-300 text-red-900 font-semibold',
  
  // === MALADIE : ROUGE ===
  'MA': 'bg-red-200 text-red-800 font-semibold',
  'F': 'bg-purple-200 text-purple-800 font-semibold',
  
  // === INACTIF ===
  'I': 'bg-pink-100 text-pink-700',
  'INAC': 'bg-blue-100 text-blue-800',
  'INACTIN': 'bg-gray-300 text-gray-700',
  
  // === DISPO : BLEU ===
  'D': 'bg-blue-100 text-blue-800',
  'DISPO': 'bg-blue-200 text-blue-800',
  
  // === NON UTILISE ===
  'NU': 'bg-gray-200 text-gray-600',
  
  // === SERVICE DE JOUR : BLEU CLAIR ===
  'VL': 'bg-blue-100 text-blue-800',
  'EIA': 'bg-blue-100 text-blue-800',
  'DPX': 'bg-blue-100 text-blue-800',
  'PSE': 'bg-blue-100 text-blue-800',
  'VM': 'bg-blue-100 text-blue-800',
  
  // === HAB/FO : ORANGE ===
  'FO': 'bg-orange-200 text-orange-800',
  'HAB': 'bg-orange-200 text-orange-800',
  'FO RO': 'bg-orange-200 text-orange-800',
  'FO RC': 'bg-orange-200 text-orange-800',
  'FO CAC': 'bg-orange-200 text-orange-800',
  'FO CRC': 'bg-orange-200 text-orange-800',
  'FO ACR': 'bg-orange-200 text-orange-800',
  'FO CCU': 'bg-orange-200 text-orange-800',
  'HAB-QF': 'bg-orange-200 text-orange-800',
  
  // === JOURS RH : JAUNE CLAIR ===
  'VT': 'bg-yellow-100 text-yellow-800',
  'D2I': 'bg-yellow-100 text-yellow-800',
  'RU': 'bg-yellow-100 text-yellow-800',
  'RA': 'bg-yellow-100 text-yellow-800',
  'RN': 'bg-yellow-100 text-yellow-800',
  'TY': 'bg-yellow-100 text-yellow-800',
  'AY': 'bg-yellow-100 text-yellow-800',
  'AH': 'bg-yellow-100 text-yellow-800',
  'DD': 'bg-yellow-100 text-yellow-800',
  
  // === SPECIAL ===
  'TQ': 'bg-pink-500 text-white',
  'figé': 'bg-gray-500 text-white',
  
  // === POSTES DE RESERVE : PAS DE COULEUR ===
  'CRC': '',
  'ACR': '',
  'RC': '',
  'RO': '',
  'CCU': '',
  'RE': '',
  'CAC': '',
  'SOUF': '',
  
  // === VIDE ===
  '': 'bg-gray-50 text-gray-400'
};

export const ORDRE_GROUPES = [
  'CRC - ROULEMENT CRC COGC',
  'ACR - ROULEMENT ACR COGC',
  'RC - ROULEMENT REGULATEUR CENTRE',
  'RO - ROULEMENT REGULATEUR TABLE OUEST',
  'RESERVE REGULATEUR PN',
  'RESERVE REGULATEUR DR',
  'CCU - ROULEMENT CCU DENFERT',
  'RE - ROULEMENT REGULATEUR TABLE EST DENFERT',
  'CAC - ROULEMENT DENFERT',
  'EAC - APPORT DENFERT',
  'RESERVE PCD - DENFERT'
];

export const GROUPES_PAR_STATUT = {
  roulement: [
    'CRC - ROULEMENT CRC COGC',
    'ACR - ROULEMENT ACR COGC',
    'RC - ROULEMENT REGULATEUR CENTRE',
    'RO - ROULEMENT REGULATEUR TABLE OUEST',
    'CCU - ROULEMENT CCU DENFERT',
    'RE - ROULEMENT REGULATEUR TABLE EST DENFERT',
    'CAC - ROULEMENT DENFERT'
  ],
  reserve: [
    'RESERVE REGULATEUR PN',
    'RESERVE REGULATEUR DR',
    'EAC - APPORT DENFERT',
    'RESERVE PCD - DENFERT'
  ]
};

// ============================================
// CODES HORAIRES DE BASE (toujours visibles)
// ============================================
export const SERVICE_CODES = [
  { code: '-', desc: 'Matin' },
  { code: 'O', desc: 'Soir' },
  { code: 'X', desc: 'Nuit' },
  { code: 'I', desc: 'Inactif' },
  { code: 'RP', desc: 'Repos' },
  { code: 'NU', desc: 'Non Utilisé' }
];

// ============================================
// ABSENCES (MA, F)
// ============================================
export const ABSENCES_CODES = [
  { code: 'MA', desc: 'Maladie' },
  { code: 'F', desc: 'Famille' }
];

// ============================================
// CONGES (C, C?, CNA)
// ============================================
export const CONGES_CODES = [
  { code: 'C', desc: 'Congé accordé' },
  { code: 'C?', desc: 'Congé en attente' },
  { code: 'CNA', desc: 'Congé non accordé' }
];

// ============================================
// SERVICE DE JOUR (accordéon)
// ============================================
export const SERVICE_JOUR_CODES = [
  { code: 'VL', desc: 'Visite Locale' },
  { code: 'D', desc: 'Disponible' },
  { code: 'EIA', desc: 'EIA' },
  { code: 'DPX', desc: 'Déplacement' },
  { code: 'PSE', desc: 'PSE' },
  { code: 'INAC', desc: 'Inactif jour' },
  { code: 'VM', desc: 'Visite Médicale' }
];

// ============================================
// HABILITATION / FORMATION (accordéon)
// ============================================
export const HABILITATION_CODES = [
  { code: 'HAB', desc: 'Habilitation' },
  { code: 'FO RO', desc: 'Formation RO' },
  { code: 'FO RC', desc: 'Formation RC' },
  { code: 'FO CAC', desc: 'Formation CAC' },
  { code: 'FO CRC', desc: 'Formation CRC' },
  { code: 'FO ACR', desc: 'Formation ACR' },
  { code: 'FO CCU', desc: 'Formation CCU' }
];

// ============================================
// JOURS RH (accordéon)
// ============================================
export const JOURS_RH_CODES = [
  { code: 'VT', desc: 'Temps partiel' },
  { code: 'D2I', desc: 'D2I' },
  { code: 'RU', desc: 'Récup Utilisé' },
  { code: 'RA', desc: 'Récup Accordé' },
  { code: 'RN', desc: 'Récup Non accord.' },
  { code: 'TY', desc: 'Travail de nuit' },
  { code: 'AY', desc: 'Abs. Autorisée' },
  { code: 'AH', desc: 'Absence heures' },
  { code: 'DD', desc: 'Droit dispo.' }
];

// Postes pour agents réserve (CENT et S/S supprimés)
export const POSTES_CODES = ['CRC', 'ACR', 'RC', 'RO', 'CCU', 'RE', 'CAC', 'SOUF'];

// Liste des postes avec option texte libre pour les formulaires
export const POSTES_CODES_WITH_LIBRE = [
  { code: '', desc: '— Aucun —' },
  { code: 'CRC', desc: 'CRC' },
  { code: 'ACR', desc: 'ACR' },
  { code: 'CCU', desc: 'CCU' },
  { code: 'RE', desc: 'RE' },
  { code: 'RC', desc: 'RC' },
  { code: 'RO', desc: 'RO' },
  { code: 'CAC', desc: 'CAC' },
  { code: 'SOUF', desc: 'SOUF' },
  { code: 'LIBRE', desc: '✏️ Texte libre...' }
];

// Postes spécifiques par groupe (pour les agents avec choix de poste limité)
export const POSTES_PAR_GROUPE = {
  // Agents RC - ROULEMENT REGULATEUR CENTRE → choix RC ou SOUFF
  'RC - ROULEMENT REGULATEUR CENTRE': ['RC', 'SOUF'],
  // Agents EAC - APPORT DENFERT → choix CCU ou RE
  'EAC - APPORT DENFERT': ['CCU', 'RE']
};

// Groupes qui ont accès au sélecteur de poste (réserves + groupes spéciaux)
export const GROUPES_AVEC_POSTE = [
  'RESERVE REGULATEUR PN',
  'RESERVE REGULATEUR DR',
  'RESERVE PCD - DENFERT',
  'RC - ROULEMENT REGULATEUR CENTRE',
  'EAC - APPORT DENFERT'
];

// Postes figés / Postes supplémentaires (disponibles pour réserve ET roulement)
export const POSTES_SUPPLEMENTAIRES = [
  { code: '+ACR', desc: 'Poste ACR supplémentaire' },
  { code: '+RO', desc: 'Poste RO supplémentaire' },
  { code: '+RE', desc: 'Poste RE supplémentaire' },
  { code: '+RC', desc: 'Poste RC supplémentaire' },
  { code: '+CCU', desc: 'Poste CCU supplémentaire' },
  { code: '+CAC', desc: 'Poste CAC supplémentaire' },
  { code: '+OV', desc: 'Poste OV supplémentaire' },
  { code: '+PN', desc: 'Rapatriement Paris Nord' }
];

// Constante pour détecter si une valeur est en mode texte libre
export const LIBRE_MARKER = 'LIBRE';
