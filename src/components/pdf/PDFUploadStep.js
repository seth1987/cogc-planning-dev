// Composant pour l'étape d'upload du PDF
import React from 'react';
import { Upload, Key, Database, Lock } from 'lucide-react';

const PDFUploadStep = ({ 
  file, 
  onFileUpload,
  error, 
  isApiConfigured,
  stats
}) => {
  
  // Gestion de la sélection de fichier
  const handleFileSelect = (event) => {
    if (!isApiConfigured) {
      alert('Le module PDF nécessite une clé API Mistral pour fonctionner.');
      event.target.value = ''; // Reset input
      return;
    }

    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      console.log('📁 Fichier sélectionné:', selectedFile.name);
      onFileUpload(selectedFile);
    } else {
      alert('Veuillez sélectionner un fichier PDF valide.');
    }
  };

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
                Configurez REACT_APP_MISTRAL_API_KEY dans vos variables d'environnement.
              </p>
              <p className="text-xs text-red-700 mt-2">
                Obtenez votre clé sur : https://console.mistral.ai/
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

      {/* Zone d'upload */}
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
              accept=".pdf"
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
            <p className="text-gray-500 font-medium">
              Upload désactivé
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Configurez votre clé API Mistral pour activer cette fonctionnalité
            </p>
          </>
        )}
        
        {file && isApiConfigured && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              📄 {file.name}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className={`rounded-lg p-4 ${
        isApiConfigured ? 'bg-gray-50' : 'bg-gray-100'
      }`}>
        <h3 className="font-semibold text-gray-900 mb-2">
          {isApiConfigured ? 'Instructions :' : 'Configuration requise :'}
        </h3>
        
        {isApiConfigured ? (
          <ul className="text-sm text-gray-700 space-y-1">
            <li>✓ Format accepté : PDF bulletin de commande SNCF</li>
            <li>✓ Le nom de l'agent sera détecté automatiquement</li>
            <li>✓ Les services de nuit seront décalés au lendemain</li>
            <li>✓ Mapping automatique via base de données</li>
            <li>✓ Extraction par Mistral OCR avec IA</li>
          </ul>
        ) : (
          <ol className="text-sm text-gray-700 space-y-2">
            <li>1. Créez un compte sur <a href="https://console.mistral.ai/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.mistral.ai</a></li>
            <li>2. Générez une clé API dans votre dashboard</li>
            <li>3. Ajoutez la clé dans votre fichier .env :</li>
            <li className="ml-4 font-mono text-xs bg-white p-2 rounded border">
              REACT_APP_MISTRAL_API_KEY=votre_clé_ici
            </li>
            <li>4. Redémarrez l'application</li>
          </ol>
        )}
      </div>
    </div>
  );
};

export default PDFUploadStep;