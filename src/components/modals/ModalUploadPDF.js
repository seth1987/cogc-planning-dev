// Modal pour l'upload et traitement de PDF
import React, { useState } from 'react';
import { X } from 'lucide-react';

// Composants PDF
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';

// Services
import supabaseService from '../../services/supabaseService';

const ModalUploadPDF = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState('upload'); // 'upload', 'validation', 'result'
  const [uploadedData, setUploadedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [validation, setValidation] = useState({ errors: [], warnings: [] });
  const [importReport, setImportReport] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Reset modal state
  const resetModal = () => {
    setCurrentStep('upload');
    setUploadedData(null);
    setEditedData(null);
    setValidation({ errors: [], warnings: [] });
    setImportReport(null);
    setProcessing(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetModal();
    onClose();
  };

  // Handle successful upload and parsing
  const handleUploadSuccess = (data) => {
    console.log('📄 Données extraites du PDF:', data);
    setUploadedData(data);
    setEditedData(data); // Copie pour édition
    
    // Validation des données
    const errors = [];
    const warnings = [];
    
    // Vérifications de base
    if (!data.agent || !data.agent.nom) {
      errors.push('Nom de l\'agent manquant ou non détecté');
    }
    
    if (!data.planning || data.planning.length === 0) {
      errors.push('Aucune donnée de planning extraite');
    }
    
    // Avertissements
    if (data.planning && data.planning.length > 50) {
      warnings.push(`Grand nombre d'entrées détectées (${data.planning.length})`);
    }
    
    if (data.parsing_mode === 'manual') {
      warnings.push('Extraction manuelle - vérifiez les données');
    }
    
    setValidation({ errors, warnings });
    setCurrentStep('validation');
  };

  // Handle data changes during validation
  const handleDataChange = (newData) => {
    setEditedData(newData);
    
    // Re-validation avec les nouvelles données
    const errors = [];
    const warnings = [];
    
    if (!newData.agent || !newData.agent.nom || !newData.agent.prenom) {
      errors.push('Nom et prénom de l\'agent requis');
    }
    
    if (!newData.planning || newData.planning.length === 0) {
      errors.push('Au moins une entrée de planning requise');
    }
    
    setValidation({ errors, warnings });
  };

  // Handle validation and import
  const handleValidateAndImport = async () => {
    if (!editedData || validation.errors.length > 0) {
      alert('Corrigez les erreurs avant d\'importer');
      return;
    }

    setProcessing(true);
    
    try {
      console.log('🚀 Début de l\'import en base...');
      
      // 1. Trouver ou créer l'agent
      let agent = await supabaseService.findAgentByName(
        editedData.agent.nom, 
        editedData.agent.prenom
      );
      
      if (!agent) {
        // Créer l'agent s'il n'existe pas
        agent = await supabaseService.createAgent({
          nom: editedData.agent.nom,
          prenom: editedData.agent.prenom,
          statut: 'roulement', // Statut par défaut
          groupe: 'A' // Groupe par défaut
        });
      }

      // 2. Import des données de planning
      const importStats = {
        entriesProcessed: 0,
        entriesInserted: 0,
        entriesUpdated: 0,
        entriesSkipped: 0,
        errors: [],
        warnings: []
      };

      for (const entry of editedData.planning) {
        try {
          importStats.entriesProcessed++;
          
          // Vérifier si une entrée existe déjà
          const existing = await supabaseService.getPlanningEntry(agent.id, entry.date);
          
          if (existing) {
            // Mise à jour
            await supabaseService.updatePlanning(
              agent.id,
              entry.date,
              entry.service_code,
              entry.poste_code
            );
            importStats.entriesUpdated++;
          } else {
            // Création
            await supabaseService.savePlanning(
              agent.id,
              entry.date,
              entry.service_code,
              entry.poste_code
            );
            importStats.entriesInserted++;
          }
          
        } catch (error) {
          console.error(`Erreur import entrée ${entry.date}:`, error);
          importStats.errors.push({
            date: entry.date,
            error: error.message
          });
        }
      }

      // 3. Calcul de la période importée
      const dates = editedData.planning.map(p => p.date).sort();
      const dateRange = {
        min: dates[0],
        max: dates[dates.length - 1]
      };

      // 4. Créer le rapport d'import
      const report = {
        success: importStats.errors.length === 0,
        agent,
        ...importStats,
        dateRange,
        totalEntries: editedData.planning.length
      };

      console.log('✅ Import terminé:', report);
      setImportReport(report);
      setCurrentStep('result');
      
      // Notifier le succès au parent
      if (report.success) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('❌ Erreur durant l\'import:', error);
      
      // Rapport d'erreur
      setImportReport({
        success: false,
        errors: [{ error: error.message }],
        warnings: [],
        entriesProcessed: 0,
        entriesInserted: 0,
        entriesUpdated: 0,
        entriesSkipped: 0,
        dateRange: { min: null, max: null }
      });
      setCurrentStep('result');
    } finally {
      setProcessing(false);
    }
  };

  // Handle back button from validation
  const handleBackToUpload = () => {
    setCurrentStep('upload');
    setValidation({ errors: [], warnings: [] });
  };

  // Handle rollback (annuler l'import)
  const handleRollback = async () => {
    if (!importReport || !importReport.agent) return;
    
    try {
      setProcessing(true);
      
      // Supprimer les entrées importées
      for (const entry of editedData.planning) {
        await supabaseService.deletePlanning(importReport.agent.id, entry.date);
      }
      
      alert('Import annulé avec succès');
      handleClose();
      
    } catch (error) {
      console.error('Erreur rollback:', error);
      alert('Erreur lors de l\'annulation');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {currentStep === 'upload' && 'Import PDF Planning'}
            {currentStep === 'validation' && 'Validation des données'}
            {currentStep === 'result' && 'Résultat de l\'import'}
          </h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-6 h-6 rounded-full ${currentStep === 'upload' ? 'bg-blue-600' : 'bg-green-600'} text-white text-xs flex items-center justify-center mr-2`}>
                1
              </div>
              Upload
            </div>
            <div className={`flex items-center ${currentStep === 'validation' ? 'text-blue-600' : currentStep === 'result' ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full ${currentStep === 'validation' ? 'bg-blue-600' : currentStep === 'result' ? 'bg-green-600' : 'bg-gray-400'} text-white text-xs flex items-center justify-center mr-2`}>
                2
              </div>
              Validation
            </div>
            <div className={`flex items-center ${currentStep === 'result' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full ${currentStep === 'result' ? 'bg-blue-600' : 'bg-gray-400'} text-white text-xs flex items-center justify-center mr-2`}>
                3
              </div>
              Import
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentStep === 'upload' && (
            <PDFUploadStep 
              onSuccess={handleUploadSuccess}
              onCancel={handleClose}
            />
          )}
          
          {currentStep === 'validation' && editedData && (
            <PDFValidationStep
              data={editedData}
              onChange={handleDataChange}
              validation={validation}
              onValidate={handleValidateAndImport}
              onCancel={handleBackToUpload}
            />
          )}
          
          {currentStep === 'result' && (
            <PDFImportResult
              importReport={importReport}
              onClose={handleClose}
              onRollback={importReport?.success ? handleRollback : null}
            />
          )}
        </div>

        {/* Loading overlay */}
        {processing && (
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700">
                {currentStep === 'validation' ? 'Import en cours...' : 'Traitement...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalUploadPDF;