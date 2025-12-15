import { useState, useCallback, useEffect } from 'react';
import supabaseService from '../services/supabaseService';
import planningService from '../services/planningService';
import { MONTHS, CURRENT_YEAR } from '../constants/config';

/**
 * Hook personnalisé pour la gestion du planning
 * Centralise le chargement, la mise à jour et la suppression des données de planning
 * 
 * @version 1.4.0 - Support complet texte libre (lecture/écriture)
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
    
    // 🔍 DEBUG: Log des paramètres d'entrée
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEBUG usePlanning.loadData DEBUT');
    console.log('   → month param:', month);
    console.log('   → currentMonth state:', currentMonth);
    console.log('   → currentYear param/state:', currentYear);
    console.log('   → CURRENT_YEAR (config):', CURRENT_YEAR);
    console.log('   → user:', user?.email);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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
      
      // 🔍 DEBUG: Log des dates calculées
      console.log('🔍 DEBUG Dates calculées:');
      console.log('   → monthIndex:', monthIndex);
      console.log('   → year utilisé:', year);
      console.log('   → startDate:', startDate);
      console.log('   → endDate:', endDate);
      console.log('   → lastDay (jours dans le mois):', lastDay);
      
      console.log(`📅 Chargement planning ${month} ${year}: du ${startDate} au ${endDate}`);
      
      const planningFromDB = await supabaseService.getPlanningForMonth(startDate, endDate);
      
      // 🔍 DEBUG: Log des résultats Supabase
      console.log('🔍 DEBUG Résultats Supabase:');
      console.log('   → Nombre total d\'entrées:', planningFromDB?.length || 0);
      
      // Organiser les données de planning AVEC les notes, postes supplémentaires ET texte libre
      const planningData = {};
      agentsResult.forEach(agent => {
        const agentName = `${agent.nom} ${agent.prenom}`;
        planningData[agentName] = {};
      });
      
      // 🔍 DEBUG: Compteurs pour diagnostic
      let entriesProcessed = 0;
      let entriesIgnored = 0;
      let texteLibreCount = 0;
      const daysLoaded = new Set();
      const lateDecemberEntries = []; // Jours 25-31
      
      if (planningFromDB) {
        planningFromDB.forEach(entry => {
          const agent = agentsResult.find(a => a.id === entry.agent_id);
          if (agent) {
            entriesProcessed++;
            const agentName = `${agent.nom} ${agent.prenom}`;
            // FIX: Parse la date directement sans passer par Date object
            // Évite le bug de fuseau horaire (UTC → heure locale = J-1)
            const day = parseDayFromDateString(entry.date);
            
            daysLoaded.add(day);
            
            // 🔍 DEBUG: Log spécifique pour fin décembre
            if (day >= 25) {
              lateDecemberEntries.push({
                agent: agentName,
                date: entry.date,
                day: day,
                service: entry.service_code
              });
            }
            
            // 🔍 DEBUG: Log si texte libre présent
            if (entry.texte_libre) {
              texteLibreCount++;
              console.log(`📝 Texte libre trouvé: ${agentName} jour ${day} → "${entry.texte_libre}"`);
            }
            
            // Construire l'objet de données de cellule avec note, postes supplémentaires ET texte libre
            const cellData = {
              service: entry.service_code,
              ...(entry.poste_code && { poste: entry.poste_code }),
              ...(entry.commentaire && { note: entry.commentaire }),
              ...(entry.postes_supplementaires && entry.postes_supplementaires.length > 0 && { 
                postesSupplementaires: entry.postes_supplementaires 
              }),
              // ✅ FIX v1.4.0: Inclure texte_libre depuis la DB
              ...(entry.texte_libre && { texteLibre: entry.texte_libre })
            };
            
            // Si pas de données supplémentaires, garder le format simple
            if (!entry.poste_code && !entry.commentaire && 
                (!entry.postes_supplementaires || entry.postes_supplementaires.length === 0) &&
                !entry.texte_libre) {
              planningData[agentName][day] = entry.service_code;
            } else {
              planningData[agentName][day] = cellData;
            }
          } else {
            entriesIgnored++;
            console.warn('⚠️ Entrée ignorée - agent non trouvé:', entry.agent_id, entry.date);
          }
        });
      }
      
      // 🔍 DEBUG: Résumé du chargement
      console.log('🔍 DEBUG Résumé chargement:');
      console.log('   → Entrées traitées:', entriesProcessed);
      console.log('   → Entrées ignorées (agent non trouvé):', entriesIgnored);
      console.log('   → Entrées avec texte libre:', texteLibreCount);
      console.log('   → Jours uniques chargés:', [...daysLoaded].sort((a,b) => a-b).join(', '));
      console.log('   → Nombre de jours:', daysLoaded.size);
      
      // 🔍 DEBUG: Détail fin décembre
      if (month === 'DECEMBRE') {
        console.log('🔍 DEBUG FIN DÉCEMBRE (jours 25-31):');
        console.log('   → Nombre d\'entrées:', lateDecemberEntries.length);
        if (lateDecemberEntries.length > 0) {
          console.table(lateDecemberEntries.slice(0, 10)); // Max 10 pour lisibilité
        } else {
          console.log('   ⚠️ AUCUNE ENTRÉE POUR FIN DÉCEMBRE !');
        }
        
        // Vérifier si les jours 25-31 sont dans daysLoaded
        const missingDays = [];
        for (let d = 25; d <= 31; d++) {
          if (!daysLoaded.has(d)) {
            missingDays.push(d);
          }
        }
        if (missingDays.length > 0) {
          console.log('   ⚠️ Jours manquants:', missingDays.join(', '));
        }
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      setPlanning(planningData);
      
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError(`Erreur de connexion: ${err.message}`);
      setConnectionStatus('❌ Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, user]);

  /**
   * Récupère les données d'une cellule spécifique
   * @version 1.4.0 - Support texteLibre
   * @param {string} agentName - Nom complet de l'agent
   * @param {number} day - Jour du mois
   * @returns {Object|null} Données de la cellule {service, poste, note, postesSupplementaires, texteLibre} ou null
   */
  const getCellData = useCallback((agentName, day) => {
    const cellValue = planning[agentName]?.[day];
    
    if (!cellValue) return null;
    
    if (typeof cellValue === 'string') {
      return { service: cellValue, poste: null, note: null, postesSupplementaires: null, texteLibre: null };
    }
    
    return {
      service: cellValue.service || null,
      poste: cellValue.poste || null,
      note: cellValue.note || null,
      postesSupplementaires: cellValue.postesSupplementaires || null,
      // ✅ FIX v1.4.0: Inclure texteLibre
      texteLibre: cellValue.texteLibre || null
    };
  }, [planning]);

  /**
   * Met à jour une cellule du planning avec support des notes, postes supplémentaires et texte libre
   * @version 1.4.0 - Support texteLibre
   * @param {string} agentName - Nom complet de l'agent
   * @param {number} day - Jour du mois
   * @param {string|Object} value - Valeur: string (service simple), object {service, poste?, note?, postesSupplementaires?, texteLibre?}, ou '' pour supprimer
   */
  const updateCell = useCallback(async (agentName, day, value) => {
    try {
      const agent = agents.find(a => `${a.nom} ${a.prenom}` === agentName);
      if (!agent) {
        console.error('Agent non trouvé:', agentName);
        return;
      }

      const date = planningService.formatDate(day, currentMonth, currentYear);
      
      // 🔍 DEBUG: Log de la mise à jour
      console.log(`🔍 DEBUG updateCell: ${agentName} jour ${day} → date calculée: ${date}`);
      console.log(`🔍 DEBUG updateCell value:`, value);
      
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
        // ✅ FIX v1.4.0: Extraire texteLibre
        const texteLibre = typeof value === 'object' ? (value.texteLibre || null) : null;
        
        console.log(`📝 Sauvegarde avec texteLibre: "${texteLibre}"`);
        
        // Sauvegarde avec note, postes supplémentaires ET texteLibre
        await supabaseService.savePlanning(agent.id, date, serviceCode, posteCode, note, postesSupplementaires, texteLibre);
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
    // 🔍 DEBUG: Log du déclenchement de l'effet
    console.log('🔍 DEBUG useEffect triggered:', {
      hasUser: !!user,
      currentMonth,
      currentYear,
      timestamp: new Date().toISOString()
    });
    
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
