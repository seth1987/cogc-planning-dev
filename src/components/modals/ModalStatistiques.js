import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

/**
 * ModalStatistiques - Compteurs et analyses pour l'agent connecté
 * 
 * Affiche les statistiques de l'agent :
 * - Compteurs par type de vacation : - (Matin), O (Soir), X (Nuit), RP, MA
 * - Compteurs congés définitifs : C (accordé), CNA (refusé)
 * - Compteurs des positions supplémentaires (+CCU, +RO, +RC, etc.)
 * - Détails mensuels repliables en fin de modal
 * 
 * v1.4 - Sections détails repliables à la fin, RP/MA dans vacations, simplification
 */
const ModalStatistiques = ({ isOpen, onClose, currentUser }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    byMonth: {},
    annual: {},
    supplements: {},
    conges: {}
  });
  
  // États pour les sections repliables (fermées par défaut)
  const [showDetailMois, setShowDetailMois] = useState(false);
  const [showDetailSupplements, setShowDetailSupplements] = useState(false);

  const months = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  // Liste des postes supplémentaires possibles
  const supplementTypes = ['+ACR', '+RO', '+RC', '+CCU', '+RE', '+OV'];

  // Couleurs pour les statuts congé définitifs
  const congeColors = {
    'C': { bg: '#facc15', text: '#713f12', label: 'Accordé' },
    'CNA': { bg: '#fca5a5', text: '#991b1b', label: 'Refusé' }
  };

  // Couleurs pour les postes supplémentaires
  const supplementColors = {
    '+ACR': '#9C27B0',
    '+RO': '#E91E63',
    '+RC': '#00BCD4',
    '+CCU': '#FF9800',
    '+RE': '#8BC34A',
    '+OV': '#795548'
  };

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

  // Calculer les statistiques
  const loadStats = useCallback(async () => {
    if (!agentInfo?.id) return;

    setLoading(true);
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data, error } = await supabase
        .from('planning')
        .select('*')
        .eq('agent_id', agentInfo.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      // Initialiser les compteurs
      const byMonth = {};
      const annual = {
        matin: 0, soiree: 0, nuit: 0,
        rp: 0, ma: 0,
        total: 0
      };
      const supplements = {};
      
      const conges = {
        'C': { count: 0, byMonth: {} },
        'CNA': { count: 0, byMonth: {} }
      };

      // Initialiser chaque mois
      for (let i = 0; i < 12; i++) {
        byMonth[i] = {
          matin: 0, soiree: 0, nuit: 0,
          rp: 0, ma: 0,
          total: 0
        };
        conges['C'].byMonth[i] = 0;
        conges['CNA'].byMonth[i] = 0;
      }

      // Initialiser tous les types de postes supplémentaires
      supplementTypes.forEach(sup => {
        supplements[sup] = { 
          count: 0, 
          byMonth: {} 
        };
        for (let i = 0; i < 12; i++) {
          supplements[sup].byMonth[i] = 0;
        }
      });

      // Analyser les données
      (data || []).forEach(entry => {
        const month = new Date(entry.date).getMonth();
        const code = (entry.service_code || '').toUpperCase().trim();
        const statutConge = (entry.statut_conge || '').toUpperCase().trim();

        // Compter les statuts congé DÉFINITIFS uniquement (C et CNA)
        if (statutConge === 'C' || statutConge === 'CNA') {
          conges[statutConge].count++;
          conges[statutConge].byMonth[month]++;
        }

        // === COMPTAGE DES VACATIONS ===
        if (code === '-') {
          byMonth[month].matin++;
          annual.matin++;
          byMonth[month].total++;
          annual.total++;
        }
        else if (code === 'O') {
          byMonth[month].soiree++;
          annual.soiree++;
          byMonth[month].total++;
          annual.total++;
        }
        else if (code === 'X') {
          byMonth[month].nuit++;
          annual.nuit++;
          byMonth[month].total++;
          annual.total++;
        }
        else if (code === 'RP' || code === 'RU') {
          byMonth[month].rp++;
          annual.rp++;
        }
        else if (code === 'C' || code === 'CP') {
          if (!statutConge) {
            conges['C'].count++;
            conges['C'].byMonth[month]++;
          }
        }
        else if (code === 'MA' || code === 'MALADIE') {
          byMonth[month].ma++;
          annual.ma++;
        }
        else if (code && !['RP', 'RU', 'C', 'CP', 'MA', 'MALADIE', 'NU', 'VT', 'I'].includes(code)) {
          byMonth[month].total++;
          annual.total++;
        }

        // Compter les positions supplémentaires
        if (entry.postes_supplementaires && Array.isArray(entry.postes_supplementaires)) {
          entry.postes_supplementaires.forEach(sup => {
            const supCode = sup.toUpperCase();
            if (!supplements[supCode]) {
              supplements[supCode] = { count: 0, byMonth: {} };
              for (let i = 0; i < 12; i++) {
                supplements[supCode].byMonth[i] = 0;
              }
            }
            supplements[supCode].count++;
            supplements[supCode].byMonth[month]++;
          });
        }
      });

      setStats({ byMonth, annual, supplements, conges });
    } catch (err) {
      console.error('Erreur calcul stats:', err);
    } finally {
      setLoading(false);
    }
  }, [agentInfo, selectedYear]);

  // Effets
  useEffect(() => {
    if (isOpen) {
      loadAgentInfo();
      setShowDetailMois(false);
      setShowDetailSupplements(false);
    }
  }, [isOpen, loadAgentInfo]);

  useEffect(() => {
    if (agentInfo) {
      loadStats();
    }
  }, [agentInfo, loadStats]);

  // Calculer le pourcentage
  const getPercentage = (value, total) => {
    if (!total || total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  // Calculer le total mensuel des postes supplémentaires
  const getMonthSupplementTotal = (monthIdx) => {
    return Object.values(stats.supplements).reduce((sum, sup) => {
      return sum + (sup.byMonth[monthIdx] || 0);
    }, 0);
  };

  // Calculer le total annuel des postes supplémentaires
  const getTotalSupplements = () => {
    return Object.values(stats.supplements).reduce((sum, sup) => sum + sup.count, 0);
  };

  // Obtenir les postes supplémentaires avec données (triés par count)
  const getActiveSupplements = () => {
    return Object.entries(stats.supplements)
      .filter(([_, data]) => data.count > 0)
      .sort((a, b) => b[1].count - a[1].count);
  };

  // Calculer le total des congés définitifs (C + CNA)
  const getTotalConges = () => {
    if (!stats.conges) return 0;
    return (stats.conges['C']?.count || 0) + (stats.conges['CNA']?.count || 0);
  };

  if (!isOpen) return null;

  // Totaux
  const totalVacations = stats.annual.matin + stats.annual.soiree + stats.annual.nuit + stats.annual.rp + stats.annual.ma;
  const totalSupplements = getTotalSupplements();
  const activeSupplements = getActiveSupplements();
  const totalConges = getTotalConges();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>📊 Statistiques</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Info agent */}
        {agentInfo && (
          <div style={styles.agentInfo}>
            <span style={styles.agentName}>{agentInfo.nom} {agentInfo.prenom}</span>
            <span style={styles.agentGroup}>{agentInfo.groupe}</span>
          </div>
        )}

        {/* Sélecteur année */}
        <div style={styles.yearSelector}>
          <button 
            style={styles.yearBtn} 
            onClick={() => setSelectedYear(y => y - 1)}
          >
            ◀
          </button>
          <span style={styles.yearTitle}>{selectedYear}</span>
          <button 
            style={styles.yearBtn} 
            onClick={() => setSelectedYear(y => y + 1)}
          >
            ▶
          </button>
        </div>

        {loading ? (
          <div style={styles.loading}>Chargement des statistiques...</div>
        ) : (
          <div style={styles.content}>
            {/* Vacations (Matin, Soir, Nuit, RP, MA) */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📅 Vacations {selectedYear}</h3>
              <div style={styles.vacationsGrid}>
                {/* Matinées */}
                <div style={styles.statCard}>
                  <div style={{...styles.statIcon, backgroundColor: '#FFC107'}}>
                    {stats.annual.matin}
                  </div>
                  <div style={styles.statLabel}>Matinées</div>
                  <div style={styles.statMarker}>( - )</div>
                </div>
                
                {/* Soirées */}
                <div style={styles.statCard}>
                  <div style={{...styles.statIcon, backgroundColor: '#FF5722'}}>
                    {stats.annual.soiree}
                  </div>
                  <div style={styles.statLabel}>Soirées</div>
                  <div style={styles.statMarker}>( O )</div>
                </div>
                
                {/* Nuits */}
                <div style={styles.statCard}>
                  <div style={{...styles.statIcon, backgroundColor: '#3F51B5'}}>
                    {stats.annual.nuit}
                  </div>
                  <div style={styles.statLabel}>Nuits</div>
                  <div style={styles.statMarker}>( X )</div>
                </div>

                {/* RP */}
                <div style={styles.statCard}>
                  <div style={{...styles.statIcon, backgroundColor: '#4CAF50'}}>
                    {stats.annual.rp}
                  </div>
                  <div style={styles.statLabel}>Repos</div>
                  <div style={styles.statMarker}>( RP )</div>
                </div>

                {/* MA */}
                <div style={styles.statCard}>
                  <div style={{...styles.statIcon, backgroundColor: '#f44336'}}>
                    {stats.annual.ma}
                  </div>
                  <div style={styles.statLabel}>Maladie</div>
                  <div style={styles.statMarker}>( MA )</div>
                </div>
              </div>
              
              <div style={styles.totalBox}>
                <strong>Total :</strong> {totalVacations}
              </div>
            </div>

            {/* Congés (C / CNA) */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🏖️ Congés {selectedYear}</h3>
              <div style={styles.congesGrid}>
                {/* C - Accordé */}
                <div style={{
                  ...styles.statCardConge,
                  backgroundColor: `${congeColors['C'].bg}30`,
                  borderColor: congeColors['C'].bg
                }}>
                  <div style={{
                    ...styles.statIconConge, 
                    backgroundColor: congeColors['C'].bg,
                    color: congeColors['C'].text
                  }}>
                    {stats.conges?.['C']?.count || 0}
                  </div>
                  <div style={{...styles.statLabel, color: congeColors['C'].text}}>C</div>
                  <div style={{...styles.statMarkerConge, color: congeColors['C'].text}}>
                    {congeColors['C'].label}
                  </div>
                </div>
                
                {/* CNA - Refusé */}
                <div style={{
                  ...styles.statCardConge,
                  backgroundColor: `${congeColors['CNA'].bg}30`,
                  borderColor: congeColors['CNA'].bg
                }}>
                  <div style={{
                    ...styles.statIconConge, 
                    backgroundColor: congeColors['CNA'].bg,
                    color: congeColors['CNA'].text
                  }}>
                    {stats.conges?.['CNA']?.count || 0}
                  </div>
                  <div style={{...styles.statLabel, color: congeColors['CNA'].text}}>CNA</div>
                  <div style={{...styles.statMarkerConge, color: congeColors['CNA'].text}}>
                    {congeColors['CNA'].label}
                  </div>
                </div>
              </div>
              
              {totalConges > 0 && (
                <div style={{...styles.totalBox, backgroundColor: 'rgba(250, 204, 21, 0.15)'}}>
                  <strong>Total congés :</strong> {totalConges}
                </div>
              )}
            </div>

            {/* Positions Supplémentaires */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>⚡ Positions Supplémentaires {selectedYear}</h3>
              
              <div style={styles.supplementsSummary}>
                {activeSupplements.length > 0 ? (
                  activeSupplements.map(([sup, data]) => (
                    <div key={sup} style={{
                      ...styles.supplementCard,
                      borderColor: supplementColors[sup] || '#FFD700',
                      backgroundColor: `${supplementColors[sup] || '#FFD700'}20`
                    }}>
                      <div style={{...styles.supplementName, color: supplementColors[sup] || '#FFD700'}}>
                        {sup}
                      </div>
                      <div style={styles.supplementCount}>{data.count}</div>
                      <div style={styles.supplementPercent}>
                        {getPercentage(data.count, totalSupplements)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={styles.noData}>Aucune position supplémentaire enregistrée</p>
                )}
              </div>
              
              {totalSupplements > 0 && (
                <div style={styles.totalBox}>
                  <strong>Total positions supplémentaires :</strong> {totalSupplements}
                </div>
              )}
            </div>

            {/* === SECTIONS REPLIABLES À LA FIN === */}

            {/* Détail par Mois - REPLIABLE */}
            <div style={styles.section}>
              <h3 
                style={styles.sectionTitleClickable} 
                onClick={() => setShowDetailMois(!showDetailMois)}
              >
                <span style={styles.toggleIcon}>{showDetailMois ? '▼' : '▶'}</span>
                📆 Détail par Mois
              </h3>
              
              {showDetailMois && (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Mois</th>
                        <th style={{...styles.th, color: '#FFC107'}}>-</th>
                        <th style={{...styles.th, color: '#FF5722'}}>O</th>
                        <th style={{...styles.th, color: '#3F51B5'}}>X</th>
                        <th style={{...styles.th, color: '#4CAF50'}}>RP</th>
                        <th style={{...styles.th, color: '#facc15'}}>C</th>
                        <th style={{...styles.th, color: '#fca5a5'}}>CNA</th>
                        <th style={{...styles.th, color: '#f44336'}}>MA</th>
                        <th style={styles.th}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map((month, idx) => (
                        <tr key={idx} style={styles.tr}>
                          <td style={styles.td}>{month}</td>
                          <td style={{...styles.td, color: '#FFC107', fontWeight: 'bold'}}>
                            {stats.byMonth[idx]?.matin || 0}
                          </td>
                          <td style={{...styles.td, color: '#FF5722', fontWeight: 'bold'}}>
                            {stats.byMonth[idx]?.soiree || 0}
                          </td>
                          <td style={{...styles.td, color: '#3F51B5', fontWeight: 'bold'}}>
                            {stats.byMonth[idx]?.nuit || 0}
                          </td>
                          <td style={styles.td}>{stats.byMonth[idx]?.rp || 0}</td>
                          <td style={{...styles.td, color: '#facc15', fontWeight: stats.conges?.['C']?.byMonth[idx] > 0 ? 'bold' : 'normal'}}>
                            {stats.conges?.['C']?.byMonth[idx] || 0}
                          </td>
                          <td style={{...styles.td, color: '#fca5a5', fontWeight: stats.conges?.['CNA']?.byMonth[idx] > 0 ? 'bold' : 'normal'}}>
                            {stats.conges?.['CNA']?.byMonth[idx] || 0}
                          </td>
                          <td style={styles.td}>{stats.byMonth[idx]?.ma || 0}</td>
                          <td style={{...styles.td, fontWeight: 'bold'}}>
                            {stats.byMonth[idx]?.total || 0}
                          </td>
                        </tr>
                      ))}
                      {/* Ligne totaux */}
                      <tr style={{...styles.tr, backgroundColor: 'rgba(0, 240, 255, 0.1)'}}>
                        <td style={{...styles.td, fontWeight: 'bold'}}>TOTAL</td>
                        <td style={{...styles.td, color: '#FFC107', fontWeight: 'bold'}}>{stats.annual.matin}</td>
                        <td style={{...styles.td, color: '#FF5722', fontWeight: 'bold'}}>{stats.annual.soiree}</td>
                        <td style={{...styles.td, color: '#3F51B5', fontWeight: 'bold'}}>{stats.annual.nuit}</td>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{stats.annual.rp}</td>
                        <td style={{...styles.td, color: '#facc15', fontWeight: 'bold'}}>{stats.conges?.['C']?.count || 0}</td>
                        <td style={{...styles.td, color: '#fca5a5', fontWeight: 'bold'}}>{stats.conges?.['CNA']?.count || 0}</td>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{stats.annual.ma}</td>
                        <td style={{...styles.td, fontWeight: 'bold'}}>{stats.annual.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Détail Postes Supplémentaires par Mois - REPLIABLE */}
            {totalSupplements > 0 && (
              <div style={styles.section}>
                <h3 
                  style={styles.sectionTitleClickable}
                  onClick={() => setShowDetailSupplements(!showDetailSupplements)}
                >
                  <span style={styles.toggleIcon}>{showDetailSupplements ? '▼' : '▶'}</span>
                  📆 Détail Postes Supplémentaires par Mois
                </h3>
                
                {showDetailSupplements && (
                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Mois</th>
                          {activeSupplements.map(([sup]) => (
                            <th key={sup} style={{
                              ...styles.th, 
                              color: supplementColors[sup] || '#FFD700',
                              fontSize: '11px'
                            }}>
                              {sup}
                            </th>
                          ))}
                          <th style={styles.th}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {months.map((month, idx) => {
                          const monthTotal = getMonthSupplementTotal(idx);
                          return (
                            <tr key={idx} style={styles.tr}>
                              <td style={styles.td}>{month}</td>
                              {activeSupplements.map(([sup, data]) => (
                                <td key={sup} style={{
                                  ...styles.td, 
                                  color: supplementColors[sup] || '#FFD700',
                                  fontWeight: data.byMonth[idx] > 0 ? 'bold' : 'normal'
                                }}>
                                  {data.byMonth[idx] || 0}
                                </td>
                              ))}
                              <td style={{...styles.td, fontWeight: monthTotal > 0 ? 'bold' : 'normal'}}>
                                {monthTotal}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Ligne totaux */}
                        <tr style={{...styles.tr, backgroundColor: 'rgba(255, 215, 0, 0.1)'}}>
                          <td style={{...styles.td, fontWeight: 'bold'}}>TOTAL</td>
                          {activeSupplements.map(([sup, data]) => (
                            <td key={sup} style={{
                              ...styles.td, 
                              color: supplementColors[sup] || '#FFD700',
                              fontWeight: 'bold'
                            }}>
                              {data.count}
                            </td>
                          ))}
                          <td style={{...styles.td, fontWeight: 'bold', color: '#FFD700'}}>
                            {totalSupplements}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
    maxWidth: '800px',
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
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    backgroundColor: '#1a1a2e',
    zIndex: 10
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
  yearSelector: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '20px', padding: '15px'
  },
  yearBtn: {
    background: 'rgba(0, 240, 255, 0.2)', border: '1px solid rgba(0, 240, 255, 0.4)',
    color: 'white', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px'
  },
  yearTitle: { color: 'white', fontSize: '24px', fontWeight: 'bold' },
  loading: { textAlign: 'center', color: 'white', padding: '40px' },
  content: { padding: '20px' },
  section: { marginBottom: '30px' },
  sectionTitle: {
    color: '#00f0ff', fontSize: '16px', marginBottom: '15px',
    paddingBottom: '10px', borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
  },
  sectionTitleClickable: {
    color: '#00f0ff', 
    fontSize: '16px', 
    marginBottom: '15px',
    paddingBottom: '10px', 
    borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    userSelect: 'none',
    transition: 'color 0.2s ease'
  },
  toggleIcon: {
    fontSize: '12px',
    color: '#00f0ff',
    width: '16px',
    display: 'inline-block'
  },
  vacationsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(5, 1fr)', 
    gap: '12px' 
  },
  congesGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(2, 1fr)', 
    gap: '15px' 
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderRadius: '12px',
    padding: '15px 10px', 
    textAlign: 'center'
  },
  statCardConge: {
    borderRadius: '12px',
    padding: '20px 15px', 
    textAlign: 'center',
    border: '2px solid'
  },
  statIcon: {
    width: '50px', height: '50px', borderRadius: '50%',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    margin: '0 auto 8px', fontSize: '18px', fontWeight: 'bold', color: 'white'
  },
  statIconConge: {
    width: '60px', height: '60px', borderRadius: '50%',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    margin: '0 auto 10px', fontSize: '22px', fontWeight: 'bold'
  },
  statLabel: { color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px', marginBottom: '2px' },
  statMarker: { color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' },
  statMarkerConge: { fontSize: '10px', fontWeight: '500' },
  totalBox: {
    textAlign: 'center', marginTop: '15px', padding: '12px',
    backgroundColor: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', color: 'white', fontSize: '15px'
  },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
  th: {
    padding: '10px 4px', backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: '10px'
  },
  tr: { borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
  td: { padding: '8px 4px', color: 'white', textAlign: 'center', fontSize: '11px' },
  supplementsSummary: {
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
    gap: '12px',
    marginBottom: '15px'
  },
  supplementCard: {
    border: '1px solid',
    borderRadius: '12px', 
    padding: '15px 10px', 
    textAlign: 'center'
  },
  supplementName: { 
    fontSize: '14px', 
    fontWeight: 'bold', 
    marginBottom: '8px' 
  },
  supplementCount: { 
    color: 'white', 
    fontSize: '24px', 
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  supplementPercent: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '11px'
  },
  noData: { color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', fontStyle: 'italic' }
};

export default ModalStatistiques;
