import React, { useState, useEffect } from 'react';
import { createAllAgentAccounts, listAgentsWithEmails, DEFAULT_PASSWORD } from '../services/userManagementService';

const AdminUserSetup = ({ onClose }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Charger la liste des agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agentsList = await listAgentsWithEmails();
        setAgents(agentsList);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadAgents();
  }, []);

  const handleCreateAllAccounts = async () => {
    if (!window.confirm(
      `Vous allez créer des comptes pour ${agents.length} agents.\n\n` +
      `Mot de passe par défaut : ${DEFAULT_PASSWORD}\n\n` +
      `Voulez-vous continuer ?`
    )) {
      return;
    }

    setCreating(true);
    setError(null);
    setResults(null);

    try {
      const result = await createAllAgentAccounts((progress) => {
        setProgress(progress);
      });
      setResults(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">👤 Gestion des comptes utilisateurs</h2>
            <p className="text-blue-200 text-sm">Créer les comptes pour tous les agents</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-amber-800 mb-2">ℹ️ Configuration requise</h3>
            <p className="text-sm text-amber-700 mb-2">
              Avant de créer les comptes, assurez-vous d'avoir désactivé la confirmation email dans Supabase :
            </p>
            <ol className="text-sm text-amber-700 list-decimal ml-5 space-y-1">
              <li>Allez dans <strong>Authentication → Providers → Email</strong></li>
              <li>Désactivez <strong>"Confirm email"</strong></li>
              <li>Ou activez <strong>"Enable automatic confirmation"</strong></li>
            </ol>
            <p className="text-sm text-amber-700 mt-3">
              <strong>Mot de passe par défaut :</strong> <code className="bg-amber-100 px-2 py-0.5 rounded">{DEFAULT_PASSWORD}</code>
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des agents...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Agents list */}
          {!loading && agents.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-gray-700">
                  {agents.length} agents à configurer
                </h3>
                <button
                  onClick={handleCreateAllAccounts}
                  disabled={creating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Créer tous les comptes
                    </>
                  )}
                </button>
              </div>

              {/* Progress bar */}
              {progress && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>{progress.agent}</span>
                    <span>{progress.current} / {progress.total}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Results */}
              {results && (
                <div className="mb-6 space-y-3">
                  {results.created.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="font-medium text-green-800 mb-2">
                        ✅ {results.created.length} compte(s) créé(s)
                      </h4>
                      <div className="text-sm text-green-700 max-h-32 overflow-y-auto">
                        {results.created.map((item, i) => (
                          <div key={i}>{item.agent} ({item.email})</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {results.existing.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h4 className="font-medium text-blue-800 mb-2">
                        ℹ️ {results.existing.length} compte(s) existant(s)
                      </h4>
                      <div className="text-sm text-blue-700 max-h-32 overflow-y-auto">
                        {results.existing.map((item, i) => (
                          <div key={i}>{item.agent} ({item.email})</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {results.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h4 className="font-medium text-red-800 mb-2">
                        ❌ {results.errors.length} erreur(s)
                      </h4>
                      <div className="text-sm text-red-700 max-h-32 overflow-y-auto">
                        {results.errors.map((item, i) => (
                          <div key={i}>{item.agent}: {item.error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Agents table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Agent</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Email de connexion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {agents.map((agent) => (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{agent.nom} {agent.prenom}</td>
                        <td className="px-4 py-2 text-gray-600 font-mono text-xs">{agent.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* No agents */}
          {!loading && agents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun agent trouvé dans la base de données.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserSetup;
