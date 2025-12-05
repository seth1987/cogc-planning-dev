import React from 'react';
import { MONTHS, CURRENT_YEAR } from '../constants/config';

const MonthTabs = ({ currentMonth, onChangeMonth }) => (
  <div className="bg-white border-b px-4">
    <div className="flex items-center gap-2">
      {/* Indicateur de l'année */}
      <div className="px-3 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-200">
        {CURRENT_YEAR}
      </div>
      
      {/* Onglets des mois */}
      <div className="flex gap-1 overflow-x-auto">
        {MONTHS.map(month => (
          <button
            key={month}
            onClick={() => onChangeMonth(month)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              currentMonth === month
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {month}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default MonthTabs;
