// Modal d'upload et d'import de PDF - Extraction avec Mistral OCR
// Version 3.6 - TOUJOURS MONTÉ (hidden par CSS) pour éviter destruction sur mobile
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, AlertCircle, Loader } from 'lucide-react';
import PDFServiceWrapper from '../../services/PDFServiceWrapper';
import mappingService from '../../services/mappingService';
import planningImportService from '../../services/planningImportService';
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';
import { supabase } from '../../lib/supabaseClient';
import useIsMobile from '../../hooks/useIsMobile';

// ID unique global pour tracker les instances
let globalInstanceCounter = 0;

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  // ID unique de cette instance - ne change jamais
  const instanceId = useRef(++globalInstanceCounter);
  const hasInitialized = useRef(false);
  
  const isMobile = useIsMobile();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, mapped: 0 });
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  const [extractionMethod, setExtractionMethod] = useState(null);
  const [debugLog, setDebugLog] = useState([]);
  
  const codesMapping = useRef({});
  const processingRef = useRef(false);

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : '📋';
    console.log(`[Modal#${instanceId.current}] ${prefix} ${msg}`);
    setDebugLog(prev => [...prev.slice(-30), { time: timestamp, msg, type }]);
  };

  // Initialisation UNE SEULE FOIS quand isOpen devient true
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      addLog(`Modal #${instanceId.current} initialisé`, 'success');
      loadMappingStats();
      loadCodesMapping();
    }
  }, [isOpen]);

  // Reset quand le modal se ferme proprement
  useEffect(() => {
    if (!isOpen && hasInitialized.current && !processingRef.current) {
      // Délai pour éviter reset pendant fermeture temporaire
      const timeout = setTimeout(() => {
        if (!processingRef.current) {
          hasInitialized.current = false;
          resetModalState();
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

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

  const resetModalState = () => {
    setCurrentStep(1);
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setImportResult(null);
    setError(null);
    setValidation({ errors: [], warnings: [] });
    setExtractionMethod(null);
    setDebugLog([]);
  };

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
      
      setExtractionMethod(parsed.method);
      
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
    setLoading(true);
    setError(null);
    try {
      const result = await planningImportService.importPlanning(editedData);
      setImportResult(result);
      setCurrentStep(3);
      if (result.success) setTimeout(() => onSuccess && onSuccess(), 100);
    } catch (err) {
      setError(err.message || 'Erreur import');
    } finally {
      setLoading(false);
    }
  };

  const handleDataEdit = (newData) => setEditedData(newData);
  const goBackToUpload = () => { setCurrentStep(1); setExtractedData(null); setEditedData(null); setError(null); };
  
  const handleClose = () => { 
    if (processingRef.current) {
      addLog('Fermeture bloquée', 'warn');
      return;
    }
    onClose(); 
  };

  // ========== RENDU TOUJOURS PRÉSENT MAIS CACHÉ SI !isOpen ==========
  // Ceci évite la destruction du composant sur mobile
  
  const modalStyle = {
    display: isOpen ? 'flex' : 'none',
    position: 'fixed',
    inset: 0,
    zIndex: 50,
  };

  return (
    <div style={modalStyle} className={isMobile ? 'bg-white' : 'bg-black bg-opacity-50 items-center justify-center p-2'}>
      <div className={`${isMobile ? 'h-full w-full flex flex-col' : 'bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} />
              <div>
                <h2 className="text-base font-bold">Import PDF #{instanceId.current}</h2>
                <p className="text-blue-200 text-xs">Étape {currentStep}/3</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Debug log */}
        <div className="bg-gray-900 p-2 text-xs font-mono flex-shrink-0" style={{ maxHeight: '100px', overflowY: 'auto' }}>
          <div className="text-gray-500 mb-1">Console #{instanceId.current}</div>
          {debugLog.slice(-8).map((log, i) => (
            <div 
              key={i} 
              className={
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-green-400' : 
                log.type === 'warn' ? 'text-yellow-400' : 
                'text-gray-300'
              }
            >
              <span className="text-gray-500">{log.time}</span> {log.msg}
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
              <PDFValidationStep data={editedData} onChange={handleDataEdit} validation={validation} onValidate={handleValidate} onCancel={goBackToUpload} loading={loading} pdfFile={file} />
            </div>
          )}

          {currentStep === 3 && importResult && (
            <div className="flex-1 overflow-y-auto p-3">
              <PDFImportResult importReport={importResult} onClose={handleClose} onRollback={null} onBackToValidation={() => setCurrentStep(2)} />
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white p-4 rounded-xl shadow-xl text-center mx-4">
              <Loader className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
              <p className="text-gray-700 text-sm">Analyse OCR...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalUploadPDF;
