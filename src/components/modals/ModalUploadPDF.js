// Modal d'upload et d'import de PDF - Extraction avec Mistral OCR
// Version 3.3 - DEBUG INTENSIF: alertes à CHAQUE étape
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, AlertCircle, Loader, AlertTriangle } from 'lucide-react';
import PDFServiceWrapper from '../../services/PDFServiceWrapper';
import mappingService from '../../services/mappingService';
import planningImportService from '../../services/planningImportService';
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';
import { supabase } from '../../lib/supabaseClient';
import useIsMobile from '../../hooks/useIsMobile';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  
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
  const isMounted = useRef(true);

  // Track unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      console.log('⚠️ MODAL UNMOUNTED!');
    };
  }, []);

  const addDebugLog = (msg) => {
    console.log('📋 ' + msg);
    if (isMounted.current) {
      setDebugLog(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      addDebugLog('Modal ouvert');
      loadMappingStats();
      loadCodesMapping();
    }
  }, [isOpen]);

  const loadMappingStats = async () => {
    const mappingStats = await mappingService.getStats();
    if (isMounted.current) {
      setStats(mappingStats);
      addDebugLog(`Stats: ${mappingStats.total || mappingStats.totalCodes || 0} codes`);
    }
  };

  const loadCodesMapping = async () => {
    try {
      const { data, error } = await supabase
        .from('codes_services')
        .select('code, poste_code, service_code, description');
      
      if (error || !isMounted.current) return;
      
      const mapping = {};
      data.forEach(row => {
        mapping[row.code.toUpperCase()] = {
          poste: row.poste_code,
          service: row.service_code,
          description: row.description
        };
      });
      
      codesMapping.current = mapping;
      addDebugLog(`Mapping: ${data.length} codes`);
    } catch (err) {
      addDebugLog('Erreur mapping: ' + err.message);
    }
  };

  const resetModal = () => {
    setCurrentStep(1);
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setImportResult(null);
    setError(null);
    setValidation({ errors: [], warnings: [] });
    setExtractionMethod(null);
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

  // ============ FONCTION PRINCIPALE - DEBUG INTENSIF ============
  const handleFileUpload = async (uploadedFile) => {
    // LOG IMMÉDIAT - avant toute autre action
    console.log('🚀 handleFileUpload START', uploadedFile?.name);
    addDebugLog(`>>> handleFileUpload: ${uploadedFile?.name}`);
    
    // ÉTAPE 1: Confirmation fichier reçu
    alert(`ÉTAPE 1/5: Fichier reçu!\n\nNom: ${uploadedFile?.name}\nTaille: ${uploadedFile?.size} bytes\n\nCliquez OK pour continuer...`);
    
    // Vérifier si toujours monté après l'alerte
    if (!isMounted.current) {
      console.log('❌ Component unmounted après alerte 1');
      return;
    }
    
    addDebugLog('Après alerte 1 - setFile...');
    
    // ÉTAPE 2: Mise à jour état
    try {
      setFile(uploadedFile);
      setLoading(true);
      setError(null);
      addDebugLog('États mis à jour');
    } catch (e) {
      alert('ERREUR setState: ' + e.message);
      return;
    }
    
    alert('ÉTAPE 2/5: États mis à jour\n\nLoading activé\n\nCliquez OK pour lancer OCR...');
    
    if (!isMounted.current) {
      console.log('❌ Component unmounted après alerte 2');
      return;
    }
    
    // ÉTAPE 3: Appel OCR
    addDebugLog('Avant appel PDFServiceWrapper...');
    
    let parsed = null;
    try {
      addDebugLog('Appel readPDF...');
      alert('ÉTAPE 3/5: Lancement extraction OCR...\n\nCeci peut prendre quelques secondes.\n\nCliquez OK et patientez...');
      
      parsed = await PDFServiceWrapper.readPDF(uploadedFile);
      
      addDebugLog(`OCR terminé: ${parsed?.method || 'unknown'}`);
      alert(`ÉTAPE 4/5: OCR terminé!\n\nMéthode: ${parsed?.method}\nSuccès: ${parsed?.success}\nEntrées: ${parsed?.entries?.length || 0}`);
      
    } catch (ocrError) {
      const errMsg = ocrError?.message || String(ocrError);
      addDebugLog('ERREUR OCR: ' + errMsg);
      alert('ERREUR OCR:\n\n' + errMsg);
      if (isMounted.current) {
        setError(errMsg);
        setLoading(false);
      }
      return;
    }
    
    if (!isMounted.current) {
      console.log('❌ Component unmounted après OCR');
      return;
    }
    
    // ÉTAPE 4: Vérification résultat
    if (!parsed || !parsed.success) {
      const errorMsg = parsed?.error || 'Extraction échouée sans message';
      addDebugLog('Échec extraction: ' + errorMsg);
      alert('ÉCHEC EXTRACTION:\n\n' + errorMsg);
      if (isMounted.current) {
        setError(errorMsg);
        setLoading(false);
      }
      return;
    }
    
    // ÉTAPE 5: Transformation et passage étape 2
    try {
      addDebugLog('Transformation données...');
      const transformedData = transformParsedDataForValidation(parsed);
      const validationResult = validateTransformedData(transformedData);
      
      addDebugLog(`Agent: ${transformedData.agent?.nom} ${transformedData.agent?.prenom}`);
      addDebugLog(`Planning: ${transformedData.planning?.length} entrées`);
      
      alert(`ÉTAPE 5/5: Transformation OK!\n\nAgent: ${transformedData.agent?.nom} ${transformedData.agent?.prenom}\nEntrées: ${transformedData.planning?.length}\n\nPassage à l'étape 2...`);
      
      if (isMounted.current) {
        setExtractionMethod(parsed.method);
        setValidation(validationResult);
        setExtractedData(transformedData);
        setEditedData(JSON.parse(JSON.stringify(transformedData)));
        setLoading(false);
        addDebugLog('>>> PASSAGE ÉTAPE 2 <<<');
        setCurrentStep(2);
      }
      
    } catch (transformError) {
      addDebugLog('ERREUR Transform: ' + transformError.message);
      alert('ERREUR TRANSFORMATION:\n\n' + transformError.message);
      if (isMounted.current) {
        setError(transformError.message);
        setLoading(false);
      }
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
  const handleClose = () => { resetModal(); onClose(); };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${isMobile ? 'bg-white' : 'bg-black bg-opacity-50 flex items-center justify-center p-2'}`}>
      <div className={`${isMobile ? 'h-full flex flex-col' : 'bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} />
              <div>
                <h2 className="text-base font-bold">Import PDF {isMobile ? '📱' : '💻'}</h2>
                <p className="text-blue-200 text-xs">Étape {currentStep}/3 • R#{renderCount.current}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Debug log - TOUJOURS VISIBLE */}
        <div className="bg-gray-900 text-green-400 p-2 text-xs font-mono max-h-40 overflow-y-auto flex-shrink-0">
          <div className="text-gray-500 mb-1">--- Debug ({debugLog.length} logs) ---</div>
          {debugLog.length === 0 ? (
            <div className="text-gray-600">En attente...</div>
          ) : (
            debugLog.map((log, i) => (
              <div key={i} className={log.includes('ERREUR') ? 'text-red-400' : log.includes('>>>') ? 'text-yellow-400' : ''}>{log}</div>
            ))
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentStep === 1 && (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                <p className="text-amber-800 text-sm">
                  <AlertTriangle className="inline mr-1" size={14} />
                  <strong>Vérifiez les données</strong> après extraction.
                </p>
              </div>
              
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
              <p className="text-gray-700 text-sm">Analyse en cours...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalUploadPDF;
