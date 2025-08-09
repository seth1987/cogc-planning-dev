import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [agents, setAgents] = useState([]);
  const [planning, setPlanning] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadData();
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [selectedMonth, selectedYear, user]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadData();
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!user) return;
    
    // Charger les agents
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('site', 'Paris Nord')
      .order('nom');
    
    if (!agentsError) {
      setAgents(agentsData || []);
    }

    // Charger le planning du mois
    const startDate = new Date(selectedYear, selectedMonth - 1, 1);
    const endDate = new Date(selectedYear, selectedMonth, 0);
    
    const { data: planningData, error: planningError } = await supabase
      .from('planning')
      .select(`
        *,
        agent:agents(nom, prenom, groupe)
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');
    
    if (!planningError) {
      setPlanning(planningData || []);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Vérifiez votre email pour confirmer votre inscription!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      alert(error.message);
    }
  };

  const getMonthName = (month) => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[month - 1];
  };

  const getServiceColor = (code) => {
    const colors = {
      'O': 'bg-green-500',
      'X': 'bg-red-500',
      '-': 'bg-gray-400',
      'RP': 'bg-yellow-500',
      'D': 'bg-blue-500',
      'C': 'bg-purple-500',
      'MA': 'bg-orange-500',
      'TQ': 'bg-pink-500'
    };
    return colors[code] || 'bg-gray-300';
  };

  const groupPlanningByDate = () => {
    const grouped = {};
    planning.forEach(item => {
      const date = new Date(item.date).toLocaleDateString('fr-FR');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App flex items-center justify-center min-h-screen">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-8">
            Planning COGC Paris Nord
          </h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {isSignUp ? 'S\'inscrire' : 'Se connecter'}
            </button>
          </form>
          <p className="text-center mt-4">
            {isSignUp ? 'Déjà un compte?' : 'Pas encore de compte?'}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-purple-600 ml-2 hover:underline"
            >
              {isSignUp ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const groupedPlanning = groupPlanningByDate();

  return (
    <div className="App min-h-screen">
      <header className="App-header p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-700">
            Planning COGC Paris Nord
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Bienvenue, {user.email}</span>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-8">
        {/* Sélecteur de mois */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Planning {getMonthName(selectedMonth)} {selectedYear}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (selectedMonth === 1) {
                    setSelectedMonth(12);
                    setSelectedYear(selectedYear - 1);
                  } else {
                    setSelectedMonth(selectedMonth - 1);
                  }
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                ← Mois précédent
              </button>
              <button
                onClick={() => {
                  if (selectedMonth === 12) {
                    setSelectedMonth(1);
                    setSelectedYear(selectedYear + 1);
                  } else {
                    setSelectedMonth(selectedMonth + 1);
                  }
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Mois suivant →
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{agents.length}</div>
            <div className="text-gray-600">Agents actifs</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{planning.length}</div>
            <div className="text-gray-600">Services ce mois</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {agents.filter(a => a.statut === 'roulement').length}
            </div>
            <div className="text-gray-600">Agents roulement</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {agents.filter(a => a.statut === 'reserve').length}
            </div>
            <div className="text-gray-600">Agents réserve</div>
          </div>
        </div>

        {/* Planning détaillé */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Planning détaillé</h3>
          {Object.keys(groupedPlanning).length === 0 ? (
            <p className="text-gray-500">Aucun planning pour ce mois</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPlanning).map(([date, items]) => (
                <div key={date} className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-700 mb-2">{date}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-white text-xs ${getServiceColor(item.service_code)}`}>
                          {item.service_code}
                        </span>
                        <span className="text-sm">
                          {item.agent ? `${item.agent.nom} ${item.agent.prenom}` : 'Non assigné'}
                        </span>
                        {item.poste_code && (
                          <span className="text-xs text-gray-500">({item.poste_code})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liste des agents */}
        <div className="card p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">Liste des agents</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => (
              <div key={agent.id} className="border rounded p-3">
                <div className="font-semibold">{agent.nom} {agent.prenom}</div>
                <div className="text-sm text-gray-600">{agent.groupe}</div>
                <div className="text-xs mt-1">
                  <span className={`px-2 py-1 rounded ${
                    agent.statut === 'roulement' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {agent.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;