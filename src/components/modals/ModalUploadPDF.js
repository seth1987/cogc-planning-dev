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
  const handleFileUpload = async (uploa