/**
 * Calendrier prévisionnel de paie 2026
 * 
 * Contient les dates de disponibilité des bulletins Digiposte
 * et les dates de virement pour chaque mois.
 * 
 * Note: PFA = Prime de Fin d'Année (décembre)
 */

// Dates au format { mois (1-12), jour }
export const DATES_PAIE_2026 = {
  digiposte: [
    { month: 1, day: 23 },   // Janvier - Vendredi 23
    { month: 2, day: 20 },   // Février - Vendredi 20
    { month: 3, day: 24 },   // Mars - Mardi 24
    { month: 4, day: 23 },   // Avril - Jeudi 23
    { month: 5, day: 21 },   // Mai - Jeudi 21
    { month: 6, day: 23 },   // Juin - Mardi 23
    { month: 7, day: 24 },   // Juillet - Vendredi 24
    { month: 8, day: 24 },   // Août - Lundi 24
    { month: 9, day: 23 },   // Septembre - Mercredi 23
    { month: 10, day: 23 },  // Octobre - Vendredi 23
    { month: 11, day: 23 },  // Novembre - Lundi 23
    { month: 12, day: 11 },  // PFA (Prime Fin d'Année) - Vendredi 11
    { month: 12, day: 23 },  // Décembre - Mercredi 23
  ],
  virement: [
    { month: 1, day: 29 },   // Janvier - Jeudi 29
    { month: 2, day: 26 },   // Février - Jeudi 26
    { month: 3, day: 27 },   // Mars - Vendredi 27
    { month: 4, day: 28 },   // Avril - Mardi 28
    { month: 5, day: 28 },   // Mai - Jeudi 28
    { month: 6, day: 26 },   // Juin - Vendredi 26
    { month: 7, day: 29 },   // Juillet - Mercredi 29
    { month: 8, day: 28 },   // Août - Vendredi 28
    { month: 9, day: 28 },   // Septembre - Lundi 28
    { month: 10, day: 29 },  // Octobre - Jeudi 29
    { month: 11, day: 27 },  // Novembre - Vendredi 27
    { month: 12, day: 17 },  // PFA (Prime Fin d'Année) - Jeudi 17
    { month: 12, day: 29 },  // Décembre - Mardi 29
  ]
};

// Chemins des icônes (nouveaux logos unifiés)
export const PAIE_ICONS = {
  digiposte: '/icons/logo_digiposte.png',
  argent: '/icons/logo_argent.png'
};

/**
 * Vérifie si une date correspond à une date Digiposte
 * @param {number} day - Jour du mois (1-31)
 * @param {number} month - Mois (0-11 pour JS, sera converti)
 * @param {number} year - Année
 * @returns {boolean}
 */
export const isDigiposteDate = (day, month, year) => {
  if (year !== 2026) return false;
  const jsMonth = month + 1; // Convertir de 0-11 à 1-12
  return DATES_PAIE_2026.digiposte.some(d => d.month === jsMonth && d.day === day);
};

/**
 * Vérifie si une date correspond à une date de virement
 * @param {number} day - Jour du mois (1-31)
 * @param {number} month - Mois (0-11 pour JS, sera converti)
 * @param {number} year - Année
 * @returns {boolean}
 */
export const isVirementDate = (day, month, year) => {
  if (year !== 2026) return false;
  const jsMonth = month + 1; // Convertir de 0-11 à 1-12
  return DATES_PAIE_2026.virement.some(d => d.month === jsMonth && d.day === day);
};

/**
 * Retourne le type de date paie (pour afficher l'icône appropriée)
 * @param {number} day - Jour du mois (1-31)
 * @param {number} month - Mois (0-11 pour JS)
 * @param {number} year - Année
 * @returns {'digiposte' | 'virement' | 'both' | null}
 */
export const getPaieType = (day, month, year) => {
  const isDigiposte = isDigiposteDate(day, month, year);
  const isVirement = isVirementDate(day, month, year);
  
  if (isDigiposte && isVirement) return 'both';
  if (isDigiposte) return 'digiposte';
  if (isVirement) return 'virement';
  return null;
};
