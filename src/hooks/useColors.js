import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DEFAULT_COLORS,
  COLORS_STORAGE_KEY,
  COLOR_CATEGORIES,
  findCategoryForCode,
  findParentSubCategory,
  isSubCategoryUniform,
  getHorairesForSubCategory
} from '../constants/defaultColors';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook pour gérer les couleurs personnalisées du planning
 * VERSION 4.1 - Fix: getServiceColor respecte le mode Groupe/Individuel
 * 
 * @param {string} context - 'general' (défaut) ou 'perso' pour Mon Planning
 * @param {string} userEmail - Email de l'utilisateur pour la sync (optionnel)
 */
export const useColors = (context = 'general', userEmail = null) => {
  const storageKey = useMemo(() => {
    return context === 'perso' 
      ? `${COLORS_STORAGE_KEY}-perso` 
      : COLORS_STORAGE_KEY;
  }, [context]);

  const syncFlagKey = useMemo(() => `${storageKey}-sync`, [storageKey]);

  const getInitialColors = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          services: { ...DEFAULT_COLORS.services, ...parsed?.services },
          groups: { ...DEFAULT_COLORS.groups, ...parsed?.groups },
          categoryModes: { ...parsed?.categoryModes }, // v4.0: modes des catégories
          subCategoryModes: { ...DEFAULT_COLORS.subCategoryModes, ...parsed?.subCategoryModes },
          postesSupp: { ...DEFAULT_COLORS.postesSupp, ...parsed?.postesSupp },
          texteLibre: { ...DEFAULT_COLORS.texteLibre, ...parsed?.texteLibre },
        };
      }
    } catch (error) {
      console.error(`🎨 Erreur chargement couleurs (${context}):`, error);
    }
    return DEFAULT_COLORS;
  };

  const getInitialSyncState = () => {
    try {
      const stored = localStorage.getItem(syncFlagKey);
      return stored === 'true';
    } catch {
      return false;
    }
  };

  const [colors, setColors] = useState(getInitialColors);
  const [isLoaded] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(getInitialSyncState);
  const [isSyncing, setIsSyncing] = useState(false);

  const mergeWithDefaults = useCallback((stored) => {
    return {
      services: { ...DEFAULT_COLORS.services, ...stored?.services },
      groups: { ...DEFAULT_COLORS.groups, ...stored?.groups },
      categoryModes: { ...stored?.categoryModes },
      subCategoryModes: { ...DEFAULT_COLORS.subCategoryModes, ...stored?.subCategoryModes },
      postesSupp: { ...DEFAULT_COLORS.postesSupp, ...stored?.postesSupp },
      texteLibre: { ...DEFAULT_COLORS.texteLibre, ...stored?.texteLibre },
    };
  }, []);

  // ========== SUPABASE SYNC ==========

  const loadFromSupabase = useCallback(async () => {
    if (!userEmail) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_color_preferences')
        .select('colors, sync_enabled')
        .eq('user_email', userEmail)
        .eq('context', context)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    } catch (error) {
      console.error(`🎨 Erreur chargement Supabase (${context}):`, error);
      return null;
    }
  }, [userEmail, context]);

  const saveToSupabase = useCallback(async (newColors, forceSave = false) => {
    if (!userEmail) return false;
    if (!forceSave && !syncEnabled) return false;
    
    try {
      setIsSyncing(true);
      const { error } = await supabase
        .from('user_color_preferences')
        .upsert({
          user_email: userEmail,
          context: context,
          colors: newColors,
          sync_enabled: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_email,context' });

      if (error) throw error;
      console.log(`☁️ Couleurs synchronisées (${context})`, Object.keys(newColors.categoryModes || {}).length);
      return true;
    } catch (error) {
      console.error(`🎨 Erreur sauvegarde Supabase (${context}):`, error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [userEmail, context, syncEnabled]);

  const deleteFromSupabase = useCallback(async () => {
    if (!userEmail) return;
    try {
      await supabase
        .from('user_color_preferences')
        .delete()
        .eq('user_email', userEmail)
        .eq('context', context);
    } catch (error) {
      console.error(`🎨 Erreur suppression Supabase (${context}):`, error);
    }
  }, [userEmail, context]);

  const toggleSync = useCallback(async (enabled) => {
    setSyncEnabled(enabled);
    localStorage.setItem(syncFlagKey, enabled ? 'true' : 'false');
    
    if (enabled && userEmail) {
      await saveToSupabase(colors, true);
    } else if (!enabled) {
      await deleteFromSupabase();
    }
  }, [syncFlagKey, userEmail, saveToSupabase, deleteFromSupabase, colors]);

  useEffect(() => {
    const initFromSupabase = async () => {
      if (!userEmail) return;
      const data = await loadFromSupabase();
      if (data?.sync_enabled && data?.colors) {
        const merged = mergeWithDefaults(data.colors);
        setColors(merged);
        setSyncEnabled(true);
        localStorage.setItem(storageKey, JSON.stringify(merged));
        localStorage.setItem(syncFlagKey, 'true');
      }
    };
    initFromSupabase();
  }, [userEmail, context, loadFromSupabase, mergeWithDefaults, storageKey, syncFlagKey]);

  // ========== COLOR FUNCTIONS ==========

  const reloadColors = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = mergeWithDefaults(parsed);
        setColors(merged);
        return merged;
      }
    } catch (error) {
      console.error(`🎨 Erreur reload (${context}):`, error);
    }
    return DEFAULT_COLORS;
  }, [storageKey, context, mergeWithDefaults]);

  const saveColors = useCallback((newColors) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newColors));
      setColors(newColors);
      if (syncEnabled && userEmail) saveToSupabase(newColors);
      return true;
    } catch (error) {
      console.error(`🎨 Erreur sauvegarde (${context}):`, error);
      return false;
    }
  }, [storageKey, context, syncEnabled, userEmail, saveToSupabase]);

  /**
   * v4.0: Mettre à jour une couleur de service (élément individuel)
   * Passe automatiquement en mode "individual" pour la catégorie concernée
   */
  const updateServiceColor = useCallback((serviceCode, colorType, value) => {
    setColors(prev => {
      const updated = {
        ...prev,
        services: {
          ...prev.services,
          [serviceCode]: {
            ...prev.services[serviceCode],
            [colorType]: value
          }
        }
      };
      
      // v4.0: Trouver la catégorie et passer en mode individuel
      const category = findCategoryForCode(serviceCode);
      if (category) {
        updated.categoryModes = {
          ...updated.categoryModes,
          [category.key]: 'individual'
        };
      }
      
      // Si c'est un élément de sous-catégorie, passer aussi en mode individuel pour la sous-cat
      const parentSubCat = findParentSubCategory(serviceCode);
      if (parentSubCat && parentSubCat !== serviceCode) {
        updated.subCategoryModes = {
          ...updated.subCategoryModes,
          [parentSubCat]: 'individual'
        };
      }
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  /**
   * Mettre à jour la couleur d'un groupe (catégorie) - pour le header
   */
  const updateGroupColor = useCallback((groupKey, colorType, value) => {
    setColors(prev => {
      const updated = {
        ...prev,
        groups: {
          ...prev.groups,
          [groupKey]: {
            ...prev.groups?.[groupKey],
            [colorType]: value
          }
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  /**
   * v4.0: Mettre à jour la couleur d'une catégorie entière
   * Applique la couleur à TOUS les éléments de la catégorie
   */
  const updateCategoryColor = useCallback((categoryKey, colorType, value) => {
    setColors(prev => {
      const category = COLOR_CATEGORIES[categoryKey];
      if (!category) return prev;
      
      const newServices = { ...prev.services };
      const newGroups = {
        ...prev.groups,
        [categoryKey]: {
          ...prev.groups?.[categoryKey],
          [colorType]: value
        }
      };
      
      // Appliquer à tous les éléments de la catégorie
      if (category.items) {
        Object.keys(category.items).forEach(code => {
          newServices[code] = {
            ...newServices[code],
            [colorType]: value
          };
        });
      }
      
      // Pour les catégories avec sous-catégories, appliquer aussi aux sous-catégories
      if (category.subCategories) {
        Object.keys(category.subCategories).forEach(subCatCode => {
          newServices[subCatCode] = {
            ...newServices[subCatCode],
            [colorType]: value
          };
          // Et aux combinaisons horaires
          const horaires = getHorairesForSubCategory(subCatCode);
          horaires.forEach(h => {
            const combinedCode = `${subCatCode} ${h.code}`;
            newServices[combinedCode] = {
              ...newServices[combinedCode],
              [colorType]: value
            };
          });
        });
      }
      
      const updated = {
        ...prev,
        services: newServices,
        groups: newGroups,
        categoryModes: {
          ...prev.categoryModes,
          [categoryKey]: 'group' // Rester/passer en mode groupe
        }
      };
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  /**
   * v4.0: Définir le mode d'une catégorie (groupe/individual)
   */
  const setCategoryMode = useCallback((categoryKey, mode) => {
    setColors(prev => {
      const updated = {
        ...prev,
        categoryModes: {
          ...prev.categoryModes,
          [categoryKey]: mode
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  /**
   * v4.0: Obtenir le mode d'une catégorie
   */
  const getCategoryMode = useCallback((categoryKey) => {
    // Si explicitement défini
    if (colors.categoryModes?.[categoryKey]) {
      return colors.categoryModes[categoryKey];
    }
    // Par défaut : groupe
    return 'group';
  }, [colors]);

  /**
   * v3.3: Mettre à jour la couleur d'une sous-catégorie (ex: FO RO, CRC, etc.)
   * Applique la couleur à tous les éléments combinés avec les bons horaires
   */
  const updateSubCategoryColor = useCallback((subCatCode, colorType, value) => {
    setColors(prev => {
      const newServices = { ...prev.services };
      
      // Mettre à jour la sous-catégorie elle-même
      newServices[subCatCode] = {
        ...newServices[subCatCode],
        [colorType]: value
      };
      
      // Récupérer les horaires spécifiques à cette sous-catégorie
      const horaires = getHorairesForSubCategory(subCatCode);
      
      // Mettre à jour toutes les combinaisons avec horaires
      horaires.forEach(horaire => {
        const combinedCode = `${subCatCode} ${horaire.code}`;
        newServices[combinedCode] = {
          ...newServices[combinedCode],
          [colorType]: value
        };
      });
      
      const updated = {
        ...prev,
        services: newServices,
        subCategoryModes: {
          ...prev.subCategoryModes,
          [subCatCode]: 'group' // Repasser en mode groupe
        }
      };
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  /**
   * Changer le mode d'une sous-catégorie (groupe/individuel)
   */
  const setSubCategoryMode = useCallback((subCatCode, mode) => {
    setColors(prev => {
      const updated = {
        ...prev,
        subCategoryModes: {
          ...prev.subCategoryModes,
          [subCatCode]: mode
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  /**
   * Obtenir le mode d'une sous-catégorie
   */
  const getSubCategoryMode = useCallback((subCatCode) => {
    // Si explicitement défini
    if (colors.subCategoryModes?.[subCatCode]) {
      return colors.subCategoryModes[subCatCode];
    }
    // Par défaut, vérifier si les couleurs sont uniformes
    return isSubCategoryUniform(subCatCode, colors) ? 'group' : 'individual';
  }, [colors]);

  const updatePostesSupp = useCallback((value) => {
    setColors(prev => {
      const updated = { ...prev, postesSupp: { text: value } };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  const updateTexteLibre = useCallback((colorType, value) => {
    setColors(prev => {
      const updated = {
        ...prev,
        texteLibre: { ...prev.texteLibre, [colorType]: value }
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (syncEnabled && userEmail) saveToSupabase(updated);
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  const resetColors = useCallback(async () => {
    localStorage.removeItem(storageKey);
    setColors(DEFAULT_COLORS);
    if (syncEnabled && userEmail) {
      await deleteFromSupabase();
      setSyncEnabled(false);
      localStorage.setItem(syncFlagKey, 'false');
    }
  }, [storageKey, syncEnabled, userEmail, deleteFromSupabase, syncFlagKey]);

  const exportColors = useCallback(() => {
    const dataStr = JSON.stringify(colors, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = context === 'perso' ? 'cogc-couleurs-perso.json' : 'cogc-couleurs.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [colors, context]);

  const importColors = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.services && typeof imported.services === 'object') {
            const merged = mergeWithDefaults(imported);
            saveColors(merged);
            resolve(true);
          } else {
            reject(new Error('Format invalide'));
          }
        } catch (error) {
          reject(new Error('Erreur de lecture'));
        }
      };
      reader.onerror = () => reject(new Error('Erreur de lecture'));
      reader.readAsText(file);
    });
  }, [saveColors, mergeWithDefaults]);

  /**
   * v4.1 FIX: Obtenir la couleur d'un service avec respect du mode Groupe/Individuel
   * 
   * LOGIQUE:
   * 1. Trouver la catégorie du code
   * 2. Vérifier le mode de la catégorie (group/individual)
   * 3. Si MODE GROUPE: utiliser directement la couleur du groupe (ignorer couleurs individuelles)
   * 4. Si MODE INDIVIDUEL: cascade classique (service > sous-cat > groupe > défaut)
   */
  const getServiceColor = useCallback((serviceCode) => {
    if (!serviceCode) return { bg: 'transparent', text: '#000000' };
    
    // 1. Trouver la catégorie pour ce code
    const category = findCategoryForCode(serviceCode);
    
    if (category) {
      // 2. Vérifier le mode de la catégorie
      const categoryMode = colors.categoryModes?.[category.key] || 'group';
      
      // 3. MODE GROUPE: utiliser la couleur du groupe directement
      if (categoryMode === 'group') {
        // 3a. Si l'item a une couleur par défaut DISTINCTE du groupe, la respecter
        // (ex: RPP a un texte rouge différent de RP dans la catégorie repos)
        const itemDefault = category.items?.[serviceCode]?.defaultColor;
        if (itemDefault && (itemDefault.bg !== category.defaultColor?.bg || itemDefault.text !== category.defaultColor?.text)) {
          return colors.services?.[serviceCode]?.bg && colors.services[serviceCode].bg !== 'transparent'
            ? colors.services[serviceCode]
            : itemDefault;
        }
        // 3b. Priorité: couleur groupe personnalisée > couleur par défaut du groupe
        if (colors.groups?.[category.key]?.bg && colors.groups[category.key].bg !== 'transparent') {
          return colors.groups[category.key];
        }
        // Sinon couleur par défaut de la catégorie
        return category.defaultColor || { bg: 'transparent', text: '#000000' };
      }
      
      // 4. MODE INDIVIDUEL: cascade classique
      // 4a. Couleur personnalisée de l'élément individuel
      const customService = colors.services?.[serviceCode];
      if (customService?.bg && customService.bg !== 'transparent') {
        return customService;
      }
      
      // 4b. Couleur de la sous-catégorie parent (pour habilitation/formation et postes)
      const parentSubCat = findParentSubCategory(serviceCode);
      if (parentSubCat && parentSubCat !== serviceCode) {
        // Vérifier le mode de la sous-catégorie
        const subCatMode = colors.subCategoryModes?.[parentSubCat] || 'group';
        
        if (subCatMode === 'group') {
          // En mode groupe pour la sous-cat, utiliser sa couleur
          const parentColor = colors.services?.[parentSubCat];
          if (parentColor?.bg && parentColor.bg !== 'transparent') {
            return parentColor;
          }
        } else {
          // En mode individuel, vérifier la couleur spécifique
          const parentColor = colors.services?.[parentSubCat];
          if (parentColor?.bg && parentColor.bg !== 'transparent') {
            return parentColor;
          }
        }
      }
      
      // 4c. Couleur personnalisée du groupe (fallback)
      if (colors.groups?.[category.key]?.bg && colors.groups[category.key].bg !== 'transparent') {
        return colors.groups[category.key];
      }
      
      // 4d. Couleur par défaut de l'item ou du groupe
      const itemDefault = category.items?.[serviceCode]?.defaultColor;
      return itemDefault || category.defaultColor || { bg: 'transparent', text: '#000000' };
    }
    
    // 5. Code non trouvé dans les catégories - fallback dans DEFAULT_COLORS
    if (DEFAULT_COLORS.services?.[serviceCode]) {
      return DEFAULT_COLORS.services[serviceCode];
    }
    
    return { bg: 'transparent', text: '#000000' };
  }, [colors]);

  const getGroupColor = useCallback((groupKey) => {
    if (colors.groups?.[groupKey]) return colors.groups[groupKey];
    if (COLOR_CATEGORIES[groupKey]) return COLOR_CATEGORIES[groupKey].defaultColor;
    return { bg: 'transparent', text: '#000000' };
  }, [colors]);

  return {
    colors,
    isLoaded,
    saveColors,
    updateServiceColor,
    updateGroupColor,
    updateCategoryColor,      // v4.0
    setCategoryMode,          // v4.0
    getCategoryMode,          // v4.0
    updateSubCategoryColor,
    setSubCategoryMode,
    getSubCategoryMode,
    updatePostesSupp,
    updateTexteLibre,
    resetColors,
    exportColors,
    importColors,
    getServiceColor,
    getGroupColor,
    reloadColors,
    context,
    syncEnabled,
    isSyncing,
    toggleSync,
    categories: COLOR_CATEGORIES,
  };
};

export default useColors;
