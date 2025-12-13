import { useState, useEffect, useRef } from 'react';

/**
 * Détection mobile par User-Agent (ne change jamais)
 */
const isMobileUserAgent = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(ua);
};

/**
 * Détection tactile
 */
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * useIsMobile - Hook de détection mobile/desktop STABLE
 * 
 * Utilise une combinaison de :
 * - User-Agent (prioritaire, ne change jamais)
 * - Touch capability
 * - Largeur écran (fallback)
 * 
 * La valeur initiale est VERROUILLÉE pour éviter les bascules
 * causées par le clavier virtuel ou autres resize events.
 * 
 * @param {number} breakpoint - Largeur en px (défaut: 768)
 * @returns {boolean} true si mobile, false si desktop
 */
const useIsMobile = (breakpoint = 768) => {
  // Détection initiale avec User-Agent (prioritaire)
  const initialDetection = useRef(null);
  
  if (initialDetection.current === null) {
    const byUserAgent = isMobileUserAgent();
    const byTouch = isTouchDevice();
    const byWidth = typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false;
    
    // Priorité : User-Agent > Touch + Width
    initialDetection.current = byUserAgent || (byTouch && byWidth);
    
    console.log('📱 Détection mobile initiale:', {
      userAgent: byUserAgent,
      touch: byTouch,
      width: byWidth,
      result: initialDetection.current
    });
  }
  
  // État basé sur la détection initiale (verrouillée)
  const [isMobile] = useState(initialDetection.current);
  
  return isMobile;
};

/**
 * useIsMobileReactive - Version réactive (pour les cas où on veut suivre les resize)
 * À utiliser avec précaution car peut causer des bascules d'UI
 */
export const useIsMobileReactive = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= breakpoint;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [breakpoint]);

  return isMobile;
};

/**
 * useDeviceDetect - Hook de détection avancée (STABLE)
 */
export const useDeviceDetect = () => {
  const detectionRef = useRef(null);
  
  if (detectionRef.current === null) {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const touch = isTouchDevice();
    const mobileUA = isMobileUserAgent();
    
    detectionRef.current = {
      isMobile: mobileUA || (touch && width <= 768),
      isTablet: width > 768 && width <= 1024,
      isDesktop: !mobileUA && width > 768,
      isTouchDevice: touch,
      screenWidth: width,
      userAgentMobile: mobileUA
    };
  }
  
  const [device] = useState(detectionRef.current);
  return device;
};

export default useIsMobile;
