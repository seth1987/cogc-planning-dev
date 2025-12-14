import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

/**
 * ModalStatistiques - Compteurs et analyses pour l'agent connecté
 * 
 * Affiche les statistiques de l'agent :
 * - Compteurs par type de vacation : - (Matin), O (Soir), X (Nuit)
 * - Compteurs RP, CP, MA
 * - Pourcentages mensuels et annuels
 * - Compteurs des positions supplémentaires (+CCU, +RO, +RC, etc.) - MENSUEL et ANNUEL
 * 
 * v1.2 - Ajout décompte mensuel/annuel des postes supplémentaires
 */
const ModalStatistiques = ({ isOpen, onClose, currentUser }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    byMonth: {},
    annual: {},
    supplements: {}
  });

  const months = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  const monthsFull = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Liste des postes supplémentaires possibles
  const supplementTypes = ['+ACR', '+RO', '+RC', '+CCU', '+RE', '+OV'];

  // Catégories de comptage - CORRIGÉES selon les marqueurs
  const categories = [
    { key: 'matin', label: 'Matinées (-)', color: '#FFC107', marker: '-' },
    { key: 'soiree', label: 'Soirées (O)', color: '#FF5722', marker: 'O' },
    { key: 'nuit', label: 'Nuits (X)', color: '#3F51B5', marker: 'X' },
    { key: 'rp', label: 'RP', color: '#4CAF50' },
    { key: 'cp', label: 'CP/C', color: '#2196F3' },
    { key: 'ma', label: 'MA', color: '#f44336' }
  ];

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

  // Calculer les statistiques - LOGIQUE CORRIGÉE
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
        rp: 0, cp: 0, ma: 0,
        total: 0
      };
      const supplements = {};

      // Initialiser chaque mois
      for (let i = 0; i < 12; i++) {
        byMonth[i] = {
          matin: 0, soiree: 0, nuit: 0,
          rp: 0, cp: 0, ma: 0,
          total: 0
        };
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

      // Analyser les données avec la BONNE logique
      (data || []).forEach(entry => {
        const month = new Date(entry.date).getMonth();
        const code = (entry.service_code || '').toUpperCase().trim();

        // === COMPTAGE DES VACATIONS selon les marqueurs ===
        // Matinée = "-"
        if (code === '-') {
          byMonth[month].matin++;
          annual.matin++;
          byMonth[month].total++;
          annual.total++;
        }
        // Soirée = "O"
        else if (code === 'O') {
          byMonth[month].soiree++;
          annual.soiree++;
          byMonth[month].total++;
          annual.total++;
        }
        // Nuit = "X"
        else if (code === 'X') {
          byMonth[month].nuit++;
          annual.nuit++;
          byMonth[month].total++;
          annual.total++;
        }
        // === COMPTAGE DES ABSENCES ===
        // Repos périodique
        else if (code === 'RP' || code === 'RU') {
          byMonth[month].rp++;
          annual.rp++;
        }
        // Congés
        else if (code === 'C' || code === 'CP') {
          byMonth[month].cp++;
          annual.cp++;
        }
        // Maladie
        else if (code === 'MA' || code === 'MALADIE') {
          byMonth[month].ma++;
          annual.ma++;
        }
        // Autres services (D, DISPO, FO, HAB, etc.) - comptés dans total travaillé
        else if (code && !['RP', 'RU', 'C', 'CP', 'MA', 'MALADIE', 'NU', 'VT', 'I'].includes(code)) {
          byMonth[month].total++;
          annual.total++;
        }

        // Compter les positions supplémentaires
        if (entry.postes_supplementaires && Array.isArray(entry.postes_supplementaires)) {
          entry.postes_supplementaires.forEach(sup => {
            const supCode = sup.toUpperCase();
            // Initialiser si nouveau type de poste supp non prévu
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

      setStats({ byMonth, annual, supplements });
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

  if (!isOpen) return null;

  // Total des vacations (matins + soirs + nuits)
  const totalVacations = stats.annual.matin + stats.annual.soiree + stats.annual.nuit;
  const totalSupplements = getTotalSupplements();
  const activeSupplements = getActiveSupplements();

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
            {/* Résumé annuel - Vacations */}
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
                  <div style={styles.statPercent}>
                    {getPercentage(stats.annual.matin, totalVacations)}
                  </div>
                </div>
                
                {/* Soirées */}
                <div style={styles.statCard}>
                  <div style={{...styles.statIcon, backgroundColor: '#FF5722'}}>
                    {stats.annual.soiree}
                  </div>
                  <div style={styles.statLabel}>Soirées</div>
                  <div style={styles.statMarker}>( O )</div>
                  <div style={styles.statPercent}>
                    {getPercentage(stats.annual.soiree, totalVacations)}
                  </div>
                </div>
                
                {/* Nuits */}
                <div style={styles.statCard}>
                  <div style={{...styles.statIcon, backgroundColor: '#3F51B5'}}>
                    {stats.annual.nuit}
                  </div>
                  <div style={styles.statLabel}>Nuits</div>
                  <div style={styles.statMarker}>( X )</div>
                  <div style={styles.statPercent}>
                    {getPercentage(stats.annual.nuit, totalVacations)}
                  </div>
                </div>
              </div>
              
              <div style={styles.totalBox}>
                <strong>Total vacations :</strong> {totalVacations}
              </div>
            </div>

            {/* Résumé annuel - Absences */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🏠 Absences {selectedYear}</h3>
              <div style={styles.absencesGrid}>
                {/* RP */}
                <div style={styles.statCardSmall}>
                  <div style={{...styles.statIconSmall, backgroundColor: '#4CAF50'}}>
                    {stats.annual.rp}
                  </div>
                  <div style={styles.statLabelSmall}>Repos (RP)</div>
                </div>
                
                {/* CP */}
                <div style={styles.statCardSmall}>
                  <div style={{...styles.statIconSmall, backgroundColor: '#2196F3'}}>
                    {stats.annual.cp}
                  </div>
                  <div style={styles.statLabelSmall}>Congés (C)</div>
                </div>
                
                {/* MA */}
                <div style={styles.statCardSmall}>
                  <div style={{...styles.statIconSmall, backgroundColor: '#f44336'}}>
                    {stats.annual.ma}
                  </div>
                  <div style={styles.statLabelSmall}>Maladie (MA)</div>
                </div>
              </div>
            </div>

            {/* Tableau mensuel vacations */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📆 Détail Vacations par Mois</h3>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Mois</th>
                      <th style={{...styles.th, color: '#FFC107'}}>-</th>
                      <th style={{...styles.th, color: '#FF5722'}}>O</th>
                      <th style={{...styles.th, color: '#3F51B5'}}>X</th>
                      <th style={{...styles.th, color: '#4CAF50'}}>RP</th>
                      <th style={{...styles.th, color: '#2196F3'}}>C</th>
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
                        <td style={styles.td}>{stats.byMonth[idx]?.cp || 0}</td>
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
                      <td style={{...styles.td, fontWeight: 'bold'}}>{stats.annual.cp}</td>
                      <td style={{...styles.td, fontWeight: 'bold'}}>{stats.annual.ma}</td>
                      <td style={{...styles.td, fontWeight: 'bold'}}>{stats.annual.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* === NOUVELLE SECTION : Positions Supplémentaires Détaillées === */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>⚡ Positions Supplémentaires {selectedYear}</h3>
              
              {/* Cartes récapitulatives annuelles */}
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

            {/* Tableau mensuel des positions supplémentaires */}
            {totalSupplements > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📆 Détail Postes Supplémentaires par Mois</h3>
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
              </div>
            )}

            {/* Graphique visuel Vacations */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📈 Répartition Vacations</h3>
              <div style={styles.barChart}>
                {[
                  { key: 'matin', label: 'Matinées (-)', color: '#FFC107' },
                  { key: 'soiree', label: 'Soirées (O)', color: '#FF5722' },
                  { key: 'nuit', label: 'Nuits (X)', color: '#3F51B5' }
                ].map(cat => {
                  const value = stats.annual[cat.key] || 0;
                  const max = Math.max(stats.annual.matin, stats.annual.soiree, stats.annual.nuit, 1);
                  const width = (value / max) * 100;
                  
                  return (
                    <div key={cat.key} style={styles.barRow}>
                      <span style={styles.barLabel}>{cat.label}</span>
                      <div style={styles.barContainer}>
                        <div 
                          style={{
                            ...styles.bar,
                            width: `${width}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                      <span style={styles.barValue}>{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Graphique visuel Postes Supplémentaires */}
            {totalSupplements > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📈 Répartition Postes Supplémentaires</h3>
                <div style={styles.barChart}>
                  {activeSupplements.map(([sup, data]) => {
                    const maxSup = Math.max(...activeSupplements.map(([_, d]) => d.count), 1);
                    const width = (data.count / maxSup) * 100;
                    
                    return (
                      <div key={sup} style={styles.barRow}>
                        <span style={{...styles.barLabel, color: supplementColors[sup] || '#FFD700'}}>
                          {sup}
                        </span>
                        <div style={styles.barContainer}>
                          <div 
                            style={{
                              ...styles.bar,
                              width: `${width}%`,
                              backgroundColor: supplementColors[sup] || '#FFD700'
                            }}
                          />
                        </div>
                        <span style={styles.barValue}>{data.count}</span>
                      </div>
                    );
                  })}
                </div>
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
    maxWidth: '750px',
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
  vacationsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
  absencesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px',
    padding: '20px 15px', textAlign: 'center'
  },
  statCardSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px',
    padding: '12px 10px', textAlign: 'center'
  },
  statIcon: {
    width: '60px', height: '60px', borderRadius: '50%',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    margin: '0 auto 10px', fontSize: '22px', fontWeight: 'bold', color: 'white'
  },
  statIconSmall: {
    width: '45px', height: '45px', borderRadius: '50%',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    margin: '0 auto 8px', fontSize: '16px', fontWeight: 'bold', color: 'white'
  },
  statLabel: { color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px', marginBottom: '3px' },
  statLabelSmall: { color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px' },
  statMarker: { color: 'rgba(255, 255, 255, 0.5)', fontSize: '11px', marginBottom: '5px' },
  statPercent: { color: '#00f0ff', fontSize: '14px', fontWeight: 'bold' },
  totalBox: {
    textAlign: 'center', marginTop: '15px', padding: '12px',
    backgroundColor: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', color: 'white', fontSize: '15px'
  },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: {
    padding: '10px 5px', backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'white', textAlign: 'center', fontWeight: 'bold'
  },
  tr: { borderBottom: '1px solid rgba(255, 255, 255, 0.1)' },
  td: { padding: '8px 5px', color: 'white', textAlign: 'center' },
  // Styles pour les postes supplémentaires
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
    textAlign: 'center',
    transition: 'transform 0.2s ease'
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
  noData: { color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', fontStyle: 'italic' },
  barChart: { display: 'flex', flexDirection: 'column', gap: '12px' },
  barRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  barLabel: { width: '100px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', textAlign: 'right' },
  barContainer: {
    flex: 1, height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px', overflow: 'hidden'
  },
  bar: { height: '100%', borderRadius: '12px', transition: 'width 0.5s ease' },
  barValue: { width: '40px', color: 'white', fontSize: '14px', fontWeight: 'bold' }
};

export default ModalStatistiques;
