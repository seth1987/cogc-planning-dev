// Modal d'upload et d'import de PDF avec Mistral OCR
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader, Info } from 'lucide-react';
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

  // Clé API Mistral intégrée directement
  const MISTRAL_API_KEY = 'SABnA5l5iTJh4wdTHKpVwhcQ9D1g4wWD';

  // Charger les stats au montage
  useEffect(() => {
    if (isOpen) {
      loadMappingStats();
    }
  }, [isOpen]);

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
    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      console.log('🤖 Utilisation de Mistral OCR pour l\'extraction...');
      
      // Parser le PDF avec Mistral OCR en utilisant la clé API intégrée
      const parsed = await pdfParserService.parsePDF(uploadedFile, MISTRAL_API_KEY);
      
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

  // Gestion de l'édition
  const handleDataEdit = (newData) => {
    setEditedData(newData);
  };

  // Retour à l'upload
  const goBackToUpload = () => {
    setCurrentStep(1);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
  };

  // Fermeture du modal
  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        
        {/* Header avec étapes */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileText size={28} />
                Upload PDF Planning
              </h2>
              <p className="text-blue-100 mt-1">Powered by Mistral OCR - Extraction intelligente de documents</p>
            </div>
            <button onClick={handleClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition">
              <X size={24} />
            </button>
          </div>
          
          {/* Indicateur d'étapes */}
          <div className="flex items-center justify-center mt-4 space-x-8">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-white' : 'text-blue-300'}`}>
              <div className={`w-8 h-8 rounded-full ${currentStep >= 1 ? 'bg-white text-blue-600' : 'bg-blue-700'} flex items-center justify-center font-bold mr-2`}>1</div>
              <span>Upload</span>
            </div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-white' : 'text-blue-300'}`}>
              <div className={`w-8 h-8 rounded-full ${currentStep >= 2 ? 'bg-white text-blue-600' : 'bg-blue-700'} flex items-center justify-center font-bold mr-2`}>2</div>
              <span>Validation</span>
            </div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-white' : 'text-blue-300'}`}>
              <div className={`w-8 h-8 rounded-full ${currentStep >= 3 ? 'bg-white text-blue-600' : 'bg-blue-700'} flex items-center justify-center font-bold mr-2`}>3</div>
              <span>Import</span>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          
          {/* Étape 1: Upload */}
          {currentStep === 1 && (
            <div>
              {/* Information sur Mistral OCR */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <Info className="text-blue-600 mr-2" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900">Nouveau !</h3>
                    <p className="text-blue-800">Utilisation de Mistral OCR pour une extraction plus précise</p>
                    <ul className="text-sm text-blue-700 mt-2 space-y-1">
                      <li>• Reconnaissance avancée des tableaux et mise en page complexe</li>
                      <li>• Précision de 94.89% sur les documents structurés</li>
                      <li>• Coût réduit de 87% par rapport à l'ancienne méthode</li>
                    </ul>
                  </div>
                </div>
              </div>

              <PDFUploadStep 
                onSuccess={handleFileUpload}
                onCancel={handleClose}
                loading={loading}
                error={error}
              />
            </div>
          )}

          {/* Étape 2: Validation */}
          {currentStep === 2 && extractedData && (
            <PDFValidationStep
              data={editedData}
              onChange={handleDataEdit}
              validation={validation}
              onValidate={handleValidate}
              onCancel={goBackToUpload}
              loading={loading}
            />
          )}

          {/* Étape 3: Résultats */}
          {currentStep === 3 && importResult && (
            <PDFImportResult
              importReport={importResult}
              onClose={handleClose}
              onRollback={null}
              onBackToValidation={() => setCurrentStep(2)}
            />
          )}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
              <p className="text-gray-700">
                {currentStep === 1 && 'Analyse du PDF avec Mistral OCR...'}
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