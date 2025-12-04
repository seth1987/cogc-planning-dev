/**
 * PDFServiceWrapper.js - Wrapper intelligent avec fallback
 * Version: 1.1.0
 * 
 * Essaie d'abord SimplePDFService (OCR + JSON structuré)
 * Si échec, bascule sur MistralPDFReaderService (OCR + parsing regex)
 */

import { extractBulletinData } from './SimplePDFService';
import MistralPDFReaderService from './MistralPDFReaderService';

/**
 * Extrait les données d'un PDF bulletin SNCF avec fallback automatique
 * @param {File} pdfFile - Le fichier PDF à analyser
 * @returns {Promise<Object>} Données au format attendu par ModalUploadPDF
 */
export async function readPDF(pdfFile) {
  console.log('🔄 PDFServiceWrapper: Début extraction avec fallback');
  console.log('📄 Fichier:', pdfFile.name, `(${(pdfFile.size / 1024).toFixed(1)} KB)`);
  
  // ════════════════════════════════════════════════════════════════
  // TENTATIVE 1: SimplePDFService v2.0 (OCR + Chat JSON)
  // ════════════════════════════════════════════════════════════════
  try {
    console.log('🚀 Tentative 1: SimplePDFService v2.0 (OCR + JSON structuré)');
    
    const simpleResult = await extractBulletinData(pdfFile);
    
    if (simpleResult.success && simpleResult.data?.services?.length > 0) {
      console.log('✅ SimplePDFService réussi!', {
        agent: simpleResult.data.agent?.nom,
        nbServices: simpleResult.data.services.length,
        stats: simpleResult.data.stats
      });
      
      // Transformer vers le format attendu par ModalUploadPDF
      const transformed = transformSimpleToLegacyFormat(simpleResult.data);
      
      return {
        success: true,
        ...transformed,
        method: 'simple-ocr-json',
        stats: {
          ...transformed.stats,
          processingTimeMs: simpleResult.processingTimeMs,
          nightShifted: simpleResult.data.stats?.nightShifted || 0
        }
      };
    } else {
      console.warn('⚠️ SimplePDFService: Pas de services extraits, fallback...');
      throw new Error(simpleResult.error || 'Aucun service extrait');
    }
    
  } catch (simpleError) {
    console.warn('⚠️ SimplePDFService échoué:', simpleError.message);
    console.log('🔄 Basculement vers MistralPDFReaderService (version complète)...');
  }
  
  // ════════════════════════════════════════════════════════════════
  // TENTATIVE 2: MistralPDFReaderService (OCR + parsing regex ~1200 lignes)
  // ════════════════════════════════════════════════════════════════
  try {
    console.log('🚀 Tentative 2: MistralPDFReaderService (OCR + parsing regex)');
    
    const legacyResult = await MistralPDFReaderService.readPDF(pdfFile);
    
    if (legacyResult.success) {
      console.log('✅ MistralPDFReaderService réussi!', {
        agent: legacyResult.metadata?.agent,
        nbEntries: legacyResult.entries?.length
      });
      
      return {
        ...legacyResult,
        method: 'legacy-ocr-parsing'
      };
    } else {
      throw new Error(legacyResult.error || 'Extraction échouée');
    }
    
  } catch (legacyError) {
    console.error('❌ MistralPDFReaderService également échoué:', legacyError.message);
    
    return {
      success: false,
      error: `Les deux méthodes d'extraction ont échoué. Dernière erreur: ${legacyError.message}`,
      method: 'failed',
      metadata: {},
      entries: []
    };
  }
}

/**
 * Transforme le format SimplePDFService v2.0 vers le format legacy attendu
 * 
 * SimplePDFService retourne:
 * {
 *   agent: { nom, numeroCP },
 *   periode: { debut, fin },
 *   dateEdition,
 *   services: [{ date, dateISO, code, description, heureDebut, heureFin, codeValide, shiftedFromNight, originalDate }]
 * }
 * 
 * ModalUploadPDF attend:
 * {
 *   metadata: { agent, numeroCP, periodeDebut, periodeFin, dateEdition },
 *   entries: [{ date, dateISO, serviceCode, serviceLabel, horaires, isNightService }]
 * }
 */
function transformSimpleToLegacyFormat(simpleData) {
  // Extraire nom et prénom depuis le nom complet
  let nom = '';
  let prenom = '';
  
  if (simpleData.agent?.nom) {
    const parts = simpleData.agent.nom.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      nom = parts[0];
      prenom = parts.slice(1).join(' ');
    } else {
      nom = parts[0] || '';
    }
  }
  
  // Construire metadata
  const metadata = {
    agent: simpleData.agent?.nom || `${nom} ${prenom}`.trim(),
    numeroCP: simpleData.agent?.numeroCP || null,
    periodeDebut: simpleData.periode?.debut || '',
    periodeFin: simpleData.periode?.fin || '',
    dateEdition: simpleData.dateEdition || new Date().toISOString().split('T')[0]
  };
  
  // Transformer services en entries
  const entries = (simpleData.services || []).map(service => {
    // Construire les horaires structurés depuis heureDebut/heureFin
    let horaires = [];
    if (service.heureDebut && service.heureFin) {
      horaires = [{
        type: 'SERVICE',
        debut: service.heureDebut,
        fin: service.heureFin
      }];
    }
    
    // Déterminer si c'est un service de nuit
    const isNightService = service.shiftedFromNight || 
                           service.code?.match(/003$/) || 
                           service.code === 'X' ||
                           (service.heureDebut && parseInt(service.heureDebut.split(':')[0]) >= 20);
    
    return {
      date: service.dateISO || convertDateToISO(service.date),
      dateISO: service.dateISO || convertDateToISO(service.date),
      dateDisplay: service.date,
      serviceCode: service.code,
      serviceLabel: service.description || service.code,
      description: service.description || '',
      horaires: horaires,
      isNightService: isNightService,
      isValid: service.codeValide !== false,
      hasError: !service.codeValide,
      // Infos de décalage nuit
      dateShiftedFromNight: service.shiftedFromNight || false,
      originalDate: service.originalDate || null,
      // Pour compatibilité
      codeFoundExplicitly: true,
      guessedByHoraires: false
    };
  });
  
  return {
    metadata,
    entries,
    stats: {
      total: entries.length,
      valid: entries.filter(e => e.isValid).length,
      errors: entries.filter(e => e.hasError).length,
      mapped: entries.filter(e => e.isValid).length
    }
  };
}

/**
 * Convertit une date JJ/MM/AAAA en AAAA-MM-JJ
 */
function convertDateToISO(dateStr) {
  if (!dateStr) return '';
  
  // Si déjà au format ISO
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Format JJ/MM/AAAA
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  
  return dateStr;
}

/**
 * Vérifie si l'un des services est disponible
 */
export function isAPIConfigured() {
  return true; // La clé API est embarquée dans les deux services
}

/**
 * Retourne les infos sur les méthodes disponibles
 */
export function getAvailableMethods() {
  return [
    { name: 'simple-ocr-json', description: 'OCR + JSON structuré (recommandé, ~200 lignes)', priority: 1 },
    { name: 'legacy-ocr-parsing', description: 'OCR + parsing regex (fallback, ~1200 lignes)', priority: 2 }
  ];
}

export default {
  readPDF,
  isAPIConfigured,
  getAvailableMethods
};
