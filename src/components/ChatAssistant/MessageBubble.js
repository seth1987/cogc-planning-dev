/**
 * Composant MessageBubble
 * Affiche une bulle de message (utilisateur ou assistant)
 */

import React from 'react';
import { User, Bot, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export default function MessageBubble({ message }) {
  const { role, content, file, isError, isSuccess, timestamp } = message;
  const isUser = role === 'user';

  // Formater l'heure
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-cyan-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Contenu */}
      <div
        className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}
      >
        {/* Bulle */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-cyan-500 text-white rounded-br-md'
              : isError
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-md'
              : isSuccess
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-bl-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
          }`}
        >
          {/* Indicateur d'erreur/succès */}
          {isError && (
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Erreur</span>
            </div>
          )}
          {isSuccess && (
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Succès</span>
            </div>
          )}

          {/* Fichier attaché */}
          {file && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-white/20 rounded">
              <FileText className="w-4 h-4" />
              <span className="text-sm">{file}</span>
            </div>
          )}

          {/* Texte du message */}
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {/* Heure */}
        <span
          className={`text-xs text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          } block`}
        >
          {time}
        </span>
      </div>
    </div>
  );
}
