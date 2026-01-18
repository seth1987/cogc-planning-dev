import { createClient } from '@supabase/supabase-js';

// Configuration Supabase via variables d'environnement
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('✅ Supabase URL:', supabaseUrl);
console.log('✅ Supabase Key valide:', supabaseAnonKey ? 'OUI' : 'NON');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configuration Supabase manquante!');
  throw new Error('Configuration Supabase manquante');
}

// Créer le client Supabase avec les bonnes options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Vérifier la connexion au démarrage
supabase.from('agents').select('count').then(result => {
  if (result.error) {
    console.error('❌ Erreur connexion Supabase:', result.error);
    console.error('Détails:', result.error.message, result.error.hint);
    console.error('Code erreur:', result.error.code);
  } else {
    console.log('✅ Connexion Supabase réussie! Agents trouvés:', result.data[0]?.count || 0);
  }
}).catch(err => {
  console.error('❌ Erreur lors de la vérification de connexion:', err);
});

// Helper functions pour les opérations courantes
export const auth = {
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getUser: () => supabase.auth.getUser(),
  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),
};

// Database helpers
export const db = {
  // Profiles
  getProfile: (userId) => 
    supabase.from('profiles').select('*').eq('id', userId).single(),
  
  updateProfile: (userId, updates) =>
    supabase.from('profiles').update(updates).eq('id', userId),

  // Plannings
  getPlannings: () => 
    supabase.from('plannings').select('*').order('annee', { ascending: false }).order('mois', { ascending: false }),
  
  getPlanning: (mois, annee) =>
    supabase.from('plannings').select('*').eq('mois', mois).eq('annee', annee).single(),

  // Gardes
  getGardes: (planningId) =>
    supabase.from('gardes').select('*, medecin:profiles(*)').eq('planning_id', planningId),
  
  createGarde: (garde) =>
    supabase.from('gardes').insert(garde),

  // Absences
  getAbsences: (medecinId) =>
    supabase.from('absences').select('*').eq('medecin_id', medecinId).order('date_debut', { ascending: false }),
  
  createAbsence: (absence) =>
    supabase.from('absences').insert(absence),
};