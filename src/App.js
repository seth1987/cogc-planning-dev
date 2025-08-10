import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, AlertTriangle, Upload, Plus, Edit, Trash2, Save, X, Info } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import './App.css';

// Constants
const MONTHS = [
  'JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'
];

const CODE_COLORS = {
  '-': 'bg-blue-100 text-blue-800 font-semibold',
  'O': 'bg-orange-100 text-orange-800 font-semibold', 
  'X': 'bg-purple-100 text-purple-800 font-semibold',
  'RP': 'bg-green-100 text-green-700',
  'RU': 'bg-green-100 text-green-700',
  'C': 'bg-green-100 text-green-700',
  'MA': 'bg-red-100 text-red-700',
  'I': 'bg-gray-100 text-gray-600',
  'D': 'bg-yellow-100 text-yellow-700',
  'NU': 'bg-gray-100 text-gray-600',
  'FO': 'bg-indigo-100 text-indigo-700',
  'VL': 'bg-indigo-100 text-indigo-700', 
  'VM': 'bg-indigo-100 text-indigo-700',
  'HAB': 'bg-indigo-100 text-indigo-700',
  'VT': 'bg-indigo-100 text-indigo-700',
  'EIA': 'bg-indigo-100 text-indigo-700',
  'CRC': 'bg-rose-100 text-rose-800 font-semibold',
  'ACR': 'bg-rose-100 text-rose-800 font-semibold',
  'RC': 'bg-blue-100 text-blue-800 font-semibold',
  'RO': 'bg-blue-100 text-blue-800 font-semibold',
  'CCU': 'bg-emerald-100 text-emerald-800 font-semibold',
  'RE': 'bg-emerald-100 text-emerald-800 font-semibold',
  'CAC': 'bg-amber-100 text-amber-800 font-semibold',
  'S/S': 'bg-purple-100 text-purple-800 font-semibold',
  '': 'bg-gray-50 text-gray-400'
};

const ORDRE_GROUPES = [
  'CRC - ROULEMENT CRC COGC',
  'ACR - ROULEMENT ACR GOGC', 
  'RC - ROULEMENT REGULATEUR CENTRE',
  'RO - ROULEMENT REGULATEUR TABLE OUEST',
  'RESERVE REGULATEUR PN',
  'RESERVE REGULATEUR DR',
  'CCU - ROULEMENT CCU DENFERT',
  'RE - ROULEMENT REGULATEUR TABLE EST DENFERT',
  'CAC - ROULEMENT DENFERT',
  'EAC - APPORT DENFERT',
  'RESERVE PCD - DENFERT'
];

const GROUPES_PAR_STATUT = {
  roulement: [
    'CRC - ROULEMENT CRC COGC',
    'ACR - ROULEMENT ACR GOGC',
    'RC - ROULEMENT REGULATEUR CENTRE',
    'RO - ROULEMENT REGULATEUR TABLE OUEST',
    'CCU - ROULEMENT CCU DENFERT',
    'RE - ROULEMENT REGULATEUR TABLE EST DENFERT',
    'CAC - ROULEMENT DENFERT'
  ],
  reserve: [
    'RESERVE REGULATEUR PN',
    'RESERVE REGULATEUR DR',
    'EAC - APPORT DENFERT',
    'RESERVE PCD - DENFERT'
  ]
};

