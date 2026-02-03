/**
 * Composant ServicePreviewTable
 * Affiche un tableau prévisualisant les services extraits
 */

import React from 'react';
import { Check, AlertCircle, HelpCircle, Calendar, Pencil } from 'lucide-react';

// Icônes selon le niveau de confiance
const confidenceConfig = {
  high: {
    icon: Check,
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    label: 'Validé',
  },
  medium: {
    icon: AlertCircle,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    label: 'À vérifier',
  },
  low: {
    icon: HelpCircle,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    label: 'Inconnu',
  },
  user_corrected: {
    icon: Check,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    label: 'Corrigé',
  },
};

export default function ServicePreviewTable({
  services,
  onImport,
  onCancel,
  readyToImport,
  isLoading,
  onEditService,
}) {
  if (!services || services.length === 0) return null;

  // Statistiques
  const stats = {
    total: services.length,
    high: services.filter((s) => s.confidence === 'high').length,
    medium: services.filter((s) => s.confidence === 'medium').length,
    low: services.filter((s) => s.confidence === 'low').length,
    corrected: services.filter((s) => s.confidence === 'user_corrected').length,
  };

  // Formater la date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {stats.total} services détectés
            </h3>
            {onEditService && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Cliquer pour modifier
              </span>
            )}
          </div>

          {/* Stats rapides */}
          <div className="flex items-center gap-3 text-xs">
            {stats.high > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="w-3 h-3" /> {stats.high}
              </span>
            )}
            {stats.medium > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-3 h-3" /> {stats.medium}
              </span>
            )}
            {stats.low > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <HelpCircle className="w-3 h-3" /> {stats.low}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                Date
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                Code
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                Service
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                Poste
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, idx) => {
              const conf = confidenceConfig[service.confidence] || confidenceConfig.low;
              const Icon = conf.icon;
              const isEditable = Boolean(onEditService);

              return (
                <tr
                  key={idx}
                  onClick={() => isEditable && onEditService(idx, service)}
                  className={`border-t border-gray-100 dark:border-gray-700 ${conf.bg} ${
                    isEditable
                      ? 'cursor-pointer hover:opacity-80 transition-opacity'
                      : ''
                  }`}
                >
                  <td className="px-3 py-2 text-gray-900 dark:text-white">
                    {formatDate(service.date)}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                    {service.code}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {service.service_code}
                  </td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                    {service.poste_code || '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1" title={conf.label}>
                      <Icon className={`w-4 h-4 ${conf.color}`} />
                      {isEditable && (
                        <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      {readyToImport && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onImport}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Import en cours...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Importer dans mon planning
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
