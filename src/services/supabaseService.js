import { supabase } from '../lib/supabaseClient';

class SupabaseService {
  // Agents
  async getAgents() {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('groupe,nom');
    
    if (error) {
      console.error('Erreur getAgents:', error);
      throw error;
    }
    return data || [];
  }

  async updateAgent(agentId, agentData) {
    // Nettoyer les données avant l'envoi
    const cleanData = {
      nom: agentData.nom,
      prenom: agentData.prenom,
      statut: agentData.statut,
      groupe: agentData.groupe,
      site: agentData.site
    };

    // Ajouter les dates seulement si elles existent
    if (agentData.date_arrivee) {
      cleanData.date_arrivee = agentData.date_arrivee;
    }
    if (agentData.date_depart) {
      cleanData.date_depart = agentData.date_depart || null;
    }

    console.log('Mise à jour agent:', agentId, cleanData);

    const { data, error } = await supabase
      .from('agents')
      .update(cleanData)
      .eq('id', agentId)
      .select();
    
    if (error) {
      console.error('Erreur updateAgent:', error);
      throw error;
    }
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
    
    if (error) {
      console.error('Erreur deleteAgent:', error);
      throw error;
    }
    return true;
  }

  async createAgent(agentData) {
    // Nettoyer les données avant l'envoi
    const cleanData = {
      nom: agentData.nom,
      prenom: agentData.prenom,
      statut: agentData.statut,
      groupe: agentData.groupe,
      site: agentData.site
    };

    // Ajouter les dates seulement si elles existent et sont valides
    if (agentData.date_arrivee) {
      cleanData.date_arrivee = agentData.date_arrivee;
    }
    
    // Gérer date_depart : null si vide
    if (agentData.date_depart && agentData.date_depart !== '') {
      cleanData.date_depart = agentData.date_depart;
    } else {
      cleanData.date_depart = null;
    }

    console.log('Création agent avec données nettoyées:', cleanData);

    const { data, error } = await supabase
      .from('agents')
      .insert(cleanData)
      .select();
    
    if (error) {
      console.error('Erreur createAgent:', error);
      throw error;
    }
    return data[0];
  }

  // Habilitations
  async getHabilitations() {
    const { data, error } = await supabase
      .from('habilitations')
      .select('*');
    
    if (error) {
      console.error('Erreur getHabilitations:', error);
      throw error;
    }
    return data || [];
  }

  async addHabilitation(agentId, poste) {
    const { data, error } = await supabase
      .from('habilitations')
      .insert({
        agent_id: agentId,
        poste: poste,
        date_obtention: new Date().toISOString().split('T')[0]
      })
      .select();
    
    if (error) {
      console.error('Erreur addHabilitation:', error);
      throw error;
    }
    return data;
  }

  async removeHabilitation(agentId, poste) {
    const { error } = await supabase
      .from('habilitations')
      .delete()
      .eq('agent_id', agentId)
      .eq('poste', poste);
    
    if (error) {
      console.error('Erreur removeHabilitation:', error);
      throw error;
    }
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
    
    if (error) {
      console.error('Erreur getPlanningForMonth:', error);
      throw error;
    }
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
        .eq('id', existing.id)
        .select();
      
      if (error) {
        console.error('Erreur update planning:', error);
        throw error;
      }
      return data;
    } else {
      // Créer
      const { data, error } = await supabase
        .from('planning')
        .insert(planningData)
        .select();
      
      if (error) {
        console.error('Erreur insert planning:', error);
        throw error;
      }
      return data;
    }
  }

  async deletePlanning(agentId, date) {
    const { error } = await supabase
      .from('planning')
      .delete()
      .eq('agent_id', agentId)
      .eq('date', date);
    
    if (error) {
      console.error('Erreur deletePlanning:', error);
      throw error;
    }
    return true;
  }

  // Upload PDF
  async saveUploadRecord(uploadData) {
    const { data, error } = await supabase
      .from('uploads_pdf')
      .insert(uploadData)
      .select();
    
    if (error) {
      console.error('Erreur saveUploadRecord:', error);
      throw error;
    }
    return data;
  }

  async getUploads() {
    const { data, error } = await supabase
      .from('uploads_pdf')
      .select('*')
      .order('date_upload', { ascending: false });
    
    if (error) {
      console.error('Erreur getUploads:', error);
      throw error;
    }
    return data || [];
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;