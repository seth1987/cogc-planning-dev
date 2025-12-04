// Modal d'upload et d'import de PDF - Extraction avec Mistral OCR
// Version 2.0 - Utilise PDFServiceWrapper avec fallback automatique
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader, Info, Zap, AlertTriangle } from 'lucide-react';
import PDFServiceWrapper from '../../services/PDFServiceWrapper';
import mappingService from '../../services/mappingService';
import planningImportService from '../../services/planningImportService';
import PDFUploadStep from '../pdf/PDFUploadStep';
import PDFValidationStep from '../pdf/PDFValidationStep';
import PDFImportResult from '../pdf/PDFImportResult';
import { supabase } from '../../lib/supabaseClient';

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
  const [extractionMethod, setExtractionMethod] = useState(null); // Pour afficher quelle méthode a été utilisée
  
  // Mapping des codes depuis la BDD
  const codesMapping = useRef({});

  // Charger les stats et le mapping au montage
  useEffect(() => {
    if (isOpen) {
      loadMappingStats();
      loadCodesMapping();
    }
  }, [isOpen]);

  // Charger les statistiques de mapping
  const loadMappingStats = async () => {
    const mappingStats = await mappingService.getStats();
    setStats(mappingStats);
  };

  // Charger le mapping des codes depuis la BDD
  const loadCodesMapping = async () => {
    try {
      console.log('🔄 Chargement du mapping codes depuis la BDD...');
      const { data, error } = await supabase
        .from('codes_services')
        .select('code, poste_code, service_code, description');
      
      if (error) {
        console.error('❌ Erreur chargement mapping:', error);
        return;
      }
      
      // Construire le mapping { CODE: { poste, service, desc } }
      const mapping = {};
      data.forEach(row => {
        mapping[row.code.toUpperCase()] = {
          poste: row.poste_code,
          service: row.service_code,
          description: row.description
        };
      });
      
      codesMapping.current = mapping;
      console.log(`✅ ${Object.keys(mapping).length} codes chargés depuis la BDD`);
    } catch (err) {
      console.error('❌ Erreur chargement mapping:', err);
    }
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
    setExtractionMethod(null);
  };

  /**
   * Détermine le type de service (Matin/Soir/Nuit) à partir des horaires extraits
   * UNIQUEMENT utilisé comme fallback si le code n'est pas dans la BDD
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
    if (debutMinutes >= 240 && debutMinutes < 600) {
      return '-'; // 04:00 - 10:00 → Matin
    } else if (debutMinutes >= 600 && debutMinutes < 1080) {
      return 'O'; // 10:00 - 18:00 → Soir
    } else {
      return 'X'; // 18:00 - 04:00 → Nuit
    }
  };

  /**
   * Transforme les données du PDFServiceWrapper vers le format attendu par PDFValidationStep
   */
  const transformParsedDataForValidation = (parsed) => {
    console.log('🔄 Transformation des données pour validation...');
    console.log('   Données reçues:', parsed);
    
    // Extraire nom et prénom depuis metadata.agent
    let nom = '';
    let prenom = '';
    
    if (parsed.metadata?.agent) {
      const agentClean = parsed.metadata.agent
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
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
      // Récupérer le mapping depuis la BDD
      const upperCode = (entry.serviceCode || '').toUpperCase();
      const bddMapping = codesMapping.current[upperCode];
      
      let serviceCode, posteCode, description;
      
      if (bddMapping) {
        // ✅ Code trouvé dans la BDD → utiliser les valeurs de la BDD
        serviceCode = bddMapping.service;
        posteCode = bddMapping.poste;
        description = bddMapping.description || entry.serviceLabel || entry.serviceCode;
        console.log(`   📋 ${entry.date} ${entry.serviceCode} → ${serviceCode} (BDD: poste=${posteCode})`);
      } else {
        // ⚠️ Code non trouvé → fallback sur la logique des horaires
        const serviceTypeFromHoraires = entry.isNightService ? 'X' : determineServiceTypeFromHoraires(entry.horaires);
        serviceCode = mapServiceCodeToSimpleFallback(entry.serviceCode, serviceTypeFromHoraires);
        posteCode = extractPosteCodeFallback(entry.serviceCode);
        description = entry.serviceLabel || entry.description || entry.serviceCode;
        console.log(`   ⚠️ ${entry.date} ${entry.serviceCode} → ${serviceCode} (fallback horaires, poste=${posteCode})`);
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
      original_data: parsed
    };
    
    console.log('✅ Données transformées:', transformed);
    console.log('   Agent:', transformed.agent);
    console.log('   Planning:', transformed.planning.length, 'entrées');
    
    return transformed;
  };

  /**
   * Fallback: Mappe un code service vers un code simple SI pas trouvé dans la BDD
   */
  const mapServiceCodeToSimpleFallback = (code, serviceTypeFromHoraires) => {
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
    
    // Codes de service opérationnels → utiliser le type des horaires
    return serviceTypeFromHoraires || '-';
  };

  /**
   * Fallback: Extrait le code poste SI pas trouvé dans la BDD
   */
  const extractPosteCodeFallback = (code) => {
    if (!code) return null;
    
    const upperCode = code.toUpperCase();
    
    if (upperCode.startsWith('CCU')) return 'RE'; // RE = Régulateur Parc
    if (upperCode.startsWith('CRC')) return 'CRC';
    if (upperCode.startsWith('ACR')) return 'ACR';
    if (upperCode.startsWith('CENT') || upperCode.startsWith('SOUF')) return 'SOUF';
    if (upperCode.startsWith('REO')) return 'REO';
    if (upperCode.startsWith('RC')) return 'RC';
    if (upperCode.startsWith('RO')) return 'RO';
    
    return null;
  };

  // Gestion de l'upload du fichier
  const handleFileUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    setLoading(true);
    setError(null);
    setExtractionMethod(null);

    try {
      console.log('📁 Fichier sélectionné:', uploadedFile.name);
      console.log('📄 Extraction du PDF avec PDFServiceWrapper (fallback automatique)...');
      
      // Utiliser PDFServiceWrapper qui gère le fallback automatiquement
      const parsed = await PDFServiceWrapper.readPDF(uploadedFile);
      
      // Stocker la méthode utilisée pour l'affichage
      setExtractionMethod(parsed.method);
      
      // Vérifier si l'extraction a réussi
      if (!parsed.success) {
        throw new Error(parsed.error || 'Erreur lors de l\'extraction du PDF');
      }
      
      console.log('✅ Extraction réussie avec méthode:', parsed.method);
      console.log('   Stats:', parsed.stats);
      
      // Transformer les données vers le format attendu par PDFValidationStep
      const transformedData = transformParsedDataForValidation(parsed);
      
      // Valider les données transformées
      const validationResult = validateTransformedData(transformedData);
      
      // Ajouter info sur la méthode d'extraction
      if (parsed.method === 'simple-vision') {
        validationResult.warnings.unshift('⚡ Extraction rapide (SimplePDFService)');
      } else if (parsed.method === 'legacy-ocr-parsing') {
        validationResult.warnings.unshift('🔄 Extraction classique (MistralPDFReaderService)');
      }
      
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
              <p className="text-blue-100 mt-1">
                Extraction intelligente avec fallback automatique
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
              {/* Information sur le nouveau système */}
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <div className="flex">
                  <Zap className="text-green-600 mr-2 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-green-900">Nouveau système d'extraction v2.0</h3>
                    <p className="text-green-800">Double méthode avec fallback automatique</p>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• <strong>Mode rapide ⚡</strong> : Mistral Vision direct (150 lignes)</li>
                      <li>• <strong>Mode classique 🔄</strong> : OCR + parsing (fallback si besoin)</li>
                      <li>• Détection automatique des services de nuit</li>
                      <li>• Validation des codes SNCF</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ⚠️ AVERTISSEMENT VÉRIFICATION - NOUVEAU BLOC */}
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
                <div className="flex">
                  <AlertTriangle className="text-amber-600 mr-2 flex-shrink-0" size={20} />
                  <div>
                    <h3 className="font-semibold text-amber-900">⚠️ Vérification recommandée</h3>
                    <p className="text-amber-800 text-sm mt-1">
                      Le système détecte automatiquement les services depuis les bulletins PDF, 
                      mais <strong>il est vivement recommandé de vérifier l'exactitude des données extraites</strong> avant de valider l'import.
                    </p>
                    <p className="text-amber-700 text-xs mt-2">
                      L'étape de validation (étape 2) vous permet de corriger les éventuelles erreurs d'extraction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Information sur le format attendu */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <div className="flex">
                  <Info className="text-blue-600 mr-2 flex-shrink-0" size={20} />
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
                {currentStep === 1 && 'Analyse du PDF (mode rapide → fallback si besoin)...'}
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
