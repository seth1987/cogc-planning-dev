import { MONTHS, JOURS_FERIES_2025, ORDRE_GROUPES } from '../constants/config';

class PlanningService {
  organizeData(agents, habilitations) {
    const agentsByGroupe = {};
    
    // Initialiser tous les groupes
    ORDRE_GROUPES.forEach(groupe => {
      agentsByGroupe[groupe] = [];
    });
    
    // Organiser les agents par groupe
    agents.forEach(agent => {
      const groupe = agent.groupe || 'DIVERS';
      if (!agentsByGroupe[groupe]) {
        agentsByGroupe[groupe] = [];
      }
      agentsByGroupe[groupe].push(agent);
    });
    
    // Organiser les habilitations par agent
    const habilitationsByAgent = {};
    habilitations.forEach(hab => {
      if (!habilitationsByAgent[hab.agent_id]) {
        habilitationsByAgent[hab.agent_id] = [];
      }
      habilitationsByAgent[hab.agent_id].push(hab.poste);
    });
    
    return { agentsByGroupe, habilitationsByAgent };
  }

  getDaysInMonth(month) {
    const monthIndex = MONTHS.indexOf(month);
    const year = 2025;
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  getJourType(day, month) {
    const monthIndex = MONTHS.indexOf(month);
    const date = new Date(2025, monthIndex, day);
    const dayOfWeek = date.getDay();
    
    // Vérifier si c'est un jour férié
    const joursFeriesMois = JOURS_FERIES_2025[month] || [];
    const isFerier = joursFeriesMois.includes(day);
    
    return {
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isFerier: isFerier,
      date: date,
      dayOfWeek: dayOfWeek
    };
  }

  formatDate(day, month, year = 2025) {
    const monthIndex = MONTHS.indexOf(month);
    const date = new Date(year, monthIndex, day);
    return date.toISOString().split('T')[0];
  }

  getDayName(day, month) {
    const monthIndex = MONTHS.indexOf(month);
    const date = new Date(2025, monthIndex, day);
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  }
}

export default new PlanningService();