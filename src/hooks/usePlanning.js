import { useState, useCallback, useEffect } from 'react';
import supabaseService from '../services/supabaseService';
import planningService from '../services/planningService';
import { MONTHS, CURRENT_YEAR } from '../constants/config';

/**
 * Hook personnalisé pour la gestion du planning
 * Centralise le chargement, la mise à jour et la suppression des données de planning
 * 
 * @version 1.3.0 - Fix limite Supabase + logs débogage améliorés
 * @param {Object} user - L'utilisateur authentifié
 * @param {string} currentMonth - Le mois actuellement sélectionné
 * @param {number} currentYear - L'année actuellement sélectionnée
 * @returns {Object} État et fonctions de gestion du planning
 */
export function usePlanning(user, currentMonth, currentYear = CURRENT_YEAR) {
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
   * Extrait le jour d'une date string au format YYYY-MM-DD
   * Évite les problèmes de fuseau horaire avec new Date()
   * @param {string} dateString - Date au format "2025-12-05"
   * @returns {number} Le jour du mois (1-31)
   */
  const parseDayFromDateString = (dateString) => {
    // Parse direct de la chaîne pour éviter les problèmes de timezone
    // "2025-12-05" → split('-') → ['2025', '12', '05'] → parseInt('05') → 5
    return parseInt(dateString.split('-')[2], 10);
  };

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
      
      // Charger le planning du mois - Utilise currentYear passé en paramètre
      const monthIndex = MONTHS.indexOf(month);
      const year = currentYear;
      
      const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      console.log(`📅 Chargement planning ${month.toUpperCase()} ${year}: du ${startDate} au ${endDate}`);
      
      const planningFromDB = await supabaseService.getPlanningForMonth(startDate, endDate);
      
      // Logs de débogage détaillés
      console.log(`📊 Entrées récupérées de Supabase: ${planningFromDB?.length || 0}`);
      
      if (planningFromDB && planningFromDB.length > 0) {
        // Compter les entrées par jour pour détecter les problèmes
        const entriesByDay = {};
        planningFromDB.forEach(entry => {
          const day = parseDayFromDateString(entry.date);
          entriesByDay[day] = (entriesByDay[day] || 0) + 1;
        });
        
        // Vérifier les jours de fin de mois
        const endMonthDays = Object.keys(entriesByDay)
          .map(d => parseInt(d))
          .filter(d => d >= 23);
        const endMonthCount = endMonthDays.reduce((sum, d) => sum + entriesByDay[d], 0);
        console.log(`📊 Entrées fin de mois (23-31): ${endMonthCount}`);
        
        // Vérifier quelques agents spécifiques (debug)
        const debugAgents = ['GREVIN', 'LUCHIER'];
        debugAgents.forEach(nom => {
          const agent = agentsResult.find(a => a.nom === nom);
          if (agent) {
            const agentEntries = planningFromDB.filter(e => e.agent_id === agent.id);
            console.log(`📊 Entrées ${nom} ${agent.prenom}: ${agentEntries.length}`);
            if (agentEntries.length < 20) {
              console.log(`   Détail:`, agentEntries.map(e => `${e.date}: ${e.service_code}`).join(', '));
            }
          }
        });
      }
      
      // Organiser les données de planning AVEC les notes et postes supplémentaires
      const planningData = {};
      agentsResult.forEach(agent => {
        const agentName = `${agent.nom} ${agent.prenom}`;
        planningData[agentName] = {};
      });
      
      if (planningFromDB) {
        let processedCount = 0;
        let endMonthProcessed = 0;
        
        planningFromDB.forEach(entry => {
          const agent = agentsResult.find(a => a.id === entry.agent_id);
          if (agent) {
            const agentName = `${agent.nom} ${agent.prenom}`;
            // FIX: Parse la date directement sans passer par Date object
            // Évite le bug de fuseau horaire (UTC → heure locale = J-1)
            const day = parseDayFromDateString(entry.date);
            
            if (day >= 23) endMonthProcessed++;
            
            // Construire l'objet de données de cellule avec note ET postes supplémentaires
            const cellData = {
              service: entry.service_code,
              ...(entry.poste_code && { poste: entry.poste_code }),
              ...(entry.commentaire && { note: entry.commentaire }),
              ...(entry.postes_supplementaires && entry.postes_supplementaires.length > 0 && { 
                postesSupplementaires: entry.postes_supplementaires 
              })
            };
            
            // Si pas de données supplémentaires, garder le format simple
            if (!entry.poste_code && !entry.commentaire && 
                (!entry.postes_supplementaires || entry.postes_supplementaires.length === 0)) {
              planningData[agentName][day] = entry.service_code;
            } else {
              planningData[agentName][day] = cellData;
            }
            processedCount++;
          }
        });
        
        console.log(`✅ Planning chargé: ${processedCount} entrées traitées (fin de mois: ${endMonthProcessed})`);
      }
      
      setPlanning(planningData);
      
    } catch (err) {
      console.error('❌ Erreur chargement données:', err);
      setError(`Erreur de connexion: ${err.message}`);
      setConnectionStatus('❌ Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, user]);

  /**
   * Récupère les données d'une cellule spécifique
   * @param {string} agentName - Nom complet de l'agent
   * @param {number} day - Jour du mois
   * @returns {Object|null} Données de la cellule {service, poste, note, postesSupplementaires} ou null
   */
  const getCellData = useCallback((agentName, day) => {
    const cellValue = planning[agentName]?.[day];
    
    if (!cellValue) return null;
    
    if (typeof cellValue === 'string') {
      return { service: cellValue, poste: null, note: null, postesSupplementaires: null };
    }
    
    return {
      service: cellValue.service || null,
      poste: cellValue.poste || null,
      note: cellValue.note || null,
      postesSupplementaires: cellValue.postesSupplementaires || null
    };
  }, [planning]);

  /**
   * Met à jour une cellule du planning avec support des notes et postes supplémentaires
   * @param {string} agentName - Nom complet de l'agent
   * @param {number} day - Jour du mois
   * @param {string|Object} value - Valeur: string (service simple), object {service, poste?, note?, postesSupplementaires?}, ou '' pour supprimer
   */
  const updateCell = useCallback(async (agentName, day, value) => {
    try {
      const agent = agents.find(a => `${a.nom} ${a.prenom}` === agentName);
      if (!agent) {
        console.error('Agent non trouvé:', agentName);
        return;
      }

      const date = planningService.formatDate(day, currentMonth, currentYear);
      
      if (value === '') {
        // Suppression de l'entrée
        await supabaseService.deletePlanning(agent.id, date);
      } else {
        // Extraction des valeurs
        const serviceCode = typeof value === 'object' ? value.service : value;
        const posteCode = typeof value === 'object' ? (value.poste || null) : null;
        const note = typeof value === 'object' ? (value.note || null) : null;
        const postesSupplementaires = typeof value === 'object' 
          ? (value.postesSupplementaires || null) 
          : null;
        
        // Sauvegarde avec note ET postes supplémentaires
        await supabaseService.savePlanning(agent.id, date, serviceCode, posteCode, note, postesSupplementaires);
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
  }, [agents, currentMonth, currentYear]);

  /**
   * Recharge les habilitations depuis la base
   */
  const reloadHabilitations = useCallback(async () => {
    const habilitationsResult = await supabaseService.getHabilitations();
    const { habilitationsByAgent } = planningService.organizeData(agents, habilitationsResult);
    setHabilitations(habilitationsByAgent);
  }, [agents]);

  // Charger les données quand l'utilisateur, le mois ou l'année change
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentMonth, currentYear, loadData]);

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
