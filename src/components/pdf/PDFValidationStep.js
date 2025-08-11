// Composant pour l'étape de validation des données extraites
import React from 'react';
import { AlertCircle, Check, X, Calendar, User } from 'lucide-react';

const PDFValidationStep = ({ 
  data,  // Changé de editedData à data pour correspondre à ce qui est passé
  onChange,  // Pour gérer les modifications
  validation,  // Object contenant errors et warnings
  onValidate,  // Pour valider et importer
  onCancel  // Pour annuler et revenir en arrière
}) => {
  
  // Vérifications de sécurité
  if (!data || !data.planning) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-amber-600" size={20} />
          <span className="font-medium text-amber-900">Aucune donnée extraite</span>
        </div>
        <p className="text-sm text-amber-800 mt-2">
          Le PDF n'a pas pu être analysé. Veuillez réessayer avec un autre fichier.
        </p>
        <button
          onClick={onCancel}
          className="mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Retour
        </button>
      </div>
    );
  }

  const getServiceLabel = (code) => {
    const labels = {
      '-': 'Matin',
      'O': 'Soir', 
      'X': 'Nuit',
      'RP': 'Repos',
      'C': 'Congé',
      'D': 'Dispo',
      'NU': 'Non Utilisé',
      'HAB': 'Formation',
      'MA': 'Maladie',
      'I': 'Inactif'
    };
    return labels[code] || code;
  };

  const getServiceColor = (code) => {
    const colors = {
      '-': 'bg-blue-100 text-blue-700',
      'O': 'bg-orange-100 text-orange-700',
      'X': 'bg-purple-100 text-purple-700',
      'RP': 'bg-green-100 text-green-700',
      'C': 'bg-green-100 text-green-700',
      'D': 'bg-yellow-100 text-yellow-700',
      'NU': 'bg-gray-100 text-gray-700',
      'HAB': 'bg-indigo-100 text-indigo-700',
      'MA': 'bg-red-100 text-red-700',
      'I': 'bg-pink-100 text-pink-700'
    };
    return colors[code] || 'bg-gray-100 text-gray-700';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  // Fonction pour modifier une cellule
  const handleCellEdit = (index, field, value) => {
    const updatedData = { ...data };
    updatedData.planning[index][field] = value;
    onChange(updatedData);
  };

  // Fonction pour supprimer une entrée
  const handleDeleteEntry = (index) => {
    const updatedData = { ...data };
    updatedData.planning = updatedData.planning.filter((_, i) => i !== index);
    onChange(updatedData);
  };

  // Fonction pour ajouter une entrée manuelle
  const handleAddEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = {
      date: today,
      service_code: 'RP',
      poste_code: null,
      original_code: 'MANUEL',
      description: 'Ajouté manuellement'
    };
    const updatedData = { ...data };
    updatedData.planning = [...updatedData.planning, newEntry];
    onChange(updatedData);
  };

  // Grouper par date pour un affichage plus clair
  const groupedByDate = (data.planning || []).reduce((acc, entry, index) => {
    if (!acc[entry.date]) {
      acc[entry.date] = [];
    }
    acc[entry.date].push({ ...entry, index });
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Agent détecté */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <User className="text-blue-600" size={20} />
          <h3 className="font-semibold">Agent</h3>
        </div>
        {data.agent && (data.agent.nom || data.agent.prenom) ? (
          <div className="flex gap-4">
            <div>
              <label className="text-sm text-gray-600">Nom:</label>
              <input
                type="text"
                value={data.agent.nom || ''}
                onChange={(e) => {
                  const updatedData = { ...data };
                  updatedData.agent.nom = e.target.value;
                  onChange(updatedData);
                }}
                className="ml-2 px-2 py-1 border rounded"
                placeholder="Nom de l'agent"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Prénom:</label>
              <input
                type="text"
                value={data.agent.prenom || ''}
                onChange={(e) => {
                  const updatedData = { ...data };
                  updatedData.agent.prenom = e.target.value;
                  onChange(updatedData);
                }}
                className="ml-2 px-2 py-1 border rounded"
                placeholder="Prénom de l'agent"
              />
            </div>
          </div>
        ) : (
          <p className="text-amber-600">Agent non détecté - Veuillez remplir manuellement</p>
        )}
      </div>

      {/* Erreurs */}
      {validation && validation.errors && validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="font-medium text-red-900">Erreurs à corriger</span>
          </div>
          <ul className="text-sm text-red-800 list-disc list-inside">
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Avertissements */}
      {validation && validation.warnings && validation.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-amber-600" size={20} />
            <span className="font-medium text-amber-900">Avertissements</span>
          </div>
          <ul className="text-sm text-amber-800 list-disc list-inside">
            {validation.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Planning extrait */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar size={20} />
            Planning ({data.planning ? data.planning.length : 0} entrées)
          </h3>
          <button
            onClick={handleAddEntry}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            + Ajouter une entrée
          </button>
        </div>

        {data.planning && data.planning.length > 0 ? (
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {Object.entries(groupedByDate).map(([date, entries]) => (
              <div key={date} className="border-b last:border-b-0">
                <div className="bg-gray-50 px-4 py-2 sticky top-0 z-10">
                  <span className="font-medium">{formatDate(date)}</span>
                  <span className="text-sm text-gray-600 ml-2">({entries.length} services)</span>
                </div>
                
                <div className="p-2 space-y-1">
                  {entries.map((entry) => (
                    <div key={entry.index} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      {/* Service */}
                      <select
                        value={entry.service_code}
                        onChange={(e) => handleCellEdit(entry.index, 'service_code', e.target.value)}
                        className="flex-1 p-1 border rounded text-sm"
                      >
                        <option value="-">Matin (06h-14h)</option>
                        <option value="O">Soir (14h-22h)</option>
                        <option value="X">Nuit (22h-06h)</option>
                        <option value="RP">Repos</option>
                        <option value="C">Congé</option>
                        <option value="D">Disponible</option>
                        <option value="NU">Non Utilisé</option>
                        <option value="HAB">Formation</option>
                        <option value="MA">Maladie</option>
                        <option value="I">Inactif</option>
                      </select>

                      {/* Badge service */}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getServiceColor(entry.service_code)}`}>
                        {getServiceLabel(entry.service_code)}
                      </span>

                      {/* Poste */}
                      {entry.poste_code && (
                        <select
                          value={entry.poste_code || ''}
                          onChange={(e) => handleCellEdit(entry.index, 'poste_code', e.target.value || null)}
                          className="w-24 p-1 border rounded text-sm"
                        >
                          <option value="">-</option>
                          <option value="CRC">CRC</option>
                          <option value="ACR">ACR</option>
                          <option value="CCU">CCU</option>
                          <option value="RE">RE</option>
                          <option value="RC">RC</option>
                          <option value="RO">RO</option>
                          <option value="CAC">CAC</option>
                          <option value="SOUF">SOUF</option>
                        </select>
                      )}

                      {/* Code original */}
                      {entry.original_code && (
                        <span className="text-xs text-gray-500">
                          ({entry.original_code})
                        </span>
                      )}

                      {/* Supprimer */}
                      <button
                        onClick={() => handleDeleteEntry(entry.index)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Supprimer cette entrée"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Aucune entrée de planning détectée</p>
            <p className="text-sm text-gray-500 mt-2">Utilisez le bouton ci-dessus pour ajouter des entrées manuellement</p>
          </div>
        )}
      </div>

      {/* Résumé */}
      {data.planning && data.planning.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Période :</span>
              <span className="font-medium ml-2">
                {formatDate(data.planning[0].date)} - 
                {formatDate(data.planning[data.planning.length - 1].date)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Services :</span>
              <span className="font-medium ml-2">{data.planning.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Mode :</span>
              <span className="font-medium ml-2">
                {data.parsing_mode === 'mistral' ? '🤖 IA' : '📝 Manuel'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Retour
        </button>
        <button
          onClick={onValidate}
          disabled={!data.agent || !data.agent.nom || !data.agent.prenom || !data.planning || data.planning.length === 0}
          className={`px-6 py-2 rounded font-medium ${
            data.agent && data.agent.nom && data.agent.prenom && data.planning && data.planning.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Valider et Importer
        </button>
      </div>
    </div>
  );
};

export default PDFValidationStep;