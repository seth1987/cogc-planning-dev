// Composant pour afficher le résultat de l'import
import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, BarChart2, Calendar } from 'lucide-react';

const PDFImportResult = ({ importReport, onClose, onRollback }) => {
  const isSuccess = importReport.errors.length === 0;
  
  return (
    <div className="space-y-4">
      {/* En-tête de statut */}
      <div className={`p-4 rounded-lg ${
        isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {isSuccess ? (
            <CheckCircle className="text-green-600" size={24} />
          ) : (
            <XCircle className="text-red-600" size={24} />
          )}
          <div>
            <h3 className={`font-semibold ${
              isSuccess ? 'text-green-900' : 'text-red-900'
            }`}>
              {isSuccess ? 'Import réussi !' : 'Import échoué'}
            </h3>
            {importReport.agent && (
              <p className="text-sm mt-1">
                Agent : {importReport.agent.nom} {importReport.agent.prenom}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="text-gray-600" size={20} />
          <h4 className="font-medium">Statistiques d'import</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Entrées traitées</p>
            <p className="text-2xl font-bold text-gray-900">
              {importReport.entriesProcessed}
            </p>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Entrées insérées</p>
            <p className="text-2xl font-bold text-green-600">
              {importReport.entriesInserted}
            </p>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Entrées mises à jour</p>
            <p className="text-2xl font-bold text-blue-600">
              {importReport.entriesUpdated}
            </p>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <p className="text-sm text-gray-600">Entrées ignorées</p>
            <p className="text-2xl font-bold text-gray-600">
              {importReport.entriesSkipped}
            </p>
          </div>
        </div>
      </div>

      {/* Période */}
      {importReport.dateRange.min && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={18} />
            <span className="text-sm">
              Période importée : 
              <span className="font-medium ml-2">
                {new Date(importReport.dateRange.min).toLocaleDateString('fr-FR')} - 
                {new Date(importReport.dateRange.max).toLocaleDateString('fr-FR')}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Erreurs */}
      {importReport.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="text-red-600" size={18} />
            <span className="font-medium text-red-900">Erreurs rencontrées</span>
          </div>
          <ul className="text-sm text-red-800 space-y-1">
            {importReport.errors.map((error, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-600">•</span>
                <span>
                  {error.date && `[${error.date}] `}
                  {error.error}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Avertissements */}
      {importReport.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-amber-600" size={18} />
            <span className="font-medium text-amber-900">Avertissements</span>
          </div>
          <ul className="text-sm text-amber-800 space-y-1">
            {importReport.warnings.slice(0, 5).map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>{warning}</span>
              </li>
            ))}
            {importReport.warnings.length > 5 && (
              <li className="text-amber-600 italic">
                ... et {importReport.warnings.length - 5} autres avertissements
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t">
        {isSuccess && onRollback && (
          <button
            onClick={onRollback}
            className="px-4 py-2 text-red-600 hover:text-red-700 font-medium"
          >
            Annuler l'import
          </button>
        )}
        
        <button
          onClick={onClose}
          className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Terminer
        </button>
      </div>
    </div>
  );
};

export default PDFImportResult;