/**
 * ModalEditService - Modal d'édition d'un service extrait par l'assistant
 * Permet de corriger service_code et poste_code avec autocomplete
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Calendar, Search } from 'lucide-react';

// Liste des service_codes disponibles
const SERVICE_CODES = [
  { code: '-', desc: 'Matin' },
  { code: 'O', desc: 'Après-midi' },
  { code: 'X', desc: 'Soir' },
  { code: 'I', desc: 'Journée' },
  { code: 'RP', desc: 'Repos' },
  { code: 'NU', desc: 'Nuit' },
];

export default function ModalEditService({
  isOpen,
  service,
  serviceIndex,
  codesServices = [],
  onSave,
  onClose,
}) {
  const [serviceCode, setServiceCode] = useState('');
  const [posteCode, setPosteCode] = useState('');
  const [posteSearch, setPosteSearch] = useState('');
  const [showPosteSuggestions, setShowPosteSuggestions] = useState(false);

  // Initialiser avec les valeurs du service
  useEffect(() => {
    if (service) {
      setServiceCode(service.service_code || '');
      setPosteCode(service.poste_code || '');
      setPosteSearch(service.poste_code || '');
    }
  }, [service]);

  // Extraire les postes uniques depuis codes_services
  const uniquePostes = useMemo(() => {
    const postes = new Set();
    codesServices.forEach((cs) => {
      if (cs.poste_code) {
        postes.add(cs.poste_code);
      }
    });
    return Array.from(postes).sort();
  }, [codesServices]);

  // Filtrer les suggestions de poste
  const filteredPostes = useMemo(() => {
    if (!posteSearch) return uniquePostes;
    const search = posteSearch.toUpperCase();
    return uniquePostes.filter((p) => p.toUpperCase().includes(search));
  }, [posteSearch, uniquePostes]);

  // Formater la date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  };

  const handleSave = () => {
    const updatedService = {
      ...service,
      service_code: serviceCode,
      poste_code: posteCode || null,
      confidence: 'user_corrected',
    };
    onSave(serviceIndex, updatedService);
  };

  const handlePosteSelect = (poste) => {
    setPosteCode(poste);
    setPosteSearch(poste);
    setShowPosteSuggestions(false);
  };

  const handlePosteClear = () => {
    setPosteCode('');
    setPosteSearch('');
  };

  if (!isOpen || !service) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Modifier le service
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(service.date)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code original */}
        {service.code && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Code original du bulletin :
            </span>
            <span className="ml-2 font-mono font-semibold text-gray-900 dark:text-white">
              {service.code}
            </span>
          </div>
        )}

        {/* Service Code */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type de service
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_CODES.map(({ code, desc }) => (
              <button
                key={code}
                onClick={() => setServiceCode(code)}
                className={`p-3 rounded-lg text-center transition-all ${
                  serviceCode === code
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <div className="font-semibold">{code}</div>
                <div className="text-xs mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Poste Code */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Poste (optionnel)
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={posteSearch}
              onChange={(e) => {
                setPosteSearch(e.target.value);
                setShowPosteSuggestions(true);
              }}
              onFocus={() => setShowPosteSuggestions(true)}
              placeholder="Rechercher un poste (CRC, CCU, RE...)"
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            {posteSearch && (
              <button
                onClick={handlePosteClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Suggestions dropdown */}
            {showPosteSuggestions && filteredPostes.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredPostes.map((poste) => (
                  <button
                    key={poste}
                    onClick={() => handlePosteSelect(poste)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                      posteCode === poste
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {poste}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Postes rapides */}
          {uniquePostes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {uniquePostes.slice(0, 8).map((poste) => (
                <button
                  key={poste}
                  onClick={() => handlePosteSelect(poste)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                    posteCode === poste
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {poste}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aperçu */}
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Aperçu :
          </span>
          <div className="mt-1 font-semibold text-blue-800 dark:text-blue-200">
            {serviceCode || '-'}
            {posteCode && <span className="text-blue-600 dark:text-blue-400"> / {posteCode}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg
                       text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!serviceCode}
            className="flex-1 py-2.5 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold
                       rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
