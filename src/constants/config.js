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
  
  // === MALADIE : ROUGE ===
  'MA': 'bg-red-200 text-red-800 font-semibold',
  
  // === INACTIF ===
  'I': 'bg-pink-100 text-pink-700',
  'INACTIN': 'bg-gray-300 text-gray-700',
  
  // === DISPO : BLEU ===
  'D': 'bg-blue-200 text-blue-800',
  'DISPO': 'bg-blue-200 text-blue-800',
  
  // === NON UTILISE ===
  'NU': 'bg-gray-100 text-gray-500',
  
  // === HAB/FO : ORANGE ===
  'FO': 'bg-orange-200 text-orange-800',
  'VL': 'bg-orange-200 text-orange-800', 
  'VM': 'bg-orange-200 text-orange-800',
  'HAB': 'bg-orange-200 text-orange-800',
  'HAB-QF': 'bg-orange-200 text-orange-800',
  'EIA': 'bg-orange-200 text-orange-800',
  
  // === VT : JAUNE CLAIR ===
  'VT': 'bg-yellow-100 text-yellow-800',
  
  // === D2I : GRIS ===
  'D2I': 'bg-gray-300 text-gray-700',
  
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

// SERVICE_CODES - Le texte libre est géré par un bouton séparé dans ModalCellEdit
export const SERVICE_CODES = [
  { code: '-', desc: 'Matin (06h-14h)' },
  { code: 'O', desc: 'Soir (14h-22h)' },
  { code: 'X', desc: 'Nuit (22h-06h)' },
  { code: 'RP', desc: 'Repos programmé' },
  { code: 'C', desc: 'Congés' },
  { code: 'MA', desc: 'Maladie' },
  { code: 'D', desc: 'Disponible' },
  { code: 'NU', desc: 'Non Utilisé' },
  { code: 'I', desc: 'Inactif/Visite' },
  { code: 'HAB', desc: 'Habilitation/Formation' },
  { code: 'FO', desc: 'Formation' },
  { code: 'VT', desc: 'Temps partiel' },
  { code: 'D2I', desc: 'D2I' }
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
  { code: '+OV', desc: 'Poste OV supplémentaire' }
];

// Constante pour détecter si une valeur est en mode texte libre
export const LIBRE_MARKER = 'LIBRE';
