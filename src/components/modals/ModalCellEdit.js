import React, { useState, useEffect } from 'react';
import { X, Check, MessageSquarePlus, Trash2, StickyNote, Edit3, Type, ArrowLeftRight, Search, Calendar, AlertCircle } from 'lucide-react';
import { SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES, POSTES_PAR_GROUPE, GROUPES_AVEC_POSTE, MONTHS } from '../../constants/config';

// Couleurs UNIQUEMENT pour la modal d'édition 
const MODAL_COLORS = {
  'MA': 'bg-red-200 text-red-800 font-semibold',
  'C': 'bg-yellow-400 text-yellow-900 font-semibold',
  'RP': 'bg-green-100 text-green-800',
  'RU': 'bg-green-100 text-green-800',
  'HAB': 'bg-orange-200 text-orange-800',
  'FO': 'bg-orange-200 text-orange-800',
  'D': 'bg-blue-200 text-blue-800',
  'I': 'bg-pink-100 text-pink-700',
  'NU': 'bg-gray-200 text-gray-600',
  'VT': 'bg-yellow-100 text-yellow-800',
  'D2I': 'bg-gray-300 text-gray-700',
};

/**
 * ModalCellEdit - Modal d'édition d'une cellule du planning
 * 
 * @version 2.4.2 - Fix texte libre (sauvegarde + affichage)
 */
