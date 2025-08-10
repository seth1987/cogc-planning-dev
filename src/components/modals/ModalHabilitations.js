import React, { useState } from 'react';
import { X } from 'lucide-react';
import { POSTES_CODES } from '../../constants/config';

const ModalHabilitations = ({ isOpen, agent, habilitations, onClose, onAddHabilitation, onRemoveHabilitation }) => {
  const [newHabilitation, setNewHabilitation] = useState('');

  if (!isOpen || !agent) return null;

  const agentHabilitations = habilitations[agent.id] || [];

  const handleAddHabilitation = () => {
    if (newHabilitation && !agentHabilitations.includes(newHabilitation)) {
      onAddHabilitation && onAddHabilitation(agent.id, newHabilitation);
      setNewHabilitation('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">Habilitations</h3>
            <p className="text-sm text-gray-600">
              {agent.nom} {agent.prenom}
              <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                agent.statut === 'roulement' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {agent.statut}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium text-sm mb-2">Habilitations actuelles :</h4>
          <div className="flex flex-wrap gap-2">
            {agentHabilitations.length > 0 ? (
              agentHabilitations.map(hab => (
                <div key={hab} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  <span className="font-medium">{hab}</span>
                  <button
                    onClick={() => onRemoveHabilitation && onRemoveHabilitation(agent.id, hab)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                    title="Supprimer habilitation"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">Aucune habilitation</p>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium text-sm mb-2">Ajouter une habilitation :</h4>
          <div className="flex gap-2">
            <select
              value={newHabilitation}
              onChange={(e) => setNewHabilitation(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Sélectionner un poste</option>
              {POSTES_CODES.map(poste => (
                <option key={poste} value={poste} disabled={agentHabilitations.includes(poste)}>
                  {poste} {agentHabilitations.includes(poste) ? '(déjà habilité)' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddHabilitation}
              disabled={!newHabilitation}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Ajouter
            </button>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalHabilitations;