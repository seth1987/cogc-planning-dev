// Page dédiée pour l'upload PDF - VERSION MOBILE
// Évite les problèmes de remount des modals sur mobile
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, FileText, AlertCircle, Loader, Upload, Database, CheckCircle } from 'lucide-react';
import PDFServiceWrapper from '../services/PDFServiceWrapper';
import mappingService from '../services/mappingService';
import planningImportService from '../services/planningImportService';
import PDFValidationStep from './pdf/PDFValidationStep';
import PDFImportResult from './pdf/PDFImportResult';
import { supabase } from '../lib/supabaseClient';

const PageUploadPDF = ({ onBack, onSuccess }) => {
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

  const addLog = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[PDF-Page] ${msg}`);
    setDebugLog(prev => [...prev.slice(-15), { time: timestamp, msg, type }]);
  };

  // Charger les stats et mapping au montage
  useEffect(() => {
    addLog('Page montée');
    loadMappingStats();
    loadCodesMapping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Gestion de la sélection de fichier
  const handleFileSelect = async (event) => {
    if (processingRef.current) {
      addLog('Déjà en cours...', 'warn');
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) {
      addLog('Aucun fichier sélectionné', 'warn');
      return;
    }

    const selectedFile = files[0];
    const fileName = selectedFile.name.toLowerCase();
    const fileType = selectedFile.type.toLowerCase();
    const isPDF = fileType.includes('pdf') || fileType === '' || fileName.endsWith('.pdf');
    
    if (!isPDF) {
      addLog('Fichier non PDF', 'error');
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    processingRef.current = true;
    addLog(`>>> FICHIER: ${selectedFile.name}`, 'success');
    
    setFile(selectedFile);
    setLoading(true);
    setError(null);

    try {
      addLog('OCR Mistral...');
      const parsed = await PDFServiceWrapper.readPDF(selectedFile);
      
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
    setLoading(true);
    setError(null);
    try {
      const result = await planningImportService.importPlanning(editedData);
      setImportResult(result);
      setCurrentStep(3);
      if (result.success) {
        addLog('Import réussi !', 'success');
        setTimeout(() => onSuccess && onSuccess(), 100);
      }
    } catch (err) {
      setError(err.message || 'Erreur import');
    } finally {
      setLoading(false);
    }
  };

  const handleDataEdit = (newData) => setEditedData(newData);
  
  const goBackToUpload = () => { 
    setCurrentStep(1); 
    setFile(null);
    setExtractedData(null); 
    setEditedData(null); 
    setError(null);
  };

  const handleBack = () => {
    if (processingRef.current) {
      addLog('Retour bloqué - traitement en cours', 'warn');
      return;
    }
    onBack();
  };

  // ========== RENDU ==========
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header fixe */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Import PDF</h1>
            <p className="text-blue-200 text-sm">Étape {currentStep}/3</p>
          </div>
          <FileText size={28} className="text-blue-200" />
        </div>
      </div>

      {/* Zone debug - collapsible */}
      {debugLog.length > 0 && (
        <div className="bg-gray-900 p-2 text-xs font-mono max-h-24 overflow-y-auto">
          {debugLog.slice(-6).map((log, i) => (
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
      )}

      {/* Contenu principal */}
      <div className="flex-1 overflow-y-auto">
        {/* ÉTAPE 1: Upload */}
        {currentStep === 1 && (
          <div className="p-4 space-y-4">
            {/* Stats */}
            {stats && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Database className="text-blue-600" size={20} />
                  <span className="font-medium text-blue-900">
                    Base connectée • {stats.totalCodes || stats.total || 0} codes
                  </span>
                </div>
              </div>
            )}

            {/* Zone loading */}
            {loading && (
              <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-8 text-center">
                <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={56} />
                <p className="text-xl font-bold text-blue-900">Analyse en cours...</p>
                <p className="text-blue-700 mt-2">{file?.name}</p>
                <p className="text-blue-500 text-sm mt-2">Extraction OCR avec Mistral AI</p>
                <p className="text-blue-400 text-xs mt-4">Ne quittez pas cette page</p>
              </div>
            )}

            {/* Fichier sélectionné */}
            {!loading && file && (
              <div className="bg-green-50 border-2 border-green-400 rounded-xl p-6 text-center">
                <CheckCircle className="mx-auto mb-3 text-green-600" size={48} />
                <p className="text-lg font-bold text-green-900">PDF sélectionné</p>
                <p className="text-green-700 mt-1">{file.name}</p>
              </div>
            )}

            {/* Boutons upload */}
            {!loading && !file && (
              <div className="space-y-4">
                {/* Bouton principal */}
                <label className="block bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl p-6 text-center transition-colors shadow-lg cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,application/pdf,*/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="mx-auto mb-3" size={40} />
                  <p className="text-xl font-bold">Sélectionner un PDF</p>
                  <p className="text-blue-200 text-sm mt-2">Bulletin de commande SNCF</p>
                </label>

                {/* Bouton alternatif */}
                <label className="block bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl p-4 text-center transition-colors shadow cursor-pointer">
                  <input
                    type="file"
                    accept="*/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <FileText className="mx-auto mb-2" size={28} />
                  <p className="font-bold">Méthode alternative</p>
                  <p className="text-green-200 text-xs">Si le bouton bleu ne fonctionne pas</p>
                </label>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-medium text-red-900">Erreur</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!loading && !file && (
              <div className="bg-gray-100 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Format accepté :</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✓ Bulletin de commande SNCF (PDF)</li>
                  <li>✓ Détection automatique de l'agent</li>
                  <li>✓ Services de nuit décalés J+1</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 2: Validation */}
        {currentStep === 2 && extractedData && (
          <PDFValidationStep 
            data={editedData} 
            onChange={handleDataEdit} 
            validation={validation} 
            onValidate={handleValidate} 
            onCancel={goBackToUpload} 
            loading={loading} 
            pdfFile={file} 
          />
        )}

        {/* ÉTAPE 3: Résultat */}
        {currentStep === 3 && importResult && (
          <div className="p-4">
            <PDFImportResult 
              importReport={importResult} 
              onClose={handleBack} 
              onRollback={null} 
              onBackToValidation={() => setCurrentStep(2)} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PageUploadPDF;