const ModalCellEdit = ({ 
  selectedCell, 
  cellData, 
  agentsData, 
  allAgents = [],
  allPlanning = {},
  currentMonth,
  currentYear,
  userEmail,
  onUpdateCell, 
  onCroisement,
  onClose 
}) => {
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

  // === NOUVEAUX ÉTATS POUR ÉDITION MULTIPLE ===
  const [applyToMultipleDays, setApplyToMultipleDays] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [dateRangeWarning, setDateRangeWarning] = useState('');

  // === ÉTATS CROISEMENT ===
  const [showCroisementModal, setShowCroisementModal] = useState(false);
  const [selectedCroisementAgent, setSelectedCroisementAgent] = useState(null);
  const [croisementSearch, setCroisementSearch] = useState('');
  const [croisementLoading, setCroisementLoading] = useState(false);

  // DEBUG: Log des props reçues à chaque render
  useEffect(() => {
    const planningKeys = Object.keys(allPlanning || {});
    const agentsWithData = planningKeys.filter(key => {
      const agentData = allPlanning[key];
      return agentData && Object.keys(agentData).length > 0;
    });
    
    console.log('🔍 ModalCellEdit - Props reçues:');
    console.log('   allPlanning type:', typeof allPlanning);
    console.log('   allPlanning keys count:', planningKeys.length);
    console.log('   allPlanning sample keys:', planningKeys.slice(0, 5));
    console.log('   Agents avec données:', agentsWithData.length);
    console.log('   selectedCell:', selectedCell);
    console.log('   selectedCell.day type:', typeof selectedCell?.day);
  }, [allPlanning, selectedCell]);

  // Initialiser les états avec les données existantes
  useEffect(() => {
    if (cellData) {
      // Détection du texte libre : si texteLibre existe OU si le service n'est pas un code standard
      const isTexteLibre = cellData.texteLibre || 
        (cellData.service && !SERVICE_CODES.some(sc => sc.code === cellData.service) && cellData.service !== '');
      
      if (isTexteLibre) {
        setTempService('LIBRE');
        setTempTexteLibre(cellData.texteLibre || cellData.service || '');
      } else {
        setTempService(cellData.service || '');
        setTempTexteLibre('');
      }
      
      setTempPoste(cellData.poste || '');
      setTempNote(cellData.note || '');
      setTempPostesSupplementaires(cellData.postesSupplementaires || []);
    } else {
      setTempService('');
      setTempPoste('');
      setTempNote('');
      setTempTexteLibre('');
      setTempPostesSupplementaires([]);
    }
    // Reset édition multiple
    setApplyToMultipleDays(false);
    setEndDate('');
    setDateRangeWarning('');
  }, [cellData, selectedCell]);

  // useEffect pour validation automatique de la plage de dates
  useEffect(() => {
    if (applyToMultipleDays && endDate && selectedCell) {
      const [, , day] = endDate.split('-').map(Number);
      const currentDay = selectedCell.day;
      const daysCount = day - currentDay + 1;
      
      if (day < currentDay) {
        setDateRangeWarning('❌ La date de fin doit être >= à la date de début');
      } else if (daysCount > 31) {
        setDateRangeWarning('⚠️ Maximum 31 jours');
      } else if (daysCount > 7) {
        setDateRangeWarning(`⚠️ ${daysCount} jours seront modifiés`);
      } else {
        setDateRangeWarning(`✅ ${daysCount} jour${daysCount > 1 ? 's' : ''} sera${daysCount > 1 ? 'nt' : ''} modifié${daysCount > 1 ? 's' : ''}`);
      }
    } else {
      setDateRangeWarning('');
    }
  }, [endDate, applyToMultipleDays, selectedCell]);

  if (!selectedCell) return null;

// === FONCTIONS HELPER POUR ÉDITION MULTIPLE ===
  
  // Calculer le nombre de jours dans le mois actuel
  const getDaysInMonth = (month, year) => {
    const monthIndex = MONTHS.indexOf(month);
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  // Fonction pour les boutons rapides
  const handleQuickDateRange = (days) => {
    const currentDay = selectedCell.day;
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    
    let targetDay;
    if (days === 'end') {
      targetDay = daysInMonth;
    } else {
      targetDay = Math.min(currentDay + days - 1, daysInMonth);
    }
    
    const monthIndex = MONTHS.indexOf(currentMonth);
    const month = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(targetDay).padStart(2, '0');
    const dateStr = `${currentYear}-${month}-${dayStr}`;
    
    setEndDate(dateStr);
    validateDateRange(currentDay, targetDay);
  };

  // Validation de la plage de dates
  const validateDateRange = (startDay, endDay) => {
    const daysCount = endDay - startDay + 1;
    
    if (endDay < startDay) {
      setDateRangeWarning('❌ La date de fin doit être >= à la date de début');
    } else if (daysCount > 31) {
      setDateRangeWarning('⚠️ Maximum 31 jours');
    } else if (daysCount > 7) {
      setDateRangeWarning(`⚠️ ${daysCount} jours seront modifiés`);
    } else {
      setDateRangeWarning(`✅ ${daysCount} jour${daysCount > 1 ? 's' : ''} sera${daysCount > 1 ? 'nt' : ''} modifié${daysCount > 1 ? 's' : ''}`);
    }
  };

  // Trouver le groupe de l'agent sélectionné
  const findAgentGroup = () => {
    for (const [groupe, agents] of Object.entries(agentsData)) {
      if (agents.some(agent => `${agent.nom} ${agent.prenom}` === selectedCell.agent)) {
        return groupe;
      }
    }
    return null;
  };

  const agentGroup = findAgentGroup();

  // Vérifier si l'agent a accès au sélecteur de poste
  const hasPosteSelector = GROUPES_AVEC_POSTE.some(g => agentGroup?.includes(g) || agentGroup === g);

  // Déterminer les postes disponibles pour cet agent
  const getAvailablePostes = () => {
    for (const [groupeKey, postes] of Object.entries(POSTES_PAR_GROUPE)) {
      if (agentGroup?.includes(groupeKey) || agentGroup === groupeKey) {
        return postes;
      }
    }
    return POSTES_CODES;
  };

  const availablePostes = getAvailablePostes();

  // Générer le label de la section Poste selon le groupe
  const getPosteLabel = () => {
    if (agentGroup?.includes('RC - ROULEMENT REGULATEUR CENTRE')) {
      return 'Poste (RC)';
    }
    if (agentGroup?.includes('EAC - APPORT DENFERT')) {
      return 'Poste (EAC)';
    }
    return 'Poste (Réserve)';
  };

  // Fonction pour obtenir la couleur d'un code service dans la modal
  const getModalColor = (code, isSelected) => {
    if (isSelected) {
      const baseColor = MODAL_COLORS[code] || 'bg-gray-200 text-gray-800';
      return `ring-2 ring-blue-500 ${baseColor}`;
    }
    return MODAL_COLORS[code] || 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  };

  // Toggle un poste supplémentaire
  const togglePosteSupplementaire = (code) => {
    setTempPostesSupplementaires(prev => {
      if (prev.includes(code)) {
        return prev.filter(p => p !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  // === GESTION NOTES ===
  const openAddNoteModal = () => {
    setNoteInput('');
    setIsEditMode(false);
    setShowNoteModal(true);
  };

  const openEditNoteModal = () => {
    setNoteInput(tempNote);
    setIsEditMode(true);
    setShowNoteModal(true);
  };

  const handleValidateNote = () => {
    setTempNote(noteInput.trim());
    setShowNoteModal(false);
  };

  const handleCancelNote = () => {
    setNoteInput('');
    setShowNoteModal(false);
  };

  const handleDeleteNote = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      setTempNote('');
    }
  };

  // === GESTION TEXTE LIBRE ===
  const openAddTexteLibreModal = () => {
    setTexteLibreInput('');
    setIsTexteLibreEditMode(false);
    setShowTexteLibreModal(true);
  };

  const openEditTexteLibreModal = () => {
    setTexteLibreInput(tempTexteLibre);
    setIsTexteLibreEditMode(true);
    setShowTexteLibreModal(true);
  };

  const handleValidateTexteLibre = () => {
    const texte = texteLibreInput.trim();
    if (texte) {
      setTempTexteLibre(texte);
      setTempService('LIBRE');
    }
    setShowTexteLibreModal(false);
  };

  const handleCancelTexteLibre = () => {
    setTexteLibreInput('');
    setShowTexteLibreModal(false);
  };

  const handleDeleteTexteLibre = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce texte libre ?')) {
      setTempTexteLibre('');
      setTempService('');
    }
  };

  const selectTexteLibre = () => {
    if (tempTexteLibre) {
      // Si déjà du texte libre, ouvrir en mode édition
      openEditTexteLibreModal();
    } else {
      // Sinon, ouvrir en mode ajout
      setTempService('LIBRE');
      openAddTexteLibreModal();
    }
  };

  // === GESTION CROISEMENT ===

  const openCroisementModal = () => {
    console.log('🔄 Ouverture modal croisement');
    setSelectedCroisementAgent(null);
    setCroisementSearch('');
    setShowCroisementModal(true);
  };

  const closeCroisementModal = () => {
    setShowCroisementModal(false);
    setSelectedCroisementAgent(null);
    setCroisementSearch('');
  };

  // Filtrer les agents pour le croisement
  const getFilteredAgentsForCroisement = () => {
    const allAgentsList = Object.values(agentsData).flat();
    
    return allAgentsList.filter(agent => {
      const fullName = `${agent.nom} ${agent.prenom}`;
      if (fullName === selectedCell.agent) return false;
      if (croisementSearch) {
        const search = croisementSearch.toLowerCase();
        return fullName.toLowerCase().includes(search) || 
               agent.nom.toLowerCase().includes(search) ||
               agent.prenom.toLowerCase().includes(search);
      }
      return true;
    });
  };

  /**
   * Normalise un nom pour la comparaison
   */
  const normalizeName = (name) => {
    return name?.trim().toLowerCase().replace(/\s+/g, ' ') || '';
  };

  /**
   * Trouve la clé correspondante dans allPlanning pour un nom d'agent
   */
  const findPlanningKey = (agentName) => {
    if (!allPlanning || !agentName) return null;
    
    if (allPlanning[agentName] !== undefined) {
      return agentName;
    }
    
    const normalizedSearch = normalizeName(agentName);
    const keys = Object.keys(allPlanning);
    
    for (const key of keys) {
      if (normalizeName(key) === normalizedSearch) {
        return key;
      }
    }
    
    for (const key of keys) {
      if (normalizeName(key).includes(normalizedSearch) || 
          normalizedSearch.includes(normalizeName(key))) {
        return key;
      }
    }
    
    return null;
  };

  /**
   * Récupérer les données planning d'un agent pour un jour donné
   */
  const getAgentPlanningForDay = (agentName, day) => {
    const planningKey = findPlanningKey(agentName);
    if (!planningKey) return null;
    
    const agentData = allPlanning[planningKey];
    let cellValue = agentData?.[day] || agentData?.[String(day)] || agentData?.[Number(day)];
    
    if (!cellValue) return null;
    
    if (typeof cellValue === 'string') {
      return { service: cellValue, poste: null, note: null, postesSupplementaires: null };
    }
    
    return {
      service: cellValue.service || null,
      poste: cellValue.poste || null,
      note: cellValue.note || null,
      postesSupplementaires: cellValue.postesSupplementaires || null,
      texteLibre: cellValue.texteLibre || null
    };
  };

  // Effectuer le croisement
  const handleConfirmCroisement = async () => {
    if (!selectedCroisementAgent) {
      alert('Veuillez sélectionner un agent pour le croisement');
      return;
    }

    setCroisementLoading(true);

    try {
      const agent1Name = selectedCell.agent;
      const agent2Name = `${selectedCroisementAgent.nom} ${selectedCroisementAgent.prenom}`;
      const day = selectedCell.day;

      const agent1Data = cellData || {};
      const agent2Data = getAgentPlanningForDay(agent2Name, day) || {};

      const newAgent1Data = {
        service: agent2Data.service || '',
        poste: agent2Data.poste || '',
        postesSupplementaires: agent2Data.postesSupplementaires || [],
        note: `Croisement avec ${agent2Name}`,
        texteLibre: agent2Data.texteLibre || ''
      };

      const newAgent2Data = {
        service: agent1Data.service || tempService || '',
        poste: agent1Data.poste || tempPoste || '',
        postesSupplementaires: agent1Data.postesSupplementaires || tempPostesSupplementaires || [],
        note: `Croisement avec ${agent1Name}`,
        texteLibre: agent1Data.texteLibre || tempTexteLibre || ''
      };

      if (onCroisement) {
        await onCroisement({
          date: day,
          agent1: { name: agent1Name, id: findAgentId(agent1Name), originalData: agent1Data },
          agent2: { name: agent2Name, id: selectedCroisementAgent.id, originalData: agent2Data },
          newAgent1Data,
          newAgent2Data,
          createdBy: userEmail
        });
      } else {
        await onUpdateCell(agent1Name, day, newAgent1Data);
        await onUpdateCell(agent2Name, day, newAgent2Data);
      }

      closeCroisementModal();
      onClose();

    } catch (error) {
      console.error('Erreur lors du croisement:', error);
      alert(`Erreur lors du croisement: ${error.message}`);
    } finally {
      setCroisementLoading(false);
    }
  };

  const findAgentId = (fullName) => {
    for (const agents of Object.values(agentsData)) {
      const agent = agents.find(a => `${a.nom} ${a.prenom}` === fullName);
      if (agent) return agent.id;
    }
    return null;
  };

  const handleSave = async () => {
    let planningData;
    
    // Déterminer le service final
    const isTexteLibre = tempService === 'LIBRE' && tempTexteLibre;
    const finalService = isTexteLibre ? 'LIBRE' : tempService;
    
    // Construire l'objet de données
    if (tempPoste || tempPostesSupplementaires.length > 0 || tempNote || isTexteLibre) {
      planningData = { 
        service: finalService,
        ...(tempPoste && { poste: tempPoste }),
        ...(tempPostesSupplementaires.length > 0 && { postesSupplementaires: tempPostesSupplementaires }),
        ...(tempNote && { note: tempNote }),
        ...(isTexteLibre && { texteLibre: tempTexteLibre })
      };
    } else {
      planningData = finalService;
    }
    
    console.log('💾 Sauvegarde planning:', planningData);
    
    // === GESTION ÉDITION MULTIPLE ===
    if (applyToMultipleDays && endDate) {
      const [, , endDay] = endDate.split('-').map(Number);
      const startDay = selectedCell.day;
      
      if (endDay < startDay) {
        alert('❌ La date de fin doit être >= à la date de début');
        return;
      }
      
      const daysCount = endDay - startDay + 1;
      
      if (daysCount > 7) {
        const confirm = window.confirm(
          `⚠️ Vous allez modifier ${daysCount} jours (du ${startDay} au ${endDay} ${currentMonth}).\n\nConfirmer ?`
        );
        if (!confirm) return;
      }
      
      try {
        for (let day = startDay; day <= endDay; day++) {
          await onUpdateCell(selectedCell.agent, day, planningData);
        }
        alert(`✅ ${daysCount} jour${daysCount > 1 ? 's' : ''} modifié${daysCount > 1 ? 's' : ''} avec succès !`);
      } catch (error) {
        alert('❌ Erreur lors de la modification : ' + error.message);
        return;
      }
    } else {
      await onUpdateCell(selectedCell.agent, selectedCell.day, planningData);
    }
    
    onClose();
  };

  const handleDelete = () => {
    onUpdateCell(selectedCell.agent, selectedCell.day, '');
    onClose();
  };

  const hasExistingNote = Boolean(tempNote);
  const hasExistingTexteLibre = Boolean(tempTexteLibre);
  const hasExistingPostesSupp = tempPostesSupplementaires.length > 0;
  const hasCroisementNote = tempNote?.toLowerCase().includes('croisement avec');

  // Compter combien d'agents ont des données pour ce jour (pour debug)
  const agentsWithDataForDay = Object.keys(allPlanning || {}).filter(key => {
    const data = allPlanning[key];
    return data && data[selectedCell.day] !== undefined;
  }).length;

  return (
    <>
      {/* Modal principale */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedCell.agent}</h3>
              <p className="text-sm text-gray-600">Jour {selectedCell.day}</p>
              {agentGroup && (
                <p className="text-xs text-gray-400">{agentGroup}</p>
              )}
              {hasExistingNote && (
                <div className="flex items-center gap-1 mt-1">
                  {hasCroisementNote ? (
                    <>
                      <ArrowLeftRight className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-purple-600 font-medium">{tempNote}</span>
                    </>
                  ) : (
                    <>
                      <StickyNote className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-600">Note existante</span>
                    </>
                  )}
                </div>
              )}
              {hasExistingTexteLibre && (
                <div className="flex items-center gap-1 mt-1">
                  <Type className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600">Texte libre : {tempTexteLibre}</span>
                </div>
              )}
              {hasExistingPostesSupp && (
                <div className="flex items-center gap-1 mt-1">
                  <Check className="w-3 h-3 text-purple-500" />
                  <span className="text-xs text-purple-600 italic">Postes supp: {tempPostesSupplementaires.join(', ')}</span>
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
                  onClick={() => {
                    setTempService(code);
                    // Si on sélectionne un autre service que LIBRE, effacer le texte libre
                    if (code !== 'LIBRE') {
                      setTempTexteLibre('');
                    }
                  }}
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
            
            {/* Affichage du texte libre existant */}
            {tempService === 'LIBRE' && hasExistingTexteLibre && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <Type className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-purple-900 font-medium">{tempTexteLibre}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={openEditTexteLibreModal} className="p-1 text-purple-600 hover:text-purple-800" title="Modifier">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={handleDeleteTexteLibre} className="p-1 text-red-500 hover:text-red-700" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Poste */}
          {hasPosteSelector && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">{getPosteLabel()}</label>
              <div className="grid grid-cols-4 gap-2">
                {availablePostes.map(poste => (
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

          {/* Section Postes supplémentaires */}
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

          {/* Section Notes & Croisement */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes & Croisement</label>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={hasExistingNote ? openEditNoteModal : openAddNoteModal}
                className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                  hasExistingNote 
                    ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100' 
                    : 'bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200'
                }`}
                title={hasExistingNote ? "Modifier la note" : "Ajouter une note"}
              >
                {hasExistingNote ? <Edit3 className="w-4 h-4" /> : <MessageSquarePlus className="w-4 h-4" />}
                <span>{hasExistingNote ? 'Note' : '+ Note'}</span>
              </button>

              <button
                onClick={handleDeleteNote}
                disabled={!hasExistingNote}
                className={`flex items-center justify-center gap-1 px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                  hasExistingNote 
                    ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 cursor-pointer' 
                    : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
                title="Supprimer la note"
              >
                <Trash2 className="w-4 h-4" />
                <span>Note</span>
              </button>

              <button
                onClick={openCroisementModal}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 bg-purple-100 border-purple-400 text-purple-800 hover:bg-purple-200 transition-all"
                title="Échanger le service avec un autre agent"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Croisement</span>
              </button>
            </div>

            {hasExistingNote && (
              <div className={`p-3 rounded-lg border ${hasCroisementNote ? 'bg-purple-50 border-purple-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-2">
                  {hasCroisementNote ? (
                    <ArrowLeftRight className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <StickyNote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm whitespace-pre-wrap ${hasCroisementNote ? 'text-purple-900' : 'text-amber-900'}`}>{tempNote}</p>
                </div>
              </div>
            )}
          </div>

{/* === SECTION ÉDITION MULTIPLE === */}
        <div style={{
          background: 'linear-gradient(to right, rgba(0, 240, 255, 0.05), rgba(0, 102, 179, 0.05))',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginTop: '16px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#e0e0e0',
            marginBottom: '8px'
          }}>
            <input
              type="checkbox"
              checked={applyToMultipleDays}
              onChange={(e) => setApplyToMultipleDays(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#00f0ff'
              }}
            />
            <Calendar size={16} style={{ color: '#00f0ff' }} />
            <span>Appliquer à plusieurs jours</span>
          </label>

          {applyToMultipleDays && (
            <div style={{ marginTop: '12px', paddingLeft: '4px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <span style={{ color: '#b0b0b0', fontSize: '13px', minWidth: '45px' }}>
                  Du :
                </span>
                <input
                  type="text"
                  value={`${selectedCell.day.toString().padStart(2, '0')}/${currentMonth}/${currentYear}`}
                  disabled
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    borderRadius: '6px',
                    color: '#888',
                    fontSize: '13px',
                    width: '140px'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <span style={{ color: '#b0b0b0', fontSize: '13px', minWidth: '45px' }}>
                  Au :
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={(() => {
                    const monthIndex = MONTHS.indexOf(currentMonth);
                    const month = String(monthIndex + 1).padStart(2, '0');
                    const day = String(selectedCell.day).padStart(2, '0');
                    return `${currentYear}-${month}-${day}`;
                  })()}
                  max={(() => {
                    const monthIndex = MONTHS.indexOf(currentMonth);
                    const month = String(monthIndex + 1).padStart(2, '0');
                    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
                    return `${currentYear}-${month}-${String(daysInMonth).padStart(2, '0')}`;
                  })()}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    borderRadius: '6px',
                    color: '#e0e0e0',
                    fontSize: '13px',
                    flex: 1,
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Boutons rapides */}
              <div style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}>
                {[
                  { label: '3j', value: 3 },
                  { label: '5j', value: 5 },
                  { label: '7j', value: 7 },
                  { label: 'Fin mois', value: 'end' }
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={() => handleQuickDateRange(btn.value)}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#00f0ff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0, 240, 255, 0.2)';
                      e.target.style.borderColor = 'rgba(0, 240, 255, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(0, 240, 255, 0.1)';
                      e.target.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Warning/Info message */}
              {dateRangeWarning && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: dateRangeWarning.startsWith('❌') 
                    ? 'rgba(255, 0, 0, 0.1)'
                    : dateRangeWarning.startsWith('⚠️')
                    ? 'rgba(255, 165, 0, 0.1)'
                    : 'rgba(0, 255, 0, 0.1)',
                  border: `1px solid ${
                    dateRangeWarning.startsWith('❌')
                      ? 'rgba(255, 0, 0, 0.3)'
                      : dateRangeWarning.startsWith('⚠️')
                      ? 'rgba(255, 165, 0, 0.3)'
                      : 'rgba(0, 255, 0, 0.3)'
                  }`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: dateRangeWarning.startsWith('❌')
                    ? '#ff6b6b'
                    : dateRangeWarning.startsWith('⚠️')
                    ? '#ffa500'
                    : '#4ade80'
                }}>
                  <AlertCircle size={14} />
                  <span>{dateRangeWarning}</span>
                </div>
              )}
            </div>
          )}
        </div>
          {/* Boutons d'action */}
          <div className="flex justify-between pt-4 border-t">
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
              Effacer
            </button>
            <div className="flex space-x-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
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

      {/* Sous-modal Note */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]" onClick={handleCancelNote}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {isEditMode ? <><Edit3 className="w-5 h-5 text-amber-600" />Modifier la note</> : <><MessageSquarePlus className="w-5 h-5 text-amber-600" />Ajouter une note</>}
              </h4>
              <button onClick={handleCancelNote} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
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
              <p className="text-xs text-gray-500 mt-1">{noteInput.length} caractères</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={handleCancelNote} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleValidateNote} className="px-5 py-2.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium flex items-center gap-2">
                <Check className="w-4 h-4" />Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sous-modal Texte Libre */}
      {showTexteLibreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]" onClick={handleCancelTexteLibre}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                {isTexteLibreEditMode ? <><Edit3 className="w-5 h-5 text-purple-600" />Modifier le texte libre</> : <><Type className="w-5 h-5 text-purple-600" />Saisir un texte libre</>}
              </h4>
              <button onClick={handleCancelTexteLibre} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texte personnalisé pour <span className="font-semibold">{selectedCell.agent}</span> - Jour {selectedCell.day}
              </label>
              <p className="text-xs text-gray-500 mb-3">Ce texte sera affiché directement dans la cellule du planning</p>
              <input
                type="text"
                value={texteLibreInput}
                onChange={(e) => setTexteLibreInput(e.target.value)}
                placeholder="Ex: RDV médecin, Réunion, ..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                autoFocus
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">{texteLibreInput.length}/20 caractères</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={handleCancelTexteLibre} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Annuler</button>
              <button onClick={handleValidateTexteLibre} disabled={!texteLibreInput.trim()} className="px-5 py-2.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium flex items-center gap-2 disabled:bg-gray-300">
                <Check className="w-4 h-4" />Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sous-modal Croisement */}
      {showCroisementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]" onClick={closeCroisementModal}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-purple-600" />
                Croisement de service
              </h4>
              <button onClick={closeCroisementModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Échanger le service de <span className="font-semibold text-purple-700">{selectedCell.agent}</span> (Jour {selectedCell.day}) avec :
              </p>
              
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={croisementSearch}
                  onChange={(e) => setCroisementSearch(e.target.value)}
                  placeholder="Rechercher un agent..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                {getFilteredAgentsForCroisement().length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Aucun agent trouvé</div>
                ) : (
                  getFilteredAgentsForCroisement().map(agent => {
                    const fullName = `${agent.nom} ${agent.prenom}`;
                    const agentPlanning = getAgentPlanningForDay(fullName, selectedCell.day);
                    const isSelected = selectedCroisementAgent?.id === agent.id;
                    
                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedCroisementAgent(agent)}
                        className={`w-full px-4 py-3 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                          isSelected ? 'bg-purple-100 border-l-4 border-l-purple-500' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-gray-800">{fullName}</div>
                            <div className="text-xs text-gray-500">{agent.groupe}</div>
                          </div>
                          <div className="text-right">
                            {agentPlanning?.service ? (
                              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                {agentPlanning.service}
                                {agentPlanning.poste && ` / ${agentPlanning.poste}`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Pas de service</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {selectedCroisementAgent && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 font-medium mb-2">Aperçu du croisement :</p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 text-center">
                    <div className="font-medium">{selectedCell.agent}</div>
                    <div className="text-xs text-gray-500">
                      {cellData?.service || tempService || '-'}
                      {(cellData?.poste || tempPoste) && ` / ${cellData?.poste || tempPoste}`}
                    </div>
                  </div>
                  <ArrowLeftRight className="w-5 h-5 text-purple-500" />
                  <div className="flex-1 text-center">
                    <div className="font-medium">{selectedCroisementAgent.nom} {selectedCroisementAgent.prenom}</div>
                    <div className="text-xs text-gray-500">
                      {(() => {
                        const otherAgentData = getAgentPlanningForDay(`${selectedCroisementAgent.nom} ${selectedCroisementAgent.prenom}`, selectedCell.day);
                        return otherAgentData?.service 
                          ? `${otherAgentData.service}${otherAgentData.poste ? ` / ${otherAgentData.poste}` : ''}`
                          : '-';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
              <button onClick={closeCroisementModal} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">Annuler</button>
              <button
                onClick={handleConfirmCroisement}
                disabled={!selectedCroisementAgent || croisementLoading}
                className="px-5 py-2.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 disabled:bg-gray-300"
              >
                {croisementLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />En cours...</>
                ) : (
                  <><Check className="w-4 h-4" />Confirmer le croisement</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModalCellEdit;
