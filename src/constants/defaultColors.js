// Couleurs par défaut pour les services et éléments du planning
// Ces valeurs sont utilisées si l'utilisateur n'a pas personnalisé ses couleurs

export const DEFAULT_COLORS = {
  services: {
    '-': { bg: '#ffffff', text: '#000000' },          // Matin - fond blanc, texte noir
    'O': { bg: '#ffffff', text: '#000000' },          // Soir - fond blanc, texte noir
    'X': { bg: '#ffffff', text: '#000000' },          // Nuit - fond blanc, texte noir
    'RP': { bg: '#dcfce7', text: '#166534' },         // Repos périodique
    'C': { bg: '#facc15', text: '#713f12' },          // Congés
    'MA': { bg: '#fecaca', text: '#991b1b' },         // Maladie
    'D': { bg: '#bfdbfe', text: '#1e40af' },          // Disponible
    'FO': { bg: '#fed7aa', text: '#9a3412' },         // Formation
    'HAB': { bg: '#fed7aa', text: '#9a3412' },        // Habilitation
    'NU': { bg: '#f3f4f6', text: '#374151' },         // Non utilisé
    'DISPO': { bg: '#bfdbfe', text: '#1e40af' },      // Disponible
    'INACTIN': { bg: '#e5e7eb', text: '#6b7280' },    // Inactif
    'VT': { bg: '#99f6e4', text: '#0f766e' },         // VT - fond turquoise, texte teal
  },
  postesSupp: { text: '#8b5cf6' },                    // Violet pour +ACR, +RO, etc.
  texteLibre: { bg: '#fef3c7', text: '#92400e' },     // Fond ambre pour notes/commentaires
};

// Labels pour l'interface de configuration
export const SERVICE_LABELS = {
  '-': 'Matin (06h-14h)',
  'O': 'Soir (14h-22h)',
  'X': 'Nuit (22h-06h)',
  'RP': 'Repos périodique',
  'C': 'Congés',
  'MA': 'Maladie',
  'D': 'Disponible',
  'FO': 'Formation',
  'HAB': 'Habilitation',
  'NU': 'Non utilisé',
  'DISPO': 'Disponible (DISPO)',
  'INACTIN': 'Inactif',
  'VT': 'VT',
};

// Clé localStorage
export const COLORS_STORAGE_KEY = 'cogc-planning-colors';
