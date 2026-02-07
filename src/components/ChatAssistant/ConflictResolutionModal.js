/**
 * ConflictResolutionModal - Modal pour résoudre les conflits d'import
 * Affiche les services en conflit avec sélection ligne par ligne
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowRight, Replace, Ban } from 'lucide-react';

export default function ConflictResolutionModal({
  isOpen,
  conflicts = [],
  onResolve,
  onClose,
  isLoading,
}) {
  const [selectedDates, setSelectedDates] = useState(new Set());

  // Initialiser la sélection quand les conflits changent (tout sélectionné par défaut)
  useEffect(() => {
    setSelectedDates(new Set(conflicts.map(c => c.date)));
  }, [conflicts]);

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

  // Toggle une date
  const toggleDate = (date) => {
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Tout sélectionner / déselectionner
  const allSelected = selectedDates.size === conflicts.length;
  const noneSelected = selectedDates.size === 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedDates(new Set());
    } else {
      setSelectedDates(new Set(conflicts.map(c => c.date)));
    }
  };

  // Résoudre avec la bonne stratégie
  const handleResolve = () => {
    if (allSelected) {
      onResolve('overwrite_all');
    } else if (noneSelected) {
      onResolve('skip_existing');
    } else {
      onResolve('selective', Array.from(selectedDates));
    }
  };

  // Label du bouton principal
  const getButtonLabel = () => {
    if (allSelected) return `Écraser tout (${conflicts.length})`;
    if (noneSelected) return 'Garder tout (ignorer les conflits)';
    return `Écraser ${selectedDates.size} / garder ${conflicts.length - selectedDates.size}`;
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
            Cochez les dates à écraser avec les nouvelles valeurs. Décochez pour garder l'existant.
          </p>
        </div>

        {/* Liste des conflits */}
        <div className="flex-1 overflow-y-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-2 py-2 text-center w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                </th>
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
              {conflicts.map((conflict, idx) => {
                const isSelected = selectedDates.has(conflict.date);
                return (
                  <tr
                    key={idx}
                    className={`border-t border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''
                    }`}
                    onClick={() => toggleDate(conflict.date)}
                  >
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDate(conflict.date)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">
                      {formatDate(conflict.date)}
                    </td>
                    <td className="px-3 py-2">
                      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        isSelected
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 line-through opacity-60'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      }`}>
                        {conflict.existing.service_code}
                        {conflict.existing.poste_code && (
                          <span className="ml-1 opacity-75">
                            / {conflict.existing.poste_code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ArrowRight className="w-4 h-4 text-gray-400 inline" />
                    </td>
                    <td className="px-3 py-2">
                      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        isSelected
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 opacity-60'
                      }`}>
                        {conflict.incoming.service_code}
                        {conflict.incoming.poste_code && (
                          <span className="ml-1 opacity-75">
                            / {conflict.incoming.poste_code}
                          </span>
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
        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Appliquer la sélection */}
          <button
            onClick={handleResolve}
            disabled={isLoading}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-white ${
              noneSelected
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-cyan-500 hover:bg-cyan-600'
            }`}
          >
            <Replace className="w-4 h-4" />
            {getButtonLabel()}
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
