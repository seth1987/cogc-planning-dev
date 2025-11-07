import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import './App.css';

// Services
import supabaseService from './services/supabaseService';
import planningService from './services/planningService';

// Components
import Header from './components/Header';
import MonthTabs from './components/MonthTabs';
import PlanningTable from './components/PlanningTable';
import LoginPage from './components/LoginPage';
import DebugPlanning from './components/DebugPlanning'; // TEMPORAIRE: Debug

// Modals
import ModalCellEdit from './components/modals/ModalCellEdit';
import ModalGestionAgents from './components/modals/ModalGestionAgents';
import ModalEditAgent from './components/modals/ModalEditAgent';
import ModalHabilitations from './components/modals/ModalHabilitations';
import ModalUploadPDF from './components/modals/ModalUploadPDF';

// Constants
import { MONTHS } from './constants/config';

const App = () => {
  // Auth states
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Data states
  const [currentMonth, setCurrentMonth] = useState(MONTHS[new Date().getMonth()]);
  const [agentsData, setAgentsData] = useState({});
  const [agents, setAgents] = useState([]);
  const [habilitations, setHabilitations] = useState({});
  const [planning, setPlanning] = useState({});
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('⏳ Connexion...');
  const [error, setError] = useState(null);

  // Modal states
  const [selectedCell, setSelectedCell] = useState(null);
  const [showGestionAgents, setShowGestionAgents] = useState(false);
  const [showHabilitations, setShowHabilitations] = useState(false);
  const [showEditAgent, setShowEditAgent] = useState(false);
  const [showUploadPDF, setShowUploadPDF] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  // TEMPORAIRE: Debug state
  const [showDebug, setShowDebug] = useState(false);

  // Check authentication on mount
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

  // Load data
  const loadData = useCallback(async (month = currentMonth) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      setConnectionStatus('🔗 Connexion Supabase...');
      
      // Load agents
      const agentsResult = await supabaseService.getAgents();
      
      if (!agentsResult || agentsResult.length === 0) {
        setConnectionStatus('❌ Aucun agent trouvé');
        setError('Aucun agent trouvé dans la base de données');
        return;
      }
      
      // Load habilitations
      const habilitationsResult = await supabaseService.getHabilitations();
      
      const { agentsByGroupe, habilitationsByAgent } = planningService.organizeData(
        agentsResult || [], 
        habilitationsResult || []
      );
      
      setAgents(agentsResult);
      setAgentsData(agentsByGroupe);
      setHabilitations(habilitationsByAgent);
      setConnectionStatus(`✅ ${agentsResult.length} agents connectés`);
      
      // Load planning for the month
      const monthIndex = MONTHS.indexOf(month);
      const year = 2025;
      
      // FIX: Calcul correct des dates sans problème de fuseau horaire
      // Premier jour du mois
      const firstDay = new Date(year, monthIndex, 1);
      const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      
      // Dernier jour du mois
      const lastDay = new Date(year, monthIndex + 1, 0);
      const lastDayOfMonth = lastDay.getDate();
      const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
      
      console.log(`📅 Chargement planning ${month} ${year}: du ${startDate} au ${endDate}`);
      
      const planningFromDB = await supabaseService.getPlanningForMonth(startDate, endDate);
      
      // Organize planning data
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

  // Load data when user or month changes
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

  // Handlers for planning cells
  const handleCellClick = (agentName, day) => {
    setSelectedCell({ agent: agentName, day });
  };

  const handleUpdateCell = async (agentName, day, value) => {
    try {
      const agent = agents.find(a => `${a.nom} ${a.prenom}` === agentName);
      if (!agent) return;

      const date = planningService.formatDate(day, currentMonth);
      
      if (value === '') {
        // Delete planning entry
        await supabaseService.deletePlanning(agent.id, date);
      } else {
        // Save or update planning
        const serviceCode = typeof value === 'object' ? value.service : value;
        const posteCode = typeof value === 'object' ? value.poste : null;
        
        await supabaseService.savePlanning(agent.id, date, serviceCode, posteCode);
      }
      
      // Update local state
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

  // Handlers for agents
  const handleAgentClick = (agent) => {
    setSelectedAgent(agent);
    setShowHabilitations(true);
  };

  const handleEditAgent = (agent) => {
    setSelectedAgent(agent);
    setShowEditAgent(true);
  };

  // NOUVEAU: Handler pour créer un nouvel agent
  const handleAddAgent = () => {
    setSelectedAgent(null); // Pas d'agent sélectionné = mode création
    setShowEditAgent(true);
    setShowGestionAgents(false); // Fermer le modal de gestion
  };

  // NOUVEAU: Handler pour créer un agent dans la DB
  const handleCreateAgent = async (formData) => {
    try {
      console.log('Création nouvel agent:', formData);
      await supabaseService.createAgent(formData);
      await loadData(currentMonth);
      setConnectionStatus('✅ Nouvel agent créé avec succès');
      setShowEditAgent(false);
    } catch (error) {
      console.error('Erreur création agent:', error);
      alert(`Erreur lors de la création: ${error.message}`);
    }
  };

  const handleSaveAgent = async (agentId, formData) => {
    try {
      await supabaseService.updateAgent(agentId, formData);
      await loadData(currentMonth);
      setConnectionStatus('✅ Agent mis à jour');
      setShowEditAgent(false);
    } catch (error) {
      console.error('Erreur mise à jour agent:', error);
      alert(`Erreur lors de la mise à jour: ${error.message}`);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    try {
      await supabaseService.deleteAgent(agentId);
      await loadData(currentMonth);
      setConnectionStatus('✅ Agent supprimé');
      setShowEditAgent(false);
    } catch (error) {
      console.error('Erreur suppression agent:', error);
      alert(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  // Handlers for habilitations
  const handleAddHabilitation = async (agentId, poste) => {
    try {
      await supabaseService.addHabilitation(agentId, poste);
      const habilitationsResult = await supabaseService.getHabilitations();
      const { habilitationsByAgent } = planningService.organizeData(agents, habilitationsResult);
      setHabilitations(habilitationsByAgent);
    } catch (error) {
      console.error('Erreur ajout habilitation:', error);
      alert(`Erreur lors de l'ajout: ${error.message}`);
    }
  };

  const handleRemoveHabilitation = async (agentId, poste) => {
    try {
      await supabaseService.removeHabilitation(agentId, poste);
      const habilitationsResult = await supabaseService.getHabilitations();
      const { habilitationsByAgent } = planningService.organizeData(agents, habilitationsResult);
      setHabilitations(habilitationsByAgent);
    } catch (error) {
      console.error('Erreur suppression habilitation:', error);
      alert(`Erreur lors de la suppression: ${error.message}`);
    }
  };

  // Handler for Upload PDF
  const handleOpenUploadPDF = () => {
    setShowUploadPDF(true);
  };

  const handleUploadSuccess = () => {
    loadData(currentMonth);
    setConnectionStatus('✅ Planning importé avec succès');
  };

  // Loading state
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

  // Not authenticated
  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  // Loading data
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

  // Error state
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

  // Main application
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        connectionStatus={connectionStatus}
        onOpenGestionAgents={() => setShowGestionAgents(true)}
        onOpenUploadPDF={handleOpenUploadPDF}
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
          onAgentClick={handleAgentClick}
        />
        
        {/* TEMPORAIRE: Bouton Debug */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            🔍 {showDebug ? 'Masquer' : 'Afficher'} Debug Planning
          </button>
        </div>
        
        {/* TEMPORAIRE: Composant Debug */}
        {showDebug && (
          <div className="mt-4">
            <DebugPlanning currentMonth={currentMonth} />
          </div>
        )}
      </div>
      
      {/* Modals */}
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
        onEditAgent={handleEditAgent}
        onViewHabilitations={handleAgentClick}
        onAddAgent={handleAddAgent} // AJOUT: Passer le handler
      />

      <ModalEditAgent
        isOpen={showEditAgent}
        agent={selectedAgent}
        onClose={() => {
          setShowEditAgent(false);
          setSelectedAgent(null);
        }}
        onSave={handleSaveAgent}
        onDelete={handleDeleteAgent}
        onCreate={handleCreateAgent} // AJOUT: Passer le handler de création
      />
      
      <ModalHabilitations
        isOpen={showHabilitations}
        agent={selectedAgent}
        habilitations={habilitations}
        onClose={() => setShowHabilitations(false)}
        onAddHabilitation={handleAddHabilitation}
        onRemoveHabilitation={handleRemoveHabilitation}
      />
      
      <ModalUploadPDF
        isOpen={showUploadPDF}
        onClose={() => setShowUploadPDF(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default App;