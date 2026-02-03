/**
 * ConflictResolutionModal - Modal pour résoudre les conflits d'import
 * Affiche les services en conflit et propose des options de résolution
 */

import React from 'react';
import { X, AlertTriangle, ArrowRight, Replace, SkipForward, Ban } from 'lucide-react';

export default function ConflictResolutionModal({
  isOpen,
  conflicts = [],
  onResolve,
  onClose,
  isLoading,
}) {
  if (!isOpen || conflicts.length === 0) return null;

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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Conflits détectés
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {conflicts.length} service{conflicts.length > 1 ? 's' : ''} en conflit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explication */}
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Des services existent déjà pour certaines dates. Comment souhaitez-vous procéder ?
          </p>
        </div>

        {/* Liste des conflits */}
        <div className="flex-1 overflow-y-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Date
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Existant
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">

                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Nouveau
                </th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((conflict, idx) => (
                <tr
                  key={idx}
                  className="border-t border-gray-100 dark:border-gray-700"
                >
                  <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">
                    {formatDate(conflict.date)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                      {conflict.existing.service_code}
                      {conflict.existing.poste_code && (
                        <span className="ml-1 text-red-500">
                          / {conflict.existing.poste_code}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ArrowRight className="w-4 h-4 text-gray-400 inline" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                      {conflict.incoming.service_code}
                      {conflict.incoming.poste_code && (
                        <span className="ml-1 text-green-500">
                          / {conflict.incoming.poste_code}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Écraser tout */}
          <button
            onClick={() => onResolve('overwrite_all')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
          >
            <Replace className="w-4 h-4" />
            Écraser tout
            <span className="text-xs font-normal opacity-75">
              (remplacer les services existants)
            </span>
          </button>

          {/* Ignorer existants */}
          <button
            onClick={() => onResolve('skip_existing')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Ignorer les conflits
            <span className="text-xs font-normal opacity-75">
              (garder les services existants)
            </span>
          </button>

          {/* Annuler */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Ban className="w-4 h-4" />
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
