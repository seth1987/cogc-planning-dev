/**
 * QAResponseCard - Affiche les résultats des questions Q&A sur le planning
 * Formats: tableau des services, statistiques, prochains services
 */

import React from 'react';
import { Calendar, Clock, Briefcase, BarChart2, Users } from 'lucide-react';
import DocumentSearchCard from './DocumentSearchCard';
import D2IFormCard from './D2IFormCard';

// Mapping des codes de service vers des labels et couleurs
const serviceConfig = {
  // Horaires
  '-': { label: 'Matin', color: 'bg-yellow-100 text-yellow-800', icon: '☀️' },
  'O': { label: 'Soir', color: 'bg-orange-100 text-orange-800', icon: '🌅' },
  'X': { label: 'Nuit', color: 'bg-indigo-100 text-indigo-800', icon: '🌙' },
  'I': { label: 'Journée', color: 'bg-gray-100 text-gray-800', icon: '📌' },
  // Repos
  'RP': { label: 'Repos', color: 'bg-green-100 text-green-800', icon: '🏠' },
  'RPP': { label: 'Repos programmé', color: 'bg-green-100 text-red-600', icon: '🏠' },
  'RU': { label: 'Repos récup', color: 'bg-green-100 text-green-800', icon: '🏠' },
  'RQ': { label: 'Repos qualif.', color: 'bg-green-100 text-green-800', icon: '🏠' },
  'NU': { label: 'Non utilisé', color: 'bg-gray-200 text-gray-600', icon: '⬜' },
  // Dispo
  'D': { label: 'Dispo', color: 'bg-gray-100 text-gray-800', icon: '📋' },
  'DN': { label: 'Dispo Nord', color: 'bg-gray-100 text-gray-800', icon: '📋' },
  'DR': { label: 'Dispo Denfert', color: 'bg-gray-100 text-gray-800', icon: '📋' },
  // Congés
  'C': { label: 'Congé', color: 'bg-blue-100 text-blue-800', icon: '🏖️' },
  'CA': { label: 'Congé annuel', color: 'bg-blue-100 text-blue-800', icon: '🏖️' },
  'VT': { label: 'Congé TP', color: 'bg-blue-100 text-blue-800', icon: '🏖️' },
  // Absences
  'MA': { label: 'Maladie', color: 'bg-red-100 text-red-800', icon: '🏥' },
  'VM': { label: 'Visite médicale', color: 'bg-red-100 text-red-800', icon: '🏥' },
  'F': { label: 'Férié', color: 'bg-purple-200 text-purple-800', icon: '🎌' },
  // Formation / Habilitation
  'FO': { label: 'Formation', color: 'bg-purple-100 text-purple-800', icon: '📚' },
  'HAB': { label: 'Habilitation', color: 'bg-orange-200 text-orange-800', icon: '🎓' },
  'EIA': { label: 'Entretien annuel', color: 'bg-blue-100 text-blue-800', icon: '📝' },
  // Service de jour
  'VL': { label: 'Visite ligne', color: 'bg-blue-100 text-blue-800', icon: '🚆' },
  'DPX': { label: 'DPX', color: 'bg-blue-100 text-blue-800', icon: '📋' },
  'PSE': { label: 'PSE', color: 'bg-blue-100 text-blue-800', icon: '📋' },
  'INAC': { label: 'Inactif', color: 'bg-blue-100 text-blue-800', icon: '⏸️' },
  // Jours RH
  'D2I': { label: 'D2I', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  'RA': { label: 'RA', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  'RN': { label: 'RN', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  'TY': { label: 'TY', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  'AY': { label: 'AY', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  'AH': { label: 'AH', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  'DD': { label: 'DD', color: 'bg-yellow-100 text-yellow-800', icon: '📋' },
  // PCD
  'CCCBO': { label: 'CCCBO', color: 'bg-cyan-200 text-cyan-800', icon: '🚉' },
  'CBVD': { label: 'CBVD', color: 'bg-cyan-200 text-cyan-800', icon: '🚉' },
};

function getServiceDisplay(code) {
  return serviceConfig[code] || {
    label: code,
    color: 'bg-gray-100 text-gray-800',
    icon: '📌'
  };
}

export default function QAResponseCard({ qaResponse, agentProfile }) {
  if (!qaResponse) return null;

  const { type, data, team_data, summary } = qaResponse;

  // Le type "help" n'a pas besoin de carte, le message suffit
  if (type === 'help') {
    return null;
  }

  // Recherche de documents
  if (type === 'document_search') {
    return <DocumentSearchCard documents={qaResponse.doc_data || []} summary={summary} />;
  }

  // Génération D2I (rendu via QAResponseCard comme fallback, le principal est dans ChatWindow via message)
  if (type === 'generate_d2i') {
    return <D2IFormCard d2iParams={qaResponse.d2i_params || {}} agent={agentProfile} />;
  }

  // Routes multi-agents
  if (type === 'team_on_date' || type === 'team_on_poste') {
    const teamEntries = team_data || [];
    if (teamEntries.length === 0) {
      return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">
            Aucun collègue trouvé pour cette recherche.
          </p>
        </div>
      );
    }
    return <TeamView data={teamEntries} summary={summary} />;
  }

  // Pas de données
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
        <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">
          Aucun service trouvé pour cette période.
        </p>
      </div>
    );
  }

  // Affichage selon le type de question
  switch (type) {
    case 'weekly_services':
    case 'service_search':
      return <WeeklyView data={data} summary={summary} />;

    case 'specific_date':
      return <SingleDateView data={data[0]} />;

    case 'next_service':
      return <NextServiceView data={data} />;

    case 'monthly_hours':
    case 'stats_summary':
      return <StatsView data={data} summary={summary} />;

    default:
      return <WeeklyView data={data} summary={summary} />;
  }
}

/**
 * Vue semaine - Tableau des services
 */
function WeeklyView({ data, summary }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-600" />
          <span className="font-medium text-gray-900 dark:text-white">
            Planning {summary?.period || ''}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({data.length} jours)
          </span>
        </div>
      </div>

      {/* Liste des services */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {data.map((entry, index) => {
          const display = getServiceDisplay(entry.service_code);
          return (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{display.icon}</div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {entry.day_name || entry.date}
                  </div>
                  {entry.poste_code && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Poste: {entry.poste_code}
                    </div>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${display.color}`}>
                {display.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vue date unique
 */
function SingleDateView({ data }) {
  if (!data) return null;

  const display = getServiceDisplay(data.service_code);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
      <div className="text-4xl mb-3">{display.icon}</div>
      <div className="text-lg font-medium text-gray-900 dark:text-white mb-1">
        {data.day_name || data.date}
      </div>
      <div className={`inline-block px-4 py-2 rounded-full text-lg font-medium ${display.color}`}>
        {display.label}
      </div>
      {data.poste_code && (
        <div className="mt-3 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
          <Briefcase className="w-4 h-4" />
          <span>Poste: {data.poste_code}</span>
        </div>
      )}
      {data.commentaire && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {data.commentaire}
        </div>
      )}
    </div>
  );
}

/**
 * Vue prochains services
 */
function NextServiceView({ data }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-600" />
          <span className="font-medium text-gray-900 dark:text-white">
            Prochains services
          </span>
        </div>
      </div>

      {/* Liste */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {data.slice(0, 5).map((entry, index) => {
          const display = getServiceDisplay(entry.service_code);
          const isFirst = index === 0;
          return (
            <div
              key={index}
              className={`flex items-center justify-between px-4 py-3 ${
                isFirst ? 'bg-green-50 dark:bg-green-900/20' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {isFirst && (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
                <div>
                  <div className={`font-medium ${isFirst ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                    {entry.day_name || entry.date}
                  </div>
                  {entry.poste_code && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.poste_code}
                    </div>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${display.color}`}>
                {display.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Vue statistiques
 */
function StatsView({ data, summary }) {
  // Calculer les stats
  const stats = data.reduce((acc, entry) => {
    const code = entry.service_code;
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});

  // Calculer les heures (approximatif)
  const workCodes = ['-', 'O', 'X'];
  const workDays = data.filter(d => workCodes.includes(d.service_code)).length;
  const estimatedHours = workDays * 8;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-gray-900 dark:text-white">
            Statistiques {summary?.period || ''}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="p-4">
        {/* Heures estimées */}
        <div className="text-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ~{estimatedHours}h
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            heures travaillées ({workDays} jours)
          </div>
        </div>

        {/* Répartition par type */}
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats).map(([code, count]) => {
            const display = getServiceDisplay(code);
            return (
              <div
                key={code}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${display.color}`}
              >
                <span className="flex items-center gap-2">
                  <span>{display.icon}</span>
                  <span>{display.label}</span>
                </span>
                <span className="font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Vue équipe - Liste des collègues sur une date/poste
 */
function TeamView({ data, summary }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900 dark:text-white">
            Équipe {summary?.period || ''}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({data.length} collègue{data.length > 1 ? 's' : ''})
          </span>
        </div>
      </div>

      {/* Liste des agents */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {data.map((entry, index) => {
          const display = getServiceDisplay(entry.service_code);
          const initials = entry.agent_name
            .split(' ')
            .map(n => n.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();
          return (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold">
                  {initials}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {entry.agent_name}
                  </div>
                  {entry.poste_code && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Poste: {entry.poste_code}
                    </div>
                  )}
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${display.color}`}>
                {display.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
