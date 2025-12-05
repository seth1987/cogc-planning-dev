import React from 'react';
import { MONTHS } from '../constants/config';

/**
 * MonthTabs - Composant d'onglets pour navigation mois/année
 * 
 * v2.0 - Ajout des onglets d'années dynamiques
 * 
 * @param {string} currentMonth - Mois actuellement sélectionné
 * @param {number} currentYear - Année actuellement sélectionnée
 * @param {number[]} availableYears - Liste des années disponibles
 * @param {function} onChangeMonth - Callback changement de mois
 * @param {function} onChangeYear - Callback changement d'année
 */
const MonthTabs = ({ 
  currentMonth, 
  currentYear, 
  availableYears = [], 
  onChangeMonth, 
  onChangeYear 
}) => {
  // Fallback si pas d'années disponibles
  const years = availableYears.length > 0 ? availableYears : [new Date().getFullYear()];
  
  return (
    <div className="bg-white border-b px-4 py-2">
      <div className="flex items-center gap-2">
        {/* Onglets des années */}
        <div className="flex gap-1 mr-4 border-r pr-4">
          {years.map(year => (
            <button
              key={year}
              onClick={() => onChangeYear && onChangeYear(year)}
              className={`px-3 py-2 text-sm font-bold rounded-lg border transition-all duration-200 ${
                currentYear === year
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        
        {/* Onglets des mois */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {MONTHS.map(month => (
            <button
              key={month}
              onClick={() => onChangeMonth(month)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors rounded-t ${
                currentMonth === month
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {month}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonthTabs;
