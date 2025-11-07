import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Edit2, Save, XCircle, CheckCircle, Calendar, User } from 'lucide-react';

const ModalValidationPDF = ({ 
  isOpen, 
  parsedData, 
  agents,
  onClose, 
  onValidate,
  onBack 
}) => {
  const [entries, setEntries] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState(new Set());
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedValue, setEditedValue] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showSuccessCount, setShowSuccessCount] = useState(0);

  useEffect(() => {
    if (parsedData && parsedData.entries) {
      setEntries(parsedData.entries);
      // Sélectionner automatiquement les entrées valides
      const validIndices = new Set();
      parsedData.entries.forEach((entry, index) => {
        if (entry.isValid && !entry.hasError) {
          validIndices.add(index);
        }
      });
      setSelectedEntries(validIndices);

      // Essayer de trouver l'agent correspondant
      if (parsedData.metadata && parsedData.metadata.agent && agents) {
        const agentName = parsedData.metadata.agent.toUpperCase();
        const foundAgent = agents.find(a => 
          `${a.nom} ${a.prenom}`.toUpperCase() === agentName ||
          `${a.prenom} ${a.nom}`.toUpperCase() === agentName
        );
        setSelectedAgent(foundAgent);
      }
    }
  }, [parsedData, agents]);

  if (!isOpen || !parsedData) return null;

  const toggleSelection = (index) => {
    const newSelection = new Set(selectedEntries);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedEntries(newSelection);
  };

  const selectAll = () => {
    const allIndices = new Set();
    entries.forEach((entry, index) => {
      if (!entry.hasError) {
        allIndices.add(index);
      }
    });
    setSelectedEntries(allIndices);
  };

  const deselectAll = () => {
    setSelectedEntries(new Set());
  };

  const startEditing = (index, currentValue) => {
    setEditingIndex(index);
    setEditedValue(currentValue);
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      const newEntries = [...entries];
      newEntries[editingIndex] = {
        ...newEntries[editingIndex],
        serviceCode: editedValue,
        hasError: false,
        isValid: true
      };
      setEntries(newEntries);
      setEditingIndex(null);
      setEditedValue('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditedValue('');
  };

  const handleValidate = () => {
    if (!selectedAgent) {
      alert('Veuillez sélectionner un agent');
      return;
    }

    const entriesToImport = entries.filter((_, index) => selectedEntries.has(index));
    
    if (entriesToImport.length === 0) {
      alert('Veuillez sélectionner au moins une entrée à importer');
      return;
    }

    // Animation de succès
    setShowSuccessCount(entriesToImport.length);
    setTimeout(() => {
      onValidate(entriesToImport, selectedAgent.id);
    }, 500);
  };

  const getStatusColor = (entry) => {
    if (entry.hasError) return 'bg-red-50 border-red-300';
    if (!entry.isValid) return 'bg-yellow-50 border-yellow-300';
    return 'bg-green-50 border-green-300';
  };

  const getServiceBadgeColor = (code) => {
    if (code?.startsWith('CCU')) return 'bg-blue-100 text-blue-800';
    if (code?.startsWith('CRC')) return 'bg-purple-100 text-purple-800';
    if (code === 'RP') return 'bg-green-100 text-green-800';
    if (code === 'NU') return 'bg-gray-100 text-gray-800';
    if (code === 'DISPO') return 'bg-yellow-100 text-yellow-800';
    if (code === 'INACTIN') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
              Validation de l'import PDF
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Vérifiez et corrigez les données avant l'import
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Métadonnées */}
        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-gray-600">Agent détecté:</span>
              <div className="font-semibold text-sm">{parsedData.metadata?.agent || 'Non identifié'}</div>
            </div>
            <div>
              <span className="text-xs text-gray-600">N° CP:</span>
              <div className="font-semibold text-sm">{parsedData.metadata?.numeroCP || '-'}</div>
            </div>
            <div>
              <span className="text-xs text-gray-600">Période:</span>
              <div className="font-semibold text-sm">
                {parsedData.metadata?.periode ? 
                  `${parsedData.metadata.periode.debut} - ${parsedData.metadata.periode.fin}` : 
                  '-'
                }
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-600">Agent sélectionné:</span>
              <select
                value={selectedAgent?.id || ''}
                onChange={(e) => {
                  const agent = agents.find(a => a.id === parseInt(e.target.value));
                  setSelectedAgent(agent);
                }}
                className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">-- Sélectionner --</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.nom} {agent.prenom}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Tout sélectionner
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Tout désélectionner
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {selectedEntries.size} / {entries.length} entrées sélectionnées
          </div>
        </div>

        {/* Table de validation */}
        <div className="overflow-y-auto max-h-[50vh] border rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="w-10 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedEntries.size === entries.length && entries.length > 0}
                    onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Jour</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Code Service</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Libellé</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Horaires</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Statut</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={index} className={`border-t ${getStatusColor(entry)} hover:opacity-90`}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedEntries.has(index)}
                      onChange={() => toggleSelection(index)}
                      disabled={entry.hasError && editingIndex !== index}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                      {entry.dateDisplay}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm font-medium">
                    {entry.dayOfWeek}
                  </td>
                  <td className="px-4 py-2">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value.toUpperCase())}
                        className="px-2 py-1 border rounded text-sm w-24"
                        autoFocus
                      />
                    ) : (
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getServiceBadgeColor(entry.serviceCode)}`}>
                        {entry.serviceCode || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {entry.serviceLabel || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {entry.horaires.length > 0 ? (
                      <div className="text-xs">
                        {entry.horaires.map((h, idx) => (
                          <div key={idx}>
                            {h.debut} - {h.fin}
                            {h.code && <span className="ml-1 text-gray-500">({h.code})</span>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {entry.hasError ? (
                      <span className="flex items-center justify-center text-red-600" title={entry.errorMessage}>
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center text-green-600">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {editingIndex === index ? (
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={saveEdit}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                          title="Enregistrer"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Annuler"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(index, entry.serviceCode || '')}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer avec statistiques */}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Valides: {entries.filter(e => !e.hasError).length}
            </span>
            <span className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              Erreurs: {entries.filter(e => e.hasError).length}
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Retour
            </button>
            <button
              onClick={handleValidate}
              disabled={selectedEntries.size === 0 || !selectedAgent}
              className={`px-4 py-2 text-sm text-white rounded flex items-center ${
                selectedEntries.size > 0 && selectedAgent
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Valider l'import ({selectedEntries.size} entrées)
              {showSuccessCount > 0 && (
                <span className="ml-2 animate-pulse">✓</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalValidationPDF;