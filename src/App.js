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

// Modals
import ModalCellEdit from './components/modals/ModalCellEdit';
import ModalGestionAgents from './components/modals/ModalGestionAgents';
import ModalEditAgent from './components/modals/ModalEditAgent';
import ModalHabilitations from './components/modals/ModalHabilitations';
import ModalUploadPDF from './components/modals/ModalUploadPDF';

// Constants
import { MONTHS } from './constants/config';

// Styles
import './App.css';

// Debug (dev only)
const isDev = process.env.NODE_ENV === 'development';
const DebugPlanning = isDev ? require('./components/DebugPlanning').default : null;

/**
 * App - Composant principal de l'application COGC Planning
 * 
 * Version optimisée avec hooks personnalisés pour une meilleure
 * séparation des responsabilités et maintenabilité.
 */
const App = () => {
  // === HOOKS PERSONNALISÉS ===
  const { user, loading: authLoading, signOut } = useAuth();
  
  // État du mois sélectionné
  const [currentMonth, setCurrentMonth] = React.useState(MONTHS[new Date().getMonth()]);
  
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
    reloadHabilitations,
    setConnectionStatus
  } = usePlanning(user, currentMonth);
  
  // Gestion des modals
  const {
    modals,
    selectedCell,
    selectedAgent,
    openCellEdit,
    openGestionAgents,
    openEditAgent,
    openHabilitations,
    openUploadPDF,
    closeModal,
    setSelectedAgent
  } = useModals();

  // État debug (dev only)
  const [showDebug, setShowDebug] = React.useState(false);

  // === HANDLERS ===
  
  // Gestion des cellules du planning
  const handleCellClick = (agentName, day) => {
    openCellEdit(agentName, day);
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
          <button 
            onClick={() => loadData()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // === APPLICATION PRINCIPALE ===
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        connectionStatus={connectionStatus}
        onOpenGestionAgents={openGestionAgents}
        onOpenUploadPDF={openUploadPDF}
        onSignOut={signOut}
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
    </div>
  );
};

export default App;
