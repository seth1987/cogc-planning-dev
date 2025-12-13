import { useState, useEffect } from 'react';

/**
 * useIsMobile - Hook de détection mobile/desktop
 * 
 * Détecte si l'utilisateur est sur mobile en fonction de :
 * - La largeur de l'écran (breakpoint configurable, défaut 768px)
 * - Réactif aux changements de taille (resize, rotation)
 * 
 * @param {number} breakpoint - Largeur en px sous laquelle on considère mobile (défaut: 768)
 * @returns {boolean} true si mobile, false si desktop
 * 
 * @example
 * const isMobile = useIsMobile();
 * const isTablet = useIsMobile(1024);
 * 
 * return isMobile ? <MobileView /> : <DesktopView />;
 */
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => {
    // Check initial state (SSR safe)
    if (typeof window !== 'undefined') {
      return window.innerWidth <= breakpoint;
    }
    return false;
  });

  useEffect(() => {
    // Handler pour le resize
    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    // Écouter les changements de taille
    window.addEventListener('resize', handleResize);
    
    // Écouter aussi les changements d'orientation (mobile)
    window.addEventListener('orientationchange', handleResize);

    // Vérifier au montage
    handleResize();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
};

/**
 * useDeviceDetect - Hook de détection avancée
 * 
 * Retourne des informations détaillées sur l'appareil
 * 
 * @returns {object} { isMobile, isTablet, isDesktop, isTouchDevice, screenWidth }
 */
export const useDeviceDetect = () => {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setDevice({
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1024,
        isDesktop: width > 1024,
        isTouchDevice,
        screenWidth: width
      });
    };

    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);
    
    detectDevice();

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return device;
};

export default useIsMobile;
