import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DEFAULT_COLORS, 
  COLORS_STORAGE_KEY, 
  COLOR_CATEGORIES,
  findCategoryForCode,
  resolveColorForCode 
} from '../constants/defaultColors';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook pour gérer les couleurs personnalisées du planning
 * VERSION 2.0 - Support des catégories avec fallback groupe
 * 
 * Stockage dans localStorage avec option de synchronisation Supabase
 * 
 * v1.1 - Ajout reloadColors() pour synchroniser entre composants
 * v1.2 - Support de contextes séparés (general / perso)
 * v1.3 - Fix: stabilisation storageKey + logs debug
 * v1.4 - NEW: Synchronisation multi-appareils via Supabase (optionnel)
 * v1.5 - FIX: Race condition dans toggleSync (forceSave param)
 * v2.0 - NEW: Catégories avec couleur de groupe et fallback
 * 
 * @param {string} context - 'general' (défaut) ou 'perso' pour Mon Planning
 * @param {string} userEmail - Email de l'utilisateur pour la sync (optionnel)
 */
export const useColors = (context = 'general', userEmail = null) => {
  // Mémoriser la clé de stockage pour éviter les re-renders
  const storageKey = useMemo(() => {
    const key = context === 'perso' 
      ? `${COLORS_STORAGE_KEY}-perso` 
      : COLORS_STORAGE_KEY;
    return key;
  }, [context]);

  // Clé pour le flag de sync dans localStorage
  const syncFlagKey = useMemo(() => `${storageKey}-sync`, [storageKey]);

  // Fonction de chargement initiale (appelée une seule fois)
  const getInitialColors = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = {
          services: { ...DEFAULT_COLORS.services, ...parsed?.services },
          groups: { ...DEFAULT_COLORS.groups, ...parsed?.groups },
          postesSupp: { ...DEFAULT_COLORS.postesSupp, ...parsed?.postesSupp },
          texteLibre: { ...DEFAULT_COLORS.texteLibre, ...parsed?.texteLibre },
        };
        return merged;
      }
    } catch (error) {
      console.error(`🎨 Erreur chargement couleurs (${context}):`, error);
    }
    return DEFAULT_COLORS;
  };

  // Charger l'état sync depuis localStorage
  const getInitialSyncState = () => {
    try {
      const stored = localStorage.getItem(syncFlagKey);
      return stored === 'true';
    } catch {
      return false;
    }
  };

  // État initialisé directement avec les couleurs du localStorage
  const [colors, setColors] = useState(getInitialColors);
  const [isLoaded, setIsLoaded] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(getInitialSyncState);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fusionner les couleurs stockées avec les défauts
  const mergeWithDefaults = useCallback((stored) => {
    return {
      services: { ...DEFAULT_COLORS.services, ...stored?.services },
      groups: { ...DEFAULT_COLORS.groups, ...stored?.groups },
      postesSupp: { ...DEFAULT_COLORS.postesSupp, ...stored?.postesSupp },
      texteLibre: { ...DEFAULT_COLORS.texteLibre, ...stored?.texteLibre },
    };
  }, []);

  // ========== SUPABASE SYNC FUNCTIONS ==========

  // Charger les couleurs depuis Supabase
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
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`🎨 Erreur chargement Supabase (${context}):`, error);
      return null;
    }
  }, [userEmail, context]);

  // Sauvegarder les couleurs dans Supabase
  const saveToSupabase = useCallback(async (newColors, forceSave = false) => {
    if (!userEmail) {
      return false;
    }
    
    if (!forceSave && !syncEnabled) {
      return false;
    }
    
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
        }, {
          onConflict: 'user_email,context'
        });

      if (error) {
        throw error;
      }
      
      console.log(`☁️ Couleurs synchronisées vers Supabase (${context})`);
      return true;
    } catch (error) {
      console.error(`🎨 Erreur sauvegarde Supabase (${context}):`, error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [userEmail, context, syncEnabled]);

  // Supprimer les données de Supabase
  const deleteFromSupabase = useCallback(async () => {
    if (!userEmail) return;
    
    try {
      await supabase
        .from('user_color_preferences')
        .delete()
        .eq('user_email', userEmail)
        .eq('context', context);
      
      console.log(`🗑️ Données Supabase supprimées (${context})`);
    } catch (error) {
      console.error(`🎨 Erreur suppression Supabase (${context}):`, error);
    }
  }, [userEmail, context]);

  // ========== SYNC TOGGLE ==========

  const toggleSync = useCallback(async (enabled) => {
    setSyncEnabled(enabled);
    localStorage.setItem(syncFlagKey, enabled ? 'true' : 'false');
    
    if (enabled && userEmail) {
      const success = await saveToSupabase(colors, true);
      console.log(`☁️ Synchronisation activée (${context}), sauvegarde: ${success ? 'OK' : 'ÉCHEC'}`);
    } else if (!enabled) {
      await deleteFromSupabase();
      console.log(`📱 Synchronisation désactivée - données locales uniquement (${context})`);
    }
  }, [syncFlagKey, userEmail, saveToSupabase, deleteFromSupabase, colors, context]);

  // ========== EFFECT: Charger depuis Supabase au montage ==========

  useEffect(() => {
    const initFromSupabase = async () => {
      if (!userEmail) return;
      
      const data = await loadFromSupabase();
      
      if (data && data.sync_enabled && data.colors) {
        const merged = mergeWithDefaults(data.colors);
        setColors(merged);
        setSyncEnabled(true);
        localStorage.setItem(storageKey, JSON.stringify(merged));
        localStorage.setItem(syncFlagKey, 'true');
        console.log(`☁️ Couleurs chargées depuis Supabase (${context})`);
      }
    };

    initFromSupabase();
  }, [userEmail, context, loadFromSupabase, mergeWithDefaults, storageKey, syncFlagKey]);

  // ========== COLOR FUNCTIONS ==========

  // Recharger les couleurs depuis localStorage
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
      console.error(`🎨 Erreur reload couleurs (${context}):`, error);
    }
    return DEFAULT_COLORS;
  }, [storageKey, context, mergeWithDefaults]);

  // Sauvegarder les couleurs (local + Supabase si sync activé)
  const saveColors = useCallback((newColors) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newColors));
      setColors(newColors);
      
      if (syncEnabled && userEmail) {
        saveToSupabase(newColors);
      }
      
      return true;
    } catch (error) {
      console.error(`🎨 Erreur sauvegarde couleurs (${context}):`, error);
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
      localStorage.setItem(storageKey, JSON.stringify(updated));
      
      if (syncEnabled && userEmail) {
        saveToSupabase(updated);
      }
      
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  // NEW v2.0: Mettre à jour la couleur d'un groupe (catégorie)
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
      
      if (syncEnabled && userEmail) {
        saveToSupabase(updated);
      }
      
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  // Mettre à jour la couleur des postes supplémentaires
  const updatePostesSupp = useCallback((value) => {
    setColors(prev => {
      const updated = {
        ...prev,
        postesSupp: { text: value }
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      
      if (syncEnabled && userEmail) {
        saveToSupabase(updated);
      }
      
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  // Mettre à jour les couleurs du texte libre
  const updateTexteLibre = useCallback((colorType, value) => {
    setColors(prev => {
      const updated = {
        ...prev,
        texteLibre: {
          ...prev.texteLibre,
          [colorType]: value
        }
      };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      
      if (syncEnabled && userEmail) {
        saveToSupabase(updated);
      }
      
      return updated;
    });
  }, [storageKey, syncEnabled, userEmail, saveToSupabase]);

  // Réinitialiser aux valeurs par défaut
  const resetColors = useCallback(async () => {
    localStorage.removeItem(storageKey);
    setColors(DEFAULT_COLORS);
    
    if (syncEnabled && userEmail) {
      await deleteFromSupabase();
      setSyncEnabled(false);
      localStorage.setItem(syncFlagKey, 'false');
    }
    
    console.log(`🎨 resetColors (${context}) - couleurs réinitialisées`);
  }, [storageKey, context, syncEnabled, userEmail, deleteFromSupabase, syncFlagKey]);

  // Exporter la configuration
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

  // Importer une configuration
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
            reject(new Error('Format de fichier invalide'));
          }
        } catch (error) {
          reject(new Error('Erreur de lecture du fichier'));
        }
      };
      reader.onerror = () => reject(new Error('Erreur de lecture'));
      reader.readAsText(file);
    });
  }, [saveColors, mergeWithDefaults]);

  /**
   * NEW v2.0: Obtenir la couleur d'un service avec logique de fallback
   * 
   * Ordre de priorité:
   * 1. Couleur personnalisée de l'élément spécifique
   * 2. Couleur personnalisée du groupe
   * 3. Couleur par défaut de l'élément
   * 4. Couleur par défaut du groupe
   * 5. Fallback transparent
   */
  const getServiceColor = useCallback((serviceCode) => {
    if (!serviceCode) {
      return { bg: 'transparent', text: '#000000' };
    }
    
    // 1. Chercher couleur personnalisée de l'élément
    const customService = colors.services?.[serviceCode];
    if (customService && customService.bg && customService.bg !== 'transparent') {
      return customService;
    }
    
    // 2. Trouver la catégorie du code
    const category = findCategoryForCode(serviceCode);
    
    if (category) {
      // 3. Chercher couleur personnalisée du groupe
      const customGroup = colors.groups?.[category.key];
      if (customGroup && customGroup.bg && customGroup.bg !== 'transparent') {
        return customGroup;
      }
      
      // 4. Couleur par défaut de l'élément
      const itemDefault = category.items[serviceCode]?.defaultColor;
      if (itemDefault) {
        return itemDefault;
      }
      
      // 5. Couleur par défaut du groupe
      return category.defaultColor;
    }
    
    // 6. Couleur dans DEFAULT_COLORS.services
    const defaultService = DEFAULT_COLORS.services?.[serviceCode];
    if (defaultService) {
      return defaultService;
    }
    
    // 7. Fallback final
    return { bg: 'transparent', text: '#000000' };
  }, [colors]);

  /**
   * NEW v2.0: Obtenir la couleur d'un groupe
   */
  const getGroupColor = useCallback((groupKey) => {
    // Couleur personnalisée
    if (colors.groups?.[groupKey]) {
      return colors.groups[groupKey];
    }
    
    // Couleur par défaut
    if (COLOR_CATEGORIES[groupKey]) {
      return COLOR_CATEGORIES[groupKey].defaultColor;
    }
    
    return { bg: 'transparent', text: '#000000' };
  }, [colors]);

  return {
    colors,
    isLoaded,
    saveColors,
    updateServiceColor,
    updateGroupColor, // NEW v2.0
    updatePostesSupp,
    updateTexteLibre,
    resetColors,
    exportColors,
    importColors,
    getServiceColor,
    getGroupColor, // NEW v2.0
    reloadColors,
    context,
    // Fonctions de sync
    syncEnabled,
    isSyncing,
    toggleSync,
    // Catégories disponibles (pour le modal)
    categories: COLOR_CATEGORIES,
  };
};

export default useColors;
