import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Hooks personnalisés
import { useAuth } from './hooks/useAuth';
import { usePlanning } from './hooks/usePlanning';
import { useModals } from './hooks/useModals';
import useIsMobile from './hooks/useIsMobile';

// Services
import supabaseService from './services/supabaseService';

// Components
import Header from './components/Header';
import MonthTabs from './components/MonthTabs';
import PlanningTable from './components/PlanningTable';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import PageUploadPDF from './components/PageUploadPDF';

// Modals
import ModalCellEdit from './components/modals/ModalCellEdit';
import ModalGestionAgents from './components/modals/ModalGestionAgents';
import ModalEditAgent from './components/modals/ModalEditAgent';
import ModalHabilitations from './components/modals/ModalHabilitations';
import ModalUploadPDF from './components/modals/ModalUploadPDF';
import ModalPrevisionnelJour from './components/modals/ModalPrevisionnelJour';

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
 * Version avec page d'accueil Nexaverse et navigation vers le planning.
 * v2.9 - Fix: ModalUploadPDF toujours monté (hors blocs conditionnels)
 */
const App = () => {
  // === HOOKS PERSONNALISÉS ===
  const { user, loading: authLoading, signOut } = useAuth();
  const isMobile = useIsMobile();
  
  // État de navigation : 'landing', 'planning', ou 'uploadPDF' (mobile uniquement)
  const [currentView, setCurrentView] = React.useState('landing');
  
  // État du mois sélectionné
  const [currentMonth, setCurrentMonth] = React.useState(MONTHS[new Date().getMonth()]);
  
  // État de l'année sélectionnée (dynamique depuis la DB)
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = React.useState([]);
  const [yearsLoading, setYearsLoading] = React.useState(true);
  
  // Actions différées depuis la landing page
  const [pendingAction, setPendingAction] = React.useState(null);
  
  // Données et actions du planning (passer currentYear au hook)
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
  } = usePlanning(user, currentMonth, currentYear);
  
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
    openUploadPDF: openUploadPDFModal,
    openPrevisionnelJour,
    closeModal,
    setSelectedAgent
  } = useModals();

  // État debug (dev only)
  const [showDebug, setShowDebug] = React.useState(false);

  // === HANDLER HYBRIDE UPLOAD PDF ===
  // Desktop → Modal | Mobile → Page dédiée
  const openUploadPDF = React.useCallback(() => {
    if (isMobile) {
      console.log('📱 Mobile détecté → Page dédiée PDF');
      setCurrentView('uploadPDF');
    } else {
      console.log('🖥️ Desktop détecté → Modal PDF');
      openUploadPDFModal();
    }
  }, [isMobile, openUploadPDFModal]);

  // === CHARGEMENT DES ANNÉES DISPONIBLES ===
  // Configuration: années à toujours afficher (même sans données)
  const FORCED_YEARS = [2025, 2026];
  
  React.useEffect(() => {
    const loadAvailableYears = async () => {
      try {
        setYearsLoading(true);
        const yearsFromDB = await supabaseService.getAvailableYears();
        console.log('📅 Années depuis DB:', yearsFromDB);
        
        // Fusionner les années forcées avec celles de la DB
        const allYears = [...new Set([...FORCED_YEARS, ...(yearsFromDB || [])])];
        const sortedYears = allYears.sort((a, b) => a - b); // Tri croissant (2025, 2026)
        
        console.log('📅 Années disponibles (avec forcées):', sortedYears);
        setAvailableYears(sortedYears);
        
        // Si l'année courante n'est pas dans la liste, prendre la première
        if (!sortedYears.includes(currentYear)) {
          setCurrentYear(sortedYears[0]);
        }
      } catch (err) {
        console.error('Erreur chargement années:', err);
        // Fallback: années forcées uniquement
        setAvailableYears(FORCED_YEARS);
      } finally {
        setYearsLoading(false);
      }
    };
    
    if (user) {
      loadAvailableYears();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Retour au planning (depuis page PDF mobile)
  const handleBackToPlanning = () => {
    setCurrentView('planning');
  };

  // Handler pour changement d'année
  const handleChangeYear = (year) => {
    console.log(`🗓️ Changement année: ${currentYear} → ${year}`);
    setCurrentYear(year);
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
   * FIX v2.4: Use dynamic currentYear state instead of CURRENT_YEAR constant
   */
  const handleDayHeaderClick = (day) => {
    // Construire la date au format YYYY-MM-DD avec l'année dynamique
    const monthIndex = MONTHS.indexOf(currentMonth);
    const year = currentYear; // Utiliser l'année sélectionnée dynamiquement
    const month = String(monthIndex + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    // Ouvrir le modal avec cette date
    openPrevisionnelJour(dateStr);
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

  /**
   * Création d'un nouvel agent
   * v2.5: Le ModalEditAgent gère maintenant la création du compte Auth
   * Cette fonction crée uniquement l'agent en BDD et retourne l'objet créé
   */
  const handleCreateAgent = async (formData) => {
    try {
      // Créer l'agent en BDD (inclut maintenant email et telephone)
      const createdAgent = await supabaseService.createAgent(formData);
      
      // Recharger les données
      await loadData(currentMonth);
      setConnectionStatus('✅ Nouvel agent créé avec succès');
      
      // Retourner l'agent créé pour que ModalEditAgent puisse créer le compte Auth
      return createdAgent;
    } catch (err) {
      alert(`Erreur lors de la création: ${err.message}`);
      throw err; // Propager l'erreur pour que ModalEditAgent sache qu'il y a eu un problème
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

  // Gestion de l'upload PDF - NE PAS fermer le modal ici, laisser le modal gérer
  const handleUploadSuccess = React.useCallback(() => {
    console.log('📥 handleUploadSuccess appelé');
    loadData(currentMonth);
    setConnectionStatus('✅ Planning importé avec succès');
    // Si on est sur la page mobile, revenir au planning
    if (currentView === 'uploadPDF') {
      setCurrentView('planning');
    }
    // NE PAS fermer le modal ici - il se ferme lui-même
  }, [currentMonth, currentView, loadData, setConnectionStatus]);

  // Handler pour fermer le modal PDF - stable
  const handleCloseUploadPDF = React.useCallback(() => {
    closeModal('uploadPDF');
  }, [closeModal]);

  // === RENDU ===
  
  // Le modal PDF est TOUJOURS monté (hors des blocs conditionnels)
  // pour éviter les démontages/remontages lors du rechargement des données
  const renderPDFModal = () => (
    <ModalUploadPDF
      isOpen={modals.uploadPDF}
      onClose={handleCloseUploadPDF}
      onSuccess={handleUploadSuccess}
    />
  );

  // Vérification authentification en cours
  if (authLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <div className="text-lg text-gray-600">Vérification...</div>
          </div>
        </div>
        {/* Modal toujours présent même pendant auth loading */}
        {renderPDFModal()}
      </>
    );
  }

  // Non authentifié
  if (!user) {
    return (
      <>
        <LoginPage onLogin={() => {}} />
        {/* Modal toujours présent */}
        {renderPDFModal()}
      </>
    );
  }

  // === PAGE D'ACCUEIL LANDING ===
  if (currentView === 'landing') {
    return (
      <>
        <LandingPage 
          onNavigate={handleNavigate}
          user={user}
        />
        {/* Modal toujours présent */}
        {renderPDFModal()}
      </>
    );
  }

  // === PAGE UPLOAD PDF (MOBILE UNIQUEMENT) ===
  if (currentView === 'uploadPDF') {
    return (
      <>
        <PageUploadPDF 
          onBack={handleBackToPlanning}
          onSuccess={handleUploadSuccess}
        />
        {/* Modal toujours présent */}
        {renderPDFModal()}
      </>
    );
  }

  // === VUE PLANNING ===

  // Chargement des données ou des années
  if (dataLoading || yearsLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <div className="text-lg text-gray-600">Chargement des données...</div>
            <div className="text-sm text-gray-500 mt-2">{connectionStatus}</div>
          </div>
        </div>
        {/* Modal toujours présent même pendant le chargement */}
        {renderPDFModal()}
      </>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <>
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
        {/* Modal toujours présent */}
        {renderPDFModal()}
      </>
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
        currentYear={currentYear}
        availableYears={availableYears}
        onChangeMonth={setCurrentMonth}
        onChangeYear={handleChangeYear}
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
      
      {/* 
        Modal PDF - TOUJOURS MONTÉ via renderPDFModal()
        Même emplacement que les autres modals pour cohérence visuelle
      */}
      {renderPDFModal()}

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
