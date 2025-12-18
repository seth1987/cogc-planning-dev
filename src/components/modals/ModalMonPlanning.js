import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Palette, Search, X, ChevronDown, ChevronRight, Type, Check, Edit3, StickyNote, Trash2, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { 
  SERVICE_CODES, 
  POSTES_CODES, 
  POSTES_SUPPLEMENTAIRES, 
  GROUPES_AVEC_POSTE, 
  POSTES_PAR_GROUPE,
  SERVICE_JOUR_CODES,
  HABILITATION_CODES,
  JOURS_RH_CODES,
  ABSENCES_CODES,
  STATUT_CONGE_CODES,
  PCD_CODES
} from '../../constants/config';
import { getPaieType, PAIE_ICONS } from '../../constants/paie2026';
import useColors from '../../hooks/useColors';
import ModalCouleurs from './ModalCouleurs';

/**
 * ModalMonPlanning - Calendrier personnel de l'agent connecté
 * 
 * Affiche un calendrier mensuel avec les services de l'agent.
 * Permet de modifier ses propres services avec les MÊMES OPTIONS que le planning général.
 * 
 * v3.0 - REFONTE COMPLÈTE : Alignement éditeur avec ModalCellEdit
 *   - Barre de recherche
 *   - Sections accordéon (Service jour, Habilitation, Jours RH)
 *   - Absences séparées (MA, F)
 *   - Texte libre
 *   - Dropdown PCD pour réserves
 *   - Section Notes améliorée
 * 
 * v3.1 - Icônes paie 2026 (Digiposte/Virement) en coin supérieur droit (14×14px)
 * 
 * v3.2 - NOTE PRIVÉE
 *   - Nouveau champ note_privee (TEXT) visible uniquement dans Mon Planning
 *   - Icône Lock (🔒) grise en coin inférieur gauche si note privée existe
 *   - Indépendante du service : peut exister sans horaire défini
 *   - Non effacée par le bouton "Effacer" de la case
 *   - Bouton dédié "Effacer note privée" pour suppression
 */

// Couleurs pour les statuts congé
const STATUT_CONGE_COLORS = {
  'C': { bg: '#facc15', text: '#713f12' },
  'C?': { bg: '#fef08a', text: '#854d0e' },
  'CNA': { bg: '#fca5a5', text: '#991b1b' }
};

// Couleurs pour la modal d'édition
const MODAL_COLORS = {
  '-': { bg: '#f3f4f6', text: '#374151' },
  'O': { bg: '#f3f4f6', text: '#374151' },
  'X': { bg: '#f3f4f6', text: '#374151' },
  'I': { bg: '#f3f4f6', text: '#374151' },
  'RP': { bg: '#dcfce7', text: '#166534' },
  'NU': { bg: '#e5e7eb', text: '#6b7280' },
  'MA': { bg: '#fecaca', text: '#991b1b' },
  'F': { bg: '#e9d5ff', text: '#6b21a8' },
  'C': { bg: '#facc15', text: '#713f12' },
  'C?': { bg: '#fef08a', text: '#854d0e' },
  'CNA': { bg: '#fca5a5', text: '#991b1b' },
  'VL': { bg: '#dbeafe', text: '#1e40af' },
  'D': { bg: '#dbeafe', text: '#1e40af' },
  'EIA': { bg: '#dbeafe', text: '#1e40af' },
  'DPX': { bg: '#dbeafe', text: '#1e40af' },
  'PSE': { bg: '#dbeafe', text: '#1e40af' },
  'INAC': { bg: '#dbeafe', text: '#1e40af' },
  'VM': { bg: '#dbeafe', text: '#1e40af' },
  'HAB': { bg: '#fed7aa', text: '#9a3412' },
  'FO RO': { bg: '#fed7aa', text: '#9a3412' },
  'FO RC': { bg: '#fed7aa', text: '#9a3412' },
  'FO CAC': { bg: '#fed7aa', text: '#9a3412' },
  'FO CRC': { bg: '#fed7aa', text: '#9a3412' },
  'FO ACR': { bg: '#fed7aa', text: '#9a3412' },
  'FO CCU': { bg: '#fed7aa', text: '#9a3412' },
  'VT': { bg: '#fef9c3', text: '#854d0e' },
  'D2I': { bg: '#fef9c3', text: '#854d0e' },
  'RU': { bg: '#fef9c3', text: '#854d0e' },
  'RA': { bg: '#fef9c3', text: '#854d0e' },
  'RN': { bg: '#fef9c3', text: '#854d0e' },
  'RQ': { bg: '#fef9c3', text: '#854d0e' },
  'TY': { bg: '#fef9c3', text: '#854d0e' },
  'AY': { bg: '#fef9c3', text: '#854d0e' },
  'AH': { bg: '#fef9c3', text: '#854d0e' },
  'DD': { bg: '#fef9c3', text: '#854d0e' },
  'CCCBO': { bg: '#a5f3fc', text: '#0e7490' },
  'CBVD': { bg: '#a5f3fc', text: '#0e7490' }
};

// Codes PCD pour le sous-menu
const PCD_POSTE_CODES = ['CCCBO', 'CBVD'];

const ModalMonPlanning = ({ isOpen, onClose, currentUser, onUpdate, initialYear }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    if (initialYear) {
      return new Date(initialYear, now.getMonth(), 1);
    }
    return now;
  });
  const [planningData, setPlanningData] = useState({});
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  
  const { colors, getServiceColor, reloadColors } = useColors('perso', currentUser?.email);
  const [showColorModal, setShowColorModal] = useState(false);
  
  const hasChanges = useRef(false);
  
  // === ÉTATS ÉDITION (ALIGNÉS AVEC ModalCellEdit) ===
  const [editMode, setEditMode] = useState(false);
  const [tempService, setTempService] = useState('');       // Horaire (-, O, X, I, RP, NU)
  const [tempCategorie, setTempCategorie] = useState('');   // Catégorie (MA, F, VL, HAB, etc.)
  const [tempPoste, setTempPoste] = useState('');
  const [tempPostesSupplementaires, setTempPostesSupplementaires] = useState([]);
  const [tempStatutConge, setTempStatutConge] = useState('');
  const [tempNote, setTempNote] = useState('');
  const [tempTexteLibre, setTempTexteLibre] = useState('');
  const [tempNotePrivee, setTempNotePrivee] = useState('');  // v3.2: Note privée
  
  // === ÉTATS RECHERCHE ET ACCORDÉONS ===
  const [searchTerm, setSearchTerm] = useState('');
  const [openSections, setOpenSections] = useState({
    serviceJour: false,
    habilitation: false,
    joursRH: false
  });
  
  // === ÉTAT DROPDOWN PCD ===
  const [showPcdDropdown, setShowPcdDropdown] = useState(false);
  const pcdButtonRef = useRef(null);
  
  // === ÉTATS MODALES SECONDAIRES ===
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isNoteEditMode, setIsNoteEditMode] = useState(false);
  const [showTexteLibreModal, setShowTexteLibreModal] = useState(false);
  const [texteLibreInput, setTexteLibreInput] = useState('');
  const [isTexteLibreEditMode, setIsTexteLibreEditMode] = useState(false);
  
  // === ÉTATS MODAL NOTE PRIVÉE (v3.2) ===
  const [showNotePriveeModal, setShowNotePriveeModal] = useState(false);
  const [notePriveeInput, setNotePriveeInput] = useState('');
  const [isNotePriveeEditMode, setIsNotePriveeEditMode] = useState(false);

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Liste de tous les codes catégorie
  const ALL_CATEGORIE_CODES = [
    ...SERVICE_JOUR_CODES.map(c => c.code),
    ...HABILITATION_CODES.map(c => c.code),
    ...JOURS_RH_CODES.map(c => c.code),
    ...ABSENCES_CODES.map(c => c.code)
  ];

  const ALL_HORAIRE_CODES = SERVICE_CODES.map(c => c.code);

  // Fermer dropdown PCD au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pcdButtonRef.current && !pcdButtonRef.current.contains(event.target)) {
        setShowPcdDropdown(false);
      }
    };
    if (showPcdDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPcdDropdown]);

  // Charger les infos agent
  const loadAgentInfo = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('email', currentUser.email)
        .single();
      if (error) throw error;
      setAgentInfo(data);
    } catch (err) {
      console.error('Erreur chargement agent:', err);
    }
  }, [currentUser]);

  // Charger le planning du mois
  const loadPlanning = useCallback(async () => {
    if (!agentInfo?.id) return;
    setLoading(true);
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;

      const { data, error } = await supabase
        .from('planning')
        .select('*')
        .eq('agent_id', agentInfo.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const dataByDate = {};
      (data || []).forEach(entry => {
        dataByDate[entry.date] = entry;
      });
      setPlanningData(dataByDate);
    } catch (err) {
      console.error('Erreur chargement planning:', err);
    } finally {
      setLoading(false);
    }
  }, [agentInfo, currentMonth, currentYear]);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      if (initialYear) {
        setCurrentDate(new Date(initialYear, now.getMonth(), 1));
      } else {
        setCurrentDate(now);
      }
      loadAgentInfo();
      hasChanges.current = false;
    }
  }, [isOpen, loadAgentInfo, initialYear]);

  useEffect(() => {
    if (agentInfo) loadPlanning();
  }, [agentInfo, loadPlanning]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
    setEditMode(false);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
    setEditMode(false);
  };

  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, currentMonth: false, date: null });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, currentMonth: true, date: dateStr, planning: planningData[dateStr] || null });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, currentMonth: false, date: null });
    }
    return days;
  };

  // === OUVERTURE ÉDITEUR ===
  const handleDayClick = (dayInfo) => {
    if (!dayInfo.currentMonth) return;
    setSelectedDay(dayInfo);
    setEditMode(true);
    
    const existing = dayInfo.planning;
    setTempStatutConge(existing?.statut_conge || '');
    setTempPoste(existing?.poste_code || '');
    setTempPostesSupplementaires(existing?.postes_supplementaires || []);
    setTempNote(existing?.commentaire || '');
    setTempNotePrivee(existing?.note_privee || '');  // v3.2: Charger note privée
    
    // Analyser le service stocké
    const storedService = existing?.service_code || '';
    const storedTexteLibre = existing?.texte_libre || '';
    
    if (storedTexteLibre) {
      setTempService('');
      setTempCategorie('LIBRE');
      setTempTexteLibre(storedTexteLibre);
    } else if (storedService === 'LIBRE') {
      setTempService('');
      setTempCategorie('LIBRE');
      setTempTexteLibre('');
    } else if (ALL_HORAIRE_CODES.includes(storedService)) {
      setTempService(storedService);
      setTempCategorie('');
      setTempTexteLibre('');
    } else if (ALL_CATEGORIE_CODES.includes(storedService)) {
      setTempService('');
      setTempCategorie(storedService);
      setTempTexteLibre('');
    } else if (storedService.includes(' ')) {
      const parts = storedService.split(' ');
      const lastPart = parts[parts.length - 1];
      const firstParts = parts.slice(0, -1).join(' ');
      if (ALL_HORAIRE_CODES.includes(lastPart)) {
        setTempService(lastPart);
        setTempCategorie(firstParts);
      } else {
        setTempService('');
        setTempCategorie(storedService);
      }
      setTempTexteLibre('');
    } else {
      setTempService(storedService);
      setTempCategorie('');
      setTempTexteLibre('');
    }
    
    // Reset recherche et accordéons
    setSearchTerm('');
    setOpenSections({ serviceJour: false, habilitation: false, joursRH: false });
    setShowPcdDropdown(false);
  };

  const closeEditor = () => {
    setSelectedDay(null);
    setEditMode(false);
    setTempService('');
    setTempCategorie('');
    setTempPoste('');
    setTempPostesSupplementaires([]);
    setTempNote('');
    setTempStatutConge('');
    setTempTexteLibre('');
    setTempNotePrivee('');  // v3.2: Reset note privée
    setSearchTerm('');
  };

  const handleClose = () => {
    if (hasChanges.current && onUpdate) {
      onUpdate();
    }
    hasChanges.current = false;
    onClose();
  };

  const handleCloseColorModal = () => {
    setShowColorModal(false);
    reloadColors();
  };

  // === CONSTRUCTION SERVICE FINAL ===
  const buildFinalService = () => {
    if (tempCategorie === 'LIBRE' && tempTexteLibre) return 'LIBRE';
    if (tempCategorie && !tempService) return tempCategorie;
    if (tempService && !tempCategorie) return tempService;
    if (tempCategorie && tempService) return `${tempCategorie} ${tempService}`;
    return '';
  };

  // === SAUVEGARDE ===
  const saveEdit = async () => {
    if (!selectedDay || !agentInfo) return;

    const finalService = buildFinalService();
    const hasTexteLibre = tempCategorie === 'LIBRE' && tempTexteLibre.trim() !== '';

    try {
      const { error } = await supabase
        .from('planning')
        .upsert({
          agent_id: agentInfo.id,
          date: selectedDay.date,
          service_code: finalService || null,
          poste_code: tempPoste || null,
          postes_supplementaires: tempPostesSupplementaires.length > 0 ? tempPostesSupplementaires : null,
          commentaire: tempNote || null,
          statut_conge: tempStatutConge || null,
          texte_libre: hasTexteLibre ? tempTexteLibre.trim() : null,
          note_privee: tempNotePrivee || null,  // v3.2: Sauvegarder note privée
          updated_at: new Date().toISOString()
        }, { onConflict: 'agent_id,date' });

      if (error) throw error;

      hasChanges.current = true;
      await loadPlanning();
      closeEditor();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // v3.2: Effacer la case SANS effacer la note privée
  const deleteEntry = async () => {
    if (!selectedDay || !agentInfo) return;
    if (!window.confirm('Effacer cette entrée ? (La note privée sera conservée)')) return;

    try {
      // Si une note privée existe, on met à jour en gardant uniquement la note privée
      if (tempNotePrivee) {
        const { error } = await supabase
          .from('planning')
          .upsert({
            agent_id: agentInfo.id,
            date: selectedDay.date,
            service_code: null,
            poste_code: null,
            postes_supplementaires: null,
            commentaire: null,
            statut_conge: null,
            texte_libre: null,
            note_privee: tempNotePrivee,  // Conserver la note privée
            updated_at: new Date().toISOString()
          }, { onConflict: 'agent_id,date' });

        if (error) throw error;
      } else {
        // Pas de note privée, on peut supprimer complètement
        const { error } = await supabase
          .from('planning')
          .delete()
          .eq('agent_id', agentInfo.id)
          .eq('date', selectedDay.date);

        if (error) throw error;
      }

      hasChanges.current = true;
      await loadPlanning();
      closeEditor();
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  // === FONCTIONS HELPER ===
  const togglePosteSupp = (code) => {
    setTempPostesSupplementaires(prev => 
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  const selectHoraire = (code) => {
    setTempService(tempService === code ? '' : code);
  };

  const selectCategorie = (code) => {
    if (tempCategorie === code) {
      setTempCategorie('');
    } else {
      setTempCategorie(code);
      if (code !== 'LIBRE') setTempTexteLibre('');
    }
  };

  const selectStatutConge = (code) => {
    setTempStatutConge(tempStatutConge === code ? '' : code);
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasPosteSelector = () => {
    if (!agentInfo?.groupe) return false;
    return GROUPES_AVEC_POSTE.some(g => agentInfo.groupe.includes(g));
  };

  const getAvailablePostes = () => {
    if (!agentInfo?.groupe) return POSTES_CODES;
    for (const [groupeKey, postes] of Object.entries(POSTES_PAR_GROUPE)) {
      if (agentInfo.groupe.includes(groupeKey)) return postes;
    }
    return POSTES_CODES;
  };

  const isPcdPosteSelected = PCD_POSTE_CODES.includes(tempPoste);

  const selectPcdPoste = (code) => {
    setTempPoste(tempPoste === code ? '' : code);
    setShowPcdDropdown(false);
  };

  // === FILTRAGE RECHERCHE ===
  const filterBySearch = (codes) => {
    if (!searchTerm.trim()) return codes;
    const term = searchTerm.toUpperCase().trim();
    return codes.filter(({ code, desc }) => 
      code.toUpperCase().includes(term) || desc.toUpperCase().includes(term)
    );
  };

  const hasSearchResults = (codes) => {
    if (!searchTerm.trim()) return true;
    return filterBySearch(codes).length > 0;
  };

  // === GESTION NOTES ===
  const openAddNoteModal = () => {
    setNoteInput('');
    setIsNoteEditMode(false);
    setShowNoteModal(true);
  };

  const openEditNoteModal = () => {
    setNoteInput(tempNote);
    setIsNoteEditMode(true);
    setShowNoteModal(true);
  };

  const handleValidateNote = () => {
    setTempNote(noteInput.trim());
    setShowNoteModal(false);
  };

  const handleDeleteNote = () => {
    if (window.confirm('Supprimer cette note ?')) {
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

  const handleDeleteTexteLibre = () => {
    if (window.confirm('Supprimer ce texte libre ?')) {
      setTempTexteLibre('');
      setTempCategorie('');
    }
  };

  const selectTexteLibre = () => {
    if (tempTexteLibre) {
      openEditTexteLibreModal();
    } else {
      setTempCategorie('LIBRE');
      openAddTexteLibreModal();
    }
  };

  // === GESTION NOTE PRIVÉE (v3.2) ===
  const openAddNotePriveeModal = () => {
    setNotePriveeInput('');
    setIsNotePriveeEditMode(false);
    setShowNotePriveeModal(true);
  };

  const openEditNotePriveeModal = () => {
    setNotePriveeInput(tempNotePrivee);
    setIsNotePriveeEditMode(true);
    setShowNotePriveeModal(true);
  };

  const handleValidateNotePrivee = () => {
    setTempNotePrivee(notePriveeInput.trim());
    setShowNotePriveeModal(false);
  };

  const handleDeleteNotePrivee = () => {
    if (window.confirm('Supprimer cette note privée ?')) {
      setTempNotePrivee('');
    }
  };

  // === COULEURS CELLULES CALENDRIER ===
  const getCellBackgroundColor = (planning) => {
    if (planning?.statut_conge && !planning?.service_code) {
      return STATUT_CONGE_COLORS[planning.statut_conge]?.bg || 'rgba(255, 255, 255, 0.08)';
    }
    if (!planning?.service_code) return 'rgba(255, 255, 255, 0.08)';
    const code = planning.service_code.toUpperCase();
    const colorConfig = getServiceColor(code);
    if (!colorConfig || colorConfig.bg === 'transparent') return 'rgba(255, 255, 255, 0.08)';
    return colorConfig.bg;
  };

  const getCellTextColor = (planning) => {
    if (planning?.statut_conge && !planning?.service_code) {
      return STATUT_CONGE_COLORS[planning.statut_conge]?.text || 'white';
    }
    if (!planning?.service_code) return 'white';
    const code = planning.service_code.toUpperCase();
    const colorConfig = getServiceColor(code);
    if (!colorConfig || colorConfig.bg === 'transparent') return 'white';
    return colorConfig.text;
  };

  const renderCellContent = (planning) => {
    if (!planning) return null;
    
    const serviceCode = planning.service_code;
    const posteCode = planning.poste_code;
    const statutConge = planning.statut_conge;
    const postesSupp = planning.postes_supplementaires;
    const texteLibre = planning.texte_libre;
    
    if (statutConge && !serviceCode && !posteCode) {
      return (
        <span style={{
          fontSize: '10px', fontWeight: 'bold', padding: '1px 3px', borderRadius: '3px',
          backgroundColor: STATUT_CONGE_COLORS[statutConge]?.bg,
          color: STATUT_CONGE_COLORS[statutConge]?.text
        }}>{statutConge}</span>
      );
    }
    
    return (
      <>
        {texteLibre ? (
          <span style={{ fontSize: '8px', fontWeight: 'bold', color: '#a855f7' }}>{texteLibre}</span>
        ) : serviceCode && (
          <span style={{ fontSize: '9px', fontWeight: 'bold', color: getCellTextColor(planning) }}>{serviceCode}</span>
        )}
        
        {(posteCode || statutConge) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginTop: '1px' }}>
            {posteCode && (
              <span style={{ fontSize: '7px', color: getCellTextColor(planning), opacity: 0.75 }}>{posteCode}</span>
            )}
            {posteCode && statutConge && (
              <span style={{ fontSize: '6px', opacity: 0.5, color: getCellTextColor(planning) }}>|</span>
            )}
            {statutConge && (
              <span style={{
                fontSize: '6px', fontWeight: 'bold', padding: '0px 2px', borderRadius: '2px',
                backgroundColor: STATUT_CONGE_COLORS[statutConge]?.bg,
                color: STATUT_CONGE_COLORS[statutConge]?.text
              }}>{statutConge}</span>
            )}
          </div>
        )}
        
        {postesSupp?.length > 0 && (
          <span style={{ fontSize: '6px', fontStyle: 'italic', fontWeight: 'bold', color: colors.postesSupp?.text || '#a855f7' }}>
            {postesSupp.map(p => p.replace('+', '')).join(' ')}
          </span>
        )}
      </>
    );
  };

  // === APERÇU SERVICE ===
  const previewService = buildFinalService();
  const hasExistingNote = Boolean(tempNote);
  const hasExistingTexteLibre = Boolean(tempTexteLibre && tempTexteLibre.trim() !== '');
  const hasExistingNotePrivee = Boolean(tempNotePrivee);  // v3.2

  // === RENDU BOUTONS CODE ===
  const renderCodeButtons = (codes, onClick, isSelectedFn, cols = 4) => {
    const filtered = filterBySearch(codes);
    if (filtered.length === 0) {
      return <p style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', padding: '8px' }}>Aucun résultat pour "{searchTerm}"</p>;
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '6px' }}>
        {filtered.map(({ code, desc }) => {
          const isSelected = isSelectedFn(code);
          const colorStyle = MODAL_COLORS[code] || { bg: '#f3f4f6', text: '#374151' };
          return (
            <button
              key={code}
              onClick={() => onClick(code)}
              style={{
                padding: '8px 4px', borderRadius: '6px', textAlign: 'center',
                border: isSelected ? '2px solid #3b82f6' : '1px solid #ddd',
                backgroundColor: colorStyle.bg, color: colorStyle.text,
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{code}</div>
              <div style={{ fontSize: '9px', marginTop: '2px' }}>{desc}</div>
            </button>
          );
        })}
      </div>
    );
  };

  // === COMPOSANT ACCORDÉON ===
  const AccordionSection = ({ id, title, colorBg, children, isOpen, badge }) => (
    <div style={{ marginBottom: '12px' }}>
      <button 
        onClick={() => toggleSection(id)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer',
          backgroundColor: isOpen ? '#f3f4f6' : '#fafafa', transition: 'all 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isOpen ? <ChevronDown size={16} color="#666" /> : <ChevronRight size={16} color="#666" />}
          <span style={{ width: '12px', height: '12px', backgroundColor: colorBg, borderRadius: '3px' }}></span>
          <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>{title}</span>
          {badge && <span style={{ fontSize: '11px', color: '#999' }}>({badge})</span>}
        </div>
      </button>
      {isOpen && <div style={{ marginTop: '8px', paddingLeft: '8px' }}>{children}</div>}
    </div>
  );

  if (!isOpen) return null;

  const calendarDays = generateCalendarDays();
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <>
      {/* Overlay principal */}
      <div style={styles.overlay} onClick={handleClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <h2 style={styles.title}>📆 Mon Planning</h2>
            <div style={styles.headerActions}>
              <button style={styles.paletteBtn} onClick={() => setShowColorModal(true)} title="Personnaliser les couleurs">
                <Palette size={18} />
              </button>
              <button style={styles.closeBtn} onClick={handleClose}>✕</button>
            </div>
          </div>

          {/* Info agent */}
          {agentInfo && (
            <div style={styles.agentInfo}>
              <span style={styles.agentName}>{agentInfo.nom} {agentInfo.prenom}</span>
              <span style={styles.agentGroup}>{agentInfo.groupe?.split(' - ')[0]}</span>
            </div>
          )}

          {/* Navigation mois */}
          <div style={styles.monthNav}>
            <button style={styles.navBtn} onClick={prevMonth}>◀</button>
            <span style={styles.monthTitle}>{months[currentMonth]} {currentYear}</span>
            <button style={styles.navBtn} onClick={nextMonth}>▶</button>
          </div>

          {/* Calendrier */}
          <div style={styles.calendar}>
            <div style={styles.weekHeader}>
              {weekDays.map((day, idx) => (
                <div key={idx} style={{ ...styles.weekDay, color: idx >= 5 ? '#f87171' : 'rgba(255, 255, 255, 0.6)' }}>{day}</div>
              ))}
            </div>

            {loading ? (
              <div style={styles.loading}>Chargement...</div>
            ) : (
              <div style={styles.daysGrid}>
                {calendarDays.map((dayInfo, idx) => {
                  const isWeekend = idx % 7 >= 5;
                  
                  // v3.1: Vérifier si c'est une date de paie 2026
                  const paieType = dayInfo.currentMonth ? getPaieType(dayInfo.day, currentMonth, currentYear) : null;
                  let paieIcon = null;
                  if (paieType === 'digiposte' || paieType === 'both') {
                    paieIcon = PAIE_ICONS.digiposte;
                  } else if (paieType === 'virement') {
                    paieIcon = PAIE_ICONS.argent;
                  }
                  
                  // v3.2: Vérifier si note privée existe
                  const hasNotePrivee = dayInfo.planning?.note_privee;
                  // Vérifier si note classique existe
                  const hasNoteClassique = dayInfo.planning?.commentaire;
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        ...styles.dayCell,
                        ...(dayInfo.currentMonth ? styles.currentMonthDay : styles.otherMonthDay),
                        ...(selectedDay?.date === dayInfo.date ? styles.selectedDay : {}),
                        ...(isWeekend && dayInfo.currentMonth ? styles.weekendDay : {}),
                        backgroundColor: dayInfo.currentMonth ? getCellBackgroundColor(dayInfo.planning) : 'transparent',
                        color: dayInfo.currentMonth ? getCellTextColor(dayInfo.planning) : 'rgba(255,255,255,0.2)',
                        position: 'relative',
                      }}
                      onClick={() => handleDayClick(dayInfo)}
                    >
                      {/* v3.1: Icône paie en coin supérieur droit */}
                      {paieIcon && dayInfo.currentMonth && (
                        <img 
                          src={paieIcon}
                          alt={paieType === 'virement' ? 'Virement' : 'Digiposte'}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            width: '14px',
                            height: '14px',
                            objectFit: 'contain',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                      )}
                      
                      {/* v3.2: Icône note classique en coin supérieur gauche */}
                      {hasNoteClassique && dayInfo.currentMonth && (
                        <StickyNote 
                          size={10}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            color: '#fbbf24',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                      )}
                      
                      {/* v3.2: Icône note privée en coin inférieur gauche */}
                      {hasNotePrivee && dayInfo.currentMonth && (
                        <Lock 
                          size={10}
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '2px',
                            color: '#6b7280',
                            pointerEvents: 'none',
                            zIndex: 2,
                          }}
                        />
                      )}
                      
                      <span style={{ 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        lineHeight: 1, 
                        color: dayInfo.currentMonth ? getCellTextColor(dayInfo.planning) : 'rgba(255,255,255,0.2)',
                        position: 'relative',
                        zIndex: 1,
                      }}>{dayInfo.day}</span>
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        {dayInfo.planning && renderCellContent(dayInfo.planning)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Légende */}
          <div style={styles.legend}>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('-').bg || 'rgba(255,255,255,0.1)', color: getServiceColor('-').text || 'white', border: '1px solid rgba(255,255,255,0.2)'}}>- O X</span>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('RP').bg, color: getServiceColor('RP').text}}>RP</span>
            <span style={{...styles.legendItem, backgroundColor: STATUT_CONGE_COLORS['C'].bg, color: STATUT_CONGE_COLORS['C'].text}}>C</span>
            <span style={{...styles.legendItem, backgroundColor: STATUT_CONGE_COLORS['C?'].bg, color: STATUT_CONGE_COLORS['C?'].text}}>C?</span>
            <span style={{...styles.legendItem, backgroundColor: STATUT_CONGE_COLORS['CNA'].bg, color: STATUT_CONGE_COLORS['CNA'].text}}>CNA</span>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('MA').bg, color: getServiceColor('MA').text}}>MA</span>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('D').bg, color: getServiceColor('D').text}}>D</span>
          </div>
          
          {/* Légende Paie 2026 + Notes */}
          <div style={styles.paieLegend}>
            <div style={styles.paieLegendItem}>
              <img src={PAIE_ICONS.digiposte} alt="Digiposte" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Digiposte</span>
            </div>
            <div style={styles.paieLegendItem}>
              <img src={PAIE_ICONS.argent} alt="Virement" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Virement</span>
            </div>
            <div style={styles.paieLegendItem}>
              <StickyNote size={14} style={{ color: '#fbbf24' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Note</span>
            </div>
            <div style={styles.paieLegendItem}>
              <Lock size={14} style={{ color: '#6b7280' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Privée</span>
            </div>
          </div>
        </div>

        {/* === MODAL D'ÉDITION (ALIGNÉE AVEC ModalCellEdit) === */}
        {editMode && selectedDay && (
          <div style={styles.editOverlay} onClick={closeEditor}>
            <div style={styles.editModal} onClick={e => e.stopPropagation()}>
              {/* Header éditeur */}
              <div style={styles.editHeader}>
                <div>
                  <h3 style={styles.editTitle}>{selectedDay.day} {months[currentMonth]} {currentYear}</h3>
                  <p style={styles.editSubtitle}>{agentInfo?.nom} {agentInfo?.prenom}</p>
                  
                  {/* Aperçu */}
                  {(previewService || tempStatutConge) && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                      <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '500' }}>Aperçu : </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1d4ed8' }}>{previewService || '-'}</span>
                      {tempPoste && <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>/ {tempPoste}</span>}
                      {tempStatutConge && (
                        <span style={{
                          marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          backgroundColor: MODAL_COLORS[tempStatutConge]?.bg,
                          color: MODAL_COLORS[tempStatutConge]?.text
                        }}>{tempStatutConge}</span>
                      )}
                      {hasExistingTexteLibre && <span style={{ fontSize: '11px', color: '#a855f7', marginLeft: '8px' }}>({tempTexteLibre})</span>}
                    </div>
                  )}
                </div>
                <button style={styles.editCloseBtn} onClick={closeEditor}>✕</button>
              </div>

              {/* === BARRE DE RECHERCHE === */}
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un code (ex: FO, MA, VL...)"
                  style={{
                    width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box'
                  }}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* === SECTION HORAIRES === */}
              <div style={styles.section}>
                <label style={styles.sectionLabel}>Horaires</label>
                {renderCodeButtons(SERVICE_CODES, selectHoraire, (code) => tempService === code, 6)}
              </div>

              {/* === SECTION STATUT CONGÉ === */}
              <div style={styles.section}>
                <label style={styles.sectionLabel}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ padding: '2px 6px', backgroundColor: '#fef08a', color: '#854d0e', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>Congés</span>
                    Statut congé
                    <span style={{ fontWeight: 'normal', fontSize: '10px', color: '#999' }}>(combinable)</span>
                  </span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {STATUT_CONGE_CODES.filter(c => c.code !== '').map(({ code, desc }) => {
                    const isSelected = tempStatutConge === code;
                    return (
                      <button
                        key={code}
                        onClick={() => selectStatutConge(code)}
                        style={{
                          padding: '10px 6px', borderRadius: '6px', textAlign: 'center',
                          border: isSelected ? '2px solid #333' : '2px solid transparent',
                          backgroundColor: STATUT_CONGE_COLORS[code]?.bg,
                          color: STATUT_CONGE_COLORS[code]?.text,
                          cursor: 'pointer', transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 0 0 2px rgba(0,0,0,0.2)' : 'none'
                        }}
                      >
                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{code}</div>
                        <div style={{ fontSize: '9px', marginTop: '2px' }}>{desc}</div>
                      </button>
                    );
                  })}
                </div>
                {tempStatutConge && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '11px', color: '#92400e' }}>
                    Statut sélectionné : <strong>{tempStatutConge}</strong>
                    {tempService && <span style={{ marginLeft: '4px' }}>(combiné avec {tempService})</span>}
                  </div>
                )}
              </div>

              {/* === SECTION POSTE (SI APPLICABLE) + PCD === */}
              {hasPosteSelector() && (
                <div style={styles.section}>
                  <label style={styles.sectionLabel}>Poste</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {getAvailablePostes().map(poste => (
                      <button
                        key={poste}
                        onClick={() => setTempPoste(tempPoste === poste ? '' : poste)}
                        style={{
                          padding: '8px', borderRadius: '6px', fontWeight: '600', fontSize: '11px',
                          border: tempPoste === poste ? '2px solid #3b82f6' : '1px solid #ddd',
                          backgroundColor: tempPoste === poste ? '#dbeafe' : '#f5f5f5',
                          color: '#333', cursor: 'pointer'
                        }}
                      >
                        {poste}
                      </button>
                    ))}
                    
                    {/* Bouton PCD avec dropdown */}
                    <div style={{ position: 'relative' }} ref={pcdButtonRef}>
                      <button
                        onClick={() => setShowPcdDropdown(!showPcdDropdown)}
                        style={{
                          width: '100%', padding: '8px', borderRadius: '6px', fontSize: '11px',
                          border: isPcdPosteSelected ? '2px solid #3b82f6' : '1px solid #06b6d4',
                          backgroundColor: isPcdPosteSelected ? '#a5f3fc' : '#ecfeff',
                          color: '#0e7490', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                        }}
                      >
                        <span style={{ fontWeight: '600' }}>{isPcdPosteSelected ? tempPoste : 'PCD'}</span>
                        <ChevronDown size={12} style={{ transform: showPcdDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      
                      {showPcdDropdown && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                          width: '100%', backgroundColor: 'white', border: '1px solid #06b6d4',
                          borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10, overflow: 'hidden'
                        }}>
                          {PCD_POSTE_CODES.map(code => (
                            <button
                              key={code}
                              onClick={() => selectPcdPoste(code)}
                              style={{
                                width: '100%', padding: '8px 12px', fontSize: '11px', textAlign: 'left',
                                border: 'none', cursor: 'pointer',
                                backgroundColor: tempPoste === code ? '#a5f3fc' : 'white',
                                color: '#0e7490', fontWeight: tempPoste === code ? '600' : '400'
                              }}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isPcdPosteSelected && (
                    <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '6px', fontSize: '11px', color: '#0e7490' }}>
                      Poste PCD : <strong>{tempPoste}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* === SECTION ABSENCES (MA, F) === */}
              <div style={styles.section}>
                <label style={styles.sectionLabel}>
                  Absences <span style={{ fontWeight: 'normal', fontSize: '10px', color: '#999' }}>(combinable avec horaire)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {ABSENCES_CODES.map(({ code, desc }) => {
                    const isSelected = tempCategorie === code;
                    const colorStyle = MODAL_COLORS[code] || { bg: '#f3f4f6', text: '#374151' };
                    return (
                      <button
                        key={code}
                        onClick={() => selectCategorie(code)}
                        style={{
                          padding: '12px', borderRadius: '6px', textAlign: 'center',
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #ddd',
                          backgroundColor: colorStyle.bg, color: colorStyle.text,
                          cursor: 'pointer', boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none'
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{code}</div>
                        <div style={{ fontSize: '11px', marginTop: '2px' }}>{desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* === BOUTON TEXTE LIBRE === */}
              <div style={styles.section}>
                <button
                  onClick={selectTexteLibre}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '6px', textAlign: 'center',
                    border: tempCategorie === 'LIBRE' ? '2px solid #a855f7' : '2px dashed #d8b4fe',
                    backgroundColor: tempCategorie === 'LIBRE' ? '#f3e8ff' : '#faf5ff',
                    color: '#7c3aed', cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Type size={16} />
                    TEXTE LIBRE
                  </div>
                  {hasExistingTexteLibre && (
                    <div style={{ fontSize: '11px', marginTop: '4px', color: '#a855f7' }}>Actuel : {tempTexteLibre}</div>
                  )}
                </button>
              </div>

              {/* === SECTIONS ACCORDÉON === */}
              
              {/* Service de jour */}
              {hasSearchResults(SERVICE_JOUR_CODES) && (
                <AccordionSection 
                  id="serviceJour" 
                  title="Service de jour" 
                  colorBg="#dbeafe"
                  isOpen={openSections.serviceJour || searchTerm.trim() !== ''}
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
                  colorBg="#fed7aa"
                  isOpen={openSections.habilitation || searchTerm.trim() !== ''}
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
                  colorBg="#fef9c3"
                  isOpen={openSections.joursRH || searchTerm.trim() !== ''}
                  badge="VT, D2I, RU..."
                >
                  {renderCodeButtons(JOURS_RH_CODES, selectCategorie, (code) => tempCategorie === code, 5)}
                </AccordionSection>
              )}

              {/* === SECTION POSTES SUPPLÉMENTAIRES === */}
              <div style={styles.section}>
                <label style={styles.sectionLabel}>
                  Postes supplémentaires <span style={{ fontWeight: 'normal', fontSize: '10px', color: '#999' }}>(multi-sélection)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {POSTES_SUPPLEMENTAIRES.map(({ code, desc }) => {
                    const isSelected = tempPostesSupplementaires.includes(code);
                    return (
                      <button
                        key={code}
                        onClick={() => togglePosteSupp(code)}
                        style={{
                          padding: '8px', borderRadius: '6px', textAlign: 'center', position: 'relative',
                          border: isSelected ? '2px solid #22c55e' : '1px solid #ddd',
                          backgroundColor: isSelected ? '#dcfce7' : '#f5f5f5',
                          cursor: 'pointer'
                        }}
                      >
                        {isSelected && (
                          <Check size={12} style={{ position: 'absolute', top: '2px', right: '4px', color: '#22c55e' }} />
                        )}
                        <div style={{ fontWeight: '600', fontSize: '10px', fontStyle: 'italic', color: '#333' }}>{code}</div>
                      </button>
                    );
                  })}
                </div>
                {tempPostesSupplementaires.length > 0 && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#f5f5f5', borderRadius: '6px', fontSize: '11px', color: '#666' }}>
                    Sélectionnés : <em>{tempPostesSupplementaires.join(', ')}</em>
                  </div>
                )}
              </div>

              {/* === SECTION NOTES (classique + privée) === */}
              <div style={styles.section}>
                <label style={styles.sectionLabel}>Notes</label>
                
                {/* Ligne 1 : Note classique */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    onClick={hasExistingNote ? openEditNoteModal : openAddNoteModal}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
                      borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                      backgroundColor: hasExistingNote ? '#fef3c7' : '#fde68a',
                      border: hasExistingNote ? '1px solid #fcd34d' : '1px solid #f59e0b',
                      color: '#92400e'
                    }}
                  >
                    {hasExistingNote ? <Edit3 size={14} /> : <StickyNote size={14} />}
                    <span>{hasExistingNote ? 'Modifier note' : '+ Ajouter note'}</span>
                  </button>
                  
                  {hasExistingNote && (
                    <button
                      onClick={handleDeleteNote}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '8px 12px',
                        borderRadius: '6px', cursor: 'pointer',
                        backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626'
                      }}
                      title="Effacer la note"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                
                {/* Affichage note classique */}
                {hasExistingNote && (
                  <div style={{ padding: '10px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <StickyNote size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ margin: 0, fontSize: '12px', color: '#92400e', whiteSpace: 'pre-wrap' }}>{tempNote}</p>
                    </div>
                  </div>
                )}
                
                {/* Ligne 2 : Note privée (v3.2) */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <button
                    onClick={hasExistingNotePrivee ? openEditNotePriveeModal : openAddNotePriveeModal}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px',
                      borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                      backgroundColor: hasExistingNotePrivee ? '#e5e7eb' : '#f3f4f6',
                      border: hasExistingNotePrivee ? '1px solid #9ca3af' : '1px solid #d1d5db',
                      color: '#4b5563'
                    }}
                  >
                    {hasExistingNotePrivee ? <Edit3 size={14} /> : <Lock size={14} />}
                    <span>{hasExistingNotePrivee ? 'Modifier note privée' : '+ Note privée'}</span>
                  </button>
                  
                  {hasExistingNotePrivee && (
                    <button
                      onClick={handleDeleteNotePrivee}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '8px 12px',
                        borderRadius: '6px', cursor: 'pointer',
                        backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626'
                      }}
                      title="Effacer la note privée"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                
                {/* Affichage note privée */}
                {hasExistingNotePrivee && (
                  <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <Lock size={14} style={{ color: '#6b7280', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', whiteSpace: 'pre-wrap' }}>{tempNotePrivee}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>
                          🔒 Visible uniquement dans Mon Planning
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* === BOUTONS D'ACTION === */}
              <div style={styles.editActions}>
                <button style={styles.deleteBtn} onClick={deleteEntry}>Effacer</button>
                <div style={styles.rightActions}>
                  <button style={styles.cancelBtn} onClick={closeEditor}>Annuler</button>
                  <button 
                    style={{...styles.saveBtn, opacity: (!tempService && !tempCategorie && !tempPoste && !tempStatutConge && !tempNotePrivee) ? 0.5 : 1}}
                    onClick={saveEdit}
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === SOUS-MODAL NOTE === */}
      {showNoteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }} onClick={() => setShowNoteModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', margin: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isNoteEditMode ? <><Edit3 size={18} color="#f59e0b" />Modifier la note</> : <><StickyNote size={18} color="#f59e0b" />Ajouter une note</>}
              </h4>
              <button onClick={() => setShowNoteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20} /></button>
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Saisissez votre commentaire..."
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
              autoFocus
            />
            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{noteInput.length} caractères</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setShowNoteModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: 'white', color: '#666', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleValidateNote} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#f59e0b', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* === SOUS-MODAL TEXTE LIBRE === */}
      {showTexteLibreModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }} onClick={() => setShowTexteLibreModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', margin: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isTexteLibreEditMode ? <><Edit3 size={18} color="#a855f7" />Modifier le texte</> : <><Type size={18} color="#a855f7" />Texte libre</>}
              </h4>
              <button onClick={() => setShowTexteLibreModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20} /></button>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>Ce texte sera affiché dans la cellule du planning</p>
            <input
              type="text"
              value={texteLibreInput}
              onChange={(e) => setTexteLibreInput(e.target.value)}
              placeholder="Ex: RDV médecin, Réunion..."
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }}
              autoFocus
              maxLength={20}
            />
            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{texteLibreInput.length}/20 caractères</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setShowTexteLibreModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: 'white', color: '#666', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleValidateTexteLibre} disabled={!texteLibreInput.trim()} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#a855f7', color: 'white', cursor: 'pointer', fontWeight: '500', opacity: texteLibreInput.trim() ? 1 : 0.5 }}>Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* === SOUS-MODAL NOTE PRIVÉE (v3.2) === */}
      {showNotePriveeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }} onClick={() => setShowNotePriveeModal(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '400px', margin: '16px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isNotePriveeEditMode ? <><Edit3 size={18} color="#6b7280" />Modifier la note privée</> : <><Lock size={18} color="#6b7280" />Note privée</>}
              </h4>
              <button onClick={() => setShowNotePriveeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><X size={20} /></button>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px', marginBottom: '12px', border: '1px solid #e5e7eb' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>
                🔒 Cette note est <strong>privée</strong> : elle n'apparaît que dans "Mon Planning" et n'est pas visible sur le planning général.
              </p>
            </div>
            <textarea
              value={notePriveeInput}
              onChange={(e) => setNotePriveeInput(e.target.value)}
              placeholder="Saisissez votre note personnelle..."
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
              autoFocus
            />
            <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{notePriveeInput.length} caractères</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setShowNotePriveeModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: 'white', color: '#666', cursor: 'pointer' }}>Annuler</button>
              <button onClick={handleValidateNotePrivee} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#6b7280', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Couleurs */}
      <ModalCouleurs 
        isOpen={showColorModal} 
        onClose={handleCloseColorModal}
        context="perso"
        userEmail={currentUser?.email}
      />
    </>
  );
};

// ============================================
// STYLES
// ============================================
const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999, padding: '8px'
  },
  modal: {
    backgroundColor: '#1a1a2e', borderRadius: '12px',
    width: '100%', maxWidth: '420px', maxHeight: '95vh', overflow: 'auto',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.15)'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  title: { margin: 0, color: '#00f0ff', fontSize: '16px' },
  paletteBtn: {
    background: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#00f0ff',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  closeBtn: { background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' },
  agentInfo: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '10px', padding: '10px', backgroundColor: 'rgba(0, 102, 179, 0.2)'
  },
  agentName: { color: 'white', fontWeight: 'bold', fontSize: '13px' },
  agentGroup: {
    color: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.2)',
    padding: '3px 10px', borderRadius: '10px', fontSize: '11px'
  },
  monthNav: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '10px' },
  navBtn: {
    background: 'rgba(0, 240, 255, 0.2)', border: '1px solid rgba(0, 240, 255, 0.4)',
    color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px'
  },
  monthTitle: { color: 'white', fontSize: '15px', fontWeight: 'bold', minWidth: '140px', textAlign: 'center' },
  calendar: { padding: '0 8px 8px' },
  weekHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' },
  weekDay: { textAlign: 'center', fontSize: '11px', fontWeight: 'bold', padding: '4px 0' },
  loading: { textAlign: 'center', color: 'white', padding: '30px' },
  daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' },
  dayCell: {
    aspectRatio: '1', borderRadius: '6px', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
    border: '1px solid transparent', transition: 'all 0.15s ease', minHeight: '42px', padding: '2px'
  },
  currentMonthDay: { backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' },
  otherMonthDay: { opacity: 0.25, cursor: 'default' },
  selectedDay: { border: '2px solid #00f0ff', boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)' },
  weekendDay: { borderColor: 'rgba(248, 113, 113, 0.2)' },
  legend: { 
    display: 'flex', justifyContent: 'center', gap: '4px', padding: '8px', flexWrap: 'wrap',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  legendItem: { padding: '3px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold' },
  paieLegend: {
    display: 'flex', justifyContent: 'center', gap: '16px', padding: '8px 8px 12px',
    borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap'
  },
  paieLegendItem: {
    display: 'flex', alignItems: 'center', gap: '6px'
  },
  
  // Styles modal d'édition
  editOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 10000, padding: '10px'
  },
  editModal: {
    backgroundColor: 'white', borderRadius: '12px', padding: '16px',
    width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto'
  },
  editHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  editTitle: { margin: 0, fontSize: '16px', color: '#333' },
  editSubtitle: { margin: '4px 0 0', fontSize: '12px', color: '#666' },
  editCloseBtn: { background: 'none', border: 'none', fontSize: '18px', color: '#999', cursor: 'pointer', padding: '0 4px' },
  section: { marginBottom: '16px' },
  sectionLabel: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' },
  editActions: { display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #eee' },
  deleteBtn: {
    padding: '8px 14px', backgroundColor: '#f44336', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
  },
  rightActions: { display: 'flex', gap: '8px' },
  cancelBtn: {
    padding: '8px 14px', backgroundColor: 'white', color: '#666',
    border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
  },
  saveBtn: {
    padding: '8px 14px', backgroundColor: '#2196F3', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
  }
};

export default ModalMonPlanning;
