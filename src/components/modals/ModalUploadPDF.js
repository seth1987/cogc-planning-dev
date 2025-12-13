// Modal d'upload et d'import de PDF - Extraction avec Mistral OCR
// Version 3.0 - Responsive mobile (plein écran + simplification)
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, AlertCircle, Loader, Info, Zap, AlertTriangle } from 'lucide-react';
import PDFServiceWrapper from '../../services/PDFServiceWrapper';
import mappingService from '../../services/mappingService';
import planningImportService from '../../services/planningImportService';
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';
import { supabase } from '../../lib/supabaseClient';
import { useIsMobile } from '../../hooks/useIsMobile';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
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
  
  const codesMapping = useRef({});

  useEffect(() => {
    if (isOpen) {
      loadMappingStats();
      loadCodesMapping();
    }
  }, [isOpen]);

  const loadMappingStats = async () => {
    const mappingStats = await mappingService.getStats();
    setStats(mappingStats);
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
    } catch (err) {
      console.error('Erreur chargement mapping:', err);
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

  const handleFileUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setExtractionMethod(null);

    try {
      const parsed = await PDFServiceWrapper.readPDF(uploadedFile);
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
      setCurrentStep(2);
    } catch (err) {
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

  // ========== VERSION MOBILE ==========
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header mobile */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} />
              <div>
                <h2 className="text-lg font-bold">Import PDF</h2>
                <p className="text-blue-200 text-xs">
                  Étape {currentStep}/3
                  {extractionMethod && <span className="ml-1">{extractionMethod === 'simple-vision' ? '⚡' : '🔄'}</span>}
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

        {/* Contenu mobile */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentStep === 1 && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-amber-800 text-sm">
                  <AlertTriangle className="inline mr-1" size={16} />
                  <strong>Vérifiez les données</strong> après extraction.
                </p>
              </div>
              <PDFUploadStep file={file} onFileUpload={handleFileUpload} error={error} isApiConfigured={true} stats={stats} />
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
                {currentStep === 1 && 'Analyse...'}
                {currentStep === 2 && 'Import...'}
                {currentStep === 3 && 'Finalisation...'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== VERSION DESKTOP ==========
  const modalSizeClass = currentStep === 2 ? 'max-w-[95vw] w-full' : 'max-w-6xl w-full';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className={`bg-white rounded-lg shadow-xl ${modalSizeClass} max-h-[95vh] overflow-hidden flex flex-col`}>
        
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileText size={28} />
                Upload PDF Planning
              </h2>
              <p className="text-blue-100 mt-1">
                Extraction intelligente
                {extractionMethod && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
                    {extractionMethod === 'simple-vision' ? '⚡ Mode rapide' : '🔄 Mode classique'}
                  </span>
                )}
              </p>
            </div>
            <button onClick={handleClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex items-center justify-center mt-4 space-x-8">
            {[1, 2, 3].map((step, i) => (
              <div key={step} className={`flex items-center ${currentStep >= step ? 'text-white' : 'text-blue-300'}`}>
                <div className={`w-8 h-8 rounded-full ${currentStep >= step ? 'bg-white text-blue-600' : 'bg-blue-700'} flex items-center justify-center font-bold mr-2`}>{step}</div>
                <span>{['Upload', 'Validation', 'Import'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 flex-1 overflow-hidden ${currentStep === 2 ? '' : 'overflow-y-auto'}`}>
          
          {currentStep === 1 && (
            <div className="overflow-y-auto max-h-full">
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <div className="flex">
                  <Zap className="text-green-600 mr-2 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-green-900">Système d'extraction v2.0</h3>
                    <p className="text-green-800">Double méthode avec fallback automatique</p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
                <div className="flex">
                  <AlertTriangle className="text-amber-600 mr-2 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-amber-900">⚠️ Vérification recommandée</h3>
                    <p className="text-amber-800 text-sm mt-1">Vérifiez les données extraites avant de valider.</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <Info className="text-blue-600 mr-2 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900">Format bulletin SNCF</h3>
                    <p className="text-blue-800 text-sm">Dates JJ/MM/AAAA, codes CCU/CRC/ACR, horaires HH:MM</p>
                  </div>
                </div>
              </div>

              <PDFUploadStep file={file} onFileUpload={handleFileUpload} error={error} isApiConfigured={true} stats={stats} />
            </div>
          )}

          {currentStep === 2 && extractedData && (
            <PDFValidationStep data={editedData} onChange={handleDataEdit} validation={validation} onValidate={handleValidate} onCancel={goBackToUpload} loading={loading} pdfFile={file} />
          )}

          {currentStep === 3 && importResult && (
            <div className="overflow-y-auto max-h-full">
              <PDFImportResult importReport={importResult} onClose={handleClose} onRollback={null} onBackToValidation={() => setCurrentStep(2)} />
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
              <p className="text-gray-700">
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
