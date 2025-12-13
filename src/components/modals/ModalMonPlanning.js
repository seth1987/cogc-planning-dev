import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

/**
 * ModalMonPlanning - Calendrier personnel de l'agent connecté
 * 
 * Affiche un calendrier mensuel avec les services de l'agent.
 * Permet de modifier ses propres services.
 * 
 * v1.0 - Création initiale
 */
const ModalMonPlanning = ({ isOpen, onClose, currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [planningData, setPlanningData] = useState({});
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [serviceCodes, setServiceCodes] = useState([]);

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

  // Charger les codes de service disponibles
  const loadServiceCodes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('service_codes')
        .select('code, label, type_service')
        .order('code');

      if (error) throw error;
      setServiceCodes(data || []);
    } catch (err) {
      console.error('Erreur chargement codes:', err);
    }
  }, []);

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
      loadAgentInfo();
      loadServiceCodes();
    }
  }, [isOpen, loadAgentInfo, loadServiceCodes]);

  useEffect(() => {
    if (agentInfo) {
      loadPlanning();
    }
  }, [agentInfo, loadPlanning]);

  // Navigation mois
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  // Générer les jours du calendrier
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Jour de la semaine du 1er (0=Dim, 1=Lun...)
    let startDay = firstDayOfMonth.getDay();
    // Convertir pour commencer par Lundi (0=Lun, 6=Dim)
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];

    // Jours du mois précédent
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        currentMonth: false,
        date: null
      });
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

    // Jours du mois suivant pour compléter
    const remainingDays = 42 - days.length; // 6 semaines x 7 jours
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        currentMonth: false,
        date: null
      });
    }

    return days;
  };

  // Cliquer sur un jour
  const handleDayClick = (dayInfo) => {
    if (!dayInfo.currentMonth) return;
    setSelectedDay(dayInfo);
    setEditMode(false);
    setEditValue(dayInfo.planning?.service_code || '');
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
          service_code: editValue || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'agent_id,date'
        });

      if (error) throw error;

      // Recharger
      await loadPlanning();
      setEditMode(false);
      setSelectedDay(null);
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Couleur selon le type de service
  const getServiceColor = (planning) => {
    if (!planning?.service_code) return 'transparent';
    
    const code = planning.service_code.toUpperCase();
    
    if (code.includes('RP') || code === 'RP') return '#4CAF50';
    if (code.includes('CP')) return '#2196F3';
    if (code.includes('MA') || code.includes('MALADIE')) return '#FF9800';
    if (code.includes('DISPO')) return '#9C27B0';
    if (code.includes('FORMA') || code.includes('INACTIN')) return '#607D8B';
    
    // Par type de service (matin/soir/nuit)
    const type = planning.type_service;
    if (type === 'matin') return '#FFC107';
    if (type === 'soiree') return '#FF5722';
    if (type === 'nuit') return '#3F51B5';
    
    return '#00BCD4';
  };

  if (!isOpen) return null;

  const calendarDays = generateCalendarDays();
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📆 Mon Planning</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
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
          {/* En-têtes jours */}
          <div style={styles.weekHeader}>
            {weekDays.map(day => (
              <div key={day} style={styles.weekDay}>{day}</div>
            ))}
          </div>

          {/* Grille jours */}
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
                    backgroundColor: dayInfo.currentMonth ? getServiceColor(dayInfo.planning) : 'transparent'
                  }}
                  onClick={() => handleDayClick(dayInfo)}
                >
                  <span style={styles.dayNumber}>{dayInfo.day}</span>
                  {dayInfo.planning?.service_code && (
                    <span style={styles.serviceCode}>
                      {dayInfo.planning.service_code}
                    </span>
                  )}
                  {dayInfo.planning?.position_supplementaire && (
                    <span style={styles.supplement}>
                      {dayInfo.planning.position_supplementaire}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel détail jour sélectionné */}
        {selectedDay && (
          <div style={styles.detailPanel}>
            <h3 style={styles.detailTitle}>
              {selectedDay.day} {months[currentMonth]} {currentYear}
            </h3>
            
            {editMode ? (
              <div style={styles.editForm}>
                <select
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- Aucun service --</option>
                  {serviceCodes.map(sc => (
                    <option key={sc.code} value={sc.code}>
                      {sc.code} - {sc.label}
                    </option>
                  ))}
                </select>
                <div style={styles.editActions}>
                  <button style={styles.saveBtn} onClick={saveEdit}>Sauvegarder</button>
                  <button style={styles.cancelBtn} onClick={() => setEditMode(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={styles.detailContent}>
                <p><strong>Service:</strong> {selectedDay.planning?.service_code || 'Non défini'}</p>
                {selectedDay.planning?.position_supplementaire && (
                  <p><strong>Position sup:</strong> {selectedDay.planning.position_supplementaire}</p>
                )}
                {selectedDay.planning?.commentaire && (
                  <p><strong>Note:</strong> {selectedDay.planning.commentaire}</p>
                )}
                <button style={styles.editBtn} onClick={() => setEditMode(true)}>
                  ✏️ Modifier
                </button>
              </div>
            )}
          </div>
        )}

        {/* Légende */}
        <div style={styles.legend}>
          <span style={{...styles.legendItem, backgroundColor: '#4CAF50'}}>RP</span>
          <span style={{...styles.legendItem, backgroundColor: '#2196F3'}}>CP</span>
          <span style={{...styles.legendItem, backgroundColor: '#FFC107'}}>Matin</span>
          <span style={{...styles.legendItem, backgroundColor: '#FF5722'}}>Soir</span>
          <span style={{...styles.legendItem, backgroundColor: '#3F51B5'}}>Nuit</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  title: {
    margin: 0,
    color: '#00f0ff',
    fontSize: '20px'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '5px 10px'
  },
  agentInfo: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    backgroundColor: 'rgba(0, 102, 179, 0.2)'
  },
  agentName: {
    color: 'white',
    fontWeight: 'bold'
  },
  agentGroup: {
    color: '#00f0ff',
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  monthNav: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    padding: '15px'
  },
  navBtn: {
    background: 'rgba(0, 240, 255, 0.2)',
    border: '1px solid rgba(0, 240, 255, 0.4)',
    color: 'white',
    padding: '8px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  monthTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    minWidth: '180px',
    textAlign: 'center'
  },
  calendar: {
    padding: '0 20px'
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '5px',
    marginBottom: '10px'
  },
  weekDay: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '8px 0'
  },
  loading: {
    textAlign: 'center',
    color: 'white',
    padding: '40px'
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '5px'
  },
  dayCell: {
    aspectRatio: '1',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.2s ease',
    minHeight: '50px'
  },
  currentMonthDay: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  otherMonthDay: {
    opacity: 0.3,
    cursor: 'default'
  },
  selectedDay: {
    border: '2px solid #00f0ff !important',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.5)'
  },
  dayNumber: {
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  serviceCode: {
    fontSize: '9px',
    color: 'white',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
  },
  supplement: {
    fontSize: '8px',
    color: '#FFD700',
    fontStyle: 'italic'
  },
  detailPanel: {
    margin: '20px',
    padding: '15px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 240, 255, 0.2)'
  },
  detailTitle: {
    color: '#00f0ff',
    margin: '0 0 15px 0',
    fontSize: '16px'
  },
  detailContent: {
    color: 'white'
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  select: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    backgroundColor: '#0a0a12',
    color: 'white',
    fontSize: '14px'
  },
  editActions: {
    display: 'flex',
    gap: '10px'
  },
  editBtn: {
    marginTop: '15px',
    padding: '10px 20px',
    backgroundColor: 'rgba(0, 102, 179, 0.3)',
    border: '1px solid #0066b3',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  saveBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#4CAF50',
    border: 'none',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#666',
    border: 'none',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    padding: '15px',
    flexWrap: 'wrap'
  },
  legendItem: {
    padding: '4px 10px',
    borderRadius: '10px',
    fontSize: '10px',
    color: 'white',
    fontWeight: 'bold'
  }
};

export default ModalMonPlanning;
