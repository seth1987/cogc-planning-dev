import React, { useState, useEffect, useRef } from 'react';
import { X, Check, MessageSquarePlus, Trash2, StickyNote, Edit3, Type, ArrowLeftRight, Search, Calendar, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  SERVICE_CODES,
  POSTES_CODES,
  POSTES_SUPPLEMENTAIRES,
  POSTES_PAR_GROUPE,
  GROUPES_AVEC_POSTE,
  MONTHS,
  SERVICE_JOUR_CODES,
  HABILITATION_CODES,
  JOURS_RH_CODES,
  ABSENCES_CODES,
  STATUT_CONGE_CODES
} from '../../constants/config';

// Couleurs pour la modal d'édition - par catégorie
const MODAL_COLORS = {
  // Horaires - pas de couleur spéciale
  '-': 'bg-gray-100 text-gray-800',
  'O': 'bg-gray-100 text-gray-800',
  'X': 'bg-gray-100 text-gray-800',
  'I': 'bg-gray-100 text-gray-800',
  'RP': 'bg-green-100 text-green-800',
  'RPP': 'bg-green-100 text-red-600',
  'NU': 'bg-gray-200 text-gray-600',
  // Absences
  'MA': 'bg-red-200 text-red-800 font-semibold',
  'F': 'bg-purple-200 text-purple-800 font-semibold',
  // Statut congé (stocké dans statut_conge)
  'C': 'bg-yellow-400 text-yellow-900 font-semibold',
  'C?': 'bg-yellow-200 text-yellow-800 font-semibold',
  'CNA': 'bg-red-300 text-red-900 font-semibold',
  // Service de jour (bleu clair)
  'VL': 'bg-blue-100 text-blue-800',
  'D': 'bg-blue-100 text-blue-800',
  'EIA': 'bg-blue-100 text-blue-800',
  'DPX': 'bg-blue-100 text-blue-800',
  'PSE': 'bg-blue-100 text-blue-800',
  'INAC': 'bg-blue-100 text-blue-800',
  'VM': 'bg-blue-100 text-blue-800',
  // Habilitation (orange)
  'HAB': 'bg-orange-200 text-orange-800',
  'FO RO': 'bg-orange-200 text-orange-800',
  'FO RC': 'bg-orange-200 text-orange-800',
  'FO CAC': 'bg-orange-200 text-orange-800',
  'FO CRC': 'bg-orange-200 text-orange-800',
  'FO ACR': 'bg-orange-200 text-orange-800',
  'FO CCU': 'bg-orange-200 text-orange-800',
  // Jours RH (jaune clair)
  'VT': 'bg-yellow-100 text-yellow-800',
  'D2I': 'bg-yellow-100 text-yellow-800',
  'RU': 'bg-yellow-100 text-yellow-800',
  'RA': 'bg-yellow-100 text-yellow-800',
  'RN': 'bg-yellow-100 text-yellow-800',
  'RQ': 'bg-yellow-100 text-yellow-800',
  'TY': 'bg-yellow-100 text-yellow-800',
  'AY': 'bg-yellow-100 text-yellow-800',
  'AH': 'bg-yellow-100 text-yellow-800',
  'DD': 'bg-yellow-100 text-yellow-800',
  // PCD (cyan/turquoise)
  'CCCBO': 'bg-cyan-200 text-cyan-800',
  'CBVD': 'bg-cyan-200 text-cyan-800',
};

// Codes PCD pour le sous-menu (2 options)
const PCD_POSTE_CODES = ['CCCBO', 'CBVD'];

