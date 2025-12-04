import React, { useState } from 'react';
import { X, Check, MessageSquarePlus, Trash2 } from 'lucide-react';
import { CODE_COLORS, SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES } from '../../constants/config';

const ModalCellEdit = ({ selectedCell, agentsData, onUpdateCell, onClose }) => {
  const [tempService, setTempService] = useState('');
  const [tempPoste, setTempPoste] = useState('');
  const [tempPostesSupplementaires, setTempPostesSupplementaires] = useState([]);
  
  // États pour la gestion des notes
  const [tempNote, setTempNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');

  if (!selectedCell) return null;

  // Toggle un poste supplémentaire (ajout/retrait du tableau)
  const togglePosteSupplementaire = (code) => {
    setTempPostesSupplementaires(prev => {
      if (prev.includes(code)) {
        return prev.filter(p => p !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  // Ouvrir la modal de note
  const openNoteModal = () => {
    setNoteInput(tempNote);
    setShowNoteModal(true);
  };

  // Valider la note
  const handleValidateNote = () => {
    setTempNote(noteInput.trim());
    setShowNoteModal(false);
  };

  // Annuler la note
  const handleCancelNote = () => {
    setNoteInput('');
    setShowNoteModal(false);
  };

  // Supprimer la note
  const handleDeleteNote = () => {
    setTempNote('');
  };

  const handleSave = () => {
    let planningData;
    
    // Construire les données de planning avec service, poste, postes supplémentaires et note
    if (tempPoste || tempPostesSupplementaires.length > 0 || tempNote) {
      planningData = { 
        service: tempService,
        ...(tempPoste && { poste: tempPoste }),
        ...(tempPostesSupplementaires.length > 0 && { postesSupplementaires: tempPostesSupplementaires }),
        ...(tempNote && { note: tempNote })
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
    <>
      {/* Modal principale */}
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
              <span className="text-xs text-gray-500 ml-2">(sélection multiple possible)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {POSTES_SUPPLEMENTAIRES.map(({ code, desc }) => {
                const isSelected = tempPostesSupplementaires.includes(code);
                return (
                  <button
                    key={code}
                    onClick={() => togglePosteSupplementaire(code)}
                    className={`p-2 rounded text-center text-xs transition-all relative ${
                      isSelected 
                        ? 'ring-2 ring-purple-500 bg-purple-100 text-purple-800'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 absolute top-1 right-1 text-purple-600" />
                    )}
                    <div className="font-semibold italic">{code}</div>
                    <div className="text-xs mt-1 not-italic">{desc.replace('Poste ', '').replace(' supplémentaire', '')}</div>
                  </button>
                );
              })}
            </div>
            {tempPostesSupplementaires.length > 0 && (
              <div className="mt-2 p-2 bg-purple-50 rounded">
                <p className="text-xs text-purple-700">
                  <span className="font-medium">Sélectionnés :</span>{' '}
                  <span className="italic">{tempPostesSupplementaires.join(', ')}</span>
                </p>
              </div>
            )}
          </div>

          {/* Section Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Commentaires</label>
            <div className="flex gap-2">
              <button
                onClick={openNoteModal}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-all"
              >
                <MessageSquarePlus className="w-4 h-4" />
                {tempNote ? 'Modifier la note' : 'Ajouter une note'}
              </button>
              {tempNote && (
                <button
                  onClick={handleDeleteNote}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer la note
                </button>
              )}
            </div>
            {tempNote && (
              <div className="mt-2 p-3 bg-amber-50 rounded border border-amber-200">
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{tempNote}</p>
              </div>
            )}
          </div>

          {/* Boutons d'action principaux */}
          <div className="flex justify-between pt-4 border-t">
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

      {/* Sous-modal pour ajouter/modifier une note */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]" onClick={handleCancelNote}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800">
                {tempNote ? 'Modifier la note' : 'Ajouter une note'}
              </h4>
              <button onClick={handleCancelNote} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire pour {selectedCell.agent} - Jour {selectedCell.day}
              </label>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Saisissez votre commentaire ici..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none text-sm"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelNote}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleValidateNote}
                disabled={!noteInput.trim()}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:bg-gray-300"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalCellEdit;
