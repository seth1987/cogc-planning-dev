import React from 'react';
import { X, Edit, Info, Plus } from 'lucide-react';

const ModalGestionAgents = ({ isOpen, agents, onClose, onEditAgent, onViewHabilitations, onAddAgent }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[80vh] shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Gestion des Agents ({agents.length})</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Agent</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Statut</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Groupe</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Site</th>
                <th className="px-4 py-2 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium">{agent.nom} {agent.prenom}</div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${
                      agent.statut === 'roulement' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {agent.statut}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={agent.groupe}>
                    {agent.groupe}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    <span className={agent.site === 'Denfert-Rochereau' ? 'text-purple-600' : 'text-blue-600'}>
                      {agent.site === 'Denfert-Rochereau' ? 'DR' : 'PN'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex justify-center space-x-1">
                      <button
                        onClick={() => onViewHabilitations && onViewHabilitations(agent)}
                        className="p-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="Voir habilitations"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditAgent && onEditAgent(agent)}
                        className="p-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        title="Modifier agent"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between">
          <button 
            onClick={onAddAgent}
            className="flex items-center px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvel Agent
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalGestionAgents;