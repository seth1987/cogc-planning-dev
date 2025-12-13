// Composant pour l'étape d'upload du PDF
// Version 2.4 - SANS ALERTES - flux simplifié
import React, { useState, useRef } from 'react';
import { Upload, Database, Lock, FileText, Loader, CheckCircle } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const PDFUploadStep = ({ 
  file, 
  onFileUpload,
  error, 
  isApiConfigured,
  stats
}) => {
  const isMobile = useIsMobile();
  const [localLoading, setLocalLoading] = useState(false);
  const [localFile, setLocalFile] = useState(null);
  const processingRef = useRef(false);
  
  // Gestion de la sélection de fichier - VERSION SIMPLIFIÉE
  const handleFileSelect = async (event) => {
    console.log('📁 handleFileSelect déclenché');
    
    // Protection contre double appel
    if (processingRef.current) {
      console.log('⚠️ Déjà en cours de traitement');
      return;
    }
    
    try {
      processingRef.current = true;
      
      if (!isApiConfigured) {
        console.log('❌ API non configurée');
        return;
      }

      const files = event.target.files;
      console.log('📁 Fichiers:', files?.length || 0);
      
      if (!files || files.length === 0) {
        console.log('❌ Aucun fichier');
        processingRef.current = false;
        return;
      }

      const selectedFile = files[0];
      console.log('📄 Fichier:', selectedFile.name, 'Type:', selectedFile.type, 'Taille:', selectedFile.size);

      // Validation très permissive
      const fileName = selectedFile.name.toLowerCase();
      const fileType = selectedFile.type.toLowerCase();
      const isPDF = fileType.includes('pdf') || fileType === '' || fileName.endsWith('.pdf');
      
      if (!isPDF) {
        console.log('❌ Pas un PDF');
        processingRef.current = false;
        return;
      }

      console.log('✅ PDF validé, mise à jour UI...');
      setLocalFile(selectedFile);
      setLocalLoading(true);

      // Appel immédiat du callback parent
      console.log('🚀 Appel onFileUpload...');
      if (typeof onFileUpload === 'function') {
        // Utiliser setTimeout pour éviter les problèmes de synchronisation
        setTimeout(() => {
          onFileUpload(selectedFile);
        }, 100);
      } else {
        console.log('❌ onFileUpload non défini');
        setLocalLoading(false);
        processingRef.current = false;
      }
      
    } catch (err) {
      console.log('❌ Erreur:', err.message);
      setLocalLoading(false);
      setLocalFile(null);
      processingRef.current = false;
    }
  };

  // Reset quand le fichier parent change
  React.useEffect(() => {
    if (!file) {
      setLocalLoading(false);
      setLocalFile(null);
      processingRef.current = false;
    }
  }, [file]);

  // ========== VERSION MOBILE ==========
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Alerte si API non configurée */}
        {!isApiConfigured && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Lock className="text-red-600 mt-1 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="font-medium text-red-900">Module PDF désactivé</p>
                <p className="text-sm text-red-800 mt-1">Clé API Mistral requise.</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats condensées */}
        {stats && isApiConfigured && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Database className="text-blue-600" size={18} />
              <span className="text-sm font-medium text-blue-900">
                Base connectée • {stats.totalCodes || stats.total || 0} codes
              </span>
            </div>
          </div>
        )}

        {/* ÉTAT: En cours de traitement */}
        {localLoading && (
          <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-6 text-center">
            <Loader className="animate-spin mx-auto mb-3 text-blue-600" size={48} />
            <p className="text-lg font-bold text-blue-900">Analyse en cours...</p>
            <p className="text-blue-700 text-sm mt-1 truncate px-4">
              {localFile?.name || file?.name || 'PDF'}
            </p>
            <p className="text-blue-500 text-xs mt-2">
              Extraction OCR avec Mistral AI
            </p>
          </div>
        )}

        {/* ÉTAT: Fichier sélectionné (depuis le parent) */}
        {!localLoading && file && (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl p-6 text-center">
            <CheckCircle className="mx-auto mb-3 text-green-600" size={48} />
            <p className="text-lg font-bold text-green-900">PDF sélectionné</p>
            <p className="text-green-700 text-sm mt-1 truncate px-4">
              {file.name}
            </p>
          </div>
        )}

        {/* BOUTONS D'UPLOAD */}
        {!localLoading && !file && isApiConfigured && (
          <div className="space-y-3">
            {/* Méthode 1: Input visible dans bouton bleu */}
            <div className="bg-blue-600 text-white rounded-xl p-4">
              <p className="text-center font-bold mb-3">📄 Sélectionner un PDF</p>
              <input
                type="file"
                accept=".pdf,application/pdf,*/*"
                onChange={handleFileSelect}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-blue-700 hover:file:bg-blue-50"
              />
            </div>
            
            {/* Méthode 2: Label classique */}
            <label className="block bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl p-4 text-center transition-colors shadow-lg cursor-pointer">
              <input
                type="file"
                accept="*/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileText className="mx-auto mb-2" size={32} />
              <p className="font-bold">Méthode alternative</p>
              <p className="text-green-200 text-xs">Si le bouton bleu ne marche pas</p>
            </label>
          </div>
        )}

        {/* Instructions condensées mobile */}
        {isApiConfigured && !localLoading && !file && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p className="font-medium mb-2">Format accepté :</p>
            <ul className="space-y-1">
              <li>✓ Bulletin de commande SNCF (PDF)</li>
              <li>✓ Détection automatique agent & services</li>
              <li>✓ Services de nuit décalés J+1</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ========== VERSION DESKTOP ==========
  return (
    <div className="space-y-4">
      {/* Alerte si API non configurée */}
      {!isApiConfigured && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Lock className="text-red-600 mt-1" size={20} />
            <div className="flex-1">
              <p className="font-medium text-red-900">Module PDF désactivé</p>
              <p className="text-sm text-red-800 mt-1">
                Ce module nécessite une clé API Mistral pour fonctionner.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats du mapping */}
      {stats && isApiConfigured && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="text-blue-600" size={18} />
            <span className="font-medium text-blue-900">Base de données connectée</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-blue-800">
            <div>📊 {stats.totalCodes || stats.total || 0} codes</div>
            <div>🎯 {Object.keys(stats.byPoste || {}).length} postes</div>
            <div>⚡ {Object.keys(stats.byService || {}).length} services</div>
          </div>
        </div>
      )}

      {/* Zone d'upload desktop */}
      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isApiConfigured 
          ? 'border-gray-300 hover:border-blue-400 cursor-pointer' 
          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
      }`}>
        <Upload className={`mx-auto h-12 w-12 mb-4 ${
          isApiConfigured ? 'text-gray-400' : 'text-gray-300'
        }`} />
        
        {isApiConfigured ? (
          <>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
            >
              Cliquez pour sélectionner un PDF
            </label>
            <p className="text-sm text-gray-500 mt-2">
              ou glissez-déposez le fichier ici
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-500 font-medium">Upload désactivé</p>
            <p className="text-sm text-gray-400 mt-2">
              Configurez votre clé API Mistral
            </p>
          </>
        )}
        
        {(file || localFile) && isApiConfigured && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              📄 {(file || localFile).name}
            </p>
          </div>
        )}
      </div>

      {/* Instructions desktop */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Instructions :</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✓ Format accepté : PDF bulletin de commande SNCF</li>
          <li>✓ Le nom de l'agent sera détecté automatiquement</li>
          <li>✓ Extraction par Mistral OCR avec IA</li>
        </ul>
      </div>
    </div>
  );
};

export default PDFUploadStep;
