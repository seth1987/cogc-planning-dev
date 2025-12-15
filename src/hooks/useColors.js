import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DEFAULT_COLORS, 
  COLORS_STORAGE_KEY, 
  COLOR_CATEGORIES,
  HORAIRES_BASE,
  findCategoryForCode,
  findParentSubCategory,
  isSubCategoryUniform,
  resolveColorForCode 
} from '../constants/defaultColors';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook pour gérer les couleurs personnalisées du planning
 * VERSION 3.0 - Support des sous-catégories avec toggle groupe/individuel
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
  const [isLoaded, setIsLoaded] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(getInitialSyncState);
  const [isSyncing, setIsSyncing] = useState(false);

  const mergeWithDefaults = useCallback((stored) => {
    return {
      services: { ...DEFAULT_COLORS.services, ...stored?.services },
      groups: { ...DEFAULT_COLORS.groups, ...stored?.groups },
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
      console.log(`☁️ Couleurs synchronisées (${context})`);
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

  // Mettre à jour une couleur de service (élément individuel)
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
      
      // Si c'est un élément de sous-catégorie, passer en mode individuel
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

  // Mettre à jour la couleur d'un groupe (catégorie)
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
   * NEW v3.0: Mettre à jour la couleur d'une sous-catégorie (ex: FO RO)
   * Applique la couleur à tous les éléments combinés (FO RO -, FO RO O, FO RO X)
   */
  const updateSubCategoryColor = useCallback((subCatCode, colorType, value) => {
    setColors(prev => {
      const newServices = { ...prev.services };
      
      // Mettre à jour la sous-catégorie elle-même
      newServices[subCatCode] = {
        ...newServices[subCatCode],
        [colorType]: value
      };
      
      // Mettre à jour toutes les combinaisons avec horaires
      HORAIRES_BASE.forEach(horaire => {
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
   * NEW v3.0: Changer le mode d'une sous-catégorie (groupe/individuel)
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
   * NEW v3.0: Obtenir le mode d'une sous-catégorie
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
   * Obtenir la couleur d'un service avec logique de fallback complète
   */
  const getServiceColor = useCallback((serviceCode) => {
    if (!serviceCode) return { bg: 'transparent', text: '#000000' };
    
    // 1. Couleur personnalisée de l'élément
    const customService = colors.services?.[serviceCode];
    if (customService?.bg && customService.bg !== 'transparent') {
      return customService;
    }
    
    // 2. Couleur de la sous-catégorie parent (pour habilitation/formation)
    const parentSubCat = findParentSubCategory(serviceCode);
    if (parentSubCat && parentSubCat !== serviceCode) {
      const parentColor = colors.services?.[parentSubCat];
      if (parentColor?.bg && parentColor.bg !== 'transparent') {
        return parentColor;
      }
    }
    
    // 3. Trouver la catégorie
    const category = findCategoryForCode(serviceCode);
    if (category) {
      // 4. Couleur personnalisée du groupe
      if (colors.groups?.[category.key]?.bg) {
        return colors.groups[category.key];
      }
      // 5. Couleur par défaut de l'item ou du groupe
      const itemDefault = category.items?.[serviceCode]?.defaultColor;
      return itemDefault || category.defaultColor;
    }
    
    // 6. Fallback dans DEFAULT_COLORS
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
    updateSubCategoryColor, // NEW v3.0
    setSubCategoryMode,      // NEW v3.0
    getSubCategoryMode,      // NEW v3.0
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
