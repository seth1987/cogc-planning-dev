import React from 'react';
import { MONTHS } from '../constants/config';

const MonthTabs = ({ currentMonth, onChangeMonth }) => (
  <div className="bg-white border-b px-4">
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
);

export default MonthTabs;