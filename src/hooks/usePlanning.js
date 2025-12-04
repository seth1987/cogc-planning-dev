import { useState, useCallback, useEffect } from 'react';
import supabaseService from '../services/supabaseService';
import planningService from '../services/planningService';
import { MONTHS } from '../constants/config';

/**
 * Hook personnalisé pour la gestion du planning
 * Centralise le chargement, la mise à jour et la suppression des données de planning
 * 
 * @param {Object} user - L'utilisateur authentifié
 * @param {string} currentMonth - Le mois actuellement sélectionné
 * @returns {Object} État et fonctions de gestion du planning
 */
export function usePlanning(user, currentMonth) {
  // États des données
  const [agents, setAgents] = useState([]);
  const [agentsData, setAgentsData] = useState({});
  const [habilitations, setHabilitations] = useState({});
  const [planning, setPlanning] = useState({});
  
  // États de chargement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('⏳ Connexion...');

  /**
   * Charge les données du planning pour le mois spécifié
   */
  const loadData = useCallback(async (month = currentMonth) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('🔗 Connexion Supabase...');
      
      // Charger les agents
      const agentsResult = await supabaseService.getAgents();
      
      if (!agentsResult || agentsResult.length === 0) {
        setConnectionStatus('❌ Aucun agent trouvé');
        setError('Aucun agent trouvé dans la base de données');
        return;
      }
      
      // Charger les habilitations
      const habilitationsResult = await supabaseService.getHabilitations();
      
      // Organiser les données
      const { agentsByGroupe, habilitationsByAgent } = planningService.organizeData(
        agentsResult || [], 
        habilitationsResult || []
      );
      
      setAgents(agentsResult);
      setAgentsData(agentsByGroupe);
      setHabilitations(habilitationsByAgent);
      setConnectionStatus(`✅ ${agentsResult.length} agents connectés`);
      
      // Charger le planning du mois
      const monthIndex = MONTHS.indexOf(month);
      const year = 2025;
      
      const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      console.log(`📅 Chargement planning ${month} ${year}: du ${startDate} au ${endDate}`);
      
      const planningFromDB = await supabaseService.getPlanningForMonth(startDate, endDate);
      
      // Organiser les données de planning AVEC les notes
      const planningData = {};
      agentsResult.forEach(agent => {
        const agentName = `${agent.nom} ${agent.prenom}`;
        planningData[agentName] = {};
      });
      
      if (planningFromDB) {
        planningFromDB.forEach(entry => {
          const agent = agentsResult.find(a => a.id === entry.agent_id);
          if (agent) {
            const agentName = `${agent.nom} ${agent.prenom}`;
            const day = new Date(entry.date).getDate();
            
            // Construire l'objet de données de cellule avec note
            const cellData = {
              service: entry.service_code,
              ...(entry.poste_code && { poste: entry.poste_code }),
              ...(entry.commentaire && { note: entry.commentaire })
            };
            
            // Si pas de poste ni de note, garder le format simple
            if (!entry.poste_code && !entry.commentaire) {
              planningData[agentName][day] = entry.service_code;
            } else {
              planningData[agentName][day] = cellData;
            }
          }
        });
      }
      
      setPlanning(planningData);
      
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError(`Erreur de connexion: ${err.message}`);
      setConnectionStatus('❌ Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, user]);

  /**
   * Récupère les données d'une cellule spécifique
   * @param {string} agentName - Nom complet de l'agent
   * @param {number} day - Jour du mois
   * @returns {Object|null} Données de la cellule {service, poste, note} ou null
   */
  const getCellData = useCallback((agentName, day) => {
    const cellValue = planning[agentName]?.[day];
    
    if (!cellValue) return null;
    
    if (typeof cellValue === 'string') {
      return { service: cellValue, poste: null, note: null };
    }
    
    return {
      service: cellValue.service || null,
      poste: cellValue.poste || null,
      note: cellValue.note || null
    };
  }, [planning]);

  /**
   * Met à jour une cellule du planning avec support des notes
   * @param {string} agentName - Nom complet de l'agent
   * @param {number} day - Jour du mois
   * @param {string|Object} value - Valeur: string (service simple), object {service, poste?, note?}, ou '' pour supprimer
   */
  const updateCell = useCallback(async (agentName, day, value) => {
    try {
      const agent = agents.find(a => `${a.nom} ${a.prenom}` === agentName);
      if (!agent) {
        console.error('Agent non trouvé:', agentName);
        return;
      }

      const date = planningService.formatDate(day, currentMonth);
      
      if (value === '') {
        // Suppression de l'entrée
        await supabaseService.deletePlanning(agent.id, date);
      } else {
        // Extraction des valeurs
        const serviceCode = typeof value === 'object' ? value.service : value;
        const posteCode = typeof value === 'object' ? (value.poste || null) : null;
        const note = typeof value === 'object' ? (value.note || null) : null;
        
        // Sauvegarde avec note
        await supabaseService.savePlanning(agent.id, date, serviceCode, posteCode, note);
      }
      
      // Mise à jour optimiste du state local
      setPlanning(prev => ({
        ...prev,
        [agentName]: {
          ...prev[agentName],
          [day]: value
        }
      }));
      
      console.log(`✅ Cellule mise à jour: ${agentName} jour ${day}`, value);
      
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
      throw err;
    }
  }, [agents, currentMonth]);

  /**
   * Recharge les habilitations depuis la base
   */
  const reloadHabilitations = useCallback(async () => {
    const habilitationsResult = await supabaseService.getHabilitations();
    const { habilitationsByAgent } = planningService.organizeData(agents, habilitationsResult);
    setHabilitations(habilitationsByAgent);
  }, [agents]);

  // Charger les données quand l'utilisateur ou le mois change
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentMonth, loadData]);

  return {
    // Données
    agents,
    agentsData,
    habilitations,
    planning,
    
    // États
    loading,
    error,
    connectionStatus,
    
    // Actions
    loadData,
    updateCell,
    getCellData,
    reloadHabilitations,
    setConnectionStatus
  };
}

export default usePlanning;
