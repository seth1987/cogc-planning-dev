import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Hooks personnalisés
import { useAuth } from './hooks/useAuth';
import { usePlanning } from './hooks/usePlanning';
import { useModals } from './hooks/useModals';

// Services
import supabaseService from './services/supabaseService';

// Components
import Header from './components/Header';
import MonthTabs from './components/MonthTabs';
import PlanningTable from './components/PlanningTable';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';

// Modals
import ModalCellEdit from './components/modals/ModalCellEdit';
import ModalGestionAgents from './components/modals/ModalGestionAgents';
import ModalEditAgent from './components/modals/ModalEditAgent';
import ModalHabilitations from './components/modals/ModalHabilitations';
import ModalUploadPDF from './components/modals/ModalUploadPDF';
import ModalPrevisionnelJour from './components/modals/ModalPrevisionnelJour';

// Constants
import { MONTHS, CURRENT_YEAR } from './constants/config';

// Styles
import './App.css';

// Debug (dev only)
const isDev = process.env.NODE_ENV === 'development';
const DebugPlanning = isDev ? require('./components/DebugPlanning').default : null;

/**
 * App - Composant principal de l'application COGC Planning
 * 
 * Version avec page d'accueil Nexaverse et navigation vers le planning.
 * v2.2 - Fix date calculation for modal Équipes du Jour
 */
