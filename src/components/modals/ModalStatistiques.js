import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

/**
 * ModalStatistiques - Compteurs et analyses pour l'agent connecté
 * 
 * Affiche les statistiques de l'agent :
 * - Compteurs par type (Matin, Soir, Nuit, RP, CP, MA)
 * - Pourcentages mensuels et annuels
 * - Compteurs des positions supplémentaires (+CCU, +RO, +RC, etc.)
 * 
 * v1.0 - Création initiale
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

  // Catégories de comptage
  const categories = [
    { key: 'matin', label: 'Matinées', color: '#FFC107' },
    { key: 'soiree', label: 'Soirées', color: '#FF5722' },
    { key: 'nuit', label: 'Nuits', color: '#3F51B5' },
    { key: 'rp', label: 'RP', color: '#4CAF50' },
    { key: 'cp', label: 'CP', color: '#2196F3' },
    { key: 'ma', label: 'MA', color: '#FF9800' }
  ];

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

      // Analyser les données
      (data || []).forEach(entry => {
        const month = new Date(entry.date).getMonth();
        const code = (entry.service_code || '').toUpperCase();
        const type = entry.type_service;

        // Compter les types de service
        if (code.includes('RP') || code === 'RP') {
          byMonth[month].rp++;
          annual.rp++;
        } else if (code.includes('CP')) {
          byMonth[month].cp++;
          annual.cp++;
        } else if (code.includes('MA') || code.includes('MALADIE')) {
          byMonth[month].ma++;
          annual.ma++;
        } else if (type === 'matin' || code.match(/00[1-4]$/)) {
          byMonth[month].matin++;
          annual.matin++;
        } else if (type === 'soiree' || code.match(/00[5-7]$/)) {
          byMonth[month].soiree++;
          annual.soiree++;
        } else if (type === 'nuit' || code.match(/00[3]$/) && code.includes('CCU')) {
          byMonth[month].nuit++;
          annual.nuit++;
        }

        // Compter le total
        if (code && !['RP', 'CP'].includes(code)) {
          byMonth[month].total++;
          annual.total++;
        }

        // Compter les positions supplémentaires
        if (entry.position_supplementaire) {
          const sup = entry.position_supplementaire.toUpperCase();
          if (!supplements[sup]) {
            supplements[sup] = { count: 0, byMonth: {} };
          }
          supplements[sup].count++;
          if (!supplements[sup].byMonth[month]) {
            supplements[sup].byMonth[month] = 0;
          }
          supplements[sup].byMonth[month]++;
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

  if (!isOpen) return null;

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
            {/* Résumé annuel */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📅 Résumé Annuel {selectedYear}</h3>
              <div style={styles.annualGrid}>
                {categories.map(cat => (
                  <div key={cat.key} style={styles.statCard}>
                    <div style={{...styles.statIcon, backgroundColor: cat.color}}>
                      {stats.annual[cat.key] || 0}
                    </div>
                    <div style={styles.statLabel}>{cat.label}</div>
                    <div style={styles.statPercent}>
                      {getPercentage(stats.annual[cat.key], stats.annual.total)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.totalBox}>
                <strong>Total services :</strong> {stats.annual.total}
              </div>
            </div>

            {/* Tableau mensuel */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📆 Détail par Mois</h3>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Mois</th>
                      {categories.map(cat => (
                        <th key={cat.key} style={{...styles.th, color: cat.color}}>
                          {cat.label}
                        </th>
                      ))}
                      <th style={styles.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((month, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td style={styles.td}>{month}</td>
                        {categories.map(cat => (
                          <td key={cat.key} style={styles.td}>
                            {stats.byMonth[idx]?.[cat.key] || 0}
                          </td>
                        ))}
                        <td style={{...styles.td, fontWeight: 'bold'}}>
                          {stats.byMonth[idx]?.total || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Positions supplémentaires */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>⚡ Positions Supplémentaires</h3>
              {Object.keys(stats.supplements).length > 0 ? (
                <div style={styles.supplementsGrid}>
                  {Object.entries(stats.supplements)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([sup, data]) => (
                      <div key={sup} style={styles.supplementCard}>
                        <div style={styles.supplementName}>{sup}</div>
                        <div style={styles.supplementCount}>{data.count}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <p style={styles.noData}>Aucune position supplémentaire enregistrée</p>
              )}
            </div>

            {/* Graphique visuel */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>📈 Répartition Services</h3>
              <div style={styles.barChart}>
                {categories.map(cat => {
                  const value = stats.annual[cat.key] || 0;
                  const max = Math.max(...categories.map(c => stats.annual[c.key] || 0), 1);
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
          </div>
        )}
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
  yearSelector: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    padding: '15px'
  },
  yearBtn: {
    background: 'rgba(0, 240, 255, 0.2)',
    border: '1px solid rgba(0, 240, 255, 0.4)',
    color: 'white',
    padding: '8px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  yearTitle: {
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  loading: {
    textAlign: 'center',
    color: 'white',
    padding: '40px'
  },
  content: {
    padding: '20px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    color: '#00f0ff',
    fontSize: '16px',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.2)'
  },
  annualGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '10px'
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '15px 10px',
    textAlign: 'center'
  },
  statIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 10px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white'
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '11px',
    marginBottom: '5px'
  },
  statPercent: {
    color: '#00f0ff',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  totalBox: {
    textAlign: 'center',
    marginTop: '15px',
    padding: '10px',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: '8px',
    color: 'white'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px'
  },
  th: {
    padding: '10px 5px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  td: {
    padding: '8px 5px',
    color: 'white',
    textAlign: 'center'
  },
  supplementsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '10px'
  },
  supplementCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    border: '1px solid rgba(255, 215, 0, 0.4)',
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center'
  },
  supplementName: {
    color: '#FFD700',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  supplementCount: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold'
  },
  noData: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  barChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  barLabel: {
    width: '70px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '12px',
    textAlign: 'right'
  },
  barContainer: {
    flex: 1,
    height: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    overflow: 'hidden'
  },
  bar: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.5s ease'
  },
  barValue: {
    width: '40px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold'
  }
};

export default ModalStatistiques;
