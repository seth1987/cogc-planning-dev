import { useState, useEffect, useCallback } from 'react';

/**
 * useTheme - Hook pour gérer le thème clair/sombre du planning
 * 
 * v1.0 - Création initiale
 *   - Toggle entre mode clair et mode sombre (Nexaverse)
 *   - Option "Se souvenir de mon choix" avec localStorage
 *   - Clé de stockage par contexte (general, perso)
 * 
 * Utilisation:
 *   const { isDarkMode, toggleTheme, rememberChoice, setRememberChoice } = useTheme('general');
 */

const STORAGE_KEY_PREFIX = 'cogc_theme_';
const REMEMBER_KEY_PREFIX = 'cogc_theme_remember_';

const useTheme = (context = 'general') => {
  const storageKey = `${STORAGE_KEY_PREFIX}${context}`;
  const rememberKey = `${REMEMBER_KEY_PREFIX}${context}`;
  
  // Initialiser depuis localStorage si "se souvenir" est activé
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const shouldRemember = localStorage.getItem(rememberKey) === 'true';
      if (shouldRemember) {
        const saved = localStorage.getItem(storageKey);
        return saved === 'dark';
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage theme:', e);
    }
    return false; // Mode clair par défaut
  });
  
  const [rememberChoice, setRememberChoice] = useState(() => {
    try {
      return localStorage.getItem(rememberKey) === 'true';
    } catch (e) {
      return false;
    }
  });

  // Sauvegarder dans localStorage si "se souvenir" est activé
  useEffect(() => {
    try {
      localStorage.setItem(rememberKey, rememberChoice.toString());
      if (rememberChoice) {
        localStorage.setItem(storageKey, isDarkMode ? 'dark' : 'light');
      } else {
        // Si on désactive "se souvenir", on supprime la préférence
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn('Erreur sauvegarde localStorage theme:', e);
    }
  }, [isDarkMode, rememberChoice, storageKey, rememberKey]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const setTheme = useCallback((dark) => {
    setIsDarkMode(dark);
  }, []);

  return {
    isDarkMode,
    toggleTheme,
    setTheme,
    rememberChoice,
    setRememberChoice,
  };
};

// Constantes de couleurs Nexaverse pour export
export const NEXAVERSE_THEME = {
  // Fonds
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgCard: 'rgba(255, 255, 255, 0.05)',
  bgHover: 'rgba(0, 240, 255, 0.1)',
  
  // Accents
  accentCyan: '#00f0ff',
  accentBlue: '#0066b3',
  accentRed: '#c91932',
  
  // Textes
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  
  // Bordures
  borderColor: 'rgba(0, 240, 255, 0.3)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  
  // Ombres
  glowCyan: '0 0 20px rgba(0, 240, 255, 0.3)',
  shadowCard: '0 0 30px rgba(0, 240, 255, 0.1)',
};

// Constantes de couleurs mode clair (existant)
export const LIGHT_THEME = {
  // Fonds
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  bgCard: '#ffffff',
  bgHover: '#f3f4f6',
  
  // Accents
  accentBlue: '#3b82f6',
  accentGreen: '#22c55e',
  accentRed: '#ef4444',
  
  // Textes
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  
  // Bordures
  borderColor: '#e5e7eb',
  borderLight: '#f3f4f6',
  
  // Ombres
  shadowCard: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

export default useTheme;