const App = () => {
  // === HOOKS PERSONNALISÉS ===
  const { user, loading: authLoading, signOut } = useAuth();
  
  // État de navigation : 'landing' ou 'planning'
  const [currentView, setCurrentView] = React.useState('landing');
  
  // État du mois sélectionné
  const [currentMonth, setCurrentMonth] = React.useState(MONTHS[new Date().getMonth()]);
  
  // Actions différées depuis la landing page
  const [pendingAction, setPendingAction] = React.useState(null);
  
  // Données et actions du planning
  const {
    agents,
    agentsData,
    habilitations,
    planning,
    loading: dataLoading,
    error,
    connectionStatus,
    loadData,
    updateCell,
    getCellData,
    reloadHabilitations,
    setConnectionStatus
  } = usePlanning(user, currentMonth);
  
  // Gestion des modals
  const {
    modals,
    selectedCell,
    selectedAgent,
    selectedDate,
    openCellEdit,
    openGestionAgents,
    openEditAgent,
    openHabilitations,
    openUploadPDF,
    openPrevisionnelJour,
    closeModal,
    setSelectedAgent
  } = useModals();

  // État debug (dev only)
  const [showDebug, setShowDebug] = React.useState(false);

  // === NAVIGATION ===
  
  // Handler pour la navigation depuis la landing page
  const handleNavigate = (view, options = {}) => {
    if (view === 'planning') {
      setCurrentView('planning');
      
      // Si options demandent d'ouvrir un modal, stocker l'action
      if (options.openModal) {
        setPendingAction({ type: 'openModal', modal: options.openModal });
      }
    }
  };

  // Retour à la landing page
  const handleBackToLanding = () => {
    setCurrentView('landing');
  };

  // Exécuter les actions différées quand les données sont chargées
  React.useEffect(() => {
    if (pendingAction && !dataLoading && currentView === 'planning') {
      if (pendingAction.type === 'openModal') {
        switch (pendingAction.modal) {
          case 'gestionAgents':
            openGestionAgents();
            break;
          case 'uploadPDF':
            openUploadPDF();
            break;
          default:
            break;
        }
      }
      setPendingAction(null);
    }
  }, [pendingAction, dataLoading, currentView, openGestionAgents, openUploadPDF]);

  // === HANDLERS ===
  
  // Gestion des cellules du planning
  const handleCellClick = (agentName, day) => {
    openCellEdit(agentName, day);
  };

  /**
   * Handler pour le clic sur un en-tête de jour (header)
   * Ouvre le modal Équipes du Jour pour cette date
   * 
   * FIX v2.2: Use CURRENT_YEAR from config instead of new Date().getFullYear()
   */
  const handleDayHeaderClick = (day) => {
    // Construire la date complète à partir du mois courant et du jour
    const monthIndex = MONTHS.indexOf(currentMonth);
    // FIX: Utiliser CURRENT_YEAR (2026) au lieu de new Date().getFullYear() (2025)
    const date = new Date(CURRENT_YEAR, monthIndex, day);
    
    // Ouvrir le modal avec cette date (format YYYY-MM-DD)
    openPrevisionnelJour(date.toISOString().split('T')[0]);
  };

  const handleUpdateCell = async (agentName, day, value) => {
    try {
      await updateCell(agentName, day, value);
    } catch (err) {
      alert('Erreur lors de la sauvegarde');
    }
  };

  // Gestion des agents
  const handleAgentClick = (agent) => {
    openHabilitations(agent);
  };

  const handleEditAgent = (agent) => {
    openEditAgent(agent);
    closeModal('gestionAgents');
  };

  const handleAddAgent = () => {
    openEditAgent(null); // null = mode création
    closeModal('gestionAgents');
  };

  const handleCreateAgent = async (formData) => {
    try {
      await supabaseService.createAgent(formData);
      await loadData(currentMonth);
      setConnectionStatus('✅ Nouvel agent créé avec succès');
      closeModal('editAgent');
    } catch (err) {
      alert(`Erreur lors de la création: ${err.message}`);
    }
  };

  const handleSaveAgent = async (agentId, formData) => {
    try {
      await supabaseService.updateAgent(agentId, formData);
      await loadData(currentMonth);
      setConnectionStatus('✅ Agent mis à jour');
      closeModal('editAgent');
    } catch (err) {
      alert(`Erreur lors de la mise à jour: ${err.message}`);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    try {
      await supabaseService.deleteAgent(agentId);
      await loadData(currentMonth);
      setConnectionStatus('✅ Agent supprimé');
      closeModal('editAgent');
    } catch (err) {
      alert(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  // Gestion des habilitations
  const handleAddHabilitation = async (agentId, poste) => {
    try {
      await supabaseService.addHabilitation(agentId, poste);
      await reloadHabilitations();
    } catch (err) {
      alert(`Erreur lors de l'ajout: ${err.message}`);
    }
  };

  const handleRemoveHabilitation = async (agentId, poste) => {
    try {
      await supabaseService.removeHabilitation(agentId, poste);
      await reloadHabilitations();
    } catch (err) {
      alert(`Erreur lors de la suppression: ${err.message}`);
    }
  };

  // Gestion de l'upload PDF
  const handleUploadSuccess = () => {
    loadData(currentMonth);
    setConnectionStatus('✅ Planning importé avec succès');
  };

  // === RENDU CONDITIONNEL ===

  // Vérification authentification en cours
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-lg text-gray-600">Vérification...</div>
        </div>
      </div>
    );
  }

  // Non authentifié
  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  // === PAGE D'ACCUEIL LANDING ===
  if (currentView === 'landing') {
    return (
      <LandingPage 
        onNavigate={handleNavigate}
        user={user}
      />
    );
  }

  // === VUE PLANNING ===

  // Chargement des données
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-lg text-gray-600">Chargement des données...</div>
          <div className="text-sm text-gray-500 mt-2">{connectionStatus}</div>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <div className="text-lg text-red-600 mb-2">Erreur de connexion</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => loadData()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Réessayer
            </button>
            <button 
              onClick={handleBackToLanding} 
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Récupérer les données de la cellule sélectionnée pour le modal
  const selectedCellData = selectedCell 
    ? getCellData(selectedCell.agent, selectedCell.day) 
    : null;

  // === APPLICATION PRINCIPALE PLANNING ===
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        connectionStatus={connectionStatus}
        onOpenGestionAgents={openGestionAgents}
        onOpenUploadPDF={openUploadPDF}
        onSignOut={signOut}
        onBackToLanding={handleBackToLanding}
        showBackButton={true}
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
          onDayHeaderClick={handleDayHeaderClick}
        />
        
        {/* Debug (dev only) */}
        {isDev && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              🔍 {showDebug ? 'Masquer' : 'Afficher'} Debug Planning
            </button>
          </div>
        )}
        
        {isDev && showDebug && DebugPlanning && (
          <div className="mt-4">
            <DebugPlanning currentMonth={currentMonth} />
          </div>
        )}
      </div>
      
      {/* === MODALS === */}
      
      {selectedCell && (
        <ModalCellEdit 
          selectedCell={selectedCell}
          cellData={selectedCellData}
          agentsData={agentsData}
          onUpdateCell={handleUpdateCell}
          onClose={() => closeModal('cellEdit')}
        />
      )}
      
      <ModalGestionAgents
        isOpen={modals.gestionAgents}
        agents={agents}
        onClose={() => closeModal('gestionAgents')}
        onEditAgent={handleEditAgent}
        onViewHabilitations={handleAgentClick}
        onAddAgent={handleAddAgent}
      />

      <ModalEditAgent
        isOpen={modals.editAgent}
        agent={selectedAgent}
        onClose={() => {
          closeModal('editAgent');
          setSelectedAgent(null);
        }}
        onSave={handleSaveAgent}
        onDelete={handleDeleteAgent}
        onCreate={handleCreateAgent}
      />
      
      <ModalHabilitations
        isOpen={modals.habilitations}
        agent={selectedAgent}
        habilitations={habilitations}
        onClose={() => closeModal('habilitations')}
        onAddHabilitation={handleAddHabilitation}
        onRemoveHabilitation={handleRemoveHabilitation}
      />
      
      <ModalUploadPDF
        isOpen={modals.uploadPDF}
        onClose={() => closeModal('uploadPDF')}
        onSuccess={handleUploadSuccess}
      />

      {/* Modal Équipes du Jour */}
      <ModalPrevisionnelJour
        isOpen={modals.previsionnelJour}
        selectedDate={selectedDate}
        agents={agents}
        planningData={planning}
        onClose={() => closeModal('previsionnelJour')}
      />
    </div>
  );
};

export default App;
