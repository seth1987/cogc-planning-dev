import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * DebugPlanning - Composant de debug pour visualiser les données
 * Uniquement visible en mode développement
 */
const DebugPlanning = ({ currentMonth }) => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDebugData = async () => {
    setLoading(true);
    try {
      // Récupérer quelques données pour debug
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .limit(5);

      const { data: planning, error: planningError } = await supabase
        .from('planning')
        .select('*')
        .limit(10);

      setDebugData({
        agents: agents || [],
        agentsError,
        planning: planning || [],
        planningError,
        currentMonth,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setDebugData({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-yellow-800">🔍 Debug Planning</h3>
        <button
          onClick={loadDebugData}
          disabled={loading}
          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Charger données'}
        </button>
      </div>

      {debugData && (
        <div className="text-xs font-mono bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-96">
          <pre>{JSON.stringify(debugData, null, 2)}</pre>
        </div>
      )}

      {!debugData && (
        <p className="text-sm text-yellow-700">
          Cliquez sur "Charger données" pour voir les données de debug
        </p>
      )}
    </div>
  );
};

export default DebugPlanning;