// Service Planning
class PlanningService {
  organizeData(agents, habilitations) {
    const agentsByGroupe = {};
    
    ORDRE_GROUPES.forEach(groupe => {
      agentsByGroupe[groupe] = [];
    });
    
    agents.forEach(agent => {
      const groupe = agent.groupe || 'DIVERS';
      if (!agentsByGroupe[groupe]) {
        agentsByGroupe[groupe] = [];
      }
      agentsByGroupe[groupe].push(agent);
    });
    
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
    const year = 2025;
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  getJourType(day, month) {
    const monthIndex = MONTHS.indexOf(month);
    const date = new Date(2025, monthIndex, day);
    const dayOfWeek = date.getDay();
    
    const feriesJuillet = [14];
    
    return {
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isFerier: feriesJuillet.includes(day)
    };
  }
}

const planningService = new PlanningService();

// Composants
const Header = ({ user, connectionStatus, onOpenGestionAgents, onSignOut }) => (
  <div className="bg-white border-b px-4 py-3">
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Planning COGC Paris Nord</h1>
        </div>
        <div className="text-sm text-gray-600">{connectionStatus}</div>
      </div>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 mr-4">{user?.email}</span>
        <button
          onClick={onOpenGestionAgents}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          <Users className="w-4 h-4" />
          <span>Gestion Agents</span>
        </button>
        
        <button 
          onClick={onSignOut}
          className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Déconnexion
        </button>
      </div>
    </div>
  </div>
);

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

const PlanningTable = ({ currentMonth, planning, agentsData, onCellClick, onAgentClick }) => {
  const daysInMonth = planningService.getDaysInMonth(currentMonth);
  
  const getDayHeader = (day) => {
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth);
    const monthIndex = MONTHS.indexOf(currentMonth);
    const date = new Date(2025, monthIndex, day);
    const dayOfWeek = date.toLocaleDateString('fr-FR', { weekday: 'short' });
    
    let className = 'px-1 py-2 text-center text-xs font-medium min-w-[60px] ';
    
    if (isFerier) {
      className += 'bg-green-200 text-green-900';
    } else if (isWeekend) {
      className += 'bg-green-100 text-green-800';
    } else {
      className += 'bg-gray-50 text-gray-700';
    }
    
    return (
      <th key={day} className={className}>
        <div className="flex flex-col">
          <span className="text-xs uppercase">{dayOfWeek}</span>
          <span className="font-bold text-sm">{day}</span>
          {isFerier && <span className="text-xs">Férié</span>}
        </div>
      </th>
    );
  };

