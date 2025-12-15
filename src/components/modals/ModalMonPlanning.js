import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES, GROUPES_AVEC_POSTE, POSTES_PAR_GROUPE, CODE_COLORS } from '../../constants/config';

/**
 * ModalMonPlanning - Calendrier personnel de l'agent connecté
 * 
 * Affiche un calendrier mensuel avec les services de l'agent.
 * Permet de modifier ses propres services avec le même popup que le planning général.
 * 
 * v1.3 - Harmonisation couleurs avec Planning complet
 * v1.4 - FIX: Calcul correct des jours de la semaine (année dynamique)
 * v1.5 - FIX: Responsive mobile + utilisation CODE_COLORS
 */
const ModalMonPlanning = ({ isOpen, onClose, currentUser, onUpdate, initialYear }) => {
  // FIX v1.4: Utiliser initialYear si fourni, sinon année système
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

  // DEBUG: Log pour vérifier l'année
  useEffect(() => {
    console.log(`📅 ModalMonPlanning: month=${currentMonth}, year=${currentYear}, initialYear prop=${initialYear}`);
  }, [currentMonth, currentYear, initialYear]);

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
      // FIX v1.4: Réinitialiser avec l'année fournie ou l'année système
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

  // Générer les jours du calendrier - FIX v1.4: Utilise currentYear correctement
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // getDay() retourne 0=Dimanche, on veut 0=Lundi
    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];

    // Jours du mois précédent
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthLastDay - i, currentMonth: false, date: null });
    }

    // Jours du mois actuel
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        currentMonth: true,
        date: dateStr,
        planning: planningData[dateStr] || null
      });
    }

    // Jours du mois suivant pour compléter la grille
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

  /**
   * Convertit les classes Tailwind de CODE_COLORS en couleurs HEX
   * v1.5: Utilisation directe de CODE_COLORS pour cohérence avec le planning complet
   */
  const getColorFromTailwind = (tailwindClass) => {
    const colorMap = {
      // Backgrounds
      'bg-green-100': '#dcfce7',
      'bg-yellow-400': '#facc15',
      'bg-red-200': '#fecaca',
      'bg-pink-100': '#fce7f3',
      'bg-gray-300': '#d1d5db',
      'bg-gray-100': '#f3f4f6',
      'bg-gray-50': '#f9fafb',
      'bg-blue-200': '#bfdbfe',
      'bg-orange-200': '#fed7aa',
      'bg-yellow-100': '#fef9c3',
      'bg-pink-500': '#ec4899',
      'bg-gray-500': '#6b7280',
      // Text colors
      'text-green-700': '#15803d',
      'text-yellow-900': '#713f12',
      'text-red-800': '#991b1b',
      'text-pink-700': '#be185d',
      'text-gray-700': '#374151',
      'text-gray-500': '#6b7280',
      'text-gray-400': '#9ca3af',
      'text-blue-800': '#1e40af',
      'text-orange-800': '#9a3412',
      'text-yellow-800': '#854d0e',
      'text-white': '#ffffff'
    };

    // Extraire les classes et retourner les couleurs
    const classes = tailwindClass.split(' ');
    let bgColor = null;
    let textColor = null;

    classes.forEach(cls => {
      if (cls.startsWith('bg-') && colorMap[cls]) {
        bgColor = colorMap[cls];
      }
      if (cls.startsWith('text-') && colorMap[cls]) {
        textColor = colorMap[cls];
      }
    });

    return { bgColor, textColor };
  };

  // Couleur selon le service - ALIGNÉ SUR CODE_COLORS (config.js)
  const getServiceColor = (planning) => {
    if (!planning?.service_code) return 'transparent';
    
    const code = planning.service_code.toUpperCase();
    const tailwindClass = CODE_COLORS[code] || '';
    
    // Services -, O, X : pas de couleur de fond spéciale
    if (code === '-' || code === 'O' || code === 'X' || !tailwindClass) {
      return 'rgba(255, 255, 255, 0.08)';
    }
    
    const { bgColor } = getColorFromTailwind(tailwindClass);
    return bgColor || 'rgba(255, 255, 255, 0.08)';
  };

  // Couleur du texte selon le fond - ALIGNÉ SUR CODE_COLORS
  const getTextColor = (planning) => {
    if (!planning?.service_code) return 'white';
    
    const code = planning.service_code.toUpperCase();
    const tailwindClass = CODE_COLORS[code] || '';
    
    // Services sans fond → texte blanc
    if (code === '-' || code === 'O' || code === 'X' || !tailwindClass) {
      return 'white';
    }
    
    const { textColor } = getColorFromTailwind(tailwindClass);
    return textColor || '#1f2937';
  };

  if (!isOpen) return null;

  const calendarDays = generateCalendarDays();
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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
              <div key={idx} style={{
                ...styles.weekDay,
                color: idx >= 5 ? '#f87171' : 'rgba(255, 255, 255, 0.6)'
              }}>{day}</div>
            ))}
          </div>

          {loading ? (
            <div style={styles.loading}>Chargement...</div>
          ) : (
            <div style={styles.daysGrid}>
              {calendarDays.map((dayInfo, idx) => {
                const isWeekend = idx % 7 >= 5;
                return (
                  <div
                    key={idx}
                    style={{
                      ...styles.dayCell,
                      ...(dayInfo.currentMonth ? styles.currentMonthDay : styles.otherMonthDay),
                      ...(selectedDay?.date === dayInfo.date ? styles.selectedDay : {}),
                      ...(isWeekend && dayInfo.currentMonth ? styles.weekendDay : {}),
                      backgroundColor: dayInfo.currentMonth ? getServiceColor(dayInfo.planning) : 'transparent',
                      color: dayInfo.currentMonth ? getTextColor(dayInfo.planning) : 'rgba(255,255,255,0.2)'
                    }}
                    onClick={() => handleDayClick(dayInfo)}
                  >
                    <span style={{
                      ...styles.dayNumber, 
                      color: dayInfo.currentMonth ? getTextColor(dayInfo.planning) : 'rgba(255,255,255,0.2)'
                    }}>{dayInfo.day}</span>
                    {dayInfo.planning?.service_code && (
                      <span style={{
                        ...styles.serviceCode, 
                        color: getTextColor(dayInfo.planning)
                      }}>{dayInfo.planning.service_code}</span>
                    )}
                    {dayInfo.planning?.poste_code && (
                      <span style={{
                        ...styles.posteCode, 
                        color: getTextColor(dayInfo.planning), 
                        opacity: 0.75
                      }}>{dayInfo.planning.poste_code}</span>
                    )}
                    {dayInfo.planning?.postes_supplementaires?.length > 0 && (
                      <span style={styles.supplement}>
                        {dayInfo.planning.postes_supplementaires.map(p => p.replace('+', '')).join(' ')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Légende - Couleurs alignées sur CODE_COLORS */}
        <div style={styles.legend}>
          <span style={{...styles.legendItem, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)'}}>- O X</span>
          <span style={{...styles.legendItem, backgroundColor: '#dcfce7', color: '#15803d'}}>RP</span>
          <span style={{...styles.legendItem, backgroundColor: '#facc15', color: '#713f12'}}>C</span>
          <span style={{...styles.legendItem, backgroundColor: '#fecaca', color: '#991b1b'}}>MA</span>
          <span style={{...styles.legendItem, backgroundColor: '#bfdbfe', color: '#1e40af'}}>D</span>
          <span style={{...styles.legendItem, backgroundColor: '#fed7aa', color: '#9a3412'}}>FO</span>
          <span style={{...styles.legendItem, backgroundColor: '#f3f4f6', color: '#6b7280'}}>NU</span>
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
                Postes supplémentaires <span style={styles.labelHint}>(multi)</span>
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
              <label style={styles.sectionLabel}>Note</label>
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

// ============================================
// STYLES - v1.5: Optimisés pour mobile
// ============================================
const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '8px' // Réduit pour mobile
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '420px', // Réduit pour tenir sur mobile
    maxHeight: '95vh',
    overflow: 'auto',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.15)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  title: { margin: 0, color: '#00f0ff', fontSize: '16px' },
  closeBtn: {
    background: 'none', border: 'none', color: 'white',
    fontSize: '20px', cursor: 'pointer', padding: '4px 8px'
  },
  agentInfo: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '10px', padding: '10px', backgroundColor: 'rgba(0, 102, 179, 0.2)'
  },
  agentName: { color: 'white', fontWeight: 'bold', fontSize: '13px' },
  agentGroup: {
    color: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.2)',
    padding: '3px 10px', borderRadius: '10px', fontSize: '11px'
  },
  monthNav: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '12px', padding: '10px'
  },
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
    aspectRatio: '1', 
    borderRadius: '6px', 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    cursor: 'pointer',
    border: '1px solid transparent', 
    transition: 'all 0.15s ease', 
    minHeight: '42px',
    padding: '2px'
  },
  currentMonthDay: { backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' },
  otherMonthDay: { opacity: 0.25, cursor: 'default' },
  selectedDay: { border: '2px solid #00f0ff', boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)' },
  weekendDay: { borderColor: 'rgba(248, 113, 113, 0.2)' },
  dayNumber: { fontSize: '12px', fontWeight: 'bold', lineHeight: 1 },
  serviceCode: { fontSize: '9px', fontWeight: 'bold', marginTop: '1px', lineHeight: 1 },
  posteCode: { fontSize: '7px', lineHeight: 1 },
  supplement: { fontSize: '6px', color: '#a855f7', fontStyle: 'italic', fontWeight: 'bold', lineHeight: 1 },
  legend: { 
    display: 'flex', 
    justifyContent: 'center', 
    gap: '4px', 
    padding: '8px', 
    flexWrap: 'wrap',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  legendItem: { padding: '3px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: 'bold' },
  
  // Styles pour la modal d'édition
  editOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 10000,
    padding: '10px'
  },
  editModal: {
    backgroundColor: 'white', borderRadius: '12px', padding: '16px',
    width: '100%', maxWidth: '400px', maxHeight: '85vh', overflow: 'auto'
  },
  editHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  editTitle: { margin: 0, fontSize: '16px', color: '#333' },
  editSubtitle: { margin: '4px 0 0', fontSize: '12px', color: '#666' },
  editCloseBtn: {
    background: 'none', border: 'none', fontSize: '18px',
    color: '#999', cursor: 'pointer', padding: '0 4px'
  },
  section: { marginBottom: '16px' },
  sectionLabel: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' },
  labelHint: { fontWeight: 'normal', fontSize: '10px', color: '#999' },
  serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' },
  serviceBtn: {
    padding: '8px 4px', borderRadius: '6px', border: '1px solid #ddd',
    backgroundColor: '#f5f5f5', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
  },
  serviceBtnSelected: { backgroundColor: '#e3f2fd', borderColor: '#2196F3', boxShadow: '0 0 0 2px rgba(33, 150, 243, 0.3)' },
  serviceBtnCode: { display: 'block', fontWeight: 'bold', fontSize: '13px', color: '#333' },
  serviceBtnDesc: { display: 'block', fontSize: '8px', color: '#666', marginTop: '2px' },
  posteGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
  posteBtn: {
    padding: '8px', borderRadius: '6px', border: '1px solid #ddd',
    backgroundColor: '#f5f5f5', cursor: 'pointer', fontWeight: '600', fontSize: '11px', color: '#333'
  },
  posteBtnSelected: { backgroundColor: '#e3f2fd', borderColor: '#2196F3' },
  suppGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' },
  suppBtn: {
    padding: '8px', borderRadius: '6px', border: '1px solid #ddd',
    backgroundColor: '#f5f5f5', cursor: 'pointer', position: 'relative', textAlign: 'center'
  },
  suppBtnSelected: { backgroundColor: '#e8f5e9', borderColor: '#4CAF50' },
  suppCode: { fontWeight: '600', fontSize: '10px', fontStyle: 'italic', color: '#333' },
  checkMark: { position: 'absolute', top: '2px', right: '4px', color: '#4CAF50', fontSize: '10px' },
  selectedSupp: { marginTop: '8px', padding: '6px', backgroundColor: '#f5f5f5', borderRadius: '6px', fontSize: '11px', color: '#666' },
  noteInput: {
    width: '100%', minHeight: '60px', padding: '8px', borderRadius: '6px',
    border: '1px solid #ddd', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box'
  },
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
