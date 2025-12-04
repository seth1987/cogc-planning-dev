import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour la gestion centralisée des modals
 * Simplifie l'ouverture/fermeture et le passage de données aux modals
 * 
 * @version 2.0.0 - Fix bouton "Nouvel Agent"
 * @returns {Object} État et fonctions de gestion des modals
 */
export function useModals() {
  // État centralisé de tous les modals
  const [modals, setModals] = useState({
    cellEdit: false,
    gestionAgents: false,
    editAgent: false,
    habilitations: false,
    uploadPDF: false,
  });

  // Données associées aux modals
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  /**
   * Ouvre un modal spécifique
   * @param {string} modalName - Nom du modal à ouvrir
   * @param {Object|null} data - Données optionnelles à associer (null = mode création)
   */
  const openModal = useCallback((modalName, data = null) => {
    setModals(prev => ({
      ...prev,
      [modalName]: true
    }));
    
    // Associer les données selon le modal
    // IMPORTANT: Toujours mettre à jour même si data est null (mode création)
    if (modalName === 'cellEdit') {
      setSelectedCell(data);
    } else if (modalName === 'editAgent') {
      // FIX: Toujours mettre à jour selectedAgent, même avec null (mode création)
      setSelectedAgent(data);
    } else if (modalName === 'habilitations' && data) {
      setSelectedAgent(data);
    }
  }, []);

  /**
   * Ferme un modal spécifique
   * @param {string} modalName - Nom du modal à fermer
   */
  const closeModal = useCallback((modalName) => {
    setModals(prev => ({
      ...prev,
      [modalName]: false
    }));
    
    // Nettoyer les données associées
    if (modalName === 'cellEdit') {
      setSelectedCell(null);
    } else if (['editAgent', 'habilitations'].includes(modalName)) {
      // Délai pour éviter le flash de contenu vide
      setTimeout(() => setSelectedAgent(null), 200);
    }
  }, []);

  /**
   * Ferme tous les modals
   */
  const closeAllModals = useCallback(() => {
    setModals({
      cellEdit: false,
      gestionAgents: false,
      editAgent: false,
      habilitations: false,
      uploadPDF: false,
    });
    setSelectedCell(null);
    setSelectedAgent(null);
  }, []);

  /**
   * Vérifie si un modal est ouvert
   * @param {string} modalName - Nom du modal à vérifier
   * @returns {boolean}
   */
  const isModalOpen = useCallback((modalName) => {
    return modals[modalName] || false;
  }, [modals]);

  /**
   * Toggle l'état d'un modal
   * @param {string} modalName - Nom du modal à basculer
   */
  const toggleModal = useCallback((modalName) => {
    setModals(prev => ({
      ...prev,
      [modalName]: !prev[modalName]
    }));
  }, []);

  // Raccourcis pour les modals fréquents
  const openCellEdit = useCallback((agent, day) => {
    openModal('cellEdit', { agent, day });
  }, [openModal]);

  const openGestionAgents = useCallback(() => {
    openModal('gestionAgents');
  }, [openModal]);

  /**
   * Ouvre le modal d'édition/création d'agent
   * @param {Object|null} agent - Agent à éditer ou null pour création
   */
  const openEditAgent = useCallback((agent = null) => {
    // Explicitement passer null pour le mode création
    openModal('editAgent', agent);
  }, [openModal]);

  const openHabilitations = useCallback((agent) => {
    openModal('habilitations', agent);
  }, [openModal]);

  const openUploadPDF = useCallback(() => {
    openModal('uploadPDF');
  }, [openModal]);

  return {
    // État brut
    modals,
    selectedCell,
    selectedAgent,
    
    // Fonctions génériques
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    toggleModal,
    
    // Raccourcis spécifiques
    openCellEdit,
    openGestionAgents,
    openEditAgent,
    openHabilitations,
    openUploadPDF,
    
    // Setters directs (pour cas spéciaux)
    setSelectedAgent,
    setSelectedCell,
  };
}

export default useModals;
