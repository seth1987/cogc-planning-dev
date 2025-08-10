import { supabase } from '../lib/supabaseClient';

class SupabaseService {
  // Agents
  async getAgents() {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('groupe,nom');
    
    if (error) throw error;
    return data || [];
  }

  async updateAgent(agentId, agentData) {
    const { data, error } = await supabase
      .from('agents')
      .update(agentData)
      .eq('id', agentId);
    
    if (error) throw error;
    return data;
  }

  async deleteAgent(agentId) {
    // Supprimer les dépendances d'abord
    await supabase.from('habilitations').delete().eq('agent_id', agentId);
    await supabase.from('planning').delete().eq('agent_id', agentId);
    
    // Supprimer l'agent
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);
    
    if (error) throw error;
    return true;
  }

  async createAgent(agentData) {
    const { data, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  // Habilitations
  async getHabilitations() {
    const { data, error } = await supabase
      .from('habilitations')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async addHabilitation(agentId, poste) {
    const { data, error } = await supabase
      .from('habilitations')
      .insert({
        agent_id: agentId,
        poste: poste,
        date_obtention: new Date().toISOString().split('T')[0]
      });
    
    if (error) throw error;
    return data;
  }

  async removeHabilitation(agentId, poste) {
    const { error } = await supabase
      .from('habilitations')
      .delete()
      .eq('agent_id', agentId)
      .eq('poste', poste);
    
    if (error) throw error;
    return true;
  }

  // Planning
  async getPlanningForMonth(startDate, endDate) {
    const { data, error } = await supabase
      .from('planning')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
    
    if (error) throw error;
    return data || [];
  }

  async savePlanning(agentId, date, serviceCode, posteCode = null) {
    // Chercher si une entrée existe déjà
    const { data: existing } = await supabase
      .from('planning')
      .select('id')
      .eq('agent_id', agentId)
      .eq('date', date)
      .single();

    const planningData = {
      agent_id: agentId,
      date: date,
      service_code: serviceCode,
      poste_code: posteCode,
      statut: 'actif'
    };

    if (existing) {
      // Mettre à jour
      const { data, error } = await supabase
        .from('planning')
        .update(planningData)
        .eq('id', existing.id);
      
      if (error) throw error;
      return data;
    } else {
      // Créer
      const { data, error } = await supabase
        .from('planning')
        .insert(planningData);
      
      if (error) throw error;
      return data;
    }
  }

  async deletePlanning(agentId, date) {
    const { error } = await supabase
      .from('planning')
      .delete()
      .eq('agent_id', agentId)
      .eq('date', date);
    
    if (error) throw error;
    return true;
  }

  // Upload PDF
  async saveUploadRecord(uploadData) {
    const { data, error } = await supabase
      .from('uploads_pdf')
      .insert(uploadData);
    
    if (error) throw error;
    return data;
  }

  async getUploads() {
    const { data, error } = await supabase
      .from('uploads_pdf')
      .select('*')
      .order('date_upload', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}

export default new SupabaseService();