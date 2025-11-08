// Modal d'upload et d'import de PDF - Extraction locale sans API externe
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
      console.log('📄 Extraction locale du PDF...');
      
      // Parser le PDF avec extraction locale (PDF.js)
      const parsed = await pdfParserService.parsePDF(uploadedFile);
      
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
              <p className="text-blue-100 mt-1">Extraction locale avec PDF.js - Aucune API externe requise</p>
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
              {/* Information sur l'extraction locale */}
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <CheckCircle className="text-green-600 mr-2" size={20} />
                  <div>
                    <h3 className="font-semibold text-green-900">Extraction 100% locale</h3>
                    <p className="text-green-800">Vos documents ne quittent jamais votre ordinateur</p>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• Extraction directe avec PDF.js intégré</li>
                      <li>• Aucune API externe utilisée</li>
                      <li>• Sécurité et confidentialité garanties</li>
                      <li>• Mode démo disponible pour les tests</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Information sur le format attendu */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <Info className="text-blue-600 mr-2" size={20} />
                  <div>
                    <h3 className="font-semibold text-blue-900">Format de bulletin SNCF attendu</h3>
                    <p className="text-blue-800 text-sm">Le système reconnaît automatiquement :</p>
                    <ul className="text-sm text-blue-700 mt-1">
                      <li>• Dates au format JJ/MM/AAAA</li>
                      <li>• Codes service : CCU001-004, CRC001-002, RP, DISPO, NU, etc.</li>
                      <li>• Horaires au format HH:MM</li>
                      <li>• Informations agent et numéro CP</li>
                    </ul>
                  </div>
                </div>
              </div>

              <PDFUploadStep 
                file={file}
                onFileUpload={handleFileUpload}
                error={error}
                isApiConfigured={true} // Toujours true car pas d'API nécessaire
                stats={stats}
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
                {currentStep === 1 && 'Analyse du PDF en cours...'}
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