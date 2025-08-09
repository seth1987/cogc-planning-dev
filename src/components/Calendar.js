import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function PlanningCalendar({ value, onChange, gardes = [] }) {
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const garde = gardes.find(g => 
        new Date(g.date).toDateString() === date.toDateString()
      );
      
      if (garde) {
        return (
          <div className="text-xs mt-1">
            <span className={`px-1 py-0.5 rounded text-white ${
              garde.type_garde === 'jour' ? 'bg-blue-500' :
              garde.type_garde === 'nuit' ? 'bg-purple-600' :
              'bg-green-600'
            }`}>
              {garde.type_garde}
            </span>
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const hasGarde = gardes.some(g => 
        new Date(g.date).toDateString() === date.toDateString()
      );
      if (hasGarde) {
        return 'has-garde';
      }
    }
    return null;
  };

  return (
    <div className="calendar-container">
      <Calendar
        onChange={onChange}
        value={value}
        locale="fr-FR"
        tileContent={tileContent}
        tileClassName={tileClassName}
      />
      <style jsx>{`
        .react-calendar {
          width: 100%;
          max-width: 100%;
          background: white;
          border: 1px solid #e5e7eb;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 1.125em;
        }
        .react-calendar__tile.has-garde {
          background: #f3f4f6;
        }
        .react-calendar__tile--active {
          background: #667eea;
          color: white;
        }
        .react-calendar__tile--active:enabled:hover,
        .react-calendar__tile--active:enabled:focus {
          background: #764ba2;
        }
      `}</style>
    </div>
  );
}

export default PlanningCalendar;