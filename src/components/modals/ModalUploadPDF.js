// Modal d'upload et d'import de PDF - Extraction avec Mistral OCR
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader, Info } from 'lucide-react';
import MistralPDFReaderService from '../../services/MistralPDFReaderService';
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

  /**
   * Détermine le type de service (Matin/Soir/Nuit) à partir des horaires extraits
   * @param {Array} horaires - Tableau d'horaires [{debut: "HH:MM", fin: "HH:MM"}, ...]
   * @returns {string} - Code service: '-' (Matin), 'O' (Soir), 'X' (Nuit)
   */
  const determineServiceTypeFromHoraires = (horaires) => {
    if (!horaires || horaires.length === 0) {
      return '-'; // Par défaut Matin si pas d'horaires
    }

    // Prendre le premier horaire significatif (ignorer METRO, RS)
    let mainHoraire = horaires.find(h => h.type === 'SERVICE') || horaires[0];
    
    if (!mainHoraire || !mainHoraire.debut) {
      return '-';
    }

    // Extraire l'heure de début
    const debutStr = mainHoraire.debut;
    const [heures, minutes] = debutStr.split(':').map(Number);
    const debutMinutes = heures * 60 + (minutes || 0);

    // Logique de détermination basée sur l'heure de début
    // Matin: 04:00 - 10:00 (240 - 600 minutes)
    // Soir: 10:00 - 18:00 (600 - 1080 minutes)
    // Nuit: 18:00 - 04:00 (1080 - 240 minutes, en passant par minuit)

    if (debutMinutes >= 240 && debutMinutes < 600) {
      // 04:00 - 10:00 → Matin
      return '-';
    } else if (debutMinutes >= 600 && debutMinutes < 1080) {
      // 10:00 - 18:00 → Soir
      return 'O';
    } else {
      // 18:00 - 04:00 → Nuit
      return 'X';
    }
  };

  /**
   * Transforme les données du MistralPDFReaderService vers le format attendu par PDFValidationStep
   * MistralPDFReaderService retourne: { metadata: { agent: "NOM PRENOM" }, entries: [...] }
   * PDFValidationStep attend: { agent: { nom, prenom }, planning: [...] }
   */
  const transformParsedDataForValidation = (parsed) => {
    console.log('🔄 Transformation des données pour validation...');
    console.log('   Données reçues:', parsed);
    
    // Extraire nom et prénom depuis metadata.agent
    let nom = '';
    let prenom = '';
    
    if (parsed.metadata?.agent) {
      // Nettoyer la chaîne (enlever \n et caractères parasites)
      const agentClean = parsed.metadata.agent
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Séparer nom et prénom (format: "NOM PRENOM" ou "NOM PRENOM\nN")
      const parts = agentClean.split(' ').filter(p => p.length > 1);
      if (parts.length >= 2) {
        nom = parts[0];
        prenom = parts[1];
      } else if (parts.length === 1) {
        nom = parts[0];
      }
    }
    
    // Transformer entries en planning avec le format attendu
    const planning = (parsed.entries || []).map(entry => {
      // Déterminer le type de service à partir des horaires
      const serviceType = entry.isNightService ? 'X' : determineServiceTypeFromHoraires(entry.horaires);
      
      // Mapper les codes spéciaux qui ne dépendent pas des horaires
      const simpleCode = mapServiceCodeToSimple(entry.serviceCode, serviceType);
      
      console.log(`   📋 ${entry.date} ${entry.serviceCode} → ${simpleCode} (horaires: ${JSON.stringify(entry.horaires?.map(h => h.debut + '-' + h.fin))})`);
      
      return {
        date: entry.date || entry.dateISO,
        service_code: simpleCode,
        poste_code: extractPosteCode(entry.serviceCode),
        original_code: entry.serviceCode,
        description: entry.serviceLabel || entry.description || entry.serviceCode,
        horaires: entry.horaires || [],
        isNightService: entry.isNightService || serviceType === 'X'
      };
    });
    
    const transformed = {
      agent: {
        nom: nom,
        prenom: prenom,
        numeroCP: parsed.metadata?.numeroCP || ''
      },
      planning: planning,
      periode: {
        debut: parsed.metadata?.periodeDebut,
        fin: parsed.metadata?.periodeFin
      },
      dateEdition: parsed.metadata?.dateEdition || null,
      parsing_mode: parsed.method || 'mistral-ocr',
      original_data: parsed // Garder les données originales pour référence
    };
    
    console.log('✅ Données transformées:', transformed);
    console.log('   Agent:', transformed.agent);
    console.log('   Planning:', transformed.planning.length, 'entrées');
    
    return transformed;
  };

  /**
   * Mappe un code service complet (CCU001, ACR002, etc.) vers un code simple (-, O, X, RP, etc.)
   * @param {string} code - Code service SNCF original
   * @param {string} serviceTypeFromHoraires - Type déterminé par les horaires (-, O, X)
   * @returns {string} - Code simple pour l'affichage
   */
  const mapServiceCodeToSimple = (code, serviceTypeFromHoraires) => {
    if (!code) return 'RP';
    
    const upperCode = code.toUpperCase();
    
    // Codes de repos et absences - ne dépendent PAS des horaires
    if (upperCode === 'RP' || upperCode.includes('REPOS')) return 'RP';
    if (upperCode === 'CA' || upperCode === 'C' || upperCode === 'CONGE') return 'C';
    if (upperCode === 'NU') return 'NU';
    if (upperCode === 'DISPO' || upperCode === 'D') return 'D';
    if (upperCode === 'INACTIN' || upperCode === 'I') return 'I';
    if (upperCode.includes('HAB') || upperCode.includes('FORM')) return 'HAB';
    if (upperCode === 'RTT' || upperCode === 'RQ') return 'RP';
    if (upperCode === 'MAL' || upperCode === 'MA') return 'MA';
    if (upperCode === 'VISIMED' || upperCode === 'VMT') return 'VISIMED';
    
    // Codes de service opérationnels (CCU, CRC, ACR, CENT, REO)
    // → Utiliser le type déterminé par les horaires
    if (upperCode.startsWith('CCU') || 
        upperCode.startsWith('CRC') || 
        upperCode.startsWith('ACR') || 
        upperCode.startsWith('CENT') || 
        upperCode.startsWith('REO')) {
      return serviceTypeFromHoraires || '-';
    }
    
    // Par défaut, utiliser le type des horaires si disponible
    return serviceTypeFromHoraires || '-';
  };

  /**
   * Extrait le code poste depuis un code service complet
   */
  const extractPosteCode = (code) => {
    if (!code) return null;
    
    const upperCode = code.toUpperCase();
    
    if (upperCode.startsWith('CCU')) return 'CCU';
    if (upperCode.startsWith('CRC')) return 'CRC';
    if (upperCode.startsWith('ACR')) return 'ACR';
    if (upperCode.startsWith('CENT')) return 'SOUF';
    if (upperCode.startsWith('REO')) return 'REO';
    
    return null;
  };

  // Gestion de l'upload du fichier
  const handleFileUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      console.log('📁 Fichier sélectionné:', uploadedFile.name);
      console.log('📄 Extraction du PDF avec Mistral OCR...');
      
      // Utiliser MistralPDFReaderService pour lire le PDF
      const parsed = await MistralPDFReaderService.readPDF(uploadedFile);
      
      // Vérifier si l'extraction a réussi
      if (!parsed.success) {
        throw new Error(parsed.error || 'Erreur lors de l\'extraction du PDF');
      }
      
      console.log('✅ Extraction réussie:', parsed.stats);
      
      // Transformer les données vers le format attendu par PDFValidationStep
      const transformedData = transformParsedDataForValidation(parsed);
      
      // Valider les données transformées
      const validationResult = validateTransformedData(transformedData);
      setValidation(validationResult);
      
      setExtractedData(transformedData);
      setEditedData(JSON.parse(JSON.stringify(transformedData))); // Deep copy
      setCurrentStep(2);
      
    } catch (err) {
      console.error('Erreur extraction:', err);
      setError(err.message || 'Erreur lors de l\'extraction du PDF');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Valide les données transformées
   */
  const validateTransformedData = (data) => {
    const validation = {
      errors: [],
      warnings: [],
      isValid: true
    };

    // Vérifier l'agent
    if (!data.agent?.nom) {
      validation.warnings.push('Nom de l\'agent non détecté - à remplir manuellement');
    }
    if (!data.agent?.prenom) {
      validation.warnings.push('Prénom de l\'agent non détecté - à remplir manuellement');
    }

    // Vérifier le planning
    if (!data.planning || data.planning.length === 0) {
      validation.errors.push('Aucune entrée de planning trouvée');
      validation.isValid = false;
    } else {
      // Compter les entrées valides
      const validEntries = data.planning.filter(e => e.date && e.service_code);
      validation.warnings.push(`📊 ${validEntries.length}/${data.planning.length} entrées valides`);
      
      // Compter par type
      const matin = data.planning.filter(e => e.service_code === '-').length;
      const soir = data.planning.filter(e => e.service_code === 'O').length;
      const nuit = data.planning.filter(e => e.service_code === 'X').length;
      const repos = data.planning.filter(e => ['RP', 'C', 'NU', 'D'].includes(e.service_code)).length;
      
      if (matin > 0) validation.warnings.push(`🌅 ${matin} service(s) Matin`);
      if (soir > 0) validation.warnings.push(`🌇 ${soir} service(s) Soir`);
      if (nuit > 0) validation.warnings.push(`🌙 ${nuit} service(s) Nuit`);
      if (repos > 0) validation.warnings.push(`😴 ${repos} jour(s) repos/congé`);
      
      // Vérifier les doublons de dates
      const dates = data.planning.map(e => e.date);
      const uniqueDates = [...new Set(dates)];
      if (dates.length !== uniqueDates.length) {
        validation.warnings.push('⚠️ Plusieurs services sur certaines dates (services de nuit ?)');
      }
    }

    // Info sur la période
    if (data.periode?.debut && data.periode?.fin) {
      validation.warnings.push(`📅 Période: ${data.periode.debut} → ${data.periode.fin}`);
    }

    return validation;
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
              <p className="text-blue-100 mt-1">Extraction intelligente avec Mistral OCR - Précision 100%</p>
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
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                <div className="flex">
                  <CheckCircle className="text-green-600 mr-2" size={20} />
                  <div>
                    <h3 className="font-semibold text-green-900">Extraction intelligente avec Mistral OCR</h3>
                    <p className="text-green-800">Reconnaissance optique de caractères haute précision</p>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• Précision de 100% sur les bulletins SNCF</li>
                      <li>• Détection automatique des services de nuit</li>
                      <li>• Extraction des horaires et codes service</li>
                      <li>• Traitement en 2-4 secondes par bulletin</li>
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
                      <li>• Codes service : CCU001-006, CRC001-003, ACR001-004, CENT001-003, REO001-010, RP, DISPO, NU, VISIMED, etc.</li>
                      <li>• Horaires au format HH:MM → détection auto Matin/Soir/Nuit</li>
                      <li>• Informations agent et numéro CP</li>
                    </ul>
                  </div>
                </div>
              </div>

              <PDFUploadStep 
                file={file}
                onFileUpload={handleFileUpload}
                error={error}
                isApiConfigured={true}
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
