import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MONTHS } from '../constants/config';

const DebugPlanning = ({ currentMonth = 'Août' }) => {
  const [debugInfo, setDebugInfo] = useState({
    monthInfo: {},
    dateRange: {},
    planningData: [],
    lastDayData: [],
    stats: {}
  });

  useEffect(() => {
    debugMonth();
  }, [currentMonth]);

  const debugMonth = async () => {
    const monthIndex = MONTHS.indexOf(currentMonth);
    const year = 2025;
    
    // Calculer les infos du mois
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Dates pour la requête
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];
    
    console.log('🔍 Debug Planning pour', currentMonth, year);
    console.log('📅 Premier jour:', startDate);
    console.log('📅 Dernier jour:', endDate);
    console.log('📊 Nombre de jours:', daysInMonth);
    
    // Récupérer les données du planning
    const { data: planningData, error } = await supabase
      .from('planning')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
    
    if (error) {
      console.error('❌ Erreur requête:', error);
      return;
    }
    
    // Analyser les données
    const dateSet = new Set(planningData.map(p => p.date));
    const uniqueDates = Array.from(dateSet).sort();
    
    // Vérifier spécifiquement le dernier jour
    const lastDayStr = endDate;
    const lastDayData = planningData.filter(p => p.date === lastDayStr);
    
    // Statistiques
    const stats = {
      totalEntries: planningData.length,
      uniqueDates: uniqueDates.length,
      firstDate: uniqueDates[0],
      lastDate: uniqueDates[uniqueDates.length - 1],
      hasLastDay: dateSet.has(lastDayStr),
      lastDayEntries: lastDayData.length
    };
    
    // Vérifier les jours manquants
    const missingDays = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!dateSet.has(dateStr)) {
        missingDays.push(dateStr);
      }
    }
    
    const info = {
      monthInfo: {
        month: currentMonth,
        year: year,
        monthIndex: monthIndex,
        daysInMonth: daysInMonth
      },
      dateRange: {
        startDate: startDate,
        endDate: endDate,
        firstDayJS: firstDay.toString(),
        lastDayJS: lastDay.toString()
      },
      planningData: planningData.slice(-10), // Les 10 dernières entrées
      lastDayData: lastDayData,
      stats: stats,
      missingDays: missingDays
    };
    
    setDebugInfo(info);
    console.log('📊 Debug Info:', info);
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">🔍 Debug Planning - {currentMonth}</h3>
      
      <div className="space-y-4">
        {/* Infos du mois */}
        <div className="bg-white p-3 rounded">
          <h4 className="font-semibold mb-2">📅 Informations du mois</h4>
          <pre className="text-xs">{JSON.stringify(debugInfo.monthInfo, null, 2)}</pre>
        </div>
        
        {/* Plage de dates */}
        <div className="bg-white p-3 rounded">
          <h4 className="font-semibold mb-2">📆 Plage de dates</h4>
          <pre className="text-xs">{JSON.stringify(debugInfo.dateRange, null, 2)}</pre>
        </div>
        
        {/* Statistiques */}
        <div className="bg-white p-3 rounded">
          <h4 className="font-semibold mb-2">📊 Statistiques</h4>
          <pre className="text-xs">{JSON.stringify(debugInfo.stats, null, 2)}</pre>
          {debugInfo.stats.hasLastDay ? (
            <p className="text-green-600 mt-2">✅ Le dernier jour ({debugInfo.dateRange.endDate}) a {debugInfo.stats.lastDayEntries} entrées</p>
          ) : (
            <p className="text-red-600 mt-2">❌ Le dernier jour ({debugInfo.dateRange.endDate}) n'a pas de données!</p>
          )}
        </div>
        
        {/* Jours manquants */}
        {debugInfo.missingDays && debugInfo.missingDays.length > 0 && (
          <div className="bg-yellow-50 p-3 rounded">
            <h4 className="font-semibold mb-2">⚠️ Jours sans données</h4>
            <div className="text-sm">
              {debugInfo.missingDays.map(day => (
                <span key={day} className="inline-block px-2 py-1 m-1 bg-yellow-200 rounded">{day}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Données du dernier jour */}
        <div className="bg-white p-3 rounded">
          <h4 className="font-semibold mb-2">📋 Données du dernier jour</h4>
          <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo.lastDayData, null, 2)}</pre>
        </div>
        
        {/* Dernières entrées */}
        <div className="bg-white p-3 rounded">
          <h4 className="font-semibold mb-2">📝 10 dernières entrées du planning</h4>
          <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo.planningData, null, 2)}</pre>
        </div>
      </div>
      
      <button 
        onClick={debugMonth}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🔄 Actualiser Debug
      </button>
    </div>
  );
};

export default DebugPlanning;