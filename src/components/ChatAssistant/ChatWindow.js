/**
 * Composant ChatWindow
 * Fenêtre principale du chat assistant Mistral
 */

import React, { useRef, useEffect, useState } from 'react';
import { X, Send, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { useChatAssistant } from './useChatAssistant';
import MessageBubble from './MessageBubble';
import FileUploadZone from './FileUploadZone';
import QuickReplyButtons from './QuickReplyButtons';
import ServicePreviewTable from './ServicePreviewTable';
import ModalEditService from './ModalEditService';
import ConflictResolutionModal from './ConflictResolutionModal';
import AgentDetectionBanner from './AgentDetectionBanner';
import QAResponseCard from './QAResponseCard';

export default function ChatWindow({ isOpen, onClose }) {
  const {
    messages,
    extractedServices,
    currentQuestion,
    readyToImport,
    importResult,
    conflicts,
    detectedAgent,
    agentMismatch,
    qaResponse,
    isLoading,
    error,
    codesServices,
    sendMessage,
    answerQuestion,
    confirmImport,
    cancelImport,
    resolveConflicts,
    reset,
    updateService,
  } = useChatAssistant();

  const [inputValue, setInputValue] = useState('');
  const [showUploadZone, setShowUploadZone] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, extractedServices, currentQuestion, qaResponse]);

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Cacher la zone d'upload après le premier fichier
  useEffect(() => {
    if (messages.some((m) => m.file)) {
      setShowUploadZone(false);
    }
  }, [messages]);

  // Gérer l'envoi de message
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    sendMessage({ message: inputValue.trim() });
    setInputValue('');
  };

  // Gérer l'upload de fichier
  const handleFileSelect = (file) => {
    if (file) {
      sendMessage({ pdfFile: file });
    }
  };

  // Gérer la fermeture
  const handleClose = () => {
    onClose();
  };

  // Réinitialiser la conversation
  const handleReset = () => {
    reset();
    setShowUploadZone(true);
    setInputValue('');
  };

  // Ouvrir la modal d'édition d'un service
  const handleEditService = (index, service) => {
    setEditingIndex(index);
    setEditingService(service);
  };

  // Sauvegarder les modifications d'un service
  const handleSaveService = (index, updatedService) => {
    updateService(index, updatedService);
    setEditingService(null);
    setEditingIndex(null);
  };

  // Fermer la modal d'édition
  const handleCloseEditModal = () => {
    setEditingService(null);
    setEditingIndex(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-cyan-500 to-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-white/20 p-1">
              <img
                src="/regul-bot.png"
                alt="Regul Bot"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Regul Bot
              </h2>
              <p className="text-xs text-white/70">
                Assistant IA COGC
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Nouvelle conversation"
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Zone de messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Message de bienvenue si vide */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                <img
                  src="/regul-bot.png"
                  alt="Regul Bot"
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Bonjour, je suis Regul Bot !
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-sm mx-auto">
                Je peux vous aider de deux manières :
              </p>

              {/* Options */}
              <div className="max-w-md mx-auto space-y-3 mb-6">
                <div className="flex items-start gap-3 text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xl">📎</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Import PDF</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Envoyez votre bulletin de commande
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xl">💬</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Questions planning</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      "Mes services cette semaine ?", "Prochain repos ?"
                    </p>
                  </div>
                </div>
              </div>

              {/* Zone d'upload initiale */}
              <div className="max-w-sm mx-auto">
                <FileUploadZone
                  onFileSelect={handleFileSelect}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Liste des messages */}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {/* Réponse Q&A */}
          {qaResponse && (
            <QAResponseCard qaResponse={qaResponse} />
          )}

          {/* Agent détecté depuis le PDF */}
          {detectedAgent && (
            <AgentDetectionBanner
              detectedAgent={detectedAgent}
              agentMismatch={agentMismatch}
              onConfirm={() => {}}
              onSelectOther={() => {}}
            />
          )}

          {/* Services extraits */}
          {extractedServices.length > 0 && (
            <ServicePreviewTable
              services={extractedServices}
              readyToImport={readyToImport}
              onImport={confirmImport}
              onCancel={cancelImport}
              onEditService={handleEditService}
              isLoading={isLoading}
            />
          )}

          {/* Question en cours */}
          {currentQuestion && (
            <QuickReplyButtons
              question={currentQuestion}
              onReply={answerQuestion}
              disabled={isLoading}
            />
          )}

          {/* Indicateur de chargement */}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analyse en cours...</span>
            </div>
          )}

          {/* Message de succès après import */}
          {importResult && importResult.success && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-green-700 dark:text-green-300 font-medium">
                {importResult.count} services importés avec succès !
              </p>
              <button
                onClick={handleClose}
                className="mt-3 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Zone d'input */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {/* Zone d'upload secondaire (après premier message) */}
          {!showUploadZone && messages.length > 0 && !importResult && (
            <div className="mb-3">
              <FileUploadZone
                onFileSelect={handleFileSelect}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Formulaire de message */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  isLoading
                    ? 'Veuillez patienter...'
                    : 'Écrivez votre message...'
                }
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                disabled={isLoading || !!importResult}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !inputValue.trim() || !!importResult}
              className="p-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>

          {/* Erreur */}
          {error && (
            <p className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>

      {/* Modal d'édition de service */}
      <ModalEditService
        isOpen={editingService !== null}
        service={editingService}
        serviceIndex={editingIndex}
        codesServices={codesServices}
        onSave={handleSaveService}
        onClose={handleCloseEditModal}
      />

      {/* Modal de résolution de conflits */}
      <ConflictResolutionModal
        isOpen={conflicts.length > 0}
        conflicts={conflicts}
        onResolve={resolveConflicts}
        onClose={() => {}}
        isLoading={isLoading}
      />
    </div>
  );
}
