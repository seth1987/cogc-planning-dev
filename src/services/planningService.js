import { MONTHS, JOURS_FERIES, CURRENT_YEAR, ORDRE_GROUPES } from '../constants/config';

class PlanningService {
  constructor() {
    this.codeColors = {
      // Services de travail
      '-': 'bg-green-100 text-green-800',  // Matinée (06h-14h)
      'O': 'bg-blue-100 text-blue-800',    // Soirée (14h-22h)
      'X': 'bg-purple-100 text-purple-800', // Nuit (22h-06h)
      
      // Repos et congés
      'RP': 'bg-yellow-100 text-yellow-800',  // Repos programmé/périodique
      'RPP': 'bg-yellow-100 text-yellow-800', // Repos périodique (variante)
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
      'VISIMED': 'bg-rose-100 text-rose-800', // Visite médicale (variante)
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
    const year = CURRENT_YEAR;
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  getJourType(day, month) {
    const monthIndex = MONTHS.indexOf(month);
    const date = new Date(CURRENT_YEAR, monthIndex, day);
    const dayOfWeek = date.getDay();
    
    // Vérifier si c'est un jour férié - utilise JOURS_FERIES (année courante)
    const joursFeriesMois = JOURS_FERIES[month] || [];
    const isFerier = joursFeriesMois.includes(day);
    
    return {
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isFerier: isFerier,
      date: date,
      dayOfWeek: dayOfWeek
    };
  }

  /**
   * Formate une date en string YYYY-MM-DD
   * IMPORTANT: Ne PAS utiliser toISOString() car il convertit en UTC et décale la date
   * @param {number} day - Jour du mois (1-31)
   * @param {string} month - Nom du mois (Janvier, Février, etc.)
   * @param {number} year - Année
   * @returns {string} Date au format YYYY-MM-DD
   */
  formatDate(day, month, year = CURRENT_YEAR) {
    const monthIndex = MONTHS.indexOf(month);
    // FIX: Construire la date directement en string pour éviter les problèmes de timezone
    // Ne PAS utiliser new Date().toISOString() car il convertit en UTC (décalage J-1)
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  }

  getDayName(day, month) {
    const monthIndex = MONTHS.indexOf(month);
    const date = new Date(CURRENT_YEAR, monthIndex, day);
    return date.toLocaleDateString('fr-FR', { weekday: 'short' });
  }

  // Mapper les codes PDF vers codes standardisés
  mapPDFCodeToStandard(codePDF, isReserve = false) {
    const mapping = {
      // Services avec postes - CCU
      'CCU001': { service: '-', poste: 'CCU' },
      'CCU002': { service: 'O', poste: 'CCU' },
      'CCU003': { service: 'X', poste: 'CCU' },
      'CCU004': { service: '-', poste: 'CCU' },
      'CCU005': { service: 'O', poste: 'CCU' },
      'CCU006': { service: 'X', poste: 'CCU' },
      
      // CRC
      'CRC001': { service: '-', poste: 'CRC' },
      'CRC002': { service: 'O', poste: 'CRC' },
      'CRC003': { service: 'X', poste: 'CRC' },
      
      // RC
      'RC001': { service: '-', poste: 'RC' },
      'RC002': { service: 'O', poste: 'RC' },
      'RC003': { service: 'X', poste: 'RC' },
      
      // RE
      'RE001': { service: '-', poste: 'RE' },
      'RE002': { service: 'O', poste: 'RE' },
      'RE003': { service: 'X', poste: 'RE' },
      
      // REO (Régulateur OUEST) - REO007 et REO008
      'REO007': { service: '-', poste: 'RO' },  // Matinée
      'REO008': { service: 'O', poste: 'RO' },  // Soirée
      
      // RO
      'RO001': { service: '-', poste: 'RO' },
      'RO002': { service: 'O', poste: 'RO' },
      'RO003': { service: 'X', poste: 'RO' },
      
      // CAC
      'CAC001': { service: '-', poste: 'CAC' },
      'CAC002': { service: 'O', poste: 'CAC' },
      
      // ACR
      'ACR001': { service: '-', poste: 'ACR' },
      'ACR002': { service: 'O', poste: 'ACR' },
      'ACR003': { service: 'X', poste: 'ACR' },
      
      // CENT (Centre)
      'CENT001': { service: '-', poste: 'CENT' },
      'CENT002': { service: 'O', poste: 'CENT' },
      'CENT003': { service: 'X', poste: 'CENT' },
      
      // Repos et congés (sans poste)
      'RP': { service: 'RP', poste: '' },
      'RPP': { service: 'RP', poste: '' },
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
      'VISIMED': { service: 'VM', poste: '' },
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
    // Vérifier le code de service (finit par 003, 006 ou 009 = nuit)
    if (serviceCode && (serviceCode.endsWith('003') || serviceCode.endsWith('006') || serviceCode.endsWith('009'))) {
      return true;
    }
    
    // Vérifier l'heure de début si disponible
    if (timeString) {
      const match = timeString.match(/(\d{2}):(\d{2})/);
      if (match) {
        const hour = parseInt(match[1]);
        // Service de nuit : commence après 20h ou avant 5h
        return hour >= 20 || hour < 5;
      }
    }
    
    return false;
  }

  // Extraire les informations d'un bulletin PDF avec gestion correcte des services de nuit ET DU MOIS
  extractFromPDF(pdfText, agent, currentMonth = null) {
    const planning = {};
    const lines = pdfText.split('\n');
    
    // Patterns pour détecter les dates et services
    const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/;
    const servicePattern = /(CRC|ACR|RC|RO|REO|CCU|RE|CAC|CENT)\d{3}/;
    
    // Structure temporaire pour gérer les services multiples par jour
    const tempPlanning = {};
    
    // Déterminer le mois du bulletin
    let bulletinMonth = null;
    let bulletinYear = CURRENT_YEAR;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateMatch = line.match(datePattern);
      
      if (dateMatch) {
        const jour = parseInt(dateMatch[1]);
        const mois = parseInt(dateMatch[2]);
        const annee = parseInt(dateMatch[3]);
        
        // Mémoriser le mois et l'année du bulletin
        if (!bulletinMonth) {
          bulletinMonth = MONTHS[mois - 1]; // Convertir le numéro de mois en nom
          bulletinYear = annee;
          console.log(`Bulletin détecté pour ${bulletinMonth} ${bulletinYear}`);
        }
        
        // Initialiser le stockage pour ce jour
        if (!tempPlanning[jour]) {
          tempPlanning[jour] = [];
        }
        
        // Chercher les services dans les lignes suivantes (jusqu'à 10 lignes)
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          const currentLine = lines[j];
          
          // Chercher NU (Non Utilisable)
          if (currentLine.includes('NU') && (currentLine.includes('Utilisable') || currentLine.includes('non utilisé'))) {
            tempPlanning[jour].push({
              code: 'NU',
              service: 'NU',
              poste: '',
              isNuit: false,
              heure: null
            });
          }
          
          // Chercher RP/RPP (Repos périodique)
          if ((currentLine.includes('RP') || currentLine.includes('RPP')) && currentLine.includes('Repos')) {
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
          
          // Chercher VISIMED
          if (currentLine.includes('VISIMED')) {
            tempPlanning[jour].push({
              code: 'VISIMED',
              service: 'VM',
              poste: '',
              isNuit: false,
              heure: null
            });
          }
          
          // Chercher les codes de service (CRC001, CCU003, REO007, REO008, etc.)
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
            
            console.log(`Service détecté : ${serviceCode} le ${jour}/${mois} - ${codeStandard.service} (${codeStandard.poste})`);
          }
        }
      }
    }
    
    // Retourner le planning avec le mois correct
    const result = {
      month: bulletinMonth || currentMonth,
      year: bulletinYear,
      planning: {}
    };
    
    // Traiter le planning temporaire et gérer les décalages de nuit
    Object.keys(tempPlanning).forEach(jour => {
      const jourNum = parseInt(jour);
      const services = tempPlanning[jour];
      
      if (services.length === 0) return;
      
      // Traiter chaque service
      services.forEach(serviceData => {
        let targetDay = jourNum;
        
        // RÈGLE FONDAMENTALE : Les services de nuit sont TOUJOURS décalés au jour suivant
        // Une nuit qui commence le J à 22h et finit le J+1 à 6h est affichée en J+1
        if (serviceData.isNuit) {
          targetDay = jourNum + 1;
          
          // Gérer le passage au mois suivant
          const daysInMonth = this.getDaysInMonth(bulletinMonth || currentMonth);
          if (targetDay > daysInMonth) {
            console.warn(`Service de nuit du ${jourNum} décalé au ${targetDay} (mois suivant) - ignoré`);
            return;
          }
        }
        
        // Ajouter le service au planning final
        // IMPORTANT : On ajoute TOUJOURS le service, même s'il y a déjà quelque chose
        // Sauf si c'est NU qui existe déjà (NU n'est jamais remplacé)
        if (!result.planning[targetDay]) {
          // Premier service pour ce jour
          if (serviceData.poste) {
            result.planning[targetDay] = {
              service: serviceData.service,
              poste: serviceData.poste
            };
          } else {
            result.planning[targetDay] = serviceData.service;
          }
          console.log(`Jour ${targetDay} : ajout de ${serviceData.code}`);
        } else {
          // Il y a déjà un service ce jour-là
          const existingService = typeof result.planning[targetDay] === 'string' 
            ? result.planning[targetDay] 
            : result.planning[targetDay].service;
          
          // RÈGLE : NU n'est JAMAIS remplacé
          if (existingService === 'NU') {
            console.warn(`Jour ${targetDay} : NU présent, ${serviceData.code} ignoré (NU prioritaire)`);
          }
          // Si c'est NU qui arrive et qu'il y a déjà autre chose, NU est ignoré
          else if (serviceData.service === 'NU') {
            console.log(`Jour ${targetDay} : NU ignoré car ${existingService} déjà présent`);
          }
          // IMPORTANT : Pour les services de nuit, on REMPLACE ce qui existe (sauf NU)
          else if (serviceData.isNuit || serviceData.service === 'X') {
            if (serviceData.poste) {
              result.planning[targetDay] = {
                service: serviceData.service,
                poste: serviceData.poste
              };
            } else {
              result.planning[targetDay] = serviceData.service;
            }
            console.log(`Jour ${targetDay} : service de nuit ${serviceData.code} remplace ${existingService}`);
          }
          // Pour les autres services, on garde le premier arrivé
          else {
            console.warn(`Jour ${targetDay} a déjà ${existingService}, ${serviceData.code} ignoré`);
          }
        }
      });
    });
    
    return result;
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
