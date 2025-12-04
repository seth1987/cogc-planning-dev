/**
 * PDFServiceWrapper.js - Wrapper intelligent avec fallback
 * Version: 1.0.0
 * 
 * Essaie d'abord SimplePDFService (version légère)
 * Si échec, bascule sur MistralPDFReaderService (version complète)
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
  // TENTATIVE 1: SimplePDFService (version légère ~150 lignes)
  // ════════════════════════════════════════════════════════════════
  try {
    console.log('🚀 Tentative 1: SimplePDFService (Mistral Vision direct)');
    
    const simpleResult = await extractBulletinData(pdfFile);
    
    if (simpleResult.success && simpleResult.data?.services?.length > 0) {
      console.log('✅ SimplePDFService réussi!', {
        agent: simpleResult.data.agent?.nom,
        nbServices: simpleResult.data.services.length
      });
      
      // Transformer vers le format attendu par ModalUploadPDF
      const transformed = transformSimpleToLegacyFormat(simpleResult.data);
      
      return {
        success: true,
        ...transformed,
        method: 'simple-vision',
        stats: {
          total: simpleResult.data.services.length,
          valides: simpleResult.data.services.filter(s => s.codeValide).length
        }
      };
    } else {
      console.warn('⚠️ SimplePDFService: Pas de services extraits, fallback...');
      throw new Error('Aucun service extrait');
    }
    
  } catch (simpleError) {
    console.warn('⚠️ SimplePDFService échoué:', simpleError.message);
    console.log('🔄 Basculement vers MistralPDFReaderService (version complète)...');
  }
  
  // ════════════════════════════════════════════════════════════════
  // TENTATIVE 2: MistralPDFReaderService (version complète ~1200 lignes)
  // ════════════════════════════════════════════════════════════════
  try {
    console.log('🚀 Tentative 2: MistralPDFReaderService (OCR + parsing)');
    
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
      error: `Les deux méthodes d'extraction ont échoué. Simple: ${legacyError.message}`,
      method: 'failed',
      metadata: {},
      entries: []
    };
  }
}

/**
 * Transforme le format SimplePDFService vers le format legacy attendu
 * SimplePDFService retourne: { agent, periode, services[] }
 * ModalUploadPDF attend: { metadata, entries[] }
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
    numeroCP: simpleData.agent?.numeroCP || '',
    periodeDebut: simpleData.periode?.debut || '',
    periodeFin: simpleData.periode?.fin || '',
    dateEdition: new Date().toISOString().split('T')[0]
  };
  
  // Transformer services en entries
  const entries = (simpleData.services || []).map(service => {
    // Déterminer les horaires structurés
    let horaires = [];
    if (service.horaires) {
      const match = service.horaires.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
      if (match) {
        horaires = [{
          type: 'SERVICE',
          debut: match[1],
          fin: match[2]
        }];
      }
    }
    
    return {
      date: service.dateISO || service.date,
      dateISO: service.dateISO || convertDateToISO(service.date),
      serviceCode: service.code,
      serviceLabel: service.description || service.code,
      description: service.description || '',
      horaires: horaires,
      isNightService: service.estServiceNuit || false,
      originalDate: service.dateDorigine || null,
      confidence: service.codeValide ? 1.0 : 0.5
    };
  });
  
  return {
    metadata,
    entries,
    stats: {
      total: entries.length,
      mapped: entries.filter(e => e.confidence >= 0.8).length
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
    { name: 'simple-vision', description: 'Mistral Vision direct (recommandé)', lines: 150 },
    { name: 'legacy-ocr-parsing', description: 'OCR + parsing regex (fallback)', lines: 1200 }
  ];
}

export default {
  readPDF,
  isAPIConfigured,
  getAvailableMethods
};
