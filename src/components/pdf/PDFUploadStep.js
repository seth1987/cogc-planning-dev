// Composant pour l'étape d'upload du PDF
import React from 'react';
import { Upload, Key, Database } from 'lucide-react';

const PDFUploadStep = ({ 
  file, 
  onFileUpload,  // ← Corrigé : onFileSelect → onFileUpload
  error, 
  isApiConfigured,
  stats  // ← Corrigé : mappingStats → stats
}) => {
  
  // Gestion de la sélection de fichier
  const handleFileSelect = (event) => {
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Key className="text-amber-600 mt-1" size={20} />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Configuration API Mistral</p>
              <p className="text-sm text-amber-800 mt-1">
                Pour un parsing optimal avec IA, configurez votre clé API Mistral.
                Le parsing manuel reste disponible.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats du mapping */}
      {stats && (
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
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}  // ← Fonction corrigée
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
        
        {file && (
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
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">Instructions :</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✓ Format accepté : PDF bulletin de commande SNCF</li>
          <li>✓ Le nom de l'agent sera détecté automatiquement</li>
          <li>✓ Les services de nuit seront décalés au lendemain</li>
          <li>✓ Mapping automatique via base de données</li>
        </ul>
      </div>
    </div>
  );
};

export default PDFUploadStep;