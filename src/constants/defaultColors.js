/**
 * Couleurs par défaut pour les services et éléments du planning
 * VERSION 3.0 - Sous-catégories avec horaires pour Habilitation/Formation
 * 
 * Structure:
 * - Catégories principales avec couleur de groupe
 * - Sous-catégories (ex: FO RO) avec combinaisons horaires (FO RO -, FO RO O, FO RO X)
 * - Toggle groupe/individuel par sous-catégorie
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
  // Horaires : MASQUÉ dans le modal (pas besoin de personnaliser)
  horaires: {
    id: 'horaires',
    label: 'Horaires',
    description: 'Services de base (matin, soir, nuit)',
    hidden: true, // Ne pas afficher dans ModalCouleurs
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
  
  // Habilitation/Formation : AVEC sous-catégories et combinaisons horaires
  habilitationFormation: {
    id: 'habilitationFormation',
    label: 'Habilitation / Formation',
    description: 'HAB, FO RO, FO RC, FO CRC... avec horaires',
    defaultColor: { bg: '#fed7aa', text: '#9a3412' }, // Orange
    hasSubCategories: true, // Flag pour le modal
    subCategories: {
      'HAB': {
        label: 'Habilitation',
        defaultColor: { bg: '#fed7aa', text: '#9a3412' },
        // Combinaisons générées automatiquement : HAB -, HAB O, HAB X
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
    // Items générés à partir des sous-catégories + horaires
    items: {} // Sera rempli dynamiquement
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

// Générer les items pour habilitationFormation (sous-catégorie + horaires)
const generateHabilitationItems = () => {
  const items = {};
  const subCats = COLOR_CATEGORIES.habilitationFormation.subCategories;
  
  Object.entries(subCats).forEach(([subCatCode, subCat]) => {
    // Item de base (sans horaire) - ex: "HAB", "FO RO"
    items[subCatCode] = {
      label: subCat.label,
      defaultColor: subCat.defaultColor,
      isSubCategory: true,
    };
    
    // Combinaisons avec horaires - ex: "HAB -", "HAB O", "HAB X"
    HORAIRES_BASE.forEach(horaire => {
      const combinedCode = `${subCatCode} ${horaire.code}`;
      items[combinedCode] = {
        label: `${subCat.label} ${horaire.label}`,
        defaultColor: subCat.defaultColor,
        parentSubCategory: subCatCode, // Référence au parent
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
    
    // Items normaux
    if (category.items) {
      Object.entries(category.items).forEach(([code, item]) => {
        services[code] = item.defaultColor || groupColor;
      });
    }
  });
  
  return {
    services,
    // État des toggles groupe/individuel par sous-catégorie
    subCategoryModes: {}, // { 'HAB': 'group', 'FO RO': 'individual', ... }
    postesSupp: { text: '#8b5cf6' },
    texteLibre: { bg: '#fef3c7', text: '#92400e' },
    groups: Object.fromEntries(
      Object.entries(COLOR_CATEGORIES)
        .filter(([_, cat]) => !cat.hidden)
        .map(([key, cat]) => [key, cat.defaultColor])
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
 * "FO RO -" → "FO RO"
 * "HAB O" → "HAB"
 */
export const findParentSubCategory = (code) => {
  if (!code) return null;
  
  const habItems = COLOR_CATEGORIES.habilitationFormation.items;
  const item = habItems[code];
  
  if (item?.parentSubCategory) {
    return item.parentSubCategory;
  }
  
  // Si c'est une sous-catégorie elle-même
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
  
  // Si aucune couleur personnalisée, c'est uniforme
  if (colors.length === 0) return true;
  
  // Si toutes les couleurs sont identiques
  return colors.every(c => c === colors[0]);
};

/**
 * Résout la couleur d'un code avec fallback
 */
export const resolveColorForCode = (code, customColors = {}) => {
  if (!code) return { bg: 'transparent', text: '#000000' };
  
  // 1. Chercher dans les couleurs personnalisées (élément spécifique)
  if (customColors.services?.[code]) {
    const custom = customColors.services[code];
    if (custom.bg && custom.bg !== 'transparent') {
      return custom;
    }
  }
  
  // 2. Chercher la sous-catégorie parent (pour habilitation/formation)
  const parentSubCat = findParentSubCategory(code);
  if (parentSubCat && customColors.services?.[parentSubCat]) {
    const parentColor = customColors.services[parentSubCat];
    if (parentColor.bg && parentColor.bg !== 'transparent') {
      return parentColor;
    }
  }
  
  // 3. Trouver la catégorie du code
  const category = findCategoryForCode(code);
  
  if (category) {
    // 4. Chercher la couleur du groupe personnalisée
    if (customColors.groups?.[category.key]) {
      return customColors.groups[category.key];
    }
    
    // 5. Utiliser la couleur par défaut de l'item ou du groupe
    const itemDefault = category.items[code]?.defaultColor;
    return itemDefault || category.defaultColor;
  }
  
  // 6. Fallback final
  return { bg: 'transparent', text: '#000000' };
};

// ========================
// CONSTANTES
// ========================

export const COLORS_STORAGE_KEY = 'cogc-planning-colors';
export const COLORS_STORAGE_KEY_V2 = 'cogc-planning-colors-v2';
