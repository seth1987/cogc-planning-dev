import { createClient } from '@supabase/supabase-js';

// Configuration Supabase avec clés intégrées
const supabaseUrl = 'https://kbihxjbazmjmpsxkeydf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWh4amJhem1qbXBzeGtleWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MTEwNDAsImV4cCI6MjA0OTE4NzA0MH0.EKdpS0v_FqCgpHY3sKNOc6rXVnL5kqGw0OQxVGrjZxg';

console.log('✅ Supabase URL:', supabaseUrl);
console.log('✅ Supabase Key valide:', supabaseAnonKey ? 'OUI' : 'NON');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Configuration Supabase manquante');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Vérifier la connexion au démarrage
supabase.from('agents').select('count').then(result => {
  if (result.error) {
    console.error('❌ Erreur connexion Supabase:', result.error);
  } else {
    console.log('✅ Connexion Supabase réussie! Agents trouvés:', result.data[0]?.count || 0);
  }
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