import React, { useState, useEffect } from 'react';
import { X, Check, MessageSquarePlus, Trash2, StickyNote, Edit3, Type } from 'lucide-react';
import { SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES } from '../../constants/config';

// Couleurs UNIQUEMENT pour la modal d'édition 
// CORRIGÉES selon spécifications utilisateur :
// - MA en ROUGE 🔴
// - C (congés) en JAUNE/OR 🟡
// - HAB/FO en ORANGE 🟠
// - D (DISPO) en BLEU 🔵
// - RP/RU en VERT 🟢
// - VT en JAUNE CLAIR 🟨
// - D2I en GRIS ⬜
// - Pas de couleur pour -, O, X et les postes de réserve
const MODAL_COLORS = {
  'MA': 'bg-red-200 text-red-800 font-semibold',          // Maladie = ROUGE 🔴
  'C': 'bg-yellow-400 text-yellow-900 font-semibold',     // Congés = JAUNE/OR 🟡
  'RP': 'bg-green-100 text-green-800',                     // Repos = Vert 🟢
  'RU': 'bg-green-100 text-green-800',                     // Repos = Vert 🟢
  'HAB': 'bg-orange-200 text-orange-800',                  // Habilitation = ORANGE 🟠
  'FO': 'bg-orange-200 text-orange-800',                   // Formation = ORANGE 🟠
  'D': 'bg-blue-200 text-blue-800',                        // Disponible = BLEU 🔵
  'I': 'bg-pink-100 text-pink-700',                        // Inactif
  'NU': 'bg-gray-200 text-gray-600',                       // Non Utilisé
  'VT': 'bg-yellow-100 text-yellow-800',                   // Visite Technique = JAUNE CLAIR 🟨
  'D2I': 'bg-gray-300 text-gray-700',                      // D2I = GRIS ⬜
  // Les autres codes (-, O, X) n'ont pas de couleur (gris par défaut)
};

/**
 * ModalCellEdit - Modal d'édition d'une cellule du planning
 * 
 * @param {Object} selectedCell - {agent: string, day: number}
 * @param {Object|null} cellData - Données existantes {service, poste, note, texteLibre}
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

  // État pour le texte libre
  const [tempTexteLibre, setTempTexteLibre] = useState('');
  const [showTexteLibreModal, setShowTexteLibreModal] = useState(false);
  const [texteLibreInput, setTexteLibreInput] = useState('');
  const [isTexteLibreEditMode, setIsTexteLibreEditMode] = useState(false);

  // Initialiser les états avec les données existantes
  useEffect(() => {
    if (cellData) {
      setTempService(cellData.service || '');
      setTempPoste(cellData.poste || '');
      setTempNote(cellData.note || '');
      setTempTexteLibre(cellData.texteLibre || '');
      // Charger les postes supplémentaires existants
      setTempPostesSupplementaires(cellData.postesSupplementaires || []);
    } else {
      setTempService('');
      setTempPoste('');
      setTempNote('');
      setTempTexteLibre('');
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

  // === GESTION TEXTE LIBRE ===
  
  // Ouvrir la modal pour AJOUTER un texte libre
  const openAddTexteLibreModal = () => {
    setTexteLibreInput('');
    setIsTexteLibreEditMode(false);
    setShowTexteLibreModal(true);
  };

  // Ouvrir la modal pour MODIFIER un texte libre existant
  const openEditTexteLibreModal = () => {
    setTexteLibreInput(tempTexteLibre);
    setIsTexteLibreEditMode(true);
    setShowTexteLibreModal(true);
  };

  // Valider le texte libre
  const handleValidateTexteLibre = () => {
    setTempTexteLibre(texteLibreInput.trim());
    setShowTexteLibreModal(false);
  };

  // Annuler le texte libre
  const handleCancelTexteLibre = () => {
    setTexteLibreInput('');
    setShowTexteLibreModal(false);
  };

  // Supprimer le texte libre
  const handleDeleteTexteLibre = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce texte libre ?')) {
      setTempTexteLibre('');
    }
  };

  // Sélectionner "Texte libre" comme service
  const selectTexteLibre = () => {
    setTempService('LIBRE');
    openAddTexteLibreModal();
  };

  const handleSave = () => {
    let planningData;
    
    // Si texte libre est sélectionné, utiliser le texte libre comme service
    const finalService = tempService === 'LIBRE' && tempTexteLibre 
      ? tempTexteLibre 
      : tempService;
    
    if (tempPoste || tempPostesSupplementaires.length > 0 || tempNote || tempTexteLibre) {
      planningData = { 
        service: finalService,
        ...(tempPoste && { poste: tempPoste }),
        ...(tempPostesSupplementaires.length > 0 && { postesSupplementaires: tempPostesSupplementaires }),
        ...(tempNote && { note: tempNote }),
        ...(tempTexteLibre && tempService === 'LIBRE' && { texteLibre: tempTexteLibre })
      };
    } else {
      planningData = finalService;
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
  const hasExistingTexteLibre = Boolean(tempTexteLibre);

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
              {hasExistingTexteLibre && (
                <div className="flex items-center gap-1 mt-1">
                  <Type className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600">Texte libre : {tempTexteLibre}</span>
                </div>
              )}
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
                  className={`p-2 rounded text-center text-xs transition-all ${getModalColor(code, tempService === code)}`}
                >
                  <div className="font-semibold">{code}</div>
                  <div className="text-xs mt-1">{desc}</div>
                </button>
              ))}
              
              {/* Bouton Texte Libre */}
              <button
                onClick={selectTexteLibre}
                className={`p-2 rounded text-center text-xs transition-all ${
                  tempService === 'LIBRE'
                    ? 'ring-2 ring-purple-500 bg-purple-100 text-purple-800'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-2 border-dashed border-purple-300'
                }`}
              >
                <div className="font-semibold flex items-center justify-center gap-1">
                  <Type className="w-3 h-3" />
                  LIBRE
                </div>
                <div className="text-xs mt-1">Texte libre</div>
              </button>
            </div>
            
            {/* Affichage du texte libre si sélectionné */}
            {tempService === 'LIBRE' && hasExistingTexteLibre && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <Type className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-purple-900 font-medium">{tempTexteLibre}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={openEditTexteLibreModal}
                      className="p-1 text-purple-600 hover:text-purple-800"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleDeleteTexteLibre}
                      className="p-1 text-red-500 hover:text-red-700"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                disabled={!tempService && !tempTexteLibre}
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

      {/* Sous-modal pour ajouter/modifier un texte libre */}
      {showTexteLibreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]" onClick={handleCancelTexteLibre}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {isTexteLibreEditMode ? (
                  <>
                    <Edit3 className="w-5 h-5 text-purple-600" />
                    Modifier le texte libre
                  </>
                ) : (
                  <>
                    <Type className="w-5 h-5 text-purple-600" />
                    Saisir un texte libre
                  </>
                )}
              </h4>
              <button onClick={handleCancelTexteLibre} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texte personnalisé pour <span className="font-semibold">{selectedCell.agent}</span> - Jour {selectedCell.day}
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Ce texte sera affiché directement dans la cellule du planning
              </p>
              <input
                type="text"
                value={texteLibreInput}
                onChange={(e) => setTexteLibreInput(e.target.value)}
                placeholder="Ex: RDV médecin, Réunion, ..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                autoFocus
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">
                {texteLibreInput.length}/20 caractères
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelTexteLibre}
                className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleValidateTexteLibre}
                disabled={!texteLibreInput.trim()}
                className="px-5 py-2.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium flex items-center gap-2 disabled:bg-gray-300"
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
