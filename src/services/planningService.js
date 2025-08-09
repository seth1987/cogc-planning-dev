import { supabase } from '../lib/supabaseClient';

// Service pour gérer les opérations liées aux plannings
export const planningService = {
  // Récupérer tous les plannings
  async getAllPlannings() {
    const { data, error } = await supabase
      .from('plannings')
      .select('*')
      .order('annee', { ascending: false })
      .order('mois', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Récupérer un planning spécifique
  async getPlanning(mois, annee) {
    const { data, error } = await supabase
      .from('plannings')
      .select('*')
      .eq('mois', mois)
      .eq('annee', annee)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Créer un nouveau planning
  async createPlanning(mois, annee, createdBy) {
    const { data, error } = await supabase
      .from('plannings')
      .insert([{
        mois,
        annee,
        created_by: createdBy,
        statut: 'draft'
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Mettre à jour le statut d'un planning
  async updatePlanningStatus(id, statut) {
    const { data, error } = await supabase
      .from('plannings')
      .update({ statut })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Récupérer les gardes d'un planning
  async getGardes(planningId) {
    const { data, error } = await supabase
      .from('gardes')
      .select(`
        *,
        medecin:profiles(*)
      `)
      .eq('planning_id', planningId)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Ajouter une garde
  async addGarde(garde) {
    const { data, error } = await supabase
      .from('gardes')
      .insert([garde])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Supprimer une garde
  async deleteGarde(id) {
    const { error } = await supabase
      .from('gardes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Vérifier les conflits de garde
  async checkGardeConflict(date, typeGarde) {
    const { data, error } = await supabase
      .from('gardes')
      .select('*')
      .eq('date', date)
      .eq('type_garde', typeGarde);
    
    if (error) throw error;
    return data && data.length > 0;
  },

  // Obtenir les statistiques d'un médecin
  async getMedecinStats(medecinId, annee) {
    const { data, error } = await supabase
      .from('gardes')
      .select('*')
      .eq('medecin_id', medecinId)
      .gte('date', `${annee}-01-01`)
      .lte('date', `${annee}-12-31`);
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      jour: data.filter(g => g.type_garde === 'jour').length,
      nuit: data.filter(g => g.type_garde === 'nuit').length,
      weekend: data.filter(g => g.type_garde === 'weekend').length,
    };
    
    return stats;
  },
};

export default planningService;