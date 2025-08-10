import { MONTHS, JOURS_FERIES_2025, ORDRE_GROUPES } from '../constants/config';

class PlanningService {
  constructor() {
    this.codeColors = {
      // Services de travail
      '-': 'bg-green-100 text-green-800',  // Matinée (06h-14h)
      'O': 'bg-blue-100 text-blue-800',    // Soirée (14h-22h)
      'X': 'bg-purple-100 text-purple-800', // Nuit (22h-06h)
      
      // Repos et congés
      'RP': 'bg-yellow-100 text-yellow-800',  // Repos programmé/périodique
      'RU': 'bg-amber-100 text-amber-800',    // RTT
      'C': 'bg-lime-100 text-lime-800',       // Congés

      // Indisponibilités et formations
      'MA': 'bg-red-100 text-red-800',        // Maladie
      'I': 'bg-gray-100 text-gray-600',       // Inaction
      'D': 'bg-teal-100 text-teal-800',       // Disponible (soutien)
      'NU': 'bg-indigo-100 text-indigo-800',  // Non utilisable
      'HAB': 'bg-orange-100 text-orange-800', // Formation habilitation
      'EIA': 'bg-pink-100 text-pink-800',     // Formation EIA
      'FO': 'bg-cyan-100 text-cyan-800',      // Formation
      'VM': 'bg-rose-100 text-rose-800',      // Visite médicale
      'VL': 'bg-emerald-100 text-emerald-800' // Autre visite
    };
  }

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

  // Mapper les codes PDF vers codes standardisés
  mapPDFCodeToStandard(codePDF, isReserve = false) {
    const mapping = {
      // Services avec postes
      'CCU001': { service: '-', poste: 'CCU' },
      'CCU002': { service: 'O', poste: 'CCU' },
      'CCU003': { service: 'X', poste: 'CCU' },
      'CCU004': { service: '-', poste: 'CCU' },
      'CCU005': { service: 'O', poste: 'CCU' },
      'CCU006': { service: 'X', poste: 'CCU' },
      'CRC001': { service: '-', poste: 'CRC' },
      'CRC002': { service: 'O', poste: 'CRC' },
      'CRC003': { service: 'X', poste: 'CRC' },
      'RC001': { service: '-', poste: 'RC' },
      'RC002': { service: 'O', poste: 'RC' },
      'RC003': { service: 'X', poste: 'RC' },
      'RE001': { service: '-', poste: 'RE' },
      'RE002': { service: 'O', poste: 'RE' },
      'RE003': { service: 'X', poste: 'RE' },
      'RO001': { service: '-', poste: 'RO' },
      'RO002': { service: 'O', poste: 'RO' },
      'CAC001': { service: '-', poste: 'CAC' },
      'CAC002': { service: 'O', poste: 'CAC' },
      'ACR001': { service: '-', poste: 'ACR' },
      'ACR002': { service: 'O', poste: 'ACR' },
      'ACR003': { service: 'X', poste: 'ACR' },
      'CENT001': { service: '-', poste: 'CENT' },
      'CENT002': { service: 'O', poste: 'CENT' },
      'CENT003': { service: 'X', poste: 'CENT' },
      
      // Repos et congés (sans poste)
      'RP': { service: 'RP', poste: '' },
      'RU': { service: 'RU', poste: '' },
      'Repos': { service: 'RP', poste: '' },
      
      // Indisponibilités
      'INACTIN': { service: 'I', poste: '' },
      'DISPO': { service: 'D', poste: '' },
      'Disponible': { service: 'D', poste: '' },
      'NU': { service: 'NU', poste: '' },
      
      // Formations et visites
      'HAB': { service: 'HAB', poste: '' },
      'FO': { service: 'FO', poste: '' },
      'VM': { service: 'VM', poste: '' },
      'VL': { service: 'VL', poste: '' },
      'EIA': { service: 'EIA', poste: '' }
    };
    
    // Si le code est dans le mapping, retourner l'objet
    if (mapping[codePDF]) {
      return mapping[codePDF];
    }
    
    // Sinon, retourner comme service simple
    return { service: codePDF, poste: '' };
  }

