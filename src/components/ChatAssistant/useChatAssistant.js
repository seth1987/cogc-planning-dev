/**
 * Hook personnalisé pour gérer le chat assistant Mistral
 * Gère l'état de la conversation, les appels API et les actions
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

// URL de l'Edge Function (à configurer dans .env)
const CHAT_FUNCTION_URL = process.env.REACT_APP_SUPABASE_URL + '/functions/v1/chat-bulletin';

/**
 * États possibles de la conversation
 */
const ConversationStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Hook principal pour le chat assistant
 */
export function useChatAssistant() {
  // État de la conversation
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [extractedServices, setExtractedServices] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [readyToImport, setReadyToImport] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [detectedAgent, setDetectedAgent] = useState(null);
  const [agentMismatch, setAgentMismatch] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState(null);
  const [qaResponse, setQaResponse] = useState(null);
  const [agentProfile, setAgentProfile] = useState(null);

  // État UI
  const [status, setStatus] = useState(ConversationStatus.IDLE);
  const [error, setError] = useState(null);

  // Référentiel des codes de service (pour autocomplete)
  const [codesServices, setCodesServices] = useState([]);

  /**
   * Récupère l'ID de l'agent connecté
   */
  const getAgentId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    // Récupérer l'agent correspondant à l'email
    const { data: agent, error } = await supabase
      .from('agents')
      .select('id')
      .eq('email', user.email)
      .single();

    if (error || !agent) {
      throw new Error(`Aucun agent trouvé pour l'email ${user.email}. Contactez un administrateur.`);
    }

    return agent.id;
  }, []);

  /**
   * Charge le profil complet de l'agent connecté
   */
  const loadAgentProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!agentError && agent) {
        setAgentProfile(agent);
      }
    } catch (err) {
      console.error('Erreur chargement profil agent:', err);
    }
  }, []);

  /**
   * Récupère le token d'authentification
   */
  const getAuthToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  /**
   * Charge les codes de service depuis Supabase (pour autocomplete)
   */
  const loadCodesServices = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('codes_services')
        .select('code, service_code, poste_code, description')
        .order('code');

      if (fetchError) {
        console.error('Erreur chargement codes_services:', fetchError);
        return;
      }

      setCodesServices(data || []);
    } catch (err) {
      console.error('Erreur loadCodesServices:', err);
    }
  }, []);

  // Charger les codes de service et le profil agent au montage
  useEffect(() => {
    loadCodesServices();
    loadAgentProfile();
  }, [loadCodesServices, loadAgentProfile]);

  /**
   * Met à jour un service extrait (correction manuelle)
   */
  const updateService = useCallback((index, updatedService) => {
    setExtractedServices((prev) => {
      const newServices = [...prev];
      newServices[index] = {
        ...newServices[index],
        ...updatedService,
        confidence: 'user_corrected',
      };
      return newServices;
    });
  }, []);

  /**
   * Ajoute un message à l'historique
   */
  const addMessage = useCallback((role, content, extras = {}) => {
    const message = {
      id: Date.now(),
      role,
      content,
      timestamp: new Date().toISOString(),
      ...extras,
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  /**
   * Appelle l'Edge Function chat-bulletin
   */
  const callChatFunction = useCallback(async (payload) => {
    const token = await getAuthToken();

    const response = await fetch(CHAT_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
    }

    return response.json();
  }, [getAuthToken]);

  /**
   * Envoie un message ou un fichier PDF
   */
  const sendMessage = useCallback(async ({ message, pdfFile }) => {
    setStatus(ConversationStatus.LOADING);
    setError(null);
    setCurrentQuestion(null);

    try {
      const agentId = await getAgentId();

      // Ajouter le message utilisateur à l'UI
      if (message) {
        addMessage('user', message);
      }
      if (pdfFile) {
        addMessage('user', `📎 ${pdfFile.name}`, { file: pdfFile.name });
      }

      // Préparer le payload
      const payload = {
        agent_id: agentId,
        conversation_id: conversationId,
        message: message || undefined,
      };

      // Convertir le PDF en base64 si présent
      if (pdfFile) {
        const base64 = await fileToBase64(pdfFile);
        payload.pdf_base64 = base64;
        payload.pdf_filename = pdfFile.name;
      }

      // Appeler l'Edge Function
      const result = await callChatFunction(payload);

      // Mettre à jour l'état
      if (result.conversation_id) {
        setConversationId(result.conversation_id);
      }

      // Ajouter la réponse de l'assistant
      addMessage('assistant', result.message);

      // Mettre à jour les services extraits
      if (result.services) {
        setExtractedServices(result.services);
      }

      // Gérer les questions
      if (result.questions && result.questions.length > 0) {
        setCurrentQuestion(result.questions[0]);
      }

      // Gérer l'état ready_to_import
      setReadyToImport(result.ready_to_import || false);

      // Gérer le résultat d'import
      if (result.import_result) {
        setImportResult(result.import_result);
      }

      // Gérer l'agent détecté depuis le PDF
      if (result.detected_agent) {
        setDetectedAgent(result.detected_agent);
        setAgentMismatch(result.agent_mismatch || false);
      }

      // Gérer les réponses Q&A
      if (result.qa_response) {
        // Pour le D2I, intégrer dans l'historique des messages (persist à travers les conversations)
        if (result.qa_response.type === 'generate_d2i') {
          addMessage('assistant', result.message, {
            isD2IForm: true,
            d2iParams: result.qa_response.d2i_params || {},
          });
          setQaResponse(null);
        } else {
          setQaResponse(result.qa_response);
        }
      } else {
        setQaResponse(null);
      }

      setStatus(ConversationStatus.SUCCESS);
      return result;

    } catch (err) {
      console.error('Erreur chat assistant:', err);
      setError(err.message);
      addMessage('assistant', `❌ ${err.message}`, { isError: true });
      setStatus(ConversationStatus.ERROR);
      throw err;
    }
  }, [conversationId, getAgentId, addMessage, callChatFunction]);

  /**
   * Répond à une question rapide (bouton)
   */
  const answerQuestion = useCallback(async (option) => {
    setStatus(ConversationStatus.LOADING);
    setError(null);

    try {
      const agentId = await getAgentId();

      // Ajouter la réponse utilisateur à l'UI
      addMessage('user', option.label);

      const payload = {
        agent_id: agentId,
        conversation_id: conversationId,
        quick_reply: {
          type: 'select_code',
          value: option.value,
          service_index: currentQuestion?.index,
        },
      };

      const result = await callChatFunction(payload);

      // Ajouter la réponse de l'assistant
      addMessage('assistant', result.message);

      // Mettre à jour les services
      if (result.services) {
        setExtractedServices(result.services);
      }

      // Gérer la question suivante ou fin
      if (result.questions && result.questions.length > 0) {
        setCurrentQuestion(result.questions[0]);
      } else {
        setCurrentQuestion(null);
      }

      setReadyToImport(result.ready_to_import || false);
      setStatus(ConversationStatus.SUCCESS);

      return result;

    } catch (err) {
      console.error('Erreur réponse question:', err);
      setError(err.message);
      setStatus(ConversationStatus.ERROR);
      throw err;
    }
  }, [conversationId, currentQuestion, getAgentId, addMessage, callChatFunction]);

  /**
   * Confirme l'import des services
   */
  const confirmImport = useCallback(async () => {
    setStatus(ConversationStatus.LOADING);
    setError(null);
    setConflicts([]);

    try {
      const agentId = await getAgentId();

      const payload = {
        agent_id: agentId,
        conversation_id: conversationId,
        quick_reply: {
          type: 'confirm_import',
          value: 'confirm',
        },
      };

      // Si un agent cible a été défini, l'utiliser pour l'import
      if (targetAgentId) {
        payload.target_agent_id = targetAgentId;
      }

      const result = await callChatFunction(payload);

      // Vérifier s'il y a des conflits
      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        addMessage('assistant', result.message, { isWarning: true });
        setStatus(ConversationStatus.SUCCESS);
        return result;
      }

      // Pas de conflits, import réussi
      addMessage('assistant', result.message, { isSuccess: true });
      setImportResult(result.import_result);
      setReadyToImport(false);
      setStatus(ConversationStatus.SUCCESS);

      return result;

    } catch (err) {
      console.error('Erreur import:', err);
      setError(err.message);
      addMessage('assistant', `❌ Erreur lors de l'import: ${err.message}`, { isError: true });
      setStatus(ConversationStatus.ERROR);
      throw err;
    }
  }, [conversationId, targetAgentId, getAgentId, addMessage, callChatFunction]);

  /**
   * Définit l'agent cible pour l'import (différent du connecté)
   */
  const confirmImportForAgent = useCallback((agentId) => {
    setTargetAgentId(agentId);
    setAgentMismatch(false);
    addMessage('assistant', `✅ Les services seront importés pour ${detectedAgent?.prenom || ''} ${detectedAgent?.nom || ''}. Vous pouvez corriger les services puis cliquer sur "Importer dans mon planning".`, { isSuccess: true });
  }, [detectedAgent, addMessage]);

  /**
   * Choisit d'importer pour soi-même (ignore l'agent détecté)
   */
  const importForSelf = useCallback(() => {
    setTargetAgentId(null);
    setAgentMismatch(false);
    addMessage('assistant', '✅ Les services seront importés dans votre planning. Vous pouvez corriger les services puis cliquer sur "Importer dans mon planning".', { isSuccess: true });
  }, [addMessage]);

  /**
   * Résout les conflits avec la stratégie choisie
   */
  const resolveConflicts = useCallback(async (strategy, selectedDates = null) => {
    setStatus(ConversationStatus.LOADING);
    setError(null);

    try {
      const agentId = await getAgentId();

      const payload = {
        agent_id: agentId,
        conversation_id: conversationId,
        quick_reply: {
          type: 'resolve_conflicts',
          value: strategy,
          conflict_strategy: strategy,
          ...(strategy === 'selective' && selectedDates ? { selected_dates: selectedDates } : {}),
        },
      };

      const result = await callChatFunction(payload);

      addMessage('assistant', result.message, { isSuccess: true });
      setImportResult(result.import_result);
      setConflicts([]);
      setReadyToImport(false);
      setStatus(ConversationStatus.SUCCESS);

      return result;

    } catch (err) {
      console.error('Erreur résolution conflits:', err);
      setError(err.message);
      addMessage('assistant', `❌ Erreur: ${err.message}`, { isError: true });
      setStatus(ConversationStatus.ERROR);
      throw err;
    }
  }, [conversationId, getAgentId, addMessage, callChatFunction]);

  /**
   * Annule l'import
   */
  const cancelImport = useCallback(async () => {
    setStatus(ConversationStatus.LOADING);

    try {
      const agentId = await getAgentId();

      const payload = {
        agent_id: agentId,
        conversation_id: conversationId,
        quick_reply: {
          type: 'cancel',
          value: 'cancel',
        },
      };

      const result = await callChatFunction(payload);

      addMessage('assistant', result.message);
      setReadyToImport(false);
      setConflicts([]);
      setStatus(ConversationStatus.SUCCESS);

      return result;

    } catch (err) {
      console.error('Erreur annulation:', err);
      setError(err.message);
      setConflicts([]);
      setStatus(ConversationStatus.ERROR);
    }
  }, [conversationId, getAgentId, addMessage, callChatFunction]);

  /**
   * Réinitialise la conversation
   */
  const reset = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setExtractedServices([]);
    setCurrentQuestion(null);
    setReadyToImport(false);
    setImportResult(null);
    setConflicts([]);
    setDetectedAgent(null);
    setAgentMismatch(false);
    setTargetAgentId(null);
    setQaResponse(null);
    setStatus(ConversationStatus.IDLE);
    setError(null);
  }, []);

  return {
    // État
    conversationId,
    messages,
    extractedServices,
    currentQuestion,
    readyToImport,
    importResult,
    conflicts,
    detectedAgent,
    agentMismatch,
    qaResponse,
    agentProfile,
    status,
    error,
    isLoading: status === ConversationStatus.LOADING,
    codesServices,

    // Actions
    sendMessage,
    answerQuestion,
    confirmImport,
    confirmImportForAgent,
    importForSelf,
    cancelImport,
    resolveConflicts,
    reset,
    updateService,
  };
}

/**
 * Convertit un fichier en base64
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Retirer le préfixe "data:application/pdf;base64,"
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default useChatAssistant;
