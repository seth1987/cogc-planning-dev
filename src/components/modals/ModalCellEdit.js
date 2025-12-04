import React, { useState, useEffect } from 'react';
import { X, Check, MessageSquarePlus, Trash2, StickyNote, Edit3 } from 'lucide-react';
import { SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES } from '../../constants/config';

// Couleurs UNIQUEMENT pour la modal d'édition (pas le planning)
// - MA en rouge
// - C en jaune/or
// - HAB/FO en orange
// - D (DISPO) en bleu
// - Pas de couleur pour -, O, X et les postes de réserve
const MODAL_COLORS = {
  'MA': 'bg-red-200 text-red-800',
  'C': 'bg-yellow-200 text-yellow-800',
  'HAB': 'bg-orange-200 text-orange-800',
  'FO': 'bg-orange-200 text-orange-800',
  'D': 'bg-blue-200 text-blue-800',
  // Les autres codes n'ont pas de couleur (gris par défaut)
};

/**
 * ModalCellEdit - Modal d'édition d'une cellule du planning
 * 
 * @param {Object} selectedCell - {agent: string, day: number}
 * @param {Object|null} cellData - Données existantes {service, poste, note}
 * @param {Object} agentsData - Données des agents par groupe
 * @param {Function} onUpdateCell - Callback pour sauvegarder (agentName, day, value)
 * @param {Function} onClose - Callback pour fermer le modal
 */
const ModalCellEdit = ({ selectedCell, cellData, agentsData, onUpdateCell, onClose }) => {
  // États pour service, poste et postes supplémentaires
  const [tempService, setTempService] = useState('');
  const [tempPoste, setTempPoste] = useState('');
  const [tempPostesSupplementaires, setTempPostesSupplementaires] = useState([]);
  
  // États pour la gestion des notes
  const [tempNote, setTempNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);

  // Initialiser les états avec les données existantes
  useEffect(() => {
    if (cellData) {
      setTempService(cellData.service || '');
      setTempPoste(cellData.poste || '');
      setTempNote(cellData.note || '');
    } else {
      setTempService('');
      setTempPoste('');
      setTempNote('');
      setTempPostesSupplementaires([]);
    }
  }, [cellData, selectedCell]);

  if (!selectedCell) return null;

  // Fonction pour obtenir la couleur d'un code service dans la modal
  const getModalColor = (code, isSelected) => {
    if (isSelected) {
      // Si sélectionné : bordure bleue + couleur spécifique ou gris clair
      const baseColor = MODAL_COLORS[code] || 'bg-gray-200 text-gray-800';
      return `ring-2 ring-blue-500 ${baseColor}`;
    }
    // Non sélectionné : couleur spécifique ou gris très clair
    return MODAL_COLORS[code] || 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

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

  // Ouvrir la modal pour AJOUTER une note
  const openAddNoteModal = () => {
    setNoteInput('');
    setIsEditMode(false);
    setShowNoteModal(true);
  };

  // Ouvrir la modal pour MODIFIER une note existante
  const openEditNoteModal = () => {
    setNoteInput(tempNote);
    setIsEditMode(true);
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
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      setTempNote('');
    }
  };

  const handleSave = () => {
    let planningData;
    
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

  const hasExistingNote = Boolean(tempNote);

  return (
    <>
      {/* Modal principale */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedCell.agent}</h3>
              <p className="text-sm text-gray-600">Jour {selectedCell.day}</p>
              {hasExistingNote && (
                <div className="flex items-center gap-1 mt-1">
                  <StickyNote className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-amber-600">Note existante</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Section Service / Horaire - SANS COULEUR sauf MA, C, HAB, FO, D */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Service / Horaire</label>
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_CODES.map(({ code, desc }) => (
                <button
                  key={code}
                  onClick={() => setTempService(code)}
                  className={`p-2 rounded text-center text-xs transition-all ${getModalColor(code, tempService === code)}`}
                >
                  <div className="font-semibold">{code}</div>
                  <div className="text-xs mt-1">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section Poste (uniquement pour agents réserve) - SANS COULEUR */}
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
                        ? 'ring-2 ring-blue-500 bg-gray-200 text-gray-800 font-semibold'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {poste}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section Postes figés / Postes supplémentaires - SANS COULEUR */}
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
                        ? 'ring-2 ring-blue-500 bg-gray-200 text-gray-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 absolute top-1 right-1 text-blue-600" />
                    )}
                    <div className="font-semibold italic">{code}</div>
                    <div className="text-xs mt-1 not-italic">{desc.replace('Poste ', '').replace(' supplémentaire', '')}</div>
                  </button>
                );
              })}
            </div>
            {tempPostesSupplementaires.length > 0 && (
              <div className="mt-2 p-2 bg-gray-100 rounded">
                <p className="text-xs text-gray-700">
                  <span className="font-medium">Sélectionnés :</span>{' '}
                  <span className="italic">{tempPostesSupplementaires.join(', ')}</span>
                </p>
              </div>
            )}
          </div>

          {/* Section Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Commentaires</label>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={hasExistingNote ? openEditNoteModal : openAddNoteModal}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg border-2 transition-all ${
                  hasExistingNote 
                    ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' 
                    : 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                }`}
              >
                {hasExistingNote ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    Modifier la note
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="w-4 h-4" />
                    Ajouter une note
                  </>
                )}
              </button>

              <button
                onClick={handleDeleteNote}
                disabled={!hasExistingNote}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-lg border-2 transition-all ${
                  hasExistingNote 
                    ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 cursor-pointer' 
                    : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Supprimer une note
              </button>
            </div>

            {hasExistingNote && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <StickyNote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{tempNote}</p>
                </div>
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
              <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Edit3 className="w-5 h-5 text-amber-600" />
                    Modifier la note
                  </>
                ) : (
                  <>
                    <MessageSquarePlus className="w-5 h-5 text-amber-600" />
                    Ajouter une note
                  </>
                )}
              </h4>
              <button onClick={handleCancelNote} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commentaire pour <span className="font-semibold">{selectedCell.agent}</span> - Jour {selectedCell.day}
              </label>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Saisissez votre commentaire ici..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none text-sm"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                {noteInput.length} caractères
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelNote}
                className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleValidateNote}
                className="px-5 py-2.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
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
