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
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  const [apiConfigured, setApiConfigured] = useState(false);

  // Charger les stats au montage et vérifier l'API
  useEffect(() => {
    if (isOpen) {
      loadMappingStats();
      checkApiConfiguration();
    }
  }, [isOpen]);

  // Vérifier si l'API est configurée
  const checkApiConfiguration = () => {
    // Récupérer la clé depuis les variables d'environnement
    const apiKey = process.env.REACT_APP_MISTRAL_API_KEY || localStorage.getItem('mistral_api_key');
    setApiConfigured(apiKey && apiKey.length > 10 && apiKey !== 'sk-proj-default-key');
  };

  // Charger les statistiques de mapping
  const loadMappingStats = async () => {
    const mappingStats = await mappingService.getStats();
    setStats(mappingStats);
  };

  // Réinitialiser le modal
  const resetModal = () => {
    setCurrentStep(1);
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setImportResult(null);
    setError(null);
    setValidation({ errors: [], warnings: [] });
  };

  // Gestion de l'upload du fichier
  const handleFileUpload = async (uploadedFile) => {
    console.log('📂 Fichier reçu dans handleFileUpload:', uploadedFile.name);
    
    // Vérifier d'abord si l'API est configurée
    const apiKey = process.env.REACT_APP_MISTRAL_API_KEY || localStorage.getItem('mistral_api_key');
    
    if (!apiKey || apiKey === 'sk-proj-default-key' || apiKey.length < 10) {
      setError('Module PDF désactivé : Configurez votre clé API Mistral dans les variables d\'environnement (REACT_APP_MISTRAL_API_KEY)');
      return;
    }

    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Utilisation de Mistral OCR pour l\'extraction...');
      
      // Parser le PDF avec Mistral OCR
      const parsed = await pdfParserService.parsePDF(uploadedFile, apiKey);
      
      // Valider les données
      const validationResult = pdfParserService.validateParsedData(parsed);
      setValidation(validationResult);
      
      setExtractedData(parsed);
      setEditedData(JSON.parse(JSON.stringify(parsed))); // Deep copy
      setCurrentStep(2);
      
    } catch (err) {
      console.error('Erreur extraction:', err);
      setError(err.message || 'Erreur lors de l\'extraction du PDF');
    } finally {
      setLoading(false);
    }
  };

  // Validation et import
  const handleValidate = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await planningImportService.importPlanning(editedData);
      setImportResult(result);
      setCurrentStep(3);
      
      if (result.success) {
        setTimeout(() => {
          onSuccess && onSuccess();
        }, 100);
      }
    } catch (err) {
      console.error('Erreur import:', err);
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  // Rollback du dernier import
  const handleRollback = async () => {
    setLoading(true);
    try {
      await planningImportService.rollbackLastImport();
      alert('Import annulé avec succès');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Import Bulletin de Commande
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Extraction intelligente avec Mistral OCR
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-100 px-6 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Étape {currentStep} sur 3
            </span>
            <span className="text-sm text-blue-600 font-medium">
              {currentStep === 1 && 'Upload PDF'}
              {currentStep === 2 && 'Validation'}
              {currentStep === 3 && 'Résultat'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* OCR Info Banner */}
        {currentStep === 1 && !apiConfigured && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4">
            <div className="flex">
              <Key className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>Configuration requise</strong>
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Le module PDF nécessite une clé API Mistral pour fonctionner.<br/>
                  Configurez la variable d'environnement REACT_APP_MISTRAL_API_KEY<br/>
                  ou ajoutez votre clé dans les paramètres de l'application.
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && apiConfigured && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-4">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Mistral OCR activé</strong> - Extraction précise avec IA
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  ✓ Reconnaissance avancée des tableaux et mise en page complexe<br/>
                  ✓ Précision de 94.89% sur les documents structurés<br/>
                  ✓ Coût réduit de 87% par rapport à l'ancienne méthode
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mt-0.5 mr-2" />
                <div>
                  <p className="font-medium">Erreur</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="h-8 w-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">
                {currentStep === 1 && 'Extraction OCR en cours...'}
                {currentStep === 2 && 'Import en cours...'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Utilisation de Mistral OCR pour analyser le document
              </p>
            </div>
          )}

          {!loading && (
            <>
              {/* Étape 1: Upload */}
              {currentStep === 1 && (
                <PDFUploadStep
                  file={file}
                  onFileUpload={handleFileUpload}
                  stats={stats}
                  error={error}
                  isApiConfigured={apiConfigured}
                />
              )}

              {/* Étape 2: Validation */}
              {currentStep === 2 && extractedData && (
                <PDFValidationStep
                  data={editedData}
                  onChange={setEditedData}
                  validation={validation}
                  onValidate={handleValidate}
                  onCancel={() => setCurrentStep(1)}
                />
              )}

              {/* Étape 3: Résultat */}
              {currentStep === 3 && importResult && (
                <PDFImportResult
                  result={importResult}
                  onClose={() => {
                    resetModal();
                    onClose();
                  }}
                  onRollback={handleRollback}
                />
              )}
            </>
          )}
        </div>

        {/* Footer avec info OCR */}
        <div className="bg-gray-50 px-6 py-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {apiConfigured ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Mistral OCR activé ✓ {stats.mapped}/{stats.total} codes mappés</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span>API Mistral non configurée - Module désactivé</span>
              </>
            )}
          </div>
          <div className="text-xs text-gray-400">
            v2.1.0 - COGC Planning
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalUploadPDF;