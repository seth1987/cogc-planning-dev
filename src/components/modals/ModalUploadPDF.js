// Modal d'upload et d'import de PDF - Extraction avec Mistral OCR
// Version 3.9 - Support onChange avec fonction updater
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, FileText, AlertCircle, Loader } from 'lucide-react';
import PDFServiceWrapper from '../../services/PDFServiceWrapper';
import mappingService from '../../services/mappingService';
import planningImportService from '../../services/planningImportService';
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';
import { supabase } from '../../lib/supabaseClient';

// Instance ID pour debug
let instanceCounter = 0;

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  // ID unique pour cette instance (debug)
  const instanceId = useRef(++instanceCounter);
  const mountCount = useRef(0);
  
  // Incrémenter le compteur de montage
  useEffect(() => {
    mountCount.current++;
    console.log(`🔧 [Modal#${instanceId.current}] MONTÉ (${mountCount.current}x)`);
    return () => {
      console.log(`🔧 [Modal#${instanceId.current}] DÉMONTÉ`);
    };
  }, []);
  
  // Log des changements de isOpen
  useEffect(() => {
    console.log(`🔧 [Modal#${instanceId.current}] isOpen=${isOpen}`);
  }, [isOpen]);

  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, mapped: 0 });
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  const [debugLog, setDebugLog] = useState([]);
  
  const codesMapping = useRef({});
  const processingRef = useRef(false);

  const addLog = useCallback((msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[PDF#${instanceId.current}] ${msg}`);
    setDebugLog(prev => [...prev.slice(-20), { time: timestamp, msg, type }]);
  }, []);

  // Charger les stats et mapping quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      addLog('Modal ouvert, chargement mapping...');
      loadMappingStats();
      loadCodesMapping();
    }
  }, [isOpen, addLog]);

  const loadMappingStats = async () => {
    const mappingStats = await mappingService.getStats();
    setStats(mappingStats);
    addLog(`Stats: ${mappingStats.total || mappingStats.totalCodes || 0} codes`);
  };

  const loadCodesMapping = async () => {
    try {
      const { data, error } = await supabase
        .from('codes_services')
        .select('code, poste_code, service_code, description');
      
      if (error) return;
      
      const mapping = {};
      data.forEach(row => {
        mapping[row.code.toUpperCase()] = {
          poste: row.poste_code,
          service: row.service_code,
          description: row.description
        };
      });
      
      codesMapping.current = mapping;
      addLog(`Mapping: ${data.length} codes`);
    } catch (err) {
      addLog('Erreur mapping: ' + err.message, 'error');
    }
  };

  const resetModalState = useCallback(() => {
    addLog('Reset état modal');
    setCurrentStep(1);
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setImportResult(null);
    setError(null);
    setValidation({ errors: [], warnings: [] });
    setDebugLog([]);
  }, [addLog]);

  // Fonctions de transformation
  const determineServiceTypeFromHoraires = (horaires) => {
    if (!horaires || horaires.length === 0) return '-';
    let mainHoraire = horaires.find(h => h.type === 'SERVICE') || horaires[0];
    if (!mainHoraire || !mainHoraire.debut) return '-';
    const [heures, minutes] = mainHoraire.debut.split(':').map(Number);
    const debutMinutes = heures * 60 + (minutes || 0);
    if (debutMinutes >= 240 && debutMinutes < 600) return '-';
    if (debutMinutes >= 600 && debutMinutes < 1080) return 'O';
    return 'X';
  };

  const mapServiceCodeToSimpleFallback = (code, serviceTypeFromHoraires) => {
    if (!code) return 'RP';
    const upperCode = code.toUpperCase();
    if (upperCode === 'RP' || upperCode.includes('REPOS')) return 'RP';
    if (upperCode === 'CA' || upperCode === 'C' || upperCode === 'CONGE') return 'C';
    if (upperCode === 'NU') return 'NU';
    if (upperCode === 'DISPO' || upperCode === 'D') return 'D';
    if (upperCode === 'INACTIN' || upperCode === 'I') return 'I';
    if (upperCode.includes('HAB') || upperCode.includes('FORM')) return 'HAB';
    if (upperCode === 'RTT' || upperCode === 'RQ') return 'RP';
    if (upperCode === 'MAL' || upperCode === 'MA') return 'MA';
    if (upperCode === 'VISIMED' || upperCode === 'VMT') return 'VISIMED';
    return serviceTypeFromHoraires || '-';
  };

  const extractPosteCodeFallback = (code) => {
    if (!code) return null;
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('CCU')) return 'RE';
    if (upperCode.startsWith('CRC')) return 'CRC';
    if (upperCode.startsWith('ACR')) return 'ACR';
    if (upperCode.startsWith('CENT') || upperCode.startsWith('SOUF')) return 'SOUF';
    if (upperCode.startsWith('REO')) return 'REO';
    if (upperCode.startsWith('RC')) return 'RC';
    if (upperCode.startsWith('RO')) return 'RO';
    return null;
  };

  const transformParsedDataForValidation = (parsed) => {
    let nom = '', prenom = '';
    
    if (parsed.metadata?.agent) {
      const parts = parsed.metadata.agent.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(p => p.length > 1);
      if (parts.length >= 2) { nom = parts[0]; prenom = parts[1]; }
      else if (parts.length === 1) { nom = parts[0]; }
    }
    
    const planning = (parsed.entries || []).map(entry => {
      const upperCode = (entry.serviceCode || '').toUpperCase();
      const bddMapping = codesMapping.current[upperCode];
      
      let serviceCode, posteCode, description;
      
      if (bddMapping) {
        serviceCode = bddMapping.service;
        posteCode = bddMapping.poste;
        description = bddMapping.description || entry.serviceLabel || entry.serviceCode;
      } else {
        const serviceTypeFromHoraires = entry.isNightService ? 'X' : determineServiceTypeFromHoraires(entry.horaires);
        serviceCode = mapServiceCodeToSimpleFallback(entry.serviceCode, serviceTypeFromHoraires);
        posteCode = extractPosteCodeFallback(entry.serviceCode);
        description = entry.serviceLabel || entry.description || entry.serviceCode;
      }
      
      return {
        date: entry.date || entry.dateISO,
        service_code: serviceCode,
        poste_code: posteCode,
        original_code: entry.serviceCode,
        description: description,
        horaires: entry.horaires || [],
        isNightService: entry.isNightService || serviceCode === 'X'
      };
    });
    
    return {
      agent: { nom, prenom, numeroCP: parsed.metadata?.numeroCP || '' },
      planning,
      periode: { debut: parsed.metadata?.periodeDebut, fin: parsed.metadata?.periodeFin },
      dateEdition: parsed.metadata?.dateEdition || null,
      parsing_mode: parsed.method || 'mistral-ocr',
      original_data: parsed
    };
  };

  const validateTransformedData = (data) => {
    const validation = { errors: [], warnings: [], isValid: true };
    if (!data.agent?.nom) validation.warnings.push('Nom non détecté');
    if (!data.agent?.prenom) validation.warnings.push('Prénom non détecté');
    if (!data.planning || data.planning.length === 0) {
      validation.errors.push('Aucune entrée');
      validation.isValid = false;
    }
    return validation;
  };

  // ============ FONCTION PRINCIPALE ============
  const handleFileUpload = async (uploadedFile) => {
    if (processingRef.current) {
      addLog('Déjà en cours...', 'warn');
      return;
    }
    
    processingRef.current = true;
    addLog(`>>> FICHIER: ${uploadedFile?.name}`, 'success');
    
    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      addLog('OCR Mistral...');
      const parsed = await PDFServiceWrapper.readPDF(uploadedFile);
      
      addLog(`OCR OK: ${parsed?.entries?.length || 0} entrées`, 'success');
      
      if (!parsed || !parsed.success) {
        throw new Error(parsed?.error || 'Extraction échouée');
      }
      
      const transformedData = transformParsedDataForValidation(parsed);
      const validationResult = validateTransformedData(transformedData);
      
      addLog(`Agent: ${transformedData.agent?.nom} ${transformedData.agent?.prenom}`, 'success');
      
      setValidation(validationResult);
      setExtractedData(transformedData);
      setEditedData(JSON.parse(JSON.stringify(transformedData)));
      setLoading(false);
      setCurrentStep(2);
      addLog('>>> ÉTAPE 2 <<<', 'success');
      
    } catch (err) {
      addLog(`ERREUR: ${err.message}`, 'error');
      setError(err.message);
      setLoading(false);
    } finally {
      processingRef.current = false;
    }
  };

  const handleValidate = async () => {
    addLog('Validation et import...');
    setLoading(true);
    setError(null);
    try {
      const result = await planningImportService.importPlanning(editedData);
      setImportResult(result);
      setCurrentStep(3);
      addLog('Import terminé', 'success');
      if (result.success) setTimeout(() => onSuccess && onSuccess(), 100);
    } catch (err) {
      setError(err.message || 'Erreur import');
      addLog('Erreur import: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler pour les modifications de données - SUPPORTE FONCTION OU OBJET
  const handleDataEdit = useCallback((updaterOrData) => {
    console.log(`[Modal#${instanceId.current}] handleDataEdit appelé`);
    
    // Si c'est une fonction, l'utiliser avec setEditedData
    if (typeof updaterOrData === 'function') {
      setEditedData(prevData => {
        const newData = updaterOrData(prevData);
        console.log(`[Modal#${instanceId.current}] Mise à jour via fonction`);
        return newData;
      });
    } else {
      // Sinon, c'est un objet direct (ancien comportement)
      console.log(`[Modal#${instanceId.current}] Mise à jour directe`);
      setEditedData(updaterOrData);
    }
  }, []);

  const goBackToUpload = useCallback(() => { 
    addLog('Retour étape 1');
    setCurrentStep(1); 
    setExtractedData(null); 
    setEditedData(null); 
    setError(null);
  }, [addLog]);
  
  const handleClose = useCallback(() => { 
    if (processingRef.current) {
      addLog('Fermeture bloquée (en cours)', 'warn');
      return;
    }
    resetModalState();
    onClose(); 
  }, [addLog, resetModalState, onClose]);

  // Ne pas rendre si fermé
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} />
              <div>
                <h2 className="text-base font-bold">Import PDF</h2>
                <p className="text-blue-200 text-xs">Étape {currentStep}/3 • Instance #{instanceId.current}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Debug log */}
        <div className="bg-gray-900 p-2 text-xs font-mono flex-shrink-0 max-h-20 overflow-y-auto">
          {debugLog.slice(-5).map((log, i) => (
            <div 
              key={i} 
              className={
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-green-400' : 
                log.type === 'warn' ? 'text-yellow-400' : 
                'text-gray-300'
              }
            >
              {log.time} {log.msg}
            </div>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {currentStep === 1 && (
            <div className="flex-1 overflow-y-auto p-3">
              <PDFUploadStep 
                file={file} 
                onFileUpload={handleFileUpload} 
                error={error} 
                isApiConfigured={true} 
                stats={stats} 
              />
              
              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-red-800 text-sm"><AlertCircle className="inline mr-1" size={14} />{error}</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && extractedData && (
            <div className="flex-1 overflow-hidden">
              <PDFValidationStep 
                data={editedData} 
                onChange={handleDataEdit} 
                validation={validation} 
                onValidate={handleValidate} 
                onCancel={goBackToUpload} 
                loading={loading} 
                pdfFile={file} 
              />
            </div>
          )}

          {currentStep === 3 && importResult && (
            <div className="flex-1 overflow-y-auto p-3">
              <PDFImportResult 
                importReport={importResult} 
                onClose={handleClose} 
                onRollback={null} 
                onBackToValidation={() => setCurrentStep(2)} 
              />
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white p-4 rounded-xl shadow-xl text-center mx-4">
              <Loader className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
              <p className="text-gray-700 text-sm">Analyse OCR...</p>
              <p className="text-gray-500 text-xs mt-1">Ne fermez pas cette fenêtre</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalUploadPDF;