  // Déterminer si un service est de nuit en regardant l'heure ou le code
  isServiceNuit(serviceCode, timeString = null) {
    // Vérifier le code de service (finit par 003 ou 006 = nuit)
    if (serviceCode && (serviceCode.endsWith('003') || serviceCode.endsWith('006'))) {
      return true;
    }
    
    // Vérifier l'heure de début si disponible
    if (timeString) {
      const match = timeString.match(/(\d{2}):(\d{2})/);
      if (match) {
        const hour = parseInt(match[1]);
        // Service de nuit : commence après 20h
        return hour >= 20;
      }
    }
    
    return false;
  }

  // Extraire les informations d'un bulletin PDF avec gestion correcte des services de nuit
  extractFromPDF(pdfText, agent) {
    const planning = {};
    const lines = pdfText.split('\n');
    
    // Patterns pour détecter les dates, services et heures
    const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/;
    const servicePattern = /(CRC|ACR|RC|RO|CCU|RE|CAC|CENT)\d{3}/;
    const heurePattern = /(\d{2}):(\d{2})/;
    
    // Structure temporaire pour gérer les services multiples par jour
    const tempPlanning = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateMatch = line.match(datePattern);
      
      if (dateMatch) {
        const jour = parseInt(dateMatch[1]);
        const mois = parseInt(dateMatch[2]);
        const annee = parseInt(dateMatch[3]);
        
        // Initialiser le stockage pour ce jour
        if (!tempPlanning[jour]) {
          tempPlanning[jour] = [];
        }
        
        // Chercher les services dans les lignes suivantes (jusqu'à 10 lignes)
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          const currentLine = lines[j];
          
          // Chercher NU (Non Utilisable)
          if (currentLine.includes('NU') && (currentLine.includes('Utilisable') || currentLine.includes('non utilisé'))) {
            // Vérifier s'il y a une heure associée
            const heureMatch = currentLine.match(heurePattern);
            tempPlanning[jour].push({
              code: 'NU',
              service: 'NU',
              poste: '',
              isNuit: false,
              heure: heureMatch ? heureMatch[0] : null
            });
          }
          
          // Chercher RP (Repos périodique)
          if (currentLine.includes('RP') && currentLine.includes('Repos')) {
            tempPlanning[jour].push({
              code: 'RP',
              service: 'RP',
              poste: '',
              isNuit: false,
              heure: null
            });
          }
          
          // Chercher INACTIN
          if (currentLine.includes('INACTIN')) {
            tempPlanning[jour].push({
              code: 'INACTIN',
              service: 'I',
              poste: '',
              isNuit: false,
              heure: null
            });
          }
          
          // Chercher DISPO/Disponible
          if (currentLine.includes('DISPO') || currentLine.includes('Disponible')) {
            tempPlanning[jour].push({
              code: 'DISPO',
              service: 'D',
              poste: '',
              isNuit: false,
              heure: null
            });
          }
          
          // Chercher les codes de service (CRC001, CCU003, etc.)
          const serviceMatch = currentLine.match(servicePattern);
          if (serviceMatch) {
            const serviceCode = serviceMatch[0];
            const codeStandard = this.mapPDFCodeToStandard(serviceCode, agent.statut === 'reserve');
            
            // Chercher l'heure de début du service
            let heureDebut = null;
            // Chercher dans la ligne actuelle et les suivantes
            for (let k = j; k < Math.min(j + 3, lines.length); k++) {
              const heureMatch = lines[k].match(/(\d{2}):(\d{2})/);
              if (heureMatch) {
                heureDebut = heureMatch[0];
                break;
              }
            }
            
            // Déterminer si c'est un service de nuit
            const isNuit = this.isServiceNuit(serviceCode, heureDebut);
            
            tempPlanning[jour].push({
              code: serviceCode,
              service: codeStandard.service,
              poste: codeStandard.poste,
              isNuit: isNuit,
              heure: heureDebut
            });
          }
        }
      }
    }
    
    // Traiter le planning temporaire et gérer les décalages de nuit
    Object.keys(tempPlanning).forEach(jour => {
      const jourNum = parseInt(jour);
      const services = tempPlanning[jour];
      
      if (services.length === 0) return;
      
      // Trier les services par type (NU/RP d'abord, puis les autres)
      services.sort((a, b) => {
        // NU et RP restent sur le jour actuel
        if (a.service === 'NU' || a.service === 'RP') return -1;
        if (b.service === 'NU' || b.service === 'RP') return 1;
        // Les services de nuit passent après
        if (a.isNuit && !b.isNuit) return 1;
        if (!a.isNuit && b.isNuit) return -1;
        return 0;
      });
      
      // Traiter chaque service
      services.forEach(serviceData => {
        let targetDay = jourNum;
        
        // Si c'est un service de nuit et qu'il y a déjà un autre service ce jour-là
        if (serviceData.isNuit && services.length > 1 && serviceData.service !== 'NU') {
          // Décaler au jour suivant
          targetDay = jourNum + 1;
          
          // Gérer le passage au mois suivant
          if (targetDay > 31) {
            // Pour l'instant, on ignore les services qui dépassent le mois
            console.warn(`Service de nuit du ${jourNum} décalé au ${targetDay} (mois suivant)`);
            return;
          }
        }
        
        // Ajouter le service au planning final
        if (!planning[targetDay]) {
          // Si un seul service pour ce jour
          if (serviceData.poste) {
            planning[targetDay] = {
              service: serviceData.service,
              poste: serviceData.poste
            };
          } else {
            planning[targetDay] = serviceData.service;
          }
        } else {
          // S'il y a déjà un service ce jour-là
          // Si c'est NU sur le jour original, on peut avoir les deux
          if (serviceData.service === 'NU' && targetDay === jourNum) {
            console.log(`Jour ${targetDay} : NU conservé avec ${planning[targetDay]}`);
          } else {
            console.warn(`Jour ${targetDay} a déjà un service, ${serviceData.code} ignoré`);
          }
        }
      });
    });
    
    return planning;
  }

  // Détecter les écarts
  detecterEcarts(planningOriginal, planningModifie, agent, jour) {
    const ecarts = [];
    
    const original = planningOriginal[agent]?.[jour];
    const modifie = planningModifie[agent]?.[jour];
    
    // Extraire les services
    const serviceOriginal = typeof original === 'string' ? original : original?.service;
    const serviceModifie = typeof modifie === 'string' ? modifie : modifie?.service;
    const posteModifie = typeof modifie === 'object' ? modifie?.poste : '';
    
    // Écart de commande : HAB/EIA/VM/FO → service
    if (['HAB', 'EIA', 'VM', 'FO'].includes(serviceOriginal) && 
        ['-', 'O', 'X'].includes(serviceModifie)) {
      ecarts.push({
        type: 'commande',
        agent: agent,
        jour: jour,
        description: `${serviceOriginal} → ${serviceModifie}${posteModifie ? ' (' + posteModifie + ')' : ''}`,
        critique: false
      });
    }
    
    // Écart d'optimisation pour les réserves
    if (serviceOriginal === 'D' && posteModifie && ['RE', 'CCU'].includes(posteModifie)) {
      // Vérifier si EAC/PCD aurait pu être utilisé
      ecarts.push({
        type: 'optimisation',
        agent: agent,
        jour: jour,
        description: `Réserve utilisée pour ${posteModifie} alors qu'EAC/PCD possible`,
        critique: false
      });
    }
    
    return ecarts;
  }
}

const planningService = new PlanningService();
export default planningService;