import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES, GROUPES_AVEC_POSTE, POSTES_PAR_GROUPE } from '../../constants/config';

/**
 * ModalMonPlanning - Calendrier personnel de l'agent connecté
 * 
 * Affiche un calendrier mensuel avec les services de l'agent.
 * Permet de modifier ses propres services avec le même popup que le planning général.
 * 
 * v1.3 - Harmonisation couleurs avec Planning complet
 */
const ModalMonPlanning = ({ isOpen, onClose, currentUser, onUpdate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [planningData, setPlanningData] = useState({});
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Tracker si des modifications ont été faites
  const hasChanges = useRef(false);
  
  // États pour l'édition (comme ModalCellEdit)
  const [editMode, setEditMode] = useState(false);
  const [tempService, setTempService] = useState('');
  const [tempPoste, setTempPoste] = useState('');
  const [tempPostesSupplementaires, setTempPostesSupplementaires] = useState([]);
  const [tempNote, setTempNote] = useState('');

  // Mois et années pour navigation
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

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

      // Organiser par date
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

  // Effets
  useEffect(() => {
    if (isOpen) {
      // Réinitialiser au mois actuel à chaque ouverture
      setCurrentDate(new Date());
      loadAgentInfo();
      hasChanges.current = false; // Reset au moment d'ouvrir
    }
  }, [isOpen, loadAgentInfo]);

  useEffect(() => {
    if (agentInfo) {
      loadPlanning();
    }
  }, [agentInfo, loadPlanning]);

  // Navigation mois
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

  // Générer les jours du calendrier
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
      days.push({
        day: i,
        currentMonth: true,
        date: dateStr,
        planning: planningData[dateStr] || null
      });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, currentMonth: false, date: null });
    }

    return days;
  };

  // Cliquer sur un jour - ouvrir l'éditeur
  const handleDayClick = (dayInfo) => {
    if (!dayInfo.currentMonth) return;
    setSelectedDay(dayInfo);
    setEditMode(true);
    
    // Charger les données existantes
    const existing = dayInfo.planning;
    setTempService(existing?.service_code || '');
    setTempPoste(existing?.poste_code || '');
    setTempPostesSupplementaires(existing?.postes_supplementaires || []);
    setTempNote(existing?.commentaire || '');
  };

  // Fermer l'éditeur
  const closeEditor = () => {
    setSelectedDay(null);
    setEditMode(false);
    setTempService('');
    setTempPoste('');
    setTempPostesSupplementaires([]);
    setTempNote('');
  };

  // Fermer le modal principal et synchroniser si nécessaire
  const handleClose = () => {
    if (hasChanges.current && onUpdate) {
      console.log('📡 Synchronisation avec planning général...');
      onUpdate();
    }
    hasChanges.current = false;
    onClose();
  };

  // Sauvegarder modification
  const saveEdit = async () => {
    if (!selectedDay || !agentInfo) return;

    try {
      const { error } = await supabase
        .from('planning')
        .upsert({
          agent_id: agentInfo.id,
          date: selectedDay.date,
          service_code: tempService || null,
          poste_code: tempPoste || null,
          postes_supplementaires: tempPostesSupplementaires.length > 0 ? tempPostesSupplementaires : null,
          commentaire: tempNote || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'agent_id,date'
        });

      if (error) throw error;

      hasChanges.current = true; // Marquer qu'on a fait des modifications
      await loadPlanning();
      closeEditor();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Supprimer entrée
  const deleteEntry = async () => {
    if (!selectedDay || !agentInfo) return;
    
    if (!window.confirm('Effacer cette entrée ?')) return;

    try {
      const { error } = await supabase
        .from('planning')
        .delete()
        .eq('agent_id', agentInfo.id)
        .eq('date', selectedDay.date);

      if (error) throw error;

      hasChanges.current = true; // Marquer qu'on a fait des modifications
      await loadPlanning();
      closeEditor();
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  // Toggle poste supplémentaire
  const togglePosteSupp = (code) => {
    setTempPostesSupplementaires(prev => 
      prev.includes(code) ? prev.filter(p => p !== code) : [...prev, code]
    );
  };

  // Vérifier si l'agent a accès au sélecteur de poste
  const hasPosteSelector = () => {
    if (!agentInfo?.groupe) return false;
    return GROUPES_AVEC_POSTE.some(g => agentInfo.groupe.includes(g));
  };

  // Postes disponibles pour cet agent
  const getAvailablePostes = () => {
    if (!agentInfo?.groupe) return POSTES_CODES;
    for (const [groupeKey, postes] of Object.entries(POSTES_PAR_GROUPE)) {
      if (agentInfo.groupe.includes(groupeKey)) return postes;
    }
    return POSTES_CODES;
  };

  // Couleur selon le service - ALIGNÉ SUR PLANNING COMPLET (CODE_COLORS)
  const getServiceColor = (planning) => {
    if (!planning?.service_code) return 'transparent';
    
    const code = planning.service_code.toUpperCase();
    
    // Services -, O, X : PAS de couleur de fond (comme planning complet)
    if (code === '-' || code === 'O' || code === 'X') return 'rgba(255, 255, 255, 0.15)';
    
    // Repos - Vert clair (bg-green-100)
    if (code === 'RP' || code === 'RU') return '#dcfce7';
    
    // Congés - Jaune/Or (bg-yellow-400)
    if (code === 'C' || code === 'CP') return '#facc15';
    
    // Maladie - Rouge clair (bg-red-200)
    if (code === 'MA') return '#fecaca';
    
    // Dispo - Bleu clair (bg-blue-200)
    if (code === 'D' || code === 'DISPO') return '#bfdbfe';
    
    // Formation - Orange clair (bg-orange-200)
    if (code === 'FO' || code === 'HAB' || code === 'HAB-QF' || code === 'VL' || code === 'VM' || code === 'EIA') return '#fed7aa';
    
    // Inactif (bg-gray-300)
    if (code === 'INACTIN') return '#d1d5db';
    
    // Inactif/Visite (bg-pink-100)
    if (code === 'I') return '#fce7f3';
    
    // Non utilisé (bg-gray-100)
    if (code === 'NU') return '#f3f4f6';
    
    // VT Temps partiel (bg-yellow-100)
    if (code === 'VT') return '#fef9c3';
    
    // D2I (bg-gray-300)
    if (code === 'D2I') return '#d1d5db';
    
    return 'rgba(255, 255, 255, 0.1)'; // Défaut transparent
  };

  // Couleur du texte selon le fond
  const getTextColor = (planning) => {
    if (!planning?.service_code) return 'white';
    
    const code = planning.service_code.toUpperCase();
    
    // Fonds clairs → texte foncé
    if (['RP', 'RU', 'C', 'CP', 'MA', 'D', 'DISPO', 'FO', 'HAB', 'HAB-QF', 'VL', 'VM', 'EIA', 'INACTIN', 'I', 'NU', 'VT', 'D2I'].includes(code)) {
      return '#1f2937'; // gray-800
    }
    
    return 'white';
  };

  if (!isOpen) return null;

  const calendarDays = generateCalendarDays();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📆 Mon Planning</h2>
          <button style={styles.closeBtn} onClick={handleClose}>✕</button>
        </div>

        {/* Info agent */}
        {agentInfo && (
          <div style={styles.agentInfo}>
            <span style={styles.agentName}>{agentInfo.nom} {agentInfo.prenom}</span>
            <span style={styles.agentGroup}>{agentInfo.groupe}</span>
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
            {weekDays.map(day => (
              <div key={day} style={styles.weekDay}>{day}</div>
            ))}
          </div>

          {loading ? (
            <div style={styles.loading}>Chargement...</div>
          ) : (
            <div style={styles.daysGrid}>
              {calendarDays.map((dayInfo, idx) => (
                <div
                  key={idx}
                  style={{
                    ...styles.dayCell,
                    ...(dayInfo.currentMonth ? styles.currentMonthDay : styles.otherMonthDay),
                    ...(selectedDay?.date === dayInfo.date ? styles.selectedDay : {}),
                    backgroundColor: dayInfo.currentMonth ? getServiceColor(dayInfo.planning) : 'transparent',
                    color: dayInfo.currentMonth ? getTextColor(dayInfo.planning) : 'rgba(255,255,255,0.3)'
                  }}
                  onClick={() => handleDayClick(dayInfo)}
                >
                  <span style={{...styles.dayNumber, color: dayInfo.currentMonth ? getTextColor(dayInfo.planning) : 'rgba(255,255,255,0.3)'}}>{dayInfo.day}</span>
                  {dayInfo.planning?.service_code && (
                    <span style={{...styles.serviceCode, color: getTextColor(dayInfo.planning)}}>{dayInfo.planning.service_code}</span>
                  )}
                  {dayInfo.planning?.poste_code && (
                    <span style={{...styles.posteCode, color: getTextColor(dayInfo.planning), opacity: 0.8}}>{dayInfo.planning.poste_code}</span>
                  )}
                  {dayInfo.planning?.postes_supplementaires?.length > 0 && (
                    <span style={styles.supplement}>
                      {dayInfo.planning.postes_supplementaires.join(' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Légende - Alignée sur Planning complet */}
        <div style={styles.legend}>
          <span style={{...styles.legendItem, backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)'}}>- O X</span>
          <span style={{...styles.legendItem, backgroundColor: '#dcfce7', color: '#166534'}}>RP</span>
          <span style={{...styles.legendItem, backgroundColor: '#facc15', color: '#713f12'}}>C</span>
          <span style={{...styles.legendItem, backgroundColor: '#fecaca', color: '#991b1b'}}>MA</span>
          <span style={{...styles.legendItem, backgroundColor: '#bfdbfe', color: '#1e40af'}}>D</span>
          <span style={{...styles.legendItem, backgroundColor: '#fed7aa', color: '#9a3412'}}>FO</span>
        </div>
      </div>

      {/* Modal d'édition (comme ModalCellEdit) */}
      {editMode && selectedDay && (
        <div style={styles.editOverlay} onClick={closeEditor}>
          <div style={styles.editModal} onClick={e => e.stopPropagation()}>
            <div style={styles.editHeader}>
              <div>
                <h3 style={styles.editTitle}>
                  {selectedDay.day} {months[currentMonth]} {currentYear}
                </h3>
                <p style={styles.editSubtitle}>{agentInfo?.nom} {agentInfo?.prenom}</p>
              </div>
              <button style={styles.editCloseBtn} onClick={closeEditor}>✕</button>
            </div>

            {/* Section Service */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Service / Horaire</label>
              <div style={styles.serviceGrid}>
                {SERVICE_CODES.filter(s => s.code !== '__LIBRE__').map(({ code, desc }) => (
                  <button
                    key={code}
                    onClick={() => setTempService(code)}
                    style={{
                      ...styles.serviceBtn,
                      ...(tempService === code ? styles.serviceBtnSelected : {})
                    }}
                  >
                    <span style={styles.serviceBtnCode}>{code}</span>
                    <span style={styles.serviceBtnDesc}>{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section Poste (si applicable) */}
            {hasPosteSelector() && (
              <div style={styles.section}>
                <label style={styles.sectionLabel}>Poste</label>
                <div style={styles.posteGrid}>
                  {getAvailablePostes().map(poste => (
                    <button
                      key={poste}
                      onClick={() => setTempPoste(tempPoste === poste ? '' : poste)}
                      style={{
                        ...styles.posteBtn,
                        ...(tempPoste === poste ? styles.posteBtnSelected : {})
                      }}
                    >
                      {poste}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section Postes supplémentaires */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                Postes supplémentaires <span style={styles.labelHint}>(sélection multiple)</span>
              </label>
              <div style={styles.suppGrid}>
                {POSTES_SUPPLEMENTAIRES.map(({ code, desc }) => (
                  <button
                    key={code}
                    onClick={() => togglePosteSupp(code)}
                    style={{
                      ...styles.suppBtn,
                      ...(tempPostesSupplementaires.includes(code) ? styles.suppBtnSelected : {})
                    }}
                  >
                    <span style={styles.suppCode}>{code}</span>
                    {tempPostesSupplementaires.includes(code) && <span style={styles.checkMark}>✓</span>}
                  </button>
                ))}
              </div>
              {tempPostesSupplementaires.length > 0 && (
                <div style={styles.selectedSupp}>
                  Sélectionnés : <em>{tempPostesSupplementaires.join(', ')}</em>
                </div>
              )}
            </div>

            {/* Section Note */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>Note / Commentaire</label>
              <textarea
                value={tempNote}
                onChange={e => setTempNote(e.target.value)}
                placeholder="Ajouter une note..."
                style={styles.noteInput}
              />
            </div>

            {/* Boutons d'action */}
            <div style={styles.editActions}>
              <button style={styles.deleteBtn} onClick={deleteEntry}>Effacer</button>
              <div style={styles.rightActions}>
                <button style={styles.cancelBtn} onClick={closeEditor}>Annuler</button>
                <button 
                  style={{...styles.saveBtn, opacity: !tempService ? 0.5 : 1}}
                  onClick={saveEdit}
                  disabled={!tempService}
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  title: { margin: 0, color: '#00f0ff', fontSize: '20px' },
  closeBtn: {
    background: 'none', border: 'none', color: 'white',
    fontSize: '24px', cursor: 'pointer', padding: '5px 10px'
  },
  agentInfo: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '15px', padding: '15px', backgroundColor: 'rgba(0, 102, 179, 0.2)'
  },
  agentName: { color: 'white', fontWeight: 'bold' },
  agentGroup: {
    color: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.2)',
    padding: '4px 12px', borderRadius: '12px', fontSize: '12px'
  },
  monthNav: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '20px', padding: '15px'
  },
  navBtn: {
    background: 'rgba(0, 240, 255, 0.2)', border: '1px solid rgba(0, 240, 255, 0.4)',
    color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px'
  },
  monthTitle: { color: 'white', fontSize: '18px', fontWeight: 'bold', minWidth: '180px', textAlign: 'center' },
  calendar: { padding: '0 20px' },
  weekHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '10px' },
  weekDay: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px', fontWeight: 'bold', padding: '8px 0' },
  loading: { textAlign: 'center', color: 'white', padding: '40px' },
  daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' },
  dayCell: {
    aspectRatio: '1', borderRadius: '8px', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
    border: '1px solid transparent', transition: 'all 0.2s ease', minHeight: '50px'
  },
  currentMonthDay: { backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' },
  otherMonthDay: { opacity: 0.3, cursor: 'default' },
  selectedDay: { border: '2px solid #00f0ff', boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)' },
  dayNumber: { fontSize: '14px', fontWeight: 'bold' },
  serviceCode: { fontSize: '10px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.3)' },
  posteCode: { fontSize: '8px' },
  supplement: { fontSize: '7px', color: '#a855f7', fontStyle: 'italic', fontWeight: 'bold' },
  legend: { display: 'flex', justifyContent: 'center', gap: '8px', padding: '15px', flexWrap: 'wrap' },
  legendItem: { padding: '4px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' },
  
  // Styles pour la modal d'édition
  editOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 10000
  },
  editModal: {
    backgroundColor: 'white', borderRadius: '12px', padding: '20px',
    width: '100%', maxWidth: '500px', maxHeight: '85vh', overflow: 'auto'
  },
  editHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  editTitle: { margin: 0, fontSize: '18px', color: '#333' },
  editSubtitle: { margin: '5px 0 0', fontSize: '14px', color: '#666' },
  editCloseBtn: {
    background: 'none', border: 'none', fontSize: '20px',
    color: '#999', cursor: 'pointer', padding: '0 5px'
  },
  section: { marginBottom: '20px' },
  sectionLabel: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '10px' },
  labelHint: { fontWeight: 'normal', fontSize: '12px', color: '#999' },
  serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  serviceBtn: {
    padding: '10px 8px', borderRadius: '8px', border: '1px solid #ddd',
    backgroundColor: '#f5f5f5', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
  },
  serviceBtnSelected: { backgroundColor: '#e3f2fd', borderColor: '#2196F3', boxShadow: '0 0 0 2px rgba(33, 150, 243, 0.3)' },
  serviceBtnCode: { display: 'block', fontWeight: 'bold', fontSize: '14px', color: '#333' },
  serviceBtnDesc: { display: 'block', fontSize: '10px', color: '#666', marginTop: '3px' },
  posteGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  posteBtn: {
    padding: '10px', borderRadius: '8px', border: '1px solid #ddd',
    backgroundColor: '#f5f5f5', cursor: 'pointer', fontWeight: '600', fontSize: '12px', color: '#333'
  },
  posteBtnSelected: { backgroundColor: '#e3f2fd', borderColor: '#2196F3' },
  suppGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  suppBtn: {
    padding: '10px', borderRadius: '8px', border: '1px solid #ddd',
    backgroundColor: '#f5f5f5', cursor: 'pointer', position: 'relative', textAlign: 'center'
  },
  suppBtnSelected: { backgroundColor: '#e8f5e9', borderColor: '#4CAF50' },
  suppCode: { fontWeight: '600', fontSize: '11px', fontStyle: 'italic', color: '#333' },
  checkMark: { position: 'absolute', top: '3px', right: '5px', color: '#4CAF50', fontSize: '12px' },
  selectedSupp: { marginTop: '10px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '6px', fontSize: '12px', color: '#666' },
  noteInput: {
    width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
  },
  editActions: { display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '1px solid #eee' },
  deleteBtn: {
    padding: '10px 20px', backgroundColor: '#f44336', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
  },
  rightActions: { display: 'flex', gap: '10px' },
  cancelBtn: {
    padding: '10px 20px', backgroundColor: 'white', color: '#666',
    border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer'
  },
  saveBtn: {
    padding: '10px 20px', backgroundColor: '#2196F3', color: 'white',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
  }
};

export default ModalMonPlanning;
