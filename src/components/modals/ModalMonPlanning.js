import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Palette } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { SERVICE_CODES, POSTES_CODES, POSTES_SUPPLEMENTAIRES, GROUPES_AVEC_POSTE, POSTES_PAR_GROUPE, STATUT_CONGE_CODES } from '../../constants/config';
import useColors from '../../hooks/useColors';
import ModalCouleurs from './ModalCouleurs';

/**
 * ModalMonPlanning - Calendrier personnel de l'agent connecté
 * 
 * Affiche un calendrier mensuel avec les services de l'agent.
 * Permet de modifier ses propres services avec le même popup que le planning général.
 * 
 * v1.3 - Harmonisation couleurs avec Planning complet
 * v1.4 - FIX: Calcul correct des jours de la semaine (année dynamique)
 * v1.5 - FIX: Responsive mobile + utilisation CODE_COLORS
 * v1.6 - NEW: Bouton palette + ModalCouleurs (même système que planning général)
 * v1.7 - FIX: Synchronisation couleurs - reloadColors() à la fermeture du panneau
 * v1.8 - Couleurs séparées du planning général (contexte 'perso')
 * v1.9 - FIX: ModalCouleurs sorti de l'overlay pour éviter fermeture au color picker
 * v2.0 - NEW: Support synchronisation couleurs multi-appareils
 * v2.1 - NEW: Support statut_conge combinable (C, C?, CNA) avec service/poste
 */

