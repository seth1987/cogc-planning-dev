import { format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

// Formater une date en français
export const formatDate = (date, formatStr = 'dd MMMM yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!isValid(dateObj)) return '';
  return format(dateObj, formatStr, { locale: fr });
};

// Obtenir le nom du mois en français
export const getMonthName = (month) => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[month - 1];
};

// Obtenir tous les jours d'un mois
export const getDaysInMonth = (year, month) => {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return eachDayOfInterval({ start, end });
};

// Vérifier si c'est un weekend
export const isWeekendDay = (date) => {
  return isWeekend(date);
};

// Obtenir le type de garde par défaut selon le jour
export const getDefaultGardeType = (date) => {
  if (isWeekend(date)) {
    return 'weekend';
  }
  // Logique pour déterminer jour/nuit selon l'heure
  const hour = date.getHours();
  if (hour >= 8 && hour < 20) {
    return 'jour';
  }
  return 'nuit';
};

// Calculer le nombre de jours entre deux dates
export const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Vérifier si une date est dans une période
export const isDateInPeriod = (date, startDate, endDate) => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
};

// Obtenir les dates de garde d'un médecin pour un mois
export const getMedecinGardesForMonth = (gardes, medecinId, year, month) => {
  return gardes.filter(garde => {
    const gardeDate = new Date(garde.date);
    return (
      garde.medecin_id === medecinId &&
      gardeDate.getFullYear() === year &&
      gardeDate.getMonth() === month - 1
    );
  });
};

// Compter les gardes par type
export const countGardesByType = (gardes) => {
  const counts = {
    jour: 0,
    nuit: 0,
    weekend: 0,
    total: gardes.length
  };

  gardes.forEach(garde => {
    if (garde.type_garde in counts) {
      counts[garde.type_garde]++;
    }
  });

  return counts;
};

// Générer un calendrier de disponibilités
export const generateAvailabilityCalendar = (year, month, absences) => {
  const days = getDaysInMonth(year, month);
  const calendar = {};

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    calendar[dateStr] = {
      date: day,
      available: true,
      reason: null
    };

    // Vérifier les absences
    absences.forEach(absence => {
      if (isDateInPeriod(day, absence.date_debut, absence.date_fin)) {
        calendar[dateStr].available = false;
        calendar[dateStr].reason = absence.type_absence;
      }
    });
  });

  return calendar;
};

// Exporter le planning en format texte
export const exportPlanningText = (planning, gardes) => {
  let text = `PLANNING ${getMonthName(planning.mois)} ${planning.annee}\n`;
  text += '='.repeat(50) + '\n\n';

  const days = getDaysInMonth(planning.annee, planning.mois);
  
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayGardes = gardes.filter(g => isSameDay(new Date(g.date), day));
    
    text += formatDate(day, 'EEEE dd MMMM') + '\n';
    
    if (dayGardes.length > 0) {
      dayGardes.forEach(garde => {
        text += `  - ${garde.type_garde.toUpperCase()}: Dr. ${garde.medecin?.nom} ${garde.medecin?.prenom}\n`;
      });
    } else {
      text += '  Aucune garde programmée\n';
    }
    
    text += '\n';
  });

  return text;
};

export default {
  formatDate,
  getMonthName,
  getDaysInMonth,
  isWeekendDay,
  getDefaultGardeType,
  daysBetween,
  isDateInPeriod,
  getMedecinGardesForMonth,
  countGardesByType,
  generateAvailabilityCalendar,
  exportPlanningText
};