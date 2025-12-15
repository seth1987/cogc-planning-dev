import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_COLORS, COLORS_STORAGE_KEY } from '../constants/defaultColors';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook pour gérer les couleurs personnalisées du planning
 * Stockage dans localStorage avec option de synchronisation Supabase
 * 
 * v1.1 - Ajout reloadColors() pour synchroniser entre composants
 * v1.2 - Support de contextes séparés (general / perso)
 * v1.3 - Fix: stabilisation storageKey + logs debug
 * v1.4 - NEW: Synchronisation multi-appareils via Supabase (optionnel)
 * v1.5 - FIX: Race condition dans toggleSync (forceSave param)
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
          // Pas de données trouvées, c'est normal pour un nouvel utilisateur
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
  // forceSave: true pour bypasser la vérification syncEnabled (utilisé par toggleSync)
  const saveToSupabase = useCallback(async (newColors, forceSave = false) => {
    if (!userEmail) {
      console.log(`🎨 saveToSupabase: pas d'email, abandon`);
      return false;
    }
    
    if (!forceSave && !syncEnabled) {
      console.log(`🎨 saveToSupabase: sync désactivée, abandon`);
      return false;
    }
    
    try {
      setIsSyncing(true);
      console.log(`☁️ Tentative sauvegarde Supabase (${context})...`, { userEmail, forceSave });
      
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
        console.error(`🎨 Erreur Supabase upsert:`, error);
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

  // Supprimer les données de Supabase (quand on désactive la sync)
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

  // Activer/désactiver la synchronisation
  const toggleSync = useCallback(async (enabled) => {
    console.log(`☁️ toggleSync appelé: enabled=${enabled}, userEmail=${userEmail}`);
    
    setSyncEnabled(enabled);
    localStorage.setItem(syncFlagKey, enabled ? 'true' : 'false');
    
    if (enabled && userEmail) {
      // Activer : sauvegarder les couleurs actuelles vers Supabase
      // IMPORTANT: forceSave=true car syncEnabled n'est pas encore à jour (React async)
      const success = await saveToSupabase(colors, true);
      console.log(`☁️ Synchronisation activée (${context}), sauvegarde: ${success ? 'OK' : 'ÉCHEC'}`);
    } else if (!enabled) {
      // Désactiver : supprimer les données Supabase (garder local)
      await deleteFromSupabase();
      console.log(`📱 Synchronisation désactivée - données locales uniquement (${context})`);
    }
  }, [syncFlagKey, userEmail, saveToSupabase, deleteFromSupabase, colors, context]);

  // ========== EFFECT: Charger depuis Supabase au montage ==========

  useEffect(() => {
    const initFromSupabase = async () => {
      if (!userEmail) return;
      
      console.log(`☁️ Vérification données Supabase pour ${userEmail} (${context})...`);
      const data = await loadFromSupabase();
      
      if (data && data.sync_enabled && data.colors) {
        // Supabase a des données sync activées -> les utiliser
        const merged = mergeWithDefaults(data.colors);
        setColors(merged);
        setSyncEnabled(true);
        localStorage.setItem(storageKey, JSON.stringify(merged));
        localStorage.setItem(syncFlagKey, 'true');
        console.log(`☁️ Couleurs chargées depuis Supabase (${context})`);
      } else {
        console.log(`☁️ Pas de données sync dans Supabase (${context})`);
      }
    };

    initFromSupabase();
  }, [userEmail, context, loadFromSupabase, mergeWithDefaults, storageKey, syncFlagKey]);

  // ========== EXISTING FUNCTIONS (UPDATED) ==========

  // Recharger les couleurs depuis localStorage (pour synchronisation entre composants)
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
      
      // Sync vers Supabase si activé
      if (syncEnabled && userEmail) {
        saveToSupabase(newColors);
      }
      
      return true;
    } catch (error) {
      console.error(`🎨 Erreur sauvegarde couleurs (${context}):`, error);
      return false;
    }
  }, [storageKey, context, syncEnabled, userEmail, saveToSupabase]);

  // Mettre à jour une couleur de service
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
      
      // Sync vers Supabase si activé
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
      
      // Sync vers Supabase si activé
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
      
      // Sync vers Supabase si activé
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
    
    // Supprimer aussi de Supabase si sync activé
    if (syncEnabled && userEmail) {
      await deleteFromSupabase();
      // Désactiver la sync après reset
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
          // Valider la structure
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

  // Obtenir la couleur d'un service (avec fallback)
  const getServiceColor = useCallback((serviceCode) => {
    return colors.services[serviceCode] || DEFAULT_COLORS.services[serviceCode] || { bg: 'transparent', text: '#ffffff' };
  }, [colors]);

  return {
    colors,
    isLoaded,
    saveColors,
    updateServiceColor,
    updatePostesSupp,
    updateTexteLibre,
    resetColors,
    exportColors,
    importColors,
    getServiceColor,
    reloadColors,
    context,
    // Nouvelles fonctions de sync
    syncEnabled,
    isSyncing,
    toggleSync,
  };
};

export default useColors;
