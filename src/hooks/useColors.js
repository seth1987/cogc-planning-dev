import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_COLORS, COLORS_STORAGE_KEY } from '../constants/defaultColors';

/**
 * Hook pour gérer les couleurs personnalisées du planning
 * Stockage dans localStorage avec fallback sur les valeurs par défaut
 * 
 * v1.1 - Ajout reloadColors() pour synchroniser entre composants
 */
export const useColors = () => {
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fusionner les couleurs stockées avec les défauts
  const mergeWithDefaults = useCallback((stored) => {
    return {
      services: { ...DEFAULT_COLORS.services, ...stored?.services },
      postesSupp: { ...DEFAULT_COLORS.postesSupp, ...stored?.postesSupp },
      texteLibre: { ...DEFAULT_COLORS.texteLibre, ...stored?.texteLibre },
    };
  }, []);

  // Charger les couleurs depuis localStorage
  const loadColorsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(COLORS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.error('Erreur chargement couleurs:', error);
    }
    return DEFAULT_COLORS;
  }, [mergeWithDefaults]);

  // Charger les couleurs depuis localStorage au montage
  useEffect(() => {
    setColors(loadColorsFromStorage());
    setIsLoaded(true);
  }, [loadColorsFromStorage]);

  // Recharger les couleurs depuis localStorage (pour synchronisation entre composants)
  const reloadColors = useCallback(() => {
    const loaded = loadColorsFromStorage();
    setColors(loaded);
    return loaded;
  }, [loadColorsFromStorage]);

  // Sauvegarder les couleurs
  const saveColors = useCallback((newColors) => {
    try {
      localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(newColors));
      setColors(newColors);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde couleurs:', error);
      return false;
    }
  }, []);

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
      localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Mettre à jour la couleur des postes supplémentaires
  const updatePostesSupp = useCallback((value) => {
    setColors(prev => {
      const updated = {
        ...prev,
        postesSupp: { text: value }
      };
      localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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
      localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Réinitialiser aux valeurs par défaut
  const resetColors = useCallback(() => {
    localStorage.removeItem(COLORS_STORAGE_KEY);
    setColors(DEFAULT_COLORS);
  }, []);

  // Exporter la configuration
  const exportColors = useCallback(() => {
    const dataStr = JSON.stringify(colors, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cogc-couleurs.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [colors]);

  // Importer une configuration
  const importColors = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
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
    reloadColors, // v1.1: Nouvelle fonction pour synchronisation
  };
};

export default useColors;
