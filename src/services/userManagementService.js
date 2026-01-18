import { supabase } from '../lib/supabaseClient';

// Mot de passe par défaut pour tous les agents
export const DEFAULT_PASSWORD = '123456';

/**
 * Génère l'email SNCF à partir du nom et prénom
 * Format: prenom.nom@reseau.sncf.fr
 * 
 * @param {string} nom - Nom de l'agent
 * @param {string} prenom - Prénom de l'agent
 * @returns {string} Email généré
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
 * Crée un compte utilisateur Supabase Auth pour un agent
 * 
 * IMPORTANT: Pour éviter l'envoi d'email de confirmation, 
 * configurer Supabase Dashboard:
 * - Authentication > Providers > Email > Désactiver "Confirm email"
 * - Ou activer "Enable automatic confirmation"
 * 
 * @param {Object} agent - L'agent { id, nom, prenom, email }
 * @param {string} agent.id - ID de l'agent en BDD
 * @param {string} agent.nom - Nom de l'agent
 * @param {string} agent.prenom - Prénom de l'agent
 * @param {string} [agent.email] - Email (optionnel, généré si absent)
 * @returns {Object} - { success, email, error, exists, data }
 */
export const createAgentAccount = async (agent) => {
  // Utiliser l'email fourni ou le générer
  const email = agent.email || generateSNCFEmail(agent.nom, agent.prenom);
  
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
    
    console.log(`✅ Compte Auth créé pour ${agent.nom} ${agent.prenom} (${email})`);
    return { success: true, email, data };
  } catch (err) {
    console.error(`❌ Erreur création compte Auth pour ${email}:`, err);
    return { success: false, email, error: err.message };
  }
};

const userManagementService = {
  DEFAULT_PASSWORD,
  generateSNCFEmail,
  createAgentAccount
};

export default userManagementService;
