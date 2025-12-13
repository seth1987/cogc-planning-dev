// Modal d'upload et d'import de PDF - Extraction avec Mistral OCR
// Version 3.2 - DEBUG: logs + alerte au montage
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, AlertCircle, Loader, Info, Zap, AlertTriangle } from 'lucide-react';
import PDFServiceWrapper from '../../services/PDFServiceWrapper';
import mappingService from '../../services/mappingService';
import planningImportService from '../../services/planningImportService';
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';
import { supabase } from '../../lib/supabaseClient';
import useIsMobile from '../../hooks/useIsMobile';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  // DEBUG: compteur de renders
  const renderCount = useRef(0);
  renderCount.current++;
  
  // Détection mobile
  const isMobile = useIsMobile();
  
  // DEBUG: log à chaque render
  console.log(`🔄 ModalUploadPDF render #${renderCount.current}, isOpen=${isOpen}, isMobile=${isMobile}`);
  
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

  // DEBUG: ajouter un log
  const addDebugLog = (msg) => {
    console.log('📋 ' + msg);
    setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    if (isOpen) {
      addDebugLog('Modal ouvert');
      loadMappingStats();
      loadCodesMapping();
    }
  }, [isOpen]);

  const loadMappingStats = async () => {
    addDebugLog('Chargement stats...');
    const mappingStats = await mappingService.getStats();
    setStats(mappingStats);
    addDebugLog(`Stats chargées: ${mappingStats.total || mappingStats.totalCodes || 0} codes`);
  };

  const loadCodesMapping = async () => {
    try {
      addDebugLog('Chargement mapping codes...');
      const { data, error } = await supabase
        .from('codes_services')
        .select('code, poste_code, service_code, description');
      
      if (error) {
        addDebugLog('Erreur mapping: ' + error.message);
        return;
      }
      
      const mapping = {};
      data.forEach(row => {
        mapping[row.code.toUpperCase()] = {
          poste: row.poste_code,
          service: row.service_code,
          description: row.description
        };
      });
      
      codesMapping.current = mapping;
      addDebugLog(`Mapping chargé: ${data.length} codes`);
    } catch (err) {
      addDebugLog('Erreur: ' + err.message);
    }
  };

  const resetModal = () => {
    addDebugLog('Reset modal');
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

  // IMPORTANT: Cette fonction est passée à PDFUploadStep
  const handleFileUpload = async (uploadedFile) => {
    addDebugLog(`handleFileUpload appelé: ${uploadedFile?.name}`);
    alert(`DEBUG Modal: Fichier reçu!\n${uploadedFile?.name}\nTaille: ${uploadedFile?.size}`);
    
    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setExtractionMethod(null);

    try {
      addDebugLog('Appel PDFServiceWrapper.readPDF...');
      const parsed = await PDFServiceWrapper.readPDF(uploadedFile);
      addDebugLog(`Extraction terminée: ${parsed.method}`);
      setExtractionMethod(parsed.method);
      
      if (!parsed.success) throw new Error(parsed.error || 'Erreur extraction');
      
      const transformedData = transformParsedDataForValidation(parsed);
      const validationResult = validateTransformedData(transformedData);
      
      if (parsed.method === 'simple-vision') {
        validationResult.warnings.unshift('⚡ Extraction rapide');
      }
      
      setValidation(validationResult);
      setExtractedData(transformedData);
      setEditedData(JSON.parse(JSON.stringify(transformedData)));
      addDebugLog('Passage à étape 2');
      setCurrentStep(2);
    } catch (err) {
      addDebugLog('Erreur: ' + err.message);
      setError(err.message || 'Erreur extraction');
    } finally {
      setLoading(false);
    }
  };

  const validateTransformedData = (data) => {
    const validation = { errors: [], warnings: [], isValid: true };
    if (!data.agent?.nom) validation.warnings.push('Nom non détecté');
    if (!data.agent?.prenom) validation.warnings.push('Prénom non détecté');
    if (!data.planning || data.planning.length === 0) {
      validation.errors.push('Aucune entrée');
      validation.isValid = false;
    } else {
      const matin = data.planning.filter(e => e.service_code === '-').length;
      const soir = data.planning.filter(e => e.service_code === 'O').length;
      const nuit = data.planning.filter(e => e.service_code === 'X').length;
      const repos = data.planning.filter(e => ['RP', 'C', 'NU', 'D'].includes(e.service_code)).length;
      if (matin > 0) validation.warnings.push(`🌅 ${matin} Matin`);
      if (soir > 0) validation.warnings.push(`🌇 ${soir} Soir`);
      if (nuit > 0) validation.warnings.push(`🌙 ${nuit} Nuit`);
      if (repos > 0) validation.warnings.push(`😴 ${repos} Repos`);
    }
    return validation;
  };

  const handleValidate = async () => {
    addDebugLog('Validation...');
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

  // ========== RENDU ==========
  return (
    <div className={`fixed inset-0 z-50 ${isMobile ? 'bg-white' : 'bg-black bg-opacity-50 flex items-center justify-center p-2'}`}>
      <div className={`${isMobile ? 'h-full flex flex-col' : 'bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <div>
                <h2 className="text-lg font-bold">Import PDF {isMobile ? '(Mobile)' : '(Desktop)'}</h2>
                <p className="text-blue-200 text-xs">
                  Étape {currentStep}/3 • Render #{renderCount.current}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg">
              <X size={24} />
            </button>
          </div>
          <div className="flex items-center justify-center mt-3 gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className={`h-2 rounded-full transition-all ${currentStep >= step ? 'w-8 bg-white' : 'w-2 bg-blue-400'}`} />
            ))}
          </div>
        </div>

        {/* Debug log */}
        {debugLog.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-2 text-xs font-mono max-h-24 overflow-y-auto">
            {debugLog.map((log, i) => (
              <div key={i} className="text-yellow-800">{log}</div>
            ))}
          </div>
        )}

        {/* Contenu */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentStep === 1 && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-amber-800 text-sm">
                  <AlertTriangle className="inline mr-1" size={16} />
                  <strong>Vérifiez les données</strong> après extraction.
                </p>
              </div>
              
              {/* PDFUploadStep avec la fonction handleFileUpload */}
              <PDFUploadStep 
                file={file} 
                onFileUpload={handleFileUpload} 
                error={error} 
                isApiConfigured={true} 
                stats={stats} 
              />
              
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm"><AlertCircle className="inline mr-1" size={16} />{error}</p>
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
            <div className="flex-1 overflow-y-auto p-4">
              <PDFImportResult importReport={importResult} onClose={handleClose} onRollback={null} onBackToValidation={() => setCurrentStep(2)} />
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white p-6 rounded-xl shadow-xl text-center mx-4">
              <Loader className="animate-spin mx-auto mb-3 text-blue-600" size={40} />
              <p className="text-gray-700 font-medium">
                {currentStep === 1 && 'Analyse du PDF...'}
                {currentStep === 2 && 'Import en cours...'}
                {currentStep === 3 && 'Finalisation...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalUploadPDF;