/**
 * ModalCellEdit - Modal d'édition d'une cellule du planning
 * 
 * @version 4.5.2 - Fix préservation note_privee lors effacement + visibilité texte modales
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
  const [tempService, setTempService] = useState('');      // Horaire (-, O, X, I, RP, NU)
  const [tempCategorie, setTempCategorie] = useState('');  // Catégorie (Service jour, Habilitation, Jours RH, MA, F, etc.)
  const [tempPoste, setTempPoste] = useState('');
  const [tempPostesSupplementaires, setTempPostesSupplementaires] = useState([]);
  
  // === NOUVEL ÉTAT POUR STATUT CONGÉ ===
  const [tempStatutConge, setTempStatutConge] = useState(''); // C, C?, CNA ou ''
  
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

  // === ÉTATS POUR ÉDITION MULTIPLE (avec date de départ modifiable) ===
  const [applyToMultipleDays, setApplyToMultipleDays] = useState(false);
  const [startDate, setStartDate] = useState(''); // Date de départ modifiable
  const [endDate, setEndDate] = useState('');
  const [dateRangeWarning, setDateRangeWarning] = useState('');

  // === ÉTATS CROISEMENT ===
  const [showCroisementModal, setShowCroisementModal] = useState(false);
  const [selectedCroisementAgent, setSelectedCroisementAgent] = useState(null);
  const [croisementSearch, setCroisementSearch] = useState('');
  const [croisementLoading, setCroisementLoading] = useState(false);

  // === NOUVEAUX ÉTATS POUR ACCORDÉONS ET RECHERCHE ===
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState({
    serviceJour: false,
    habilitation: false,
    joursRH: false
  });

  // === ÉTAT POUR SOUS-MENU PCD ===
  const [showPcdDropdown, setShowPcdDropdown] = useState(false);
  const pcdButtonRef = useRef(null);

  // Liste de tous les codes de catégorie pour détection (sans C, C?, CNA car dans statut_conge)
  const ALL_CATEGORIE_CODES = [
    ...SERVICE_JOUR_CODES.map(c => c.code),
    ...HABILITATION_CODES.map(c => c.code),
    ...JOURS_RH_CODES.map(c => c.code),
    ...ABSENCES_CODES.map(c => c.code)
  ];

  // Liste des codes horaire (incluant RP et NU)
  const ALL_HORAIRE_CODES = SERVICE_CODES.map(c => c.code);

  // Liste des codes statut congé
  const STATUT_CONGE_LIST = ['C', 'C?', 'CNA'];

  // Fermer le dropdown PCD quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pcdButtonRef.current && !pcdButtonRef.current.contains(event.target)) {
        setShowPcdDropdown(false);
      }
    };

    if (showPcdDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPcdDropdown]);

  // Initialiser les états avec les données existantes
  useEffect(() => {
    if (cellData) {
      console.log('📦 CellData reçu:', JSON.stringify(cellData, null, 2));
      
      // === INITIALISER STATUT CONGÉ ===
      setTempStatutConge(cellData.statut_conge || cellData.statutConge || '');
      
      // Déterminer si c'est un texte libre
      const hasExplicitTexteLibre = cellData.texteLibre && cellData.texteLibre.trim() !== '';
      const isNonStandardService = cellData.service && 
        cellData.service !== 'LIBRE' && 
        !ALL_HORAIRE_CODES.includes(cellData.service) &&
        !ALL_CATEGORIE_CODES.includes(cellData.service) &&
        !PCD_POSTE_CODES.includes(cellData.service) &&
        !STATUT_CONGE_LIST.includes(cellData.service);

      if (hasExplicitTexteLibre) {
        setTempService('');
        setTempCategorie('LIBRE');
        setTempTexteLibre(cellData.texteLibre);
      } else if (isNonStandardService) {
        setTempService('');
        setTempCategorie('LIBRE');
        setTempTexteLibre(cellData.service);
      } else if (cellData.service === 'LIBRE') {
        setTempService('');
        setTempCategorie('LIBRE');
        setTempTexteLibre('');
      } else {
        // Analyser le service stocké
        const storedService = cellData.service || '';
        
        // Vérifier si c'est un ancien code congé (migration)
        if (STATUT_CONGE_LIST.includes(storedService)) {
          // Migration : ancien format où C/C?/CNA était dans service_code
          setTempService('');
          setTempCategorie('');
          if (!cellData.statut_conge && !cellData.statutConge) {
            setTempStatutConge(storedService);
          }
        }
        // Vérifier si c'est un horaire simple
        else if (ALL_HORAIRE_CODES.includes(storedService)) {
          setTempService(storedService);
          setTempCategorie('');
        }
        // Vérifier si c'est une catégorie
        else if (ALL_CATEGORIE_CODES.includes(storedService)) {
          setTempService('');
          setTempCategorie(storedService);
        }
        // Combinaison potentielle (ex: "FO RC -" ou "MA O")
        else if (storedService.includes(' ')) {
          const parts = storedService.split(' ');
          const lastPart = parts[parts.length - 1];
          const firstParts = parts.slice(0, -1).join(' ');
          
          if (ALL_HORAIRE_CODES.includes(lastPart)) {
            setTempService(lastPart);
            setTempCategorie(firstParts);
          } else {
            // Peut-être code comme "FO RC"
            setTempService('');
            setTempCategorie(storedService);
          }
        } else {
          setTempService(storedService);
          setTempCategorie('');
        }
        setTempTexteLibre('');
      }
      
      setTempPoste(cellData.poste || '');
      setTempNote(cellData.note || '');
      setTempPostesSupplementaires(cellData.postesSupplementaires || []);
    } else {
      setTempService('');
      setTempCategorie('');
      setTempPoste('');
      setTempNote('');
      setTempTexteLibre('');
      setTempPostesSupplementaires([]);
      setTempStatutConge('');
    }
    // Reset édition multiple et recherche
    setApplyToMultipleDays(false);
    setStartDate('');
    setEndDate('');
    setDateRangeWarning('');
    setSearchTerm('');
    setShowPcdDropdown(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellData, selectedCell]);

  // === INITIALISER LA DATE DE DÉPART QUAND ON ACTIVE L'ÉDITION MULTIPLE ===
  useEffect(() => {
    if (applyToMultipleDays && selectedCell && !startDate) {
      const monthIndex = MONTHS.indexOf(currentMonth);
      const month = String(monthIndex + 1).padStart(2, '0');
      const day = String(selectedCell.day).padStart(2, '0');
      setStartDate(`${currentYear}-${month}-${day}`);
    }
  }, [applyToMultipleDays, selectedCell, currentMonth, currentYear, startDate]);

  // useEffect pour validation automatique de la plage de dates
  useEffect(() => {
    if (applyToMultipleDays && startDate && endDate) {
      const [, , startDay] = startDate.split('-').map(Number);
      const [, , endDay] = endDate.split('-').map(Number);
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
    } else if (applyToMultipleDays && startDate && !endDate) {
      setDateRangeWarning('');
    } else {
      setDateRangeWarning('');
    }
  }, [startDate, endDate, applyToMultipleDays]);

  if (!selectedCell) return null;

  // === FONCTIONS HELPER ===
  
  const getDaysInMonth = (month, year) => {
    const monthIndex = MONTHS.indexOf(month);
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const handleQuickDateRange = (days) => {
    // Utiliser startDate si défini, sinon la date de la cellule
    let baseDay;
    if (startDate) {
      const [, , d] = startDate.split('-').map(Number);
      baseDay = d;
    } else {
      baseDay = selectedCell.day;
    }
    
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    
    let targetDay;
    if (days === 'end') {
      targetDay = daysInMonth;
    } else {
      targetDay = Math.min(baseDay + days - 1, daysInMonth);
    }
    
    const monthIndex = MONTHS.indexOf(currentMonth);
    const month = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(targetDay).padStart(2, '0');
    const dateStr = `${currentYear}-${month}-${dayStr}`;
    
    setEndDate(dateStr);
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
  const hasPosteSelector = GROUPES_AVEC_POSTE.some(g => agentGroup?.includes(g) || agentGroup === g);

  const getAvailablePostes = () => {
    for (const [groupeKey, postes] of Object.entries(POSTES_PAR_GROUPE)) {
      if (agentGroup?.includes(groupeKey) || agentGroup === groupeKey) {
        return postes;
      }
    }
    return POSTES_CODES;
  };

  const availablePostes = getAvailablePostes();

  const getPosteLabel = () => {
    if (agentGroup?.includes('RC - ROULEMENT REGULATEUR CENTRE')) return 'Poste (RC)';
    if (agentGroup?.includes('EAC - APPORT DENFERT')) return 'Poste (EAC)';
    return 'Poste (Réserve)';
  };

  // Fonction pour obtenir la couleur d'un code
  const getModalColor = (code, isSelected) => {
    const baseColor = MODAL_COLORS[code] || 'bg-gray-100 text-gray-700';
    if (isSelected) {
      return `ring-2 ring-blue-500 ${baseColor}`;
    }
    return `${baseColor} hover:opacity-80`;
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

  // Sélection d'un horaire
  const selectHoraire = (code) => {
    if (tempService === code) {
      setTempService(''); // Désélectionner
    } else {
      setTempService(code);
    }
  };

  // Sélection d'une catégorie
  const selectCategorie = (code) => {
    if (tempCategorie === code) {
      setTempCategorie(''); // Désélectionner
    } else {
      setTempCategorie(code);
      // Si on sélectionne une catégorie autre que LIBRE, effacer le texte libre
      if (code !== 'LIBRE') {
        setTempTexteLibre('');
      }
    }
  };

  // === SÉLECTION STATUT CONGÉ ===
  const selectStatutConge = (code) => {
    if (tempStatutConge === code) {
      setTempStatutConge(''); // Désélectionner
    } else {
      setTempStatutConge(code);
    }
  };

  // Toggle section accordéon
  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Vérifier si le poste sélectionné est un code PCD
  const isPcdPosteSelected = PCD_POSTE_CODES.includes(tempPoste);

  // Sélection d'un poste PCD depuis le dropdown
  const selectPcdPoste = (code) => {
    setTempPoste(tempPoste === code ? '' : code);
    setShowPcdDropdown(false);
  };

  // Toggle le dropdown PCD
  const togglePcdDropdown = () => {
    setShowPcdDropdown(!showPcdDropdown);
  };

  // === FILTRAGE PAR RECHERCHE ===
  const filterBySearch = (codes) => {
    if (!searchTerm.trim()) return codes;
    const term = searchTerm.toUpperCase().trim();
    return codes.filter(({ code, desc }) => 
      code.toUpperCase().includes(term) || desc.toUpperCase().includes(term)
    );
  };

  // Vérifier si une catégorie a des résultats de recherche
  const hasSearchResults = (codes) => {
    if (!searchTerm.trim()) return true;
    return filterBySearch(codes).length > 0;
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
      setTempCategorie('LIBRE');
    }
    setShowTexteLibreModal(false);
  };

  const handleCancelTexteLibre = () => {
    setTexteLibreInput('');
    setShowTexteLibreModal(false);
  };

  const selectTexteLibre = () => {
    if (tempTexteLibre) {
      openEditTexteLibreModal();
    } else {
      setTempCategorie('LIBRE');
      openAddTexteLibreModal();
    }
  };

  // === GESTION CROISEMENT ===
  const openCroisementModal = () => {
    setSelectedCroisementAgent(null);
    setCroisementSearch('');
    setShowCroisementModal(true);
  };

  const closeCroisementModal = () => {
    setShowCroisementModal(false);
    setSelectedCroisementAgent(null);
    setCroisementSearch('');
  };

  const getFilteredAgentsForCroisement = () => {
    const allAgentsList = Object.values(agentsData).flat();
    return allAgentsList.filter(agent => {
      const fullName = `${agent.nom} ${agent.prenom}`;
      if (fullName === selectedCell.agent) return false;
      if (croisementSearch) {
        const search = croisementSearch.toLowerCase();
        return fullName.toLowerCase().includes(search);
      }
      return true;
    });
  };

  const findPlanningKey = (agentName) => {
    if (!allPlanning || !agentName) return null;
    if (allPlanning[agentName] !== undefined) return agentName;
    const normalizedSearch = agentName.trim().toLowerCase();
    return Object.keys(allPlanning).find(key => 
      key.trim().toLowerCase() === normalizedSearch
    ) || null;
  };

  const getAgentPlanningForDay = (agentName, day) => {
    const planningKey = findPlanningKey(agentName);
    if (!planningKey) return null;
    const agentData = allPlanning[planningKey];
    let cellValue = agentData?.[day] || agentData?.[String(day)] || agentData?.[Number(day)];
    if (!cellValue) return null;
    if (typeof cellValue === 'string') {
      return { service: cellValue, poste: null, note: null, postesSupplementaires: null, statut_conge: null };
    }
    return {
      service: cellValue.service || null,
      poste: cellValue.poste || null,
      note: cellValue.note || null,
      postesSupplementaires: cellValue.postesSupplementaires || null,
      texteLibre: cellValue.texteLibre || null,
      statut_conge: cellValue.statut_conge || null
    };
  };

  const findAgentId = (fullName) => {
    for (const agents of Object.values(agentsData)) {
      const agent = agents.find(a => `${a.nom} ${a.prenom}` === fullName);
      if (agent) return agent.id;
    }
    return null;
  };

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
        texteLibre: agent2Data.texteLibre || '',
        statut_conge: agent2Data.statut_conge || ''
      };

      const newAgent2Data = {
        service: agent1Data.service || buildFinalService(),
        poste: agent1Data.poste || tempPoste || '',
        postesSupplementaires: agent1Data.postesSupplementaires || tempPostesSupplementaires || [],
        note: `Croisement avec ${agent1Name}`,
        texteLibre: agent1Data.texteLibre || tempTexteLibre || '',
        statut_conge: agent1Data.statut_conge || tempStatutConge || ''
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

  // === CONSTRUCTION DU SERVICE FINAL ===
  const buildFinalService = () => {
    // Texte libre
    if (tempCategorie === 'LIBRE' && tempTexteLibre) {
      return 'LIBRE';
    }
    
    // Catégorie seule (ex: MA, FO RC)
    if (tempCategorie && !tempService) {
      return tempCategorie;
    }
    
    // Horaire seul (ex: -, O, X, RP)
    if (tempService && !tempCategorie) {
      return tempService;
    }
    
    // Combinaison catégorie + horaire (ex: "MA O", "FO RC -")
    if (tempCategorie && tempService) {
      return `${tempCategorie} ${tempService}`;
    }
    
    return '';
  };

  const handleSave = async () => {
    const finalService = buildFinalService();
    const hasValidTexteLibre = tempTexteLibre && tempTexteLibre.trim() !== '';
    const isTexteLibre = tempCategorie === 'LIBRE' && hasValidTexteLibre;
    
    console.log('💾 Sauvegarde - tempService:', tempService);
    console.log('💾 Sauvegarde - tempCategorie:', tempCategorie);
    console.log('💾 Sauvegarde - finalService:', finalService);
    console.log('💾 Sauvegarde - tempPoste:', tempPoste);
    console.log('💾 Sauvegarde - tempStatutConge:', tempStatutConge);
    
    let planningData;
    
    // Toujours créer un objet si statut_conge est défini
    if (tempPoste || tempPostesSupplementaires.length > 0 || tempNote || isTexteLibre || tempStatutConge) {
      planningData = { 
        service: finalService,
        ...(tempPoste && { poste: tempPoste }),
        ...(tempPostesSupplementaires.length > 0 && { postesSupplementaires: tempPostesSupplementaires }),
        ...(tempNote && { note: tempNote }),
        ...(isTexteLibre && { texteLibre: tempTexteLibre.trim() }),
        ...(tempStatutConge && { statut_conge: tempStatutConge })
      };
    } else {
      planningData = finalService;
    }
    
    // === GESTION ÉDITION MULTIPLE ===
    if (applyToMultipleDays && startDate && endDate) {
      const [, , startDay] = startDate.split('-').map(Number);
      const [, , endDay] = endDate.split('-').map(Number);
      
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

  // === EFFACEMENT AVEC PRÉSERVATION NOTE PRIVÉE ===
  const handleDelete = async () => {
    // Récupérer la note privée existante
    const existingNotePrivee = cellData?.note_privee || cellData?.notePrivee || '';
    
    if (existingNotePrivee) {
      // Si note privée existe, la conserver
      if (!window.confirm('Effacer cette entrée ?\n\n(Votre note privée sera conservée)')) return;
      
      try {
        await onUpdateCell(selectedCell.agent, selectedCell.day, {
          service: null,
          poste: null,
          postesSupplementaires: null,
          note: null,
          texteLibre: null,
          statut_conge: null,
          note_privee: existingNotePrivee
        });
      } catch (error) {
        console.error('Erreur suppression avec note privée:', error);
        alert('Erreur lors de la suppression');
        return;
      }
    } else {
      // Pas de note privée, suppression complète
      await onUpdateCell(selectedCell.agent, selectedCell.day, '');
    }
    
    onClose();
  };

  const hasExistingNote = Boolean(tempNote);
  const hasExistingTexteLibre = Boolean(tempTexteLibre && tempTexteLibre.trim() !== '');
  const hasExistingPostesSupp = tempPostesSupplementaires.length > 0;
  const hasCroisementNote = tempNote?.toLowerCase().includes('croisement avec');

  // Aperçu du service final
  const previewService = buildFinalService();

  // === COMPOSANT ACCORDÉON ===
  const AccordionSection = ({ id, title, colorClass, children, isOpen, onToggle, badge }) => (
    <div className="mb-3">
      <button 
        onClick={() => onToggle(id)}
        className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
          isOpen ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          <span className={`w-3 h-3 ${colorClass} rounded`}></span>
          <span className="text-sm font-medium text-gray-700">{title}</span>
          {badge && <span className="text-xs text-gray-400 ml-1">({badge})</span>}
        </div>
      </button>
      {isOpen && (
        <div className="mt-2 pl-2">
          {children}
        </div>
      )}
    </div>
  );

  // === RENDU DES BOUTONS DE CODE ===
  const renderCodeButtons = (codes, onClick, isSelectedFn, cols = 4) => {
    const filteredCodes = filterBySearch(codes);
    if (filteredCodes.length === 0) {
      return <p className="text-xs text-gray-400 italic py-2">Aucun résultat pour "{searchTerm}"</p>;
    }
    return (
      <div className={`grid grid-cols-${cols} gap-2`}>
        {filteredCodes.map(({ code, desc }) => (
          <button
            key={code}
            onClick={() => onClick(code)}
            className={`p-2 rounded text-center text-xs transition-all ${getModalColor(code, isSelectedFn(code))}`}
          >
            <div className="font-semibold">{code}</div>
            <div className="text-[10px] mt-0.5">{desc}</div>
          </button>
        ))}
      </div>
    );
  };

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
              {/* Aperçu du service */}
              {(previewService || tempStatutConge) && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="text-xs text-blue-600 font-medium">Aperçu : </span>
                  <span className="text-sm font-semibold text-blue-800">{previewService || '-'}</span>
                  {tempPoste && <span className="text-xs text-gray-600 ml-2">/ {tempPoste}</span>}
                  {tempStatutConge && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${MODAL_COLORS[tempStatutConge]}`}>
                      {tempStatutConge}
                    </span>
                  )}
                  {hasExistingTexteLibre && <span className="text-xs text-purple-600 ml-2">({tempTexteLibre})</span>}
                </div>
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
          
          {/* === BARRE DE RECHERCHE === */}
          <div className="mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un code (ex: FO, MA, VL...)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                style={{ color: '#333' }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* === SECTION HORAIRES (TOUJOURS VISIBLE - jamais filtrée) === */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Horaires</label>
            <div className="grid grid-cols-6 gap-2">
              {SERVICE_CODES.map(({ code, desc }) => (
                <button
                  key={code}
                  onClick={() => selectHoraire(code)}
                  className={`p-2 rounded text-center text-xs transition-all ${getModalColor(code, tempService === code)}`}
                >
                  <div className="font-semibold">{code}</div>
                  <div className="text-[10px] mt-0.5 leading-tight">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* === SECTION STATUT CONGÉ (NOUVEAU - combinable) === */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs font-semibold">Congés</span>
                <span>Statut congé</span>
                <span className="text-xs text-gray-500 font-normal">(combinable avec horaire/poste)</span>
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {STATUT_CONGE_CODES.filter(c => c.code !== '').map(({ code, desc }) => (
                <button
                  key={code}
                  onClick={() => selectStatutConge(code)}
                  className={`p-3 rounded text-center text-sm transition-all ${getModalColor(code, tempStatutConge === code)}`}
                >
                  <div className="font-semibold">{code}</div>
                  <div className="text-xs mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
            {tempStatutConge && (
              <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                <span className="text-xs text-yellow-700">
                  Statut congé sélectionné : <span className="font-semibold">{tempStatutConge}</span>
                  {tempService && <span className="ml-1"> (combiné avec {tempService})</span>}
                </span>
              </div>
            )}
          </div>

          {/* === SECTION POSTE RÉSERVE (AVEC BOUTON PCD ET DROPDOWN) === */}
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
                
                {/* === BOUTON PCD AVEC DROPDOWN === */}
                <div className="relative" ref={pcdButtonRef}>
                  <button
                    onClick={togglePcdDropdown}
                    className={`w-full p-2 rounded text-center text-xs transition-all flex items-center justify-center gap-1 ${
                      isPcdPosteSelected
                        ? 'ring-2 ring-blue-500 bg-cyan-200 text-cyan-800 font-semibold'
                        : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200'
                    }`}
                  >
                    <span>{isPcdPosteSelected ? tempPoste : 'PCD'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showPcdDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* Dropdown PCD */}
                  {showPcdDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-cyan-300 rounded-lg shadow-lg z-10 overflow-hidden">
                      {PCD_POSTE_CODES.map(code => (
                        <button
                          key={code}
                          onClick={() => selectPcdPoste(code)}
                          className={`w-full px-3 py-2 text-xs text-left transition-colors ${
                            tempPoste === code
                              ? 'bg-cyan-200 text-cyan-900 font-semibold'
                              : 'bg-white text-cyan-800 hover:bg-cyan-100'
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Indicateur poste PCD sélectionné */}
              {isPcdPosteSelected && (
                <div className="mt-2 p-2 bg-cyan-50 rounded border border-cyan-200">
                  <span className="text-xs text-cyan-700">
                    Poste PCD sélectionné : <span className="font-semibold">{tempPoste}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* === SECTION ABSENCES (MA, F) === */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Absences <span className="text-xs text-gray-500">(combinable avec horaire)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ABSENCES_CODES.map(({ code, desc }) => (
                <button
                  key={code}
                  onClick={() => selectCategorie(code)}
                  className={`p-3 rounded text-center text-sm transition-all ${getModalColor(code, tempCategorie === code)}`}
                >
                  <div className="font-semibold">{code}</div>
                  <div className="text-xs mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* === BOUTON TEXTE LIBRE (TOUJOURS VISIBLE) === */}
          <div className="mb-4">
            <button
              onClick={selectTexteLibre}
              className={`w-full p-3 rounded text-center text-sm transition-all ${
                tempCategorie === 'LIBRE'
                  ? 'ring-2 ring-purple-500 bg-purple-100 text-purple-800'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-2 border-dashed border-purple-300'
              }`}
            >
              <div className="font-semibold flex items-center justify-center gap-2">
                <Type className="w-4 h-4" />
                TEXTE LIBRE
              </div>
              {hasExistingTexteLibre && (
                <div className="text-xs mt-1 text-purple-600">Actuel : {tempTexteLibre}</div>
              )}
            </button>
          </div>

          {/* === SECTIONS ACCORDÉON (FERMÉES PAR DÉFAUT, FILTRABLES) === */}
          
          {/* Service de jour */}
          {hasSearchResults(SERVICE_JOUR_CODES) && (
            <AccordionSection 
              id="serviceJour" 
              title="Service de jour" 
              colorClass="bg-blue-200"
              isOpen={openSections.serviceJour || searchTerm.trim() !== ''}
              onToggle={toggleSection}
              badge="VL, D, EIA..."
            >
              {renderCodeButtons(SERVICE_JOUR_CODES, selectCategorie, (code) => tempCategorie === code, 4)}
            </AccordionSection>
          )}

          {/* Habilitation/Formation */}
          {hasSearchResults(HABILITATION_CODES) && (
            <AccordionSection 
              id="habilitation" 
              title="Habilitation / Formation" 
              colorClass="bg-orange-200"
              isOpen={openSections.habilitation || searchTerm.trim() !== ''}
              onToggle={toggleSection}
              badge="HAB, FO..."
            >
              {renderCodeButtons(HABILITATION_CODES, selectCategorie, (code) => tempCategorie === code, 4)}
            </AccordionSection>
          )}

          {/* Jours RH */}
          {hasSearchResults(JOURS_RH_CODES) && (
            <AccordionSection 
              id="joursRH" 
              title="Jours RH" 
              colorClass="bg-yellow-200"
              isOpen={openSections.joursRH || searchTerm.trim() !== ''}
              onToggle={toggleSection}
              badge="VT, D2I, RU..."
            >
              {renderCodeButtons(JOURS_RH_CODES, selectCategorie, (code) => tempCategorie === code, 5)}
            </AccordionSection>
          )}

          {/* Section Postes supplémentaires */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postes figés / Postes supplémentaires 
              <span className="text-xs text-gray-500 ml-2">(sélection multiple possible)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
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
                    <div className="text-[10px] mt-0.5 not-italic">{desc.replace('Poste ', '').replace(' supplémentaire', '')}</div>
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
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={openCroisementModal}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border-2 bg-purple-100 border-purple-400 text-purple-800 hover:bg-purple-200 transition-all"
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
              color: '#374151',
              marginBottom: '8px'
            }}>
              <input
                type="checkbox"
                checked={applyToMultipleDays}
                onChange={(e) => setApplyToMultipleDays(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <Calendar size={16} style={{ color: '#0066b3' }} />
              <span>Appliquer à plusieurs jours</span>
            </label>

            {applyToMultipleDays && (
              <div style={{ marginTop: '12px', paddingLeft: '4px' }}>
                {/* Date de départ - maintenant modifiable */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ color: '#6b7280', fontSize: '13px', minWidth: '45px' }}>Du :</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={(() => {
                      const monthIndex = MONTHS.indexOf(currentMonth);
                      const month = String(monthIndex + 1).padStart(2, '0');
                      return `${currentYear}-${month}-01`;
                    })()}
                    max={(() => {
                      const monthIndex = MONTHS.indexOf(currentMonth);
                      const month = String(monthIndex + 1).padStart(2, '0');
                      const daysInMonth = getDaysInMonth(currentMonth, currentYear);
                      return `${currentYear}-${month}-${String(daysInMonth).padStart(2, '0')}`;
                    })()}
                    style={{
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid #0066b3',
                      borderRadius: '6px',
                      color: '#374151',
                      fontSize: '13px',
                      flex: 1,
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {/* Date de fin */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ color: '#6b7280', fontSize: '13px', minWidth: '45px' }}>Au :</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || (() => {
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
                      background: '#fff',
                      border: '1px solid #0066b3',
                      borderRadius: '6px',
                      color: '#374151',
                      fontSize: '13px',
                      flex: 1,
                      cursor: 'pointer'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
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
                        background: '#e0f2fe',
                        border: '1px solid #0066b3',
                        borderRadius: '6px',
                        color: '#0066b3',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {dateRangeWarning && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: dateRangeWarning.startsWith('❌') 
                      ? '#fef2f2'
                      : dateRangeWarning.startsWith('⚠️')
                      ? '#fffbeb'
                      : '#f0fdf4',
                    border: `1px solid ${
                      dateRangeWarning.startsWith('❌')
                        ? '#fecaca'
                        : dateRangeWarning.startsWith('⚠️')
                        ? '#fde68a'
                        : '#bbf7d0'
                    }`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: dateRangeWarning.startsWith('❌')
                      ? '#dc2626'
                      : dateRangeWarning.startsWith('⚠️')
                      ? '#d97706'
                      : '#16a34a'
                  }}>
                    <AlertCircle size={14} />
                    <span>{dateRangeWarning}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-between pt-4 border-t mt-4">
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">
              Effacer
            </button>
            <div className="flex space-x-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
                Annuler
              </button>
              <button 
                onClick={handleSave}
                disabled={!tempService && !tempCategorie && !tempPoste && !tempStatutConge}
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
                style={{ color: '#333' }}
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
                style={{ color: '#333' }}
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
                  style={{ color: '#333' }}
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
                      {previewService || '-'}
                      {tempPoste && ` / ${tempPoste}`}
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
