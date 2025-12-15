/**
 * Couleurs par défaut pour les services et éléments du planning
 * VERSION 2.0 - Catégories alignées avec ModalCellEdit v3
 * 
 * Structure:
 * - Chaque catégorie a une couleur de groupe (defaultColor)
 * - Chaque élément peut avoir sa propre couleur (optionnel)
 * - Logique fallback: élément spécifique → couleur du groupe → défaut
 */

// ========================
// DÉFINITION DES CATÉGORIES
// ========================

export const COLOR_CATEGORIES = {
  horaires: {
    id: 'horaires',
    label: 'Horaires',
    description: 'Services de base (matin, soir, nuit)',
    defaultColor: { bg: '#ffffff', text: '#1e40af' },
    items: {
      '-': { label: 'Matin (06h-14h)' },
      'O': { label: 'Soir (14h-22h)' },
      'X': { label: 'Nuit (22h-06h)' },
      'I': { label: 'Jour' },
      'RP': { label: 'Repos programmé', defaultColor: { bg: '#dcfce7', text: '#166534' } },
      'NU': { label: 'Non utilisé', defaultColor: { bg: '#f3f4f6', text: '#374151' } }
    }
  },
  
  serviceJour: {
    id: 'serviceJour',
    label: 'Service de jour',
    description: 'VL, Disponible, EIA, DPX, PSE...',
    defaultColor: { bg: '#dbeafe', text: '#1e40af' }, // Bleu clair
    items: {
      'VL': { label: 'VL' },
      'D': { label: 'Disponible' },
      'DISPO': { label: 'Disponible (DISPO)' },
      'EIA': { label: 'EIA' },
      'DPX': { label: 'DPX' },
      'PSE': { label: 'PSE' },
      'INAC': { label: 'Inactif' },
      'INACTIN': { label: 'Inactif (INACTIN)' },
      'VM': { label: 'VM' }
    }
  },
  
  habilitationFormation: {
    id: 'habilitationFormation',
    label: 'Habilitation / Formation',
    description: 'HAB, FO RO, FO RC, FO CRC...',
    defaultColor: { bg: '#fed7aa', text: '#9a3412' }, // Orange
    items: {
      'HAB': { label: 'Habilitation' },
      'FO': { label: 'Formation (générique)' },
      'FO RO': { label: 'FO RO' },
      'FO RC': { label: 'FO RC' },
      'FO CAC': { label: 'FO CAC' },
      'FO CRC': { label: 'FO CRC' },
      'FO ACR': { label: 'FO ACR' },
      'FO CCU': { label: 'FO CCU' },
      'FO RE': { label: 'FO RE' }
    }
  },
  
  joursRH: {
    id: 'joursRH',
    label: 'Jours RH',
    description: 'VT, D2I, RU, F, RA, RN, TY...',
    defaultColor: { bg: '#fef9c3', text: '#854d0e' }, // Jaune clair
    items: {
      'VT': { label: 'Temps partiel' },
      'D2I': { label: 'D2I' },
      'RU': { label: 'RU' },
      'F': { label: 'F' },
      'RA': { label: 'RA' },
      'RN': { label: 'RN' },
      'TY': { label: 'TY' },
      'AY': { label: 'AY' },
      'AH': { label: 'AH' },
      'DD': { label: 'DD' }
    }
  },
  
  absences: {
    id: 'absences',
    label: 'Absences',
    description: 'Maladie, Congés',
    defaultColor: { bg: '#fecaca', text: '#991b1b' }, // Rouge clair
    items: {
      'MA': { label: 'Maladie' },
      'C': { label: 'Congés', defaultColor: { bg: '#fde047', text: '#713f12' } }
    }
  }
};

// ========================
// STRUCTURE DES COULEURS PAR DÉFAUT
// ========================

// Génère le DEFAULT_COLORS à partir des catégories
const generateDefaultColors = () => {
  const services = {};
  
  Object.values(COLOR_CATEGORIES).forEach(category => {
    const groupColor = category.defaultColor;
    
    Object.entries(category.items).forEach(([code, item]) => {
      // Utiliser la couleur spécifique de l'item ou la couleur du groupe
      services[code] = item.defaultColor || groupColor;
    });
  });
  
  return {
    services,
    postesSupp: { text: '#8b5cf6' },  // Violet pour +ACR, +RO, etc.
    texteLibre: { bg: '#fef3c7', text: '#92400e' },  // Fond ambre
    // Stockage des couleurs de groupe (pour le fallback)
    groups: Object.fromEntries(
      Object.entries(COLOR_CATEGORIES).map(([key, cat]) => [key, cat.defaultColor])
    )
  };
};

export const DEFAULT_COLORS = generateDefaultColors();

// ========================
// LABELS POUR L'INTERFACE
// ========================

// Génère les labels à partir des catégories
const generateServiceLabels = () => {
  const labels = {};
  
  Object.values(COLOR_CATEGORIES).forEach(category => {
    Object.entries(category.items).forEach(([code, item]) => {
      labels[code] = item.label;
    });
  });
  
  return labels;
};

export const SERVICE_LABELS = generateServiceLabels();

// ========================
// FONCTIONS UTILITAIRES
// ========================

/**
 * Trouve la catégorie d'un code de service
 * @param {string} code - Code du service (ex: "FO RO", "MA", "-")
 * @returns {object|null} - Catégorie ou null
 */
export const findCategoryForCode = (code) => {
  if (!code) return null;
  
  for (const [categoryKey, category] of Object.entries(COLOR_CATEGORIES)) {
    if (category.items[code]) {
      return { key: categoryKey, ...category };
    }
  }
  
  return null;
};

/**
 * Résout la couleur d'un code avec fallback
 * @param {string} code - Code du service
 * @param {object} customColors - Couleurs personnalisées de l'utilisateur
 * @returns {object} - { bg, text }
 */
export const resolveColorForCode = (code, customColors = {}) => {
  if (!code) return { bg: 'transparent', text: '#000000' };
  
  // 1. Chercher dans les couleurs personnalisées (élément spécifique)
  if (customColors.services?.[code]) {
    return customColors.services[code];
  }
  
  // 2. Trouver la catégorie du code
  const category = findCategoryForCode(code);
  
  if (category) {
    // 3. Chercher la couleur du groupe personnalisée
    if (customColors.groups?.[category.key]) {
      return customColors.groups[category.key];
    }
    
    // 4. Utiliser la couleur par défaut de l'item ou du groupe
    const itemDefault = category.items[code]?.defaultColor;
    return itemDefault || category.defaultColor;
  }
  
  // 5. Fallback final
  return { bg: 'transparent', text: '#000000' };
};

// ========================
// CONSTANTES
// ========================

export const COLORS_STORAGE_KEY = 'cogc-planning-colors';
export const COLORS_STORAGE_KEY_V2 = 'cogc-planning-colors-v2';
