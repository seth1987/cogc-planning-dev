import React, { useState, useEffect } from 'react';
import { createAgentAccount, listAgentsWithEmails, DEFAULT_PASSWORD } from '../services/userManagementService';
import { supabase } from '../lib/supabaseClient';

const AdminUserSetup = ({ onClose }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // État pour les sélections
  const [selectedAgents, setSelectedAgents] = useState(new Set());
  
  // État pour les comptes existants
  const [existingAccounts, setExistingAccounts] = useState(new Set());
  const [checkingAccounts, setCheckingAccounts] = useState(true);

  // Charger la liste des agents et vérifier les comptes existants
  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les agents
        const agentsList = await listAgentsWithEmails();
        setAgents(agentsList);
        
        // Vérifier les comptes existants dans auth.users
        // Note: Cette requête nécessite les droits appropriés
        const { data: users, error: usersError } = await supabase
          .from('agents')
          .select('id');
        
        if (!usersError) {
          // Pour l'instant, on ne peut pas lister les users auth directement
          // On marquera comme existant lors de la tentative de création
          setExistingAccounts(new Set());
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setCheckingAccounts(false);
      }
    };
    loadData();
  }, []);

  // Sélectionner/Désélectionner un agent
  const toggleAgent = (agentId) => {
    setSelectedAgents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  // Sélectionner tous les agents (sauf ceux avec compte existant)
  const selectAll = () => {
    const allIds = agents
      .filter(a => !existingAccounts.has(a.email))
      .map(a => a.id);
    setSelectedAgents(new Set(allIds));
  };

  // Désélectionner tous
  const deselectAll = () => {
    setSelectedAgents(new Set());
  };

  // Créer les comptes pour les agents sélectionnés
  const handleCreateSelectedAccounts = async () => {
    if (selectedAgents.size === 0) {
      setError('Veuillez sélectionner au moins un agent');
      return;
    }

    const selectedList = agents.filter(a => selectedAgents.has(a.id));
    
    if (!window.confirm(
      `Vous allez créer ${selectedList.length} compte(s).\n\n` +
      `Mot de passe par défaut : ${DEFAULT_PASSWORD}\n\n` +
      `Voulez-vous continuer ?`
    )) {
      return;
    }

    setCreating(true);
    setError(null);
    setResults(null);

    const newResults = {
      created: [],
      existing: [],
      errors: []
    };

    try {
      for (let i = 0; i < selectedList.length; i++) {
        const agent = selectedList[i];
        
        setProgress({
          current: i + 1,
          total: selectedList.length,
          agent: `${agent.nom} ${agent.prenom}`
        });

        const result = await createAgentAccount(agent);
        
        if (result.success) {
          newResults.created.push({
            agent: `${agent.nom} ${agent.prenom}`,
            email: result.email
          });
        } else if (result.exists) {
          newResults.existing.push({
            agent: `${agent.nom} ${agent.prenom}`,
            email: result.email
          });
          // Marquer comme existant
          setExistingAccounts(prev => new Set([...prev, result.email]));
        } else {
          newResults.errors.push({
            agent: `${agent.nom} ${agent.prenom}`,
            email: result.email,
            error: result.error
          });
        }

        // Petit délai pour éviter le rate limiting
        if (i < selectedList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setResults(newResults);
      
      // Désélectionner les agents créés avec succès
      const createdEmails = new Set(newResults.created.map(r => r.email));
      const existingEmails = new Set(newResults.existing.map(r => r.email));
      setSelectedAgents(prev => {
        const newSet = new Set(prev);
        agents.forEach(a => {
          if (createdEmails.has(a.email) || existingEmails.has(a.email)) {
            newSet.delete(a.id);
          }
        });
        return newSet;
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
      setProgress(null);
    }
  };

  // Créer un seul compte
  const handleCreateSingleAccount = async (agent) => {
    setCreating(true);
    setError(null);

    try {
      const result = await createAgentAccount(agent);
      
      if (result.success) {
        setResults({
          created: [{ agent: `${agent.nom} ${agent.prenom}`, email: result.email }],
          existing: [],
          errors: []
        });
        // Désélectionner cet agent
        setSelectedAgents(prev => {
          const newSet = new Set(prev);
          newSet.delete(agent.id);
          return newSet;
        });
      } else if (result.exists) {
        setExistingAccounts(prev => new Set([...prev, result.email]));
        setResults({
          created: [],
          existing: [{ agent: `${agent.nom} ${agent.prenom}`, email: result.email }],
          errors: []
        });
      } else {
        setError(`Erreur pour ${agent.nom} ${agent.prenom}: ${result.error}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const selectedCount = selectedAgents.size;
  const availableCount = agents.filter(a => !existingAccounts.has(a.email)).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">👤 Gestion des comptes utilisateurs</h2>
            <p className="text-purple-200 text-sm">Créer les comptes pour les agents sélectionnés</p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
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
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des agents...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="text-red-600 underline text-sm mt-2"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Progress bar */}
          {progress && (
            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between text-sm text-purple-700 mb-2">
                <span className="font-medium">Création en cours : {progress.agent}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="h-3 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
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
                  <div className="text-sm text-green-700 max-h-24 overflow-y-auto">
                    {results.created.map((item, i) => (
                      <div key={i}>{item.agent} ({item.email})</div>
                    ))}
                  </div>
                </div>
              )}
              
              {results.existing.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 mb-2">
                    ℹ️ {results.existing.length} compte(s) déjà existant(s)
                  </h4>
                  <div className="text-sm text-blue-700 max-h-24 overflow-y-auto">
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
                  <div className="text-sm text-red-700 max-h-24 overflow-y-auto">
                    {results.errors.map((item, i) => (
                      <div key={i}>{item.agent}: {item.error}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Agents list with checkboxes */}
          {!loading && agents.length > 0 && (
            <>
              {/* Selection controls */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    <strong>{selectedCount}</strong> sélectionné(s) sur <strong>{agents.length}</strong> agents
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={deselectAll}
                      className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Tout désélectionner
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleCreateSelectedAccounts}
                  disabled={creating || selectedCount === 0}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Créer {selectedCount > 0 ? `(${selectedCount})` : ''} compte(s)
                    </>
                  )}
                </button>
              </div>

              {/* Agents table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="w-12 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount === availableCount && availableCount > 0}
                          onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Agent</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Email de connexion</th>
                      <th className="w-32 px-4 py-3 text-center font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {agents.map((agent) => {
                      const isExisting = existingAccounts.has(agent.email);
                      const isSelected = selectedAgents.has(agent.id);
                      
                      return (
                        <tr 
                          key={agent.id} 
                          className={`hover:bg-gray-50 transition-colors ${isExisting ? 'bg-green-50/50' : ''}`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAgent(agent.id)}
                              disabled={isExisting || creating}
                              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <span className={`font-medium ${isExisting ? 'text-green-700' : ''}`}>
                              {agent.nom} {agent.prenom}
                            </span>
                            {isExisting && (
                              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                Compte créé
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600 font-mono text-xs">{agent.email}</td>
                          <td className="px-4 py-2 text-center">
                            {isExisting ? (
                              <span className="text-green-600 text-xs">✓ Actif</span>
                            ) : (
                              <button
                                onClick={() => handleCreateSingleAccount(agent)}
                                disabled={creating}
                                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 transition-colors"
                              >
                                Créer
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
