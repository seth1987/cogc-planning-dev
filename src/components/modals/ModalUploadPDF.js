// Modal refactorisé pour l'upload et le traitement des PDF
// Utilise les services et composants modulaires
import React, { useState, useEffect } from 'react';
import { X, Upload, Check, Loader, ArrowLeft, ArrowRight } from 'lucide-react';

// Services
import pdfParserService from '../../services/pdfParserService';
import planningImportService from '../../services/planningImportService';
import mappingService from '../../services/mappingService';

// Composants
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  // États
  const [currentStep, setCurrentStep] = useState('upload'); // upload, validation, result
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Données
  const [parsedData, setParsedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [mappingStats, setMappingStats] = useState(null);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // Configuration API
  const MISTRAL_API_KEY = process.env.REACT_APP_MISTRAL_API_KEY;
  const isApiConfigured = MISTRAL_API_KEY && 
                          MISTRAL_API_KEY !== 'your_mistral_api_key_here' &&
                          MISTRAL_API_KEY.length > 10;

  // Charger les stats du mapping au montage
  useEffect(() => {
    if (isOpen) {
      loadMappingStats();
    }
  }, [isOpen]);

  const loadMappingStats = async () => {
    try {
      const stats = await mappingService.getStats();
      setMappingStats(stats);
      console.log('📊 Stats mapping chargées:', stats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  if (!isOpen) return null;

  // Réinitialisation complète
  const resetAll = () => {
    setCurrentStep('upload');
    setFile(null);
    setParsedData(null);
    setEditedData(null);
    setImportReport(null);
    setError('');
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  // Gestionnaire de fermeture
  const handleClose = () => {
    resetAll();
    onClose();
  };

  // Sélection du fichier
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Veuillez sélectionner un fichier PDF valide');
    }
  };

  // Upload et parsing du PDF
  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Extraire le texte
      const text = await pdfParserService.extractTextFromPDF(file);
      console.log('📄 Texte extrait (début):', text.substring(0, 300));
      
      let parsed;
      
      // 2. Parser avec Mistral ou manuellement
      if (isApiConfigured) {
        try {
          parsed = await pdfParserService.parseWithMistral(text, MISTRAL_API_KEY);
          parsed.parsing_mode = 'mistral';
          console.log('🤖 Parsing IA réussi');
        } catch (mistralError) {
          console.error('Erreur Mistral:', mistralError);
          setError(`Erreur IA: ${mistralError.message}. Utilisation du mode manuel.`);
          parsed = await pdfParserService.parseManually(text);
          parsed.parsing_mode = 'manual';
        }
      } else {
        console.log('📝 Mode manuel (API non configurée)');
        parsed = await pdfParserService.parseManually(text);
        parsed.parsing_mode = 'manual';
      }
      
      // 3. Valider les données
      const validation = pdfParserService.validateParsedData(parsed);
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      
      // 4. Préparer pour l'édition
      setParsedData(JSON.parse(JSON.stringify(parsed))); // Deep copy
      setEditedData(JSON.parse(JSON.stringify(parsed))); // Deep copy
      
      // 5. Passer à l'étape de validation
      setCurrentStep('validation');
      
    } catch (err) {
      console.error('Erreur traitement:', err);
      setError(err.message || 'Erreur lors du traitement du fichier');
    } finally {
      setLoading(false);
    }
  };

  // Modification d'une cellule
  const handleCellEdit = (index, field, value) => {
    const newData = { ...editedData };
    newData.planning[index][field] = value;
    setEditedData(newData);
    
    // Revalider
    const validation = pdfParserService.validateParsedData(newData);
    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
  };

  // Suppression d'une entrée
  const handleDeleteEntry = (index) => {
    const newData = { ...editedData };
    newData.planning.splice(index, 1);
    setEditedData(newData);
    
    // Revalider
    const validation = pdfParserService.validateParsedData(newData);
    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
  };

  // Import dans la base de données
  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      // Validation finale
      const validation = planningImportService.validateBeforeImport(editedData);
      
      if (!validation.isValid) {
        setError('Données invalides: ' + validation.errors.join(', '));
        setLoading(false);
        return;
      }
      
      // Import
      const report = await planningImportService.importPlanning(editedData);
      setImportReport(report);
      
      // Passer à l'étape résultat
      setCurrentStep('result');
      
      // Si succès, notifier le parent
      if (report.errors.length === 0 && onSuccess) {
        onSuccess();
      }
      
    } catch (err) {
      console.error('Erreur import:', err);
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setLoading(false);
    }
  };

  // Annuler le dernier import
  const handleRollback = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cet import ?')) {
      return;
    }
    
    setLoading(true);
    try {
      await planningImportService.rollbackLastImport();
      alert('Import annulé avec succès');
      handleClose();
    } catch (err) {
      console.error('Erreur rollback:', err);
      setError('Impossible d\'annuler l\'import: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Retour à l'étape précédente
  const handleBack = () => {
    if (currentStep === 'validation') {
      setCurrentStep('upload');
    } else if (currentStep === 'result') {
      setCurrentStep('validation');
    }
  };

  // Titre selon l'étape
  const getTitle = () => {
    switch(currentStep) {
      case 'upload': return '📄 Upload Bulletin PDF';
      case 'validation': return '✅ Validation des données';
      case 'result': return '📊 Résultat de l\'import';
      default: return 'Upload PDF';
    }
  };

  // Indicateur de progression
  const getProgress = () => {
    switch(currentStep) {
      case 'upload': return 33;
      case 'validation': return 66;
      case 'result': return 100;
      default: return 0;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* En-tête */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold text-gray-800">
              {getTitle()}
            </h2>
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          {/* Barre de progression */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        </div>

        {/* Contenu principal */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Messages d'erreur globaux */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Contenu selon l'étape */}
          {currentStep === 'upload' && (
            <PDFUploadStep
              file={file}
              onFileSelect={handleFileSelect}
              error={error}
              isApiConfigured={isApiConfigured}
              mappingStats={mappingStats}
            />
          )}
          
          {currentStep === 'validation' && editedData && (
            <PDFValidationStep
              parsedData={parsedData}
              editedData={editedData}
              onCellEdit={handleCellEdit}
              onDeleteEntry={handleDeleteEntry}
              validationErrors={validationErrors}
              validationWarnings={validationWarnings}
            />
          )}
          
          {currentStep === 'result' && importReport && (
            <PDFImportResult
              importReport={importReport}
              onClose={handleClose}
              onRollback={handleRollback}
            />
          )}
        </div>

        {/* Pied de page avec actions */}
        {currentStep !== 'result' && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between">
              {/* Bouton retour */}
              {currentStep === 'validation' && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
                  disabled={loading}
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>
              )}
              
              {currentStep === 'upload' && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
              )}
              
              {/* Actions principales */}
              <div className="flex gap-3 ml-auto">
                {currentStep === 'upload' && (
                  <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                      !file || loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Analyser le PDF
                      </>
                    )}
                  </button>
                )}
                
                {currentStep === 'validation' && (
                  <>
                    <button
                      onClick={() => setCurrentStep('upload')}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      disabled={loading}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={loading || validationErrors.length > 0}
                      className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                        loading || validationErrors.length > 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader className="animate-spin" size={20} />
                          Import en cours...
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          Valider et Importer
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalUploadPDF;
