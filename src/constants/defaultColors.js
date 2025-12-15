/**
 * Couleurs par défaut pour les services et éléments du planning
 * VERSION 3.4 - Séparation Horaires/Repos + Disclaimers roulement/réserve
 */

// Horaires de base pour les combinaisons
export const HORAIRES_BASE = [
  { code: '-', label: 'Matin' },
  { code: 'O', label: 'Soir' },
  { code: 'X', label: 'Nuit' },
];

// Horaires sans nuit (pour RO, SOUF, CAC)
export const HORAIRES_JOUR = [
  { code: '-', label: 'Matin' },
  { code: 'O', label: 'Soir' },
];

// ========================
// DÉFINITION DES CATÉGORIES
// ========================

export const COLOR_CATEGORIES = {
  // Horaires (Roulement) : OUVERT par défaut - pour agents en roulement
  horaires: {
    id: 'horaires',
    label: 'Horaires (Roulement)',
    description: 'Uniquement si vous êtes en roulement',
    defaultOpen: true,
    defaultColor: { bg: '#ffffff', text: '#1e40af' },
    items: {
      '-': { label: 'Matin (06h-14h)' },
      'O': { label: 'Soir (14h-22h)' },
      'X': { label: 'Nuit (22h-06h)' },
      'I': { label: 'Jour' }
    }
  },
  
  // Poste (Réserve) : OUVERT par défaut - pour agents de réserve
  posteReserve: {
    id: 'posteReserve',
    label: 'Poste (Réserve)',
    description: 'Uniquement si vous êtes à la réserve',
    defaultOpen: true,
    defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
    hasSubCategories: true,
    subCategories: {
      'CRC': {
        label: 'CRC - Coordinateur Régional',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'all',
      },
      'ACR': {
        label: 'ACR - Agent Circulation',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'all',
      },
      'RC': {
        label: 'RC - Régulateur Centre',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'all',
      },
      'RO': {
        label: 'RO - Régulateur Ouest',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'jour',
      },
      'CCU': {
        label: 'CCU - Centre Commandement Unifié',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'all',
      },
      'RE': {
        label: 'RE - Régulateur Est',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'all',
      },
      'CAC': {
        label: 'CAC - Denfert',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'jour',
      },
      'SOUF': {
        label: 'SOUF - Soufflerie',
        defaultColor: { bg: '#e0e7ff', text: '#3730a3' },
        horaires: 'jour',
      }
    },
    items: {}
  },
  
  // Repos / Non utilisé : OUVERT par défaut
  repos: {
    id: 'repos',
    label: 'Repos / Non utilisé',
    description: 'RP, NU',
    defaultOpen: true,
    defaultColor: { bg: '#dcfce7', text: '#166534' },
    items: {
      'RP': { label: 'Repos programmé', defaultColor: { bg: '#dcfce7', text: '#166534' } },
      'NU': { label: 'Non utilisé', defaultColor: { bg: '#f3f4f6', text: '#374151' } }
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
        horaires: 'all',
      },
      'FO': {
        label: 'Formation (générique)',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      },
      'FO RO': {
        label: 'FO RO',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      },
      'FO RC': {
        label: 'FO RC',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      },
      'FO CAC': {
        label: 'FO CAC',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      },
      'FO CRC': {
        label: 'FO CRC',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      },
      'FO ACR': {
        label: 'FO ACR',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      },
      'FO CCU': {
        label: 'FO CCU',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      },
      'FO RE': {
        label: 'FO RE',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        horaires: 'all',
      }
    },
    items: {}
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

// ========================
// GÉNÉRATION DES ITEMS DYNAMIQUES
// ========================

/**
 * Génère les items pour une catégorie avec sous-catégories
 */
const generateSubCategoryItems = (categoryKey) => {
  const items = {};
  const category = COLOR_CATEGORIES[categoryKey];
  if (!category?.subCategories) return items;
  
  Object.entries(category.subCategories).forEach(([subCatCode, subCat]) => {
    // Item de base (sans horaire)
    items[subCatCode] = {
      label: subCat.label,
      defaultColor: subCat.defaultColor,
      isSubCategory: true,
    };
    
    // Déterminer les horaires à utiliser
    const horaires = subCat.horaires === 'jour' ? HORAIRES_JOUR : HORAIRES_BASE;
    
    // Combinaisons avec horaires
    horaires.forEach(horaire => {
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

// Appliquer les items générés pour les catégories avec sous-catégories
COLOR_CATEGORIES.posteReserve.items = generateSubCategoryItems('posteReserve');
COLOR_CATEGORIES.habilitationFormation.items = generateSubCategoryItems('habilitationFormation');

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
  
  // Chercher dans toutes les catégories avec sous-catégories
  for (const category of Object.values(COLOR_CATEGORIES)) {
    if (category.hasSubCategories && category.items) {
      const item = category.items[code];
      if (item?.parentSubCategory) {
        return item.parentSubCategory;
      }
      if (item?.isSubCategory) {
        return code;
      }
    }
  }
  
  return null;
};

/**
 * Récupère les horaires disponibles pour une sous-catégorie
 */
export const getHorairesForSubCategory = (subCatCode) => {
  for (const category of Object.values(COLOR_CATEGORIES)) {
    if (category.hasSubCategories && category.subCategories?.[subCatCode]) {
      const subCat = category.subCategories[subCatCode];
      return subCat.horaires === 'jour' ? HORAIRES_JOUR : HORAIRES_BASE;
    }
  }
  return HORAIRES_BASE;
};

/**
 * Vérifie si tous les éléments d'une sous-catégorie ont la même couleur
 */
export const isSubCategoryUniform = (subCatCode, customColors) => {
  if (!customColors?.services) return true;
  
  const horaires = getHorairesForSubCategory(subCatCode);
  const horaireCodes = horaires.map(h => `${subCatCode} ${h.code}`);
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
