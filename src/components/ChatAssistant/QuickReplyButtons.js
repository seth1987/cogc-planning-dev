/**
 * Composant QuickReplyButtons
 * Affiche les boutons de réponse rapide pour les questions de l'IA
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function QuickReplyButtons({ question, onReply, disabled = false }) {
  if (!question) return null;

  const { text, options } = question;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
      {/* Question */}
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-amber-800 dark:text-amber-200 text-sm">
          {text}
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-2">
        {options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onReply(option)}
            disabled={disabled}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-150
              ${disabled
                ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500'
                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-cyan-400 active:scale-95'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
