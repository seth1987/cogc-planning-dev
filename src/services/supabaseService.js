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
      .select('*, commentaire, postes_supplementaires')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
    
    if (error) {
      console.error('Erreur getPlanningForMonth:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Sauvegarde une entrée de planning avec support des notes et postes supplémentaires
   * @param {string} agentId - ID de l'agent
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} serviceCode - Code du service (-, O, X, RP, etc.)
   * @param {string|null} posteCode - Code du poste pour les réserves (CRC, CCU, etc.)
   * @param {string|null} note - Note/commentaire associé à cette cellule
   * @param {Array|null} postesSupplementaires - Liste des postes supplémentaires ["+SOUF", "+RC"]
   */
  async savePlanning(agentId, date, serviceCode, posteCode = null, note = null, postesSupplementaires = null) {
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
      commentaire: note || null,
      postes_supplementaires: postesSupplementaires && postesSupplementaires.length > 0 
        ? postesSupplementaires 
        : null,
      statut: 'actif',
      updated_at: new Date().toISOString()
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

  /**
   * Met à jour uniquement la note d'une cellule de planning
   * @param {string} agentId - ID de l'agent
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string|null} note - Note/commentaire (null pour supprimer)
   */
  async updatePlanningNote(agentId, date, note) {
    const { data: existing } = await supabase
      .from('planning')
      .select('id')
      .eq('agent_id', agentId)
      .eq('date', date)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('planning')
        .update({ 
          commentaire: note || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();
      
      if (error) {
        console.error('Erreur update note planning:', error);
        throw error;
      }
      return data;
    }
    return null;
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

  // ============================================
  // POSTES STATUS (Figé / Rapatrié)
  // ============================================

  /**
   * Récupère les statuts des postes pour une date donnée
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Object} Statuts par créneau {nuitAvant: {CRC: 'fige'}, matin: {}, ...}
   */
  async getPostesStatusForDate(date) {
    const { data, error } = await supabase
      .from('postes_status')
      .select('*')
      .eq('date', date);
    
    if (error) {
      console.error('Erreur getPostesStatusForDate:', error);
      // Retourner un objet vide si la table n'existe pas encore
      return { nuitAvant: {}, matin: {}, soir: {}, nuitApres: {} };
    }
    
    // Organiser les données par créneau
    const result = {
      nuitAvant: {},
      matin: {},
      soir: {},
      nuitApres: {}
    };
    
    (data || []).forEach(entry => {
      if (result[entry.creneau]) {
        result[entry.creneau][entry.poste] = entry.status;
      }
    });
    
    return result;
  }

  /**
   * Sauvegarde ou supprime le statut d'un poste pour une date/créneau
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} creneau - Créneau: nuitAvant, matin, soir, nuitApres
   * @param {string} poste - Code du poste: CRC, ACR, RC, etc.
   * @param {string|null} status - Statut: 'fige', 'rapatrie', ou null pour supprimer
   */
  async savePosteStatus(date, creneau, poste, status) {
    if (!status) {
      // Supprimer l'entrée
      const { error } = await supabase
        .from('postes_status')
        .delete()
        .eq('date', date)
        .eq('creneau', creneau)
        .eq('poste', poste);
      
      if (error && error.code !== 'PGRST116') { // Ignorer "no rows returned"
        console.error('Erreur delete poste status:', error);
      }
      return null;
    }
    
    // Upsert (insert ou update)
    const { data, error } = await supabase
      .from('postes_status')
      .upsert({
        date,
        creneau,
        poste,
        status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date,creneau,poste'
      })
      .select();
    
    if (error) {
      console.error('Erreur upsert poste status:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Sauvegarde tous les statuts des postes pour une date (batch)
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {Object} postesStatus - {nuitAvant: {CRC: 'fige'}, matin: {CCU: 'rapatrie'}, ...}
   */
  async saveAllPostesStatus(date, postesStatus) {
    const upsertData = [];
    const deleteConditions = [];
    
    Object.entries(postesStatus).forEach(([creneau, postes]) => {
      Object.entries(postes).forEach(([poste, status]) => {
        if (status) {
          upsertData.push({
            date,
            creneau,
            poste,
            status,
            updated_at: new Date().toISOString()
          });
        } else {
          deleteConditions.push({ creneau, poste });
        }
      });
    });
    
    // Supprimer les entrées nulles
    for (const condition of deleteConditions) {
      await supabase
        .from('postes_status')
        .delete()
        .eq('date', date)
        .eq('creneau', condition.creneau)
        .eq('poste', condition.poste);
    }
    
    // Upsert les nouvelles valeurs
    if (upsertData.length > 0) {
      const { error } = await supabase
        .from('postes_status')
        .upsert(upsertData, { onConflict: 'date,creneau,poste' });
      
      if (error) {
        console.error('Erreur batch upsert postes status:', error);
        throw error;
      }
    }
    
    console.log(`✅ Postes status sauvegardés pour ${date}:`, upsertData.length, 'entrées');
  }
}

const supabaseService = new SupabaseService();
export default supabaseService;
