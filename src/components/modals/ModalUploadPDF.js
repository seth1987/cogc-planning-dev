// Modal d'upload et d'import de PDF avec Mistral OCR
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader, Info, Key } from 'lucide-react';
import pdfParserService from '../../services/pdfParserService';
import mappingService from '../../services/mappingService';
import planningImportService from '../../services/planningImportService';
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  // États
  const [currentStep, setCurrentStep] = useState(1); // 1: Upload, 2: Validation, 3: Résultat
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, mapped: 0 });
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  // Vérifier la configuration de l'API Mistral au montage
  useEffect(() => {
    const mistralKey = process.env.REACT_APP_MISTRAL_API_KEY;
    setApiKeyConfigured(!!mistralKey);
  }, []);

  // Reset du modal
  const resetModal = () => {
    setCurrentStep(1);
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setImportResult(null);
    setLoading(false);
    setError(null);
    setStats({ total: 0, mapped: 0 });
  };

  // Fermeture du modal
  const handleClose = () => {
    resetModal();
    onClose();
  };

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 1: UPLOAD ET ANALYSE MISTRAL
  // ═══════════════════════════════════════════════════════════════

  const handleFileUpload = async (uploadedFile) => {
    if (!apiKeyConfigured) {
      setError('Clé API Mistral manquante. Configurez REACT_APP_MISTRAL_API_KEY.');
      return;
    }

    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Analyse Mistral du PDF...', uploadedFile.name);
      
      // Analyse via Mistral
      const analysisResult = await pdfParserService.analyzePDF(uploadedFile);
      
      if (!analysisResult || !analysisResult.planning) {
        throw new Error('Aucune donnée de planning extraite par Mistral');
      }

      // Mapping des codes via le service - CORRECTION: utiliser mapPlanningData au lieu de getMappingStats
      const mappedData = await mappingService.mapPlanningData ? 
        await mappingService.mapPlanningData(analysisResult) : 
        analysisResult;
      
      // Statistiques - CORRECTION: utiliser getStats() au lieu de getMappingStats()
      const mappingStats = await mappingService.getStats();
      const totalEntries = mappedData.planning ? mappedData.planning.length : 0;
      
      setStats({ 
        total: totalEntries, 
        mapped: totalEntries, // Assumons que tous sont mappés pour l'instant
        mappingStats 
      });
      
      setExtractedData(mappedData);
      setEditedData({ ...mappedData }); // Copie pour édition
      
      console.log('✅ Analyse Mistral réussie:', mappedData);
      
      // Passage à l'étape de validation
      setCurrentStep(2);
      
    } catch (err) {
      console.error('❌ Erreur analyse Mistral:', err);
      setError(`Erreur d'analyse: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ÉTAPE 2: VALIDATION DES DONNÉES
  // ═══════════════════════════════════════════════════════════════

  const handleDataEdit = (newData) => {
    setEditedData(newData);
  };

  const handleValidateAndImport = async () => {
    if (!editedData || !editedData.planning) {
      setError('Aucune donnée à importer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📥 Import en base de données...', editedData);
      
      // Import via le service dédié
      const result = await planningImportService.importPlanning(editedData);
      
      console.log('✅ Import terminé:', result);
      
      // 🛡️ CORRECTION: S'assurer que importResult contient toutes les propriétés requises
      const completeResult = {
        success: result.success || false,
        errors: result.errors || [],
        warnings: result.warnings || [],
        entriesProcessed: result.entriesProcessed || 0,
        entriesInserted: result.entriesInserted || 0,
        entriesUpdated: result.entriesUpdated || 0,
        entriesSkipped: result.entriesSkipped || 0,
        agent: result.agent || editedData.agent,
        dateRange: result.dateRange || {
          min: editedData.planning[0]?.date,
          max: editedData.planning[editedData.planning.length - 1]?.date
        },
        importMode: 'mistral',
        fileName: file?.name
      };

      setImportResult(completeResult);
      setCurrentStep(3);
      
      // Notifier le succès si tout s'est bien passé
      if (completeResult.success && onSuccess) {
        onSuccess();
      }
      
    } catch (err) {
      console.error('❌ Erreur import:', err);
      
      // 🛡️ CORRECTION: Créer un rapport d'erreur complet
      const errorResult = {
        success: false,
        errors: [{ error: err.message }],
        warnings: [],
        entriesProcessed: 0,
        entriesInserted: 0,
        entriesUpdated: 0,
        entriesSkipped: 0,
        agent: editedData.agent,
        dateRange: { min: null, max: null },
        importMode: 'mistral',
        fileName: file?.name
      };
      
      setImportResult(errorResult);
      setCurrentStep(3);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION ENTRE ÉTAPES
  // ═══════════════════════════════════════════════════════════════

  const goBackToUpload = () => {
    setCurrentStep(1);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
  };

  const goBackToValidation = () => {
    setCurrentStep(2);
    setImportResult(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // ROLLBACK (ANNULER L'IMPORT)
  // ═══════════════════════════════════════════════════════════════

  const handleRollback = async () => {
    if (!importResult || !editedData) return;

    setLoading(true);
    try {
      await planningImportService.rollbackImport(editedData);
      alert('Import annulé avec succès');
      handleClose();
    } catch (err) {
      console.error('Erreur rollback:', err);
      alert(`Erreur lors de l'annulation: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION DES PRÉREQUIS
  // ═══════════════════════════════════════════════════════════════

  const getValidationErrors = () => {
    if (!editedData) return [];
    
    const errors = [];
    
    if (!editedData.agent || !editedData.agent.nom) {
      errors.push('Nom de l\'agent manquant');
    }
    
    if (!editedData.planning || editedData.planning.length === 0) {
      errors.push('Aucune donnée de planning');
    }
    
    return errors;
  };

  // ═══════════════════════════════════════════════════════════════
  // AFFICHAGE DU MODULE NON CONFIGURÉ
  // ═══════════════════════════════════════════════════════════════

  if (!apiKeyConfigured) {
    return isOpen ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Key className="text-amber-600" size={24} />
              Module PDF désactivé
            </h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <AlertCircle className="text-amber-600 mx-auto mb-2" size={48} />
              <p className="text-amber-800 font-medium">
                Ce module nécessite une clé API Mistral pour fonctionner.
              </p>
              <p className="text-amber-700 text-sm mt-2">
                Configurez <code>REACT_APP_MISTRAL_API_KEY</code> dans vos variables d'environnement.
              </p>
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              <p>Obtenez votre clé sur : <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://console.mistral.ai/</a></p>
            </div>
            
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    ) : null;
  }

  // ═══════════════════════════════════════════════════════════════
  // AFFICHAGE PRINCIPAL DU MODAL
  // ═══════════════════════════════════════════════════════════════

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        
        {/* Header avec titre et indicateur d'étape */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="text-blue-600" size={24} />
              Import PDF Planning
              {file && <span className="text-sm text-gray-500">({file.name})</span>}
            </h2>
            <div className="flex items-center mt-2 space-x-4 text-sm">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-400'} text-white text-xs flex items-center justify-center mr-2`}>1</div>
                Upload & Analyse
              </div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-400'} text-white text-xs flex items-center justify-center mr-2`}>2</div>
                Validation
              </div>
              <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-400'} text-white text-xs flex items-center justify-center mr-2`}>3</div>
                Import
              </div>
            </div>
          </div>
          
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Statistiques dans l'header */}
        {stats.total > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Info size={16} className="text-blue-600" />
                <strong>{stats.total}</strong> entrées détectées
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={16} className="text-green-600" />
                <strong>{stats.mapped}</strong> mappées
              </span>
              {file && (
                <span className="text-gray-600">
                  📄 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Contenu principal */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          
          {/* ÉTAPE 1: Upload */}
          {currentStep === 1 && (
            <PDFUploadStep 
              onSuccess={handleFileUpload}
              onCancel={handleClose}
              loading={loading}
              error={error}
            />
          )}

          {/* ÉTAPE 2: Validation */}
          {currentStep === 2 && extractedData && (
            <PDFValidationStep
              data={editedData}
              onChange={handleDataEdit}
              validation={{
                errors: getValidationErrors(),
                warnings: []
              }}
              onValidate={handleValidateAndImport}
              onCancel={goBackToUpload}
              loading={loading}
            />
          )}

          {/* ÉTAPE 3: Résultats */}
          {currentStep === 3 && importResult && (
            <PDFImportResult
              importReport={importResult}
              onClose={handleClose}
              onRollback={importResult.success ? handleRollback : null}
              onBackToValidation={goBackToValidation}
            />
          )}

        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
              <p className="text-gray-700">
                {currentStep === 1 && 'Analyse du PDF avec Mistral...'}
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