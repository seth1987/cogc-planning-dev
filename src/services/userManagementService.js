import { supabase } from '../lib/supabaseClient';

// Mot de passe par défaut pour tous les agents
export const DEFAULT_PASSWORD = '123456';

/**
 * Génère l'email SNCF à partir du nom et prénom
 */
export const generateSNCFEmail = (nom, prenom) => {
  if (!nom || !prenom) return '';
  const cleanNom = nom.toLowerCase()
    .replace(/\s+/g, '-')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleanPrenom = prenom.toLowerCase()
    .replace(/\s+/g, '-')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${cleanPrenom}.${cleanNom}@reseau.sncf.fr`;
};

/**
 * Crée un compte utilisateur pour un agent avec le mot de passe par défaut
 * Utilise signUp standard (nécessite de désactiver la confirmation email dans Supabase)
 * 
 * Configuration Supabase requise:
 * - Aller dans Authentication > Providers > Email
 * - Désactiver "Confirm email"
 * - Ou utiliser "Enable automatic confirmation"
 * 
 * @param {Object} agent - L'agent { id, nom, prenom }
 * @returns {Object} - { success, email, error }
 */
export const createAgentAccount = async (agent) => {
  const email = generateSNCFEmail(agent.nom, agent.prenom);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: DEFAULT_PASSWORD,
      options: {
        data: {
          agent_id: agent.id,
          nom: agent.nom,
          prenom: agent.prenom,
        }
      }
    });
    
    if (error) {
      // Si l'utilisateur existe déjà
      if (error.message.includes('already registered') || 
          error.message.includes('already been registered')) {
        return { 
          success: false, 
          email, 
          error: 'Compte déjà existant',
          exists: true 
        };
      }
      throw error;
    }
    
    // Vérifier si c'est un utilisateur existant (Supabase retourne quand même data sans erreur)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { 
        success: false, 
        email, 
        error: 'Compte déjà existant',
        exists: true 
      };
    }
    
    return { success: true, email, data };
  } catch (err) {
    return { success: false, email, error: err.message };
  }
};

/**
 * Crée les comptes pour tous les agents de la base de données
 * @param {Function} onProgress - Callback pour suivre la progression (optional)
 * @returns {Object} - { created, existing, errors, total }
 */
export const createAllAgentAccounts = async (onProgress = null) => {
  const results = {
    created: [],
    existing: [],
    errors: [],
    total: 0
  };
  
  try {
    // Récupérer tous les agents
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, nom, prenom')
      .order('nom', { ascending: true });
    
    if (error) throw error;
    
    results.total = agents.length;
    
    // Créer un compte pour chaque agent avec un délai pour éviter le rate limiting
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const result = await createAgentAccount(agent);
      
      if (result.success) {
        results.created.push({
          agent: `${agent.nom} ${agent.prenom}`,
          email: result.email
        });
      } else if (result.exists) {
        results.existing.push({
          agent: `${agent.nom} ${agent.prenom}`,
          email: result.email
        });
      } else {
        results.errors.push({
          agent: `${agent.nom} ${agent.prenom}`,
          email: result.email,
          error: result.error
        });
      }
      
      // Callback de progression
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: agents.length,
          agent: `${agent.nom} ${agent.prenom}`,
          status: result.success ? 'created' : (result.exists ? 'existing' : 'error')
        });
      }
      
      // Petit délai pour éviter le rate limiting de Supabase
      if (i < agents.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  } catch (err) {
    return { ...results, globalError: err.message };
  }
};

/**
 * Liste tous les agents avec leur email généré
 * @returns {Array} - Liste des agents avec email
 */
export const listAgentsWithEmails = async () => {
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, nom, prenom')
      .order('nom', { ascending: true });
    
    if (error) throw error;
    
    return agents.map(agent => ({
      id: agent.id,
      nom: agent.nom,
      prenom: agent.prenom,
      email: generateSNCFEmail(agent.nom, agent.prenom)
    }));
  } catch (err) {
    console.error('Erreur listAgentsWithEmails:', err);
    return [];
  }
};

export default {
  DEFAULT_PASSWORD,
  generateSNCFEmail,
  createAgentAccount,
  createAllAgentAccounts,
  listAgentsWithEmails
};