  const renderPlanningCell = (agent, day) => {
    const agentName = `${agent.nom} ${agent.prenom}`;
    const planningData = planning[agentName]?.[day];
    const { isWeekend, isFerier } = planningService.getJourType(day, currentMonth);
    
    let cellContent = '';
    let cellClass = 'border px-1 py-1 text-center text-xs cursor-pointer hover:bg-gray-100 transition-colors min-w-[60px] ';
    
    if (planningData) {
      if (typeof planningData === 'string') {
        cellContent = planningData;
        cellClass += CODE_COLORS[planningData] || 'bg-gray-100 text-gray-600';
      } else if (typeof planningData === 'object') {
        const service = planningData.service || '';
        const poste = planningData.poste || '';
        cellContent = (
          <div className="flex flex-col">
            <span>{service}</span>
            {poste && <span className="text-xs font-bold">{poste}</span>}
          </div>
        );
        cellClass += CODE_COLORS[service] || 'bg-gray-100 text-gray-600';
      }
    } else {
      cellClass += isWeekend || isFerier ? 'bg-green-50' : 'bg-white';
    }
    
    return (
      <td 
        key={`${agentName}_${day}`}
        className={cellClass}
        onClick={() => onCellClick(agentName, day)}
      >
        {cellContent}
      </td>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-50">
              <th className="w-48 px-4 py-2 text-left text-xs font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">
                Agent
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => getDayHeader(i + 1))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(agentsData).map(([groupe, agents], groupIndex) => (
              <React.Fragment key={groupe}>
                <tr className="bg-blue-50">
                  <td className="px-4 py-2 font-semibold text-sm text-blue-900 sticky left-0 bg-blue-50 z-10" colSpan={daysInMonth + 1}>
                    {groupe} ({agents.length} agents)
                  </td>
                </tr>
                
                {agents.map((agent) => (
                  <tr key={agent.id || `${agent.nom}_${agent.prenom}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => onAgentClick && onAgentClick(agent)}
                          className="text-left hover:text-blue-600 hover:underline transition-colors"
                          title="Voir les habilitations"
                        >
                          <span>{agent.nom} {agent.prenom}</span>
                        </button>
                        <div className="flex items-center space-x-1">
                          <span className={`px-1 py-0.5 text-xs rounded ${
                            agent.statut === 'roulement' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {agent.statut}
                          </span>
                          {agent.site === 'Denfert-Rochereau' && (
                            <span className="text-xs text-purple-600">DR</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => 
                      renderPlanningCell(agent, dayIndex + 1)
                    )}
                  </tr>
                ))}
                
                {groupIndex < Object.entries(agentsData).length - 1 && (
                  <tr className="h-2 bg-gray-100">
                    <td colSpan={daysInMonth + 1}></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-gray-50 border-t">
        <h4 className="font-semibold text-sm mb-2">Légende des codes</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="font-medium mb-1">Services :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-blue-100 rounded"></span>
                <span>- = Matin (06h-14h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-orange-100 rounded"></span>
                <span>O = Soir (14h-22h)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-purple-100 rounded"></span>
                <span>X = Nuit (22h-06h)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Repos :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-green-100 rounded"></span>
                <span>RP = Repos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-green-100 rounded"></span>
                <span>C = Congés</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">États :</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-yellow-100 rounded"></span>
                <span>D = Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 bg-red-100 rounded"></span>
                <span>MA = Maladie</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Postes (réserve) :</p>
            <p className="text-gray-600">CRC, ACR, RC, RO, CCU, RE, CAC</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ModalCellEdit = ({ selectedCell, agentsData, onUpdateCell, onClose }) => {
  const [tempService, setTempService] = useState('');
  const [tempPoste, setTempPoste] = useState('');

  if (!selectedCell) return null;

  const serviceCodes = [
    { code: '-', desc: 'Matin (06h-14h)' },
    { code: 'O', desc: 'Soir (14h-22h)' },
    { code: 'X', desc: 'Nuit (22h-06h)' },
    { code: 'RP', desc: 'Repos programmé' },
    { code: 'C', desc: 'Congés' },
    { code: 'MA', desc: 'Maladie' },
    { code: 'D', desc: 'Disponible' },
    { code: 'HAB', desc: 'Habilitation' },
    { code: 'FO', desc: 'Formation' }
  ];

  const postesCodes = ['CRC', 'ACR', 'RC', 'RO', 'CCU', 'RE', 'CAC', 'S/S'];

  const handleSave = () => {
    const planningData = tempPoste ? { service: tempService, poste: tempPoste } : tempService;
    onUpdateCell(selectedCell.agent, selectedCell.day, planningData);
    onClose();
  };

  const isReserveAgent = Object.entries(agentsData).some(([groupe, agents]) => 
    groupe.includes('RESERVE') && 
    agents.some(agent => `${agent.nom} ${agent.prenom}` === selectedCell.agent)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold">{selectedCell.agent}</h3>
            <p className="text-sm text-gray-600">Jour {selectedCell.day}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Service / Horaire</label>
          <div className="grid grid-cols-3 gap-2">
            {serviceCodes.map(({ code, desc }) => (
              <button
                key={code}
                onClick={() => setTempService(code)}
                className={`p-2 rounded text-center text-xs transition-all ${
                  tempService === code 
                    ? 'ring-2 ring-blue-500 ' + (CODE_COLORS[code] || 'bg-blue-100')
                    : CODE_COLORS[code] || 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <div className="font-semibold">{code}</div>
                <div className="text-xs mt-1">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {isReserveAgent && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Poste (Réserve)</label>
            <div className="grid grid-cols-4 gap-2">
              {postesCodes.map(poste => (
                <button
                  key={poste}
                  onClick={() => setTempPoste(tempPoste === poste ? '' : poste)}
                  className={`p-2 rounded text-center text-xs transition-all ${
                    tempPoste === poste 
                      ? 'ring-2 ring-blue-500 ' + (CODE_COLORS[poste] || 'bg-rose-100')
                      : CODE_COLORS[poste] || 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {poste}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

const ModalGestionAgents = ({ isOpen, agents, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[80vh] shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Gestion des Agents ({agents.length})</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Agent</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Statut</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Groupe</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Site</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium">{agent.nom} {agent.prenom}</div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 text-xs rounded ${
                      agent.statut === 'roulement' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {agent.statut}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate" title={agent.groupe}>
                    {agent.groupe}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    <span className={agent.site === 'Denfert-Rochereau' ? 'text-purple-600' : 'text-blue-600'}>
                      {agent.site === 'Denfert-Rochereau' ? 'DR' : 'PN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// Page de connexion
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Vérifiez votre email pour confirmer votre inscription!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          onLogin(data.user);
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Planning COGC Paris Nord</h1>
          <p className="text-sm text-gray-600 mt-2">
            {isSignUp ? 'Créer un compte' : 'Connexion à votre espace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength="6"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Chargement...' : (isSignUp ? "S'inscrire" : 'Se connecter')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Application principale
const App = () => {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('AOÛT');
  const [agentsData, setAgentsData] = useState({});
  const [agents, setAgents] = useState([]);
  const [habilitations, setHabilitations] = useState({});
  const [planning, setPlanning] = useState({});
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('⏳ Connexion...');
  const [error, setError] = useState(null);

  // États des modales
  const [selectedCell, setSelectedCell] = useState(null);
  const [showGestionAgents, setShowGestionAgents] = useState(false);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Erreur vérification utilisateur:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  const loadData = useCallback(async (month = currentMonth) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('🔗 Connexion Supabase...');
      
      // Charger les agents
      const { data: agentsResult, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .order('groupe,nom');
      
      if (agentsError) throw agentsError;
      
      if (!agentsResult || agentsResult.length === 0) {
        setConnectionStatus('❌ Aucun agent trouvé');
        setError('Aucun agent trouvé dans la base de données');
        return;
      }
      
      // Charger les habilitations
      const { data: habilitationsResult } = await supabase
        .from('habilitations')
        .select('*');
      
      const { agentsByGroupe, habilitationsByAgent } = planningService.organizeData(
        agentsResult || [], 
        habilitationsResult || []
      );
      
      setAgents(agentsResult);
      setAgentsData(agentsByGroupe);
      setHabilitations(habilitationsByAgent);
      setConnectionStatus(`✅ ${agentsResult.length} agents connectés`);
      
      // Charger le planning du mois
      const monthIndex = MONTHS.indexOf(month);
      const startDate = new Date(2025, monthIndex, 1).toISOString().split('T')[0];
      const endDate = new Date(2025, monthIndex + 1, 0).toISOString().split('T')[0];
      
      const { data: planningFromDB } = await supabase
        .from('planning')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');
      
      const planningData = {};
      
      agentsResult.forEach(agent => {
        const agentName = `${agent.nom} ${agent.prenom}`;
        planningData[agentName] = {};
      });
      
      if (planningFromDB) {
        planningFromDB.forEach(entry => {
          const agent = agentsResult.find(a => a.id === entry.agent_id);
          if (agent) {
            const agentName = `${agent.nom} ${agent.prenom}`;
            const day = new Date(entry.date).getDate();
            
            if (entry.poste_code) {
              planningData[agentName][day] = {
                service: entry.service_code,
                poste: entry.poste_code
              };
            } else {
              planningData[agentName][day] = entry.service_code;
            }
          }
        });
      }
      
      setPlanning(planningData);
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setError(`Erreur de connexion: ${error.message}`);
      setConnectionStatus('❌ Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  useEffect(() => {
    if (user && agents.length > 0) {
      loadData(currentMonth);
    }
  }, [currentMonth, user, loadData, agents.length]);

  // Handlers
  const handleCellClick = (agentName, day) => {
    setSelectedCell({ agent: agentName, day });
  };

  const handleUpdateCell = async (agentName, day, value) => {
    try {
      const agent = agents.find(a => `${a.nom} ${a.prenom}` === agentName);
      if (!agent) return;

      const monthIndex = MONTHS.indexOf(currentMonth);
      const date = new Date(2025, monthIndex, day).toISOString().split('T')[0];
      
      const planningData = {
        agent_id: agent.id,
        date: date,
        service_code: typeof value === 'object' ? value.service : value,
        poste_code: typeof value === 'object' ? value.poste : null,
        statut: 'actif'
      };

      const { error } = await supabase
        .from('planning')
        .insert(planningData);
      
      if (error) throw error;
      
      setPlanning(prev => ({
        ...prev,
        [agentName]: {
          ...prev[agentName],
          [day]: value
        }
      }));
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Si on vérifie encore l'authentification
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Vérification...</div>
        </div>
      </div>
    );
  }

  // Si pas connecté, afficher la page de connexion
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  // Si connecté mais données en chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Chargement des données...</div>
          <div className="text-sm text-gray-500 mt-2">{connectionStatus}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <div className="text-lg text-red-600 mb-2">Erreur de connexion</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button onClick={() => loadData()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Interface principale avec le planning
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        connectionStatus={connectionStatus}
        onOpenGestionAgents={() => setShowGestionAgents(true)}
        onSignOut={handleSignOut}
      />
      
      <MonthTabs 
        currentMonth={currentMonth}
        onChangeMonth={setCurrentMonth}
      />
      
      <div className="p-4">
        <PlanningTable 
          currentMonth={currentMonth}
          planning={planning}
          agentsData={agentsData}
          onCellClick={handleCellClick}
        />
      </div>
      
      {selectedCell && (
        <ModalCellEdit 
          selectedCell={selectedCell}
          agentsData={agentsData}
          onUpdateCell={handleUpdateCell}
          onClose={() => setSelectedCell(null)}
        />
      )}
      
      <ModalGestionAgents
        isOpen={showGestionAgents}
        agents={agents}
        onClose={() => setShowGestionAgents(false)}
      />
    </div>
  );
};

export default App;