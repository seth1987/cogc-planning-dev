/**
 * Couleurs par défaut pour les services et éléments du planning
 * VERSION 3.2 - Ajout catégorie Poste (Réserve)
 */

// Horaires de base pour les combinaisons
export const HORAIRES_BASE = [
  { code: '-', label: 'Matin' },
  { code: 'O', label: 'Soir' },
  { code: 'X', label: 'Nuit' },
];

// ========================
// DÉFINITION DES CATÉGORIES
// ========================

export const COLOR_CATEGORIES = {
  // Horaires : OUVERT par défaut
  horaires: {
    id: 'horaires',
    label: 'Horaire',
    description: 'Matin, Soir, Nuit, Repos, Non utilisé',
    defaultOpen: true,
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
  
  // Poste (Réserve) : OUVERT par défaut
  posteReserve: {
    id: 'posteReserve',
    label: 'Poste (Réserve)',
    description: 'CRC, ACR, RC, RO, CCU, RE, CAC, SOUF',
    defaultOpen: true,
    defaultColor: { bg: '#e0e7ff', text: '#3730a3' }, // Indigo clair
    items: {
      'CRC': { label: 'CRC - Coordinateur Régional' },
      'ACR': { label: 'ACR - Agent Circulation' },
      'RC': { label: 'RC - Régulateur Centre' },
      'RO': { label: 'RO - Régulateur Ouest' },
      'CCU': { label: 'CCU - Centre Commandement Unifié' },
      'RE': { label: 'RE - Régulateur Est' },
      'CAC': { label: 'CAC - Denfert' },
      'SOUF': { label: 'SOUF - Soufflerie' }
    }
  },
  
  // Absences : OUVERT par défaut
  absences: {
    id: 'absences',
    label: 'Absences',
    description: 'Maladie, Congés',
    defaultOpen: true,
    defaultColor: { bg: '#fecaca', text: '#991b1b' },
    items: {
      'MA': { label: 'Maladie' },
      'C': { label: 'Congés', defaultColor: { bg: '#fde047', text: '#713f12' } }
    }
  },
  
  // Service de jour : FERMÉ par défaut
  serviceJour: {
    id: 'serviceJour',
    label: 'Service de jour',
    description: 'VL, Disponible, EIA, DPX, PSE...',
    defaultOpen: false,
    defaultColor: { bg: '#dbeafe', text: '#1e40af' },
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
  
  // Habilitation/Formation : FERMÉ par défaut, avec sous-catégories
  habilitationFormation: {
    id: 'habilitationFormation',
    label: 'Habilitation / Formation',
    description: 'HAB, FO RO, FO RC, FO CRC... avec horaires',
    defaultOpen: false,
    defaultColor: { bg: '#fed7aa', text: '#9a3412' },
    hasSubCategories: true,
    subCategories: {
      'HAB': {
        label: 'Habilitation',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO': {
        label: 'Formation (générique)',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO RO': {
        label: 'FO RO',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO RC': {
        label: 'FO RC',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO CAC': {
        label: 'FO CAC',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO CRC': {
        label: 'FO CRC',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO ACR': {
        label: 'FO ACR',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO CCU': {
        label: 'FO CCU',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      },
      'FO RE': {
        label: 'FO RE',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
      }
    },
    items: {} // Sera rempli dynamiquement
  },
  
  // Jours RH : FERMÉ par défaut
  joursRH: {
    id: 'joursRH',
    label: 'Jours RH',
    description: 'VT, D2I, RU, F, RA, RN, TY...',
    defaultOpen: false,
    defaultColor: { bg: '#fef9c3', text: '#854d0e' },
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
  }
};

// Générer les items pour habilitationFormation (sous-catégorie + horaires)
const generateHabilitationItems = () => {
  const items = {};
  const subCats = COLOR_CATEGORIES.habilitationFormation.subCategories;
  
  Object.entries(subCats).forEach(([subCatCode, subCat]) => {
    // Item de base (sans horaire)
    items[subCatCode] = {
      label: subCat.label,
      defaultColor: subCat.defaultColor,
      isSubCategory: true,
    };
    
    // Combinaisons avec horaires
    HORAIRES_BASE.forEach(horaire => {
      const combinedCode = `${subCatCode} ${horaire.code}`;
      items[combinedCode] = {
        label: `${subCat.label} ${horaire.label}`,
        defaultColor: subCat.defaultColor,
        parentSubCategory: subCatCode,
        horaire: horaire.code,
      };
    });
  });
  
  return items;
};

// Appliquer les items générés
COLOR_CATEGORIES.habilitationFormation.items = generateHabilitationItems();

// ========================
// STRUCTURE DES COULEURS PAR DÉFAUT
// ========================

const generateDefaultColors = () => {
  const services = {};
  
  Object.values(COLOR_CATEGORIES).forEach(category => {
    const groupColor = category.defaultColor;
    
    if (category.items) {
      Object.entries(category.items).forEach(([code, item]) => {
        services[code] = item.defaultColor || groupColor;
      });
    }
  });
  
  return {
    services,
    subCategoryModes: {},
    postesSupp: { text: '#8b5cf6' },
    texteLibre: { bg: '#fef3c7', text: '#92400e' },
    groups: Object.fromEntries(
      Object.entries(COLOR_CATEGORIES).map(([key, cat]) => [key, cat.defaultColor])
    )
  };
};

export const DEFAULT_COLORS = generateDefaultColors();

// ========================
// LABELS POUR L'INTERFACE
// ========================

const generateServiceLabels = () => {
  const labels = {};
  
  Object.values(COLOR_CATEGORIES).forEach(category => {
    if (category.items) {
      Object.entries(category.items).forEach(([code, item]) => {
        labels[code] = item.label;
      });
    }
  });
  
  return labels;
};

export const SERVICE_LABELS = generateServiceLabels();

// ========================
// FONCTIONS UTILITAIRES
// ========================

/**
 * Trouve la catégorie d'un code de service
 */
export const findCategoryForCode = (code) => {
  if (!code) return null;
  
  for (const [categoryKey, category] of Object.entries(COLOR_CATEGORIES)) {
    if (category.items && category.items[code]) {
      return { key: categoryKey, ...category };
    }
  }
  
  return null;
};

/**
 * Trouve la sous-catégorie parent d'un code combiné
 */
export const findParentSubCategory = (code) => {
  if (!code) return null;
  
  const habItems = COLOR_CATEGORIES.habilitationFormation.items;
  const item = habItems[code];
  
  if (item?.parentSubCategory) {
    return item.parentSubCategory;
  }
  
  if (item?.isSubCategory) {
    return code;
  }
  
  return null;
};

/**
 * Vérifie si tous les éléments d'une sous-catégorie ont la même couleur
 */
export const isSubCategoryUniform = (subCatCode, customColors) => {
  if (!customColors?.services) return true;
  
  const horaireCodes = HORAIRES_BASE.map(h => `${subCatCode} ${h.code}`);
  const colors = horaireCodes.map(code => {
    const c = customColors.services[code];
    return c ? `${c.bg}|${c.text}` : null;
  }).filter(Boolean);
  
  if (colors.length === 0) return true;
  return colors.every(c => c === colors[0]);
};

/**
 * Résout la couleur d'un code avec fallback
 */
export const resolveColorForCode = (code, customColors = {}) => {
  if (!code) return { bg: 'transparent', text: '#000000' };
  
  if (customColors.services?.[code]) {
    const custom = customColors.services[code];
    if (custom.bg && custom.bg !== 'transparent') {
      return custom;
    }
  }
  
  const parentSubCat = findParentSubCategory(code);
  if (parentSubCat && customColors.services?.[parentSubCat]) {
    const parentColor = customColors.services[parentSubCat];
    if (parentColor.bg && parentColor.bg !== 'transparent') {
      return parentColor;
    }
  }
  
  const category = findCategoryForCode(code);
  
  if (category) {
    if (customColors.groups?.[category.key]) {
      return customColors.groups[category.key];
    }
    
    const itemDefault = category.items[code]?.defaultColor;
    return itemDefault || category.defaultColor;
  }
  
  return { bg: 'transparent', text: '#000000' };
};

/**
 * Recherche tous les codes correspondant à un terme
 */
export const searchCodes = (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length === 0) return [];
  
  const term = searchTerm.toUpperCase().trim();
  const results = [];
  
  Object.entries(COLOR_CATEGORIES).forEach(([categoryKey, category]) => {
    if (category.items) {
      Object.entries(category.items).forEach(([code, item]) => {
        // Chercher dans le code ou le label
        if (code.toUpperCase().includes(term) || item.label.toUpperCase().includes(term)) {
          results.push({
            code,
            label: item.label,
            categoryKey,
            categoryLabel: category.label,
            defaultColor: item.defaultColor || category.defaultColor,
            isSubCategory: item.isSubCategory,
            parentSubCategory: item.parentSubCategory,
          });
        }
      });
    }
  });
  
  return results;
};

// ========================
// CONSTANTES
// ========================

export const COLORS_STORAGE_KEY = 'cogc-planning-colors';
export const COLORS_STORAGE_KEY_V2 = 'cogc-planning-colors-v2';
