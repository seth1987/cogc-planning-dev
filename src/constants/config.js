// Constants pour l'application COGC Planning

export const MONTHS = [
  'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'
];

// Jours fériés français 2025
export const JOURS_FERIES_2025 = {
  JANVIER: [1],           // Nouvel An
  FEVRIER: [],
  MARS: [],
  AVRIL: [21],           // Lundi de Pâques
  MAI: [1, 8, 29],       // Fête du Travail, Victoire 1945, Ascension
  JUIN: [9],             // Lundi de Pentecôte
  JUILLET: [14],         // Fête Nationale
  AOÛT: [15],            // Assomption
  SEPTEMBRE: [],
  OCTOBRE: [],
  NOVEMBRE: [1, 11],     // Toussaint, Armistice
  DECEMBRE: [25]         // Noël
};

export const CODE_COLORS = {
  '-': 'bg-blue-100 text-blue-800 font-semibold',
  'O': 'bg-orange-100 text-orange-800 font-semibold', 
  'X': 'bg-purple-100 text-purple-800 font-semibold',
  'RP': 'bg-green-100 text-green-700',
  'RU': 'bg-green-100 text-green-700',
  'C': 'bg-green-100 text-green-700',
  'MA': 'bg-red-100 text-red-700',
  'I': 'bg-pink-100 text-pink-700',
  'D': 'bg-yellow-100 text-yellow-700',
  'NU': 'bg-gray-100 text-gray-500',
  'FO': 'bg-indigo-100 text-indigo-700',
  'VL': 'bg-indigo-100 text-indigo-700', 
  'VM': 'bg-indigo-100 text-indigo-700',
  'HAB': 'bg-indigo-100 text-indigo-700',
  'VT': 'bg-indigo-100 text-indigo-700',
  'EIA': 'bg-indigo-100 text-indigo-700',
  'TQ': 'bg-pink-500 text-white',
  'figé': 'bg-gray-500 text-white',
  'CRC': 'bg-rose-100 text-rose-800 font-semibold',
  'ACR': 'bg-rose-100 text-rose-800 font-semibold',
  'RC': 'bg-blue-100 text-blue-800 font-semibold',
  'RO': 'bg-blue-100 text-blue-800 font-semibold',
  'CCU': 'bg-emerald-100 text-emerald-800 font-semibold',
  'RE': 'bg-emerald-100 text-emerald-800 font-semibold',
  'CAC': 'bg-amber-100 text-amber-800 font-semibold',
  'SOUF': 'bg-cyan-100 text-cyan-800 font-semibold',
  '': 'bg-gray-50 text-gray-400'
};

export const ORDRE_GROUPES = [
  'CRC - ROULEMENT CRC COGC',
  'ACR - ROULEMENT ACR COGC',  // Corrigé de GOGC à COGC
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
    'ACR - ROULEMENT ACR COGC',  // Corrigé de GOGC à COGC
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
  { code: 'FO', desc: 'Formation' }
];

// Postes pour agents réserve (CENT et S/S supprimés)
export const POSTES_CODES = ['CRC', 'ACR', 'RC', 'RO', 'CCU', 'RE', 'CAC', 'SOUF'];

// Postes figés / Postes supplémentaires (disponibles pour réserve ET roulement)
export const POSTES_SUPPLEMENTAIRES = [
  { code: '+ACR', desc: 'Poste ACR supplémentaire' },
  { code: '+RO', desc: 'Poste RO supplémentaire' },
  { code: '+RE', desc: 'Poste RE supplémentaire' },
  { code: '+RC', desc: 'Poste RC supplémentaire' },
  { code: '+CCU', desc: 'Poste CCU supplémentaire' },
  { code: '+OV', desc: 'Poste OV supplémentaire' }
];