// Couleurs pour les statuts congé (même que PlanningTable)
const STATUT_CONGE_COLORS = {
  'C': { bg: '#facc15', text: '#713f12' },      // Jaune vif - Congé accordé
  'C?': { bg: '#fef08a', text: '#854d0e' },     // Jaune clair - En attente
  'CNA': { bg: '#fca5a5', text: '#991b1b' }     // Rouge clair - Refusé
};

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
  
  // v2.0: Hook avec email utilisateur pour synchronisation cloud
  const { colors, getServiceColor, reloadColors } = useColors('perso', currentUser?.email);
  const [showColorModal, setShowColorModal] = useState(false);
  
  // Tracker si des modifications ont été faites
  const hasChanges = useRef(false);
  
  // États pour l'édition (comme ModalCellEdit)
  const [editMode, setEditMode] = useState(false);
  const [tempService, setTempService] = useState('');
  const [tempPoste, setTempPoste] = useState('');
  const [tempPostesSupplementaires, setTempPostesSupplementaires] = useState([]);
  const [tempNote, setTempNote] = useState('');
  
  // v2.1: État pour le statut congé
  const [tempStatutConge, setTempStatutConge] = useState('');

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
    // v2.1: Charger le statut congé existant
    setTempStatutConge(existing?.statut_conge || '');
  };

  // Fermer l'éditeur
  const closeEditor = () => {
    setSelectedDay(null);
    setEditMode(false);
    setTempService('');
    setTempPoste('');
    setTempPostesSupplementaires([]);
    setTempNote('');
    setTempStatutConge('');
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

  // v1.7: Fermer le modal couleurs ET recharger les couleurs
  const handleCloseColorModal = () => {
    setShowColorModal(false);
    // Recharger les couleurs depuis localStorage pour synchroniser
    reloadColors();
    console.log('🎨 Couleurs perso rechargées après fermeture du panneau');
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
          // v2.1: Sauvegarder le statut congé
          statut_conge: tempStatutConge || null,
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
   * v1.6: Utilise le hook useColors pour obtenir les couleurs personnalisées
   */
  const getCellBackgroundColor = (planning) => {
    // v2.1: Si statut congé seul (pas de service), utiliser couleur du statut
    if (planning?.statut_conge && !planning?.service_code) {
      return STATUT_CONGE_COLORS[planning.statut_conge]?.bg || 'rgba(255, 255, 255, 0.08)';
    }
    
    if (!planning?.service_code) return 'rgba(255, 255, 255, 0.08)';
    
    const code = planning.service_code.toUpperCase();
    const colorConfig = getServiceColor(code);
    
    if (!colorConfig || colorConfig.bg === 'transparent') {
      return 'rgba(255, 255, 255, 0.08)';
    }
    
    return colorConfig.bg;
  };

  const getCellTextColor = (planning) => {
    // v2.1: Si statut congé seul (pas de service), utiliser couleur du statut
    if (planning?.statut_conge && !planning?.service_code) {
      return STATUT_CONGE_COLORS[planning.statut_conge]?.text || 'white';
    }
    
    if (!planning?.service_code) return 'white';
    
    const code = planning.service_code.toUpperCase();
    const colorConfig = getServiceColor(code);
    
    if (!colorConfig || colorConfig.bg === 'transparent') {
      return 'white';
    }
    
    return colorConfig.text;
  };

  // v2.1: Fonction pour obtenir le style du statut congé
  const getStatutCongeStyle = (statutConge) => {
    if (!statutConge || !STATUT_CONGE_COLORS[statutConge]) return {};
    return STATUT_CONGE_COLORS[statutConge];
  };

  // v2.1: Rendu du contenu de la cellule avec support statut_conge
  const renderCellContent = (planning) => {
    if (!planning) return null;
    
    const serviceCode = planning.service_code;
    const posteCode = planning.poste_code;
    const statutConge = planning.statut_conge;
    const postesSupp = planning.postes_supplementaires;
    
    // Cas 1: Statut congé seul (pas de service ni poste)
    if (statutConge && !serviceCode && !posteCode) {
      return (
        <span 
          style={{
            ...styles.serviceCode,
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '1px 3px',
            borderRadius: '3px',
            backgroundColor: STATUT_CONGE_COLORS[statutConge]?.bg,
            color: STATUT_CONGE_COLORS[statutConge]?.text
          }}
        >
          {statutConge}
        </span>
      );
    }
    
    // Cas 2: Service avec éventuellement poste et/ou statut congé
    return (
      <>
        {/* Service code */}
        {serviceCode && (
          <span style={{
            ...styles.serviceCode, 
            color: getCellTextColor(planning)
          }}>{serviceCode}</span>
        )}
        
        {/* Ligne du bas : Poste et/ou Statut congé */}
        {(posteCode || statutConge) && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '2px',
            marginTop: '1px'
          }}>
            {/* Poste */}
            {posteCode && (
              <span style={{
                ...styles.posteCode, 
                color: getCellTextColor(planning), 
                opacity: 0.75
              }}>{posteCode}</span>
            )}
            
            {/* Séparateur si poste ET statut */}
            {posteCode && statutConge && (
              <span style={{ 
                fontSize: '6px', 
                opacity: 0.5,
                color: getCellTextColor(planning)
              }}>|</span>
            )}
            
            {/* Statut congé */}
            {statutConge && (
              <span style={{
                fontSize: '6px',
                fontWeight: 'bold',
                padding: '0px 2px',
                borderRadius: '2px',
                backgroundColor: STATUT_CONGE_COLORS[statutConge]?.bg,
                color: STATUT_CONGE_COLORS[statutConge]?.text
              }}>{statutConge}</span>
            )}
          </div>
        )}
        
        {/* Postes supplémentaires */}
        {postesSupp?.length > 0 && (
          <span style={{
            ...styles.supplement,
            color: colors.postesSupp?.text || '#a855f7'
          }}>
            {postesSupp.map(p => p.replace('+', '')).join(' ')}
          </span>
        )}
      </>
    );
  };

  if (!isOpen) return null;

  const calendarDays = generateCalendarDays();
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // v1.9: Utilisation de Fragment pour sortir ModalCouleurs de l'overlay
  return (
    <>
      {/* Overlay principal de Mon Planning */}
      <div style={styles.overlay} onClick={handleClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          {/* Header avec bouton palette */}
          <div style={styles.header}>
            <h2 style={styles.title}>📆 Mon Planning</h2>
            <div style={styles.headerActions}>
              <button 
                style={styles.paletteBtn} 
                onClick={() => setShowColorModal(true)}
                title="Personnaliser les couleurs (Mon Planning)"
              >
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
                        backgroundColor: dayInfo.currentMonth ? getCellBackgroundColor(dayInfo.planning) : 'transparent',
                        color: dayInfo.currentMonth ? getCellTextColor(dayInfo.planning) : 'rgba(255,255,255,0.2)'
                      }}
                      onClick={() => handleDayClick(dayInfo)}
                    >
                      <span style={{
                        ...styles.dayNumber, 
                        color: dayInfo.currentMonth ? getCellTextColor(dayInfo.planning) : 'rgba(255,255,255,0.2)'
                      }}>{dayInfo.day}</span>
                      
                      {/* v2.1: Utiliser renderCellContent pour le contenu */}
                      {dayInfo.planning && renderCellContent(dayInfo.planning)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Légende compacte - v2.1: Ajout C, C?, CNA */}
          <div style={styles.legend}>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('-').bg || 'rgba(255,255,255,0.1)', color: getServiceColor('-').text || 'white', border: '1px solid rgba(255,255,255,0.2)'}}>- O X</span>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('RP').bg, color: getServiceColor('RP').text}}>RP</span>
            <span style={{...styles.legendItem, backgroundColor: STATUT_CONGE_COLORS['C'].bg, color: STATUT_CONGE_COLORS['C'].text}}>C</span>
            <span style={{...styles.legendItem, backgroundColor: STATUT_CONGE_COLORS['C?'].bg, color: STATUT_CONGE_COLORS['C?'].text}}>C?</span>
            <span style={{...styles.legendItem, backgroundColor: STATUT_CONGE_COLORS['CNA'].bg, color: STATUT_CONGE_COLORS['CNA'].text}}>CNA</span>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('MA').bg, color: getServiceColor('MA').text}}>MA</span>
            <span style={{...styles.legendItem, backgroundColor: getServiceColor('D').bg, color: getServiceColor('D').text}}>D</span>
          </div>
        </div>

        {/* Modal d'édition (comme ModalCellEdit) - reste dans l'overlay */}
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

              {/* v2.1: Section Statut Congé (NOUVEAU) */}
              <div style={styles.section}>
                <label style={styles.sectionLabel}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor: '#fef08a',
                      color: '#854d0e',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>Congés</span>
                    Statut congé
                    <span style={{ fontWeight: 'normal', fontSize: '10px', color: '#999' }}>(combinable)</span>
                  </span>
                </label>
                <div style={styles.statutCongeGrid}>
                  {STATUT_CONGE_CODES && STATUT_CONGE_CODES.filter(s => s.code !== '').map(({ code, desc }) => (
                    <button
                      key={code}
                      onClick={() => setTempStatutConge(tempStatutConge === code ? '' : code)}
                      style={{
                        ...styles.statutCongeBtn,
                        ...(tempStatutConge === code ? {
                          ...styles.statutCongeBtnSelected,
                          backgroundColor: STATUT_CONGE_COLORS[code]?.bg,
                          color: STATUT_CONGE_COLORS[code]?.text
                        } : {
                          backgroundColor: STATUT_CONGE_COLORS[code]?.bg + '80',
                          color: STATUT_CONGE_COLORS[code]?.text
                        })
                      }}
                    >
                      <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{code}</span>
                      <span style={{ fontSize: '9px', marginTop: '2px' }}>{desc}</span>
                    </button>
                  ))}
                </div>
                {tempStatutConge && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#92400e'
                  }}>
                    Statut sélectionné : <strong>{tempStatutConge}</strong>
                    {tempService && <span style={{ marginLeft: '4px' }}>(combiné avec {tempService})</span>}
                  </div>
                )}
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
                    style={{...styles.saveBtn, opacity: (!tempService && !tempStatutConge) ? 0.5 : 1}}
                    onClick={saveEdit}
                    disabled={!tempService && !tempStatutConge}
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* v2.0: Modal Couleurs avec email pour synchronisation cloud */}
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
// STYLES - v2.1: Ajout styles statut congé
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
    padding: '8px'
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '420px',
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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  title: { margin: 0, color: '#00f0ff', fontSize: '16px' },
  paletteBtn: {
    background: 'rgba(0, 240, 255, 0.15)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    color: '#00f0ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
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
  supplement: { fontSize: '6px', fontStyle: 'italic', fontWeight: 'bold', lineHeight: 1 },
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
  
  // v2.1: Styles pour statut congé
  statutCongeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' },
  statutCongeBtn: {
    padding: '10px 6px', borderRadius: '6px', border: '2px solid transparent',
    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
    display: 'flex', flexDirection: 'column', alignItems: 'center'
  },
  statutCongeBtnSelected: { 
    borderColor: '#333', 
    boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.2)' 
  },
  
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
