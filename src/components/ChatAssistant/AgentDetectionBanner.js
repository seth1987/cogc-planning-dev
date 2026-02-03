/**
 * AgentDetectionBanner - Affiche l'agent détecté depuis le PDF
 * Permet de confirmer ou sélectionner un autre agent pour l'import
 */

import React from 'react';
import { User, AlertTriangle, Check, HelpCircle } from 'lucide-react';

const confidenceConfig = {
  exact: {
    icon: Check,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    label: 'Correspondance exacte',
  },
  partial: {
    icon: HelpCircle,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'Correspondance partielle',
  },
  none: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    label: 'Non trouvé',
  },
};

export default function AgentDetectionBanner({
  detectedAgent,
  agentMismatch,
  onConfirm,
  onSelectOther,
}) {
  if (!detectedAgent) return null;

  const conf = confidenceConfig[detectedAgent.match_confidence] || confidenceConfig.none;
  const Icon = conf.icon;

  return (
    <div
      className={`rounded-xl border p-4 ${conf.bg} ${conf.border}`}
    >
      {/* Header avec icône agent */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          agentMismatch ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-white dark:bg-gray-700'
        }`}>
          <User className={`w-5 h-5 ${agentMismatch ? 'text-amber-600' : 'text-gray-600 dark:text-gray-300'}`} />
        </div>

        <div className="flex-1">
          {/* Nom de l'agent */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">
              {detectedAgent.prenom} {detectedAgent.nom}
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${conf.bg}`}>
              <Icon className={`w-3 h-3 ${conf.color}`} />
              <span className={conf.color}>{conf.label}</span>
            </div>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {agentMismatch ? (
              <>
                <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                Ce bulletin appartient à un autre agent. Les services seront importés dans le planning de{' '}
                <strong>{detectedAgent.prenom} {detectedAgent.nom}</strong>.
              </>
            ) : (
              <>
                Agent détecté depuis le bulletin PDF.
              </>
            )}
          </p>

          {/* Actions si mismatch */}
          {agentMismatch && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onConfirm}
                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Confirmer l'import pour {detectedAgent.prenom}
              </button>
              <button
                onClick={onSelectOther}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Importer pour moi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
