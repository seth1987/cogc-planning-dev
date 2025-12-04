import React, { useState } from 'react';
import { X } from 'lucide-react';
import { CODE_COLORS, SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES } from '../../constants/config';

const ModalCellEdit = ({ selectedCell, agentsData, onUpdateCell, onClose }) => {
  const [tempService, setTempService] = useState('');
  const [tempPoste, setTempPoste] = useState('');
  const [tempPosteSupplementaire, setTempPosteSupplementaire] = useState('');

  if (!selectedCell) return null;

  const handleSave = () => {
    let planningData;
    
    // Construire les données de planning avec service, poste et poste supplémentaire
    if (tempPoste || tempPosteSupplementaire) {
      planningData = { 
        service: tempService,
        ...(tempPoste && { poste: tempPoste }),
        ...(tempPosteSupplementaire && { posteSupplementaire: tempPosteSupplementaire })
      };
    } else {
      planningData = tempService;
    }
    
    onUpdateCell(selectedCell.agent, selectedCell.day, planningData);
    onClose();
  };

  const handleDelete = () => {
    onUpdateCell(selectedCell.agent, selectedCell.day, '');
    onClose();
  };

  const isReserveAgent = Object.entries(agentsData).some(([groupe, agents]) => 
    groupe.includes('RESERVE') && 
    agents.some(agent => `${agent.nom} ${agent.prenom}` === selectedCell.agent)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{selectedCell.agent}</h3>
            <p className="text-sm text-gray-600">Jour {selectedCell.day}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Section Service / Horaire */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Service / Horaire</label>
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_CODES.map(({ code, desc }) => (
              <button
                key={code}
                onClick={() => setTempService(code)}
                className={`p-2 rounded text-center text-xs transition-all ${
                  tempService === code 
                    ? 'ring-2 ring-blue-500 ' + (CODE_COLORS[code] || 'bg-blue-100')
                    : CODE_COLORS[code] || 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="font-semibold">{code}</div>
                <div className="text-xs mt-1">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Section Poste (uniquement pour agents réserve) */}
        {isReserveAgent && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Poste (Réserve)</label>
            <div className="grid grid-cols-4 gap-2">
              {POSTES_CODES.map(poste => (
                <button
                  key={poste}
                  onClick={() => setTempPoste(tempPoste === poste ? '' : poste)}
                  className={`p-2 rounded text-center text-xs transition-all ${
                    tempPoste === poste 
                      ? 'ring-2 ring-blue-500 ' + (CODE_COLORS[poste] || 'bg-rose-100')
                      : CODE_COLORS[poste] || 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {poste}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section Postes figés / Postes supplémentaires (pour TOUS les agents) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postes figés / Postes supplémentaires
          </label>
          <div className="grid grid-cols-3 gap-2">
            {POSTES_SUPPLEMENTAIRES.map(({ code, desc }) => (
              <button
                key={code}
                onClick={() => setTempPosteSupplementaire(tempPosteSupplementaire === code ? '' : code)}
                className={`p-2 rounded text-center text-xs transition-all ${
                  tempPosteSupplementaire === code 
                    ? 'ring-2 ring-purple-500 bg-purple-100 text-purple-800'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <div className="font-semibold italic">{code}</div>
                <div className="text-xs mt-1 not-italic">{desc.replace('Poste ', '').replace(' supplémentaire', '')}</div>
              </button>
            ))}
          </div>
          {tempPosteSupplementaire && (
            <p className="text-xs text-purple-600 mt-2 italic">
              Le poste {tempPosteSupplementaire} sera affiché en italique dans la cellule
            </p>
          )}
        </div>

        <div className="flex justify-between">
          <button 
            onClick={handleDelete}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Effacer
          </button>
          <div className="flex space-x-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Annuler
            </button>
            <button 
              onClick={handleSave}
              disabled={!tempService}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCellEdit;
