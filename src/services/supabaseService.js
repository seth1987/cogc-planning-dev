import { supabase } from '../lib/supabaseClient';

class SupabaseService {
  // Exposer le client Supabase pour accès direct si nécessaire
  get client() {
    return supabase;
  }

  // ============================================
  // ANNÉES DISPONIBLES
  // ============================================

  /**
   * Récupère les années distinctes disponibles dans la table planning
   * @returns {Promise<number[]>} Liste des années triées (récent d'abord)
   */
  async getAvailableYears() {
    try {
      const { data, error } = await supabase
        .from('planning')
        .select('date')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Erreur getAvailableYears:', error);
        return [new Date().getFullYear()];
      }
      
      if (!data || data.length === 0) {
        return [new Date().getFullYear()];
      }
      
      // Extraire les années uniques - parse direct pour éviter timezone issues
      const years = [...new Set(data.map(row => {
        // Parse YYYY-MM-DD directement sans Date object
        return parseInt(row.date.split('-')[0], 10);
      }))];
      
      console.log('📅 Années disponibles:', years);
      return years.sort((a, b) => b - a); // Tri descendant (récent d'abord)
    } catch (err) {
      console.error('Exception getAvailableYears:', err);
      return [new Date().getFullYear()];
    }
  }

  // ============================================
  // AGENTS
  // ============================================

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

  /**
   * Met à jour un agent existant
   * v2.0: Inclut maintenant email et telephone
   */
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
    if (agentData.date_depart !== undefined) {
      cleanData.date_depart = agentData.date_depart || null;
    }

    // Ajouter email et téléphone (v2.0)
    if (agentData.email !== undefined) {
      cleanData.email = agentData.email || null;
    }
    if (agentData.telephone !== undefined) {
      cleanData.telephone = agentData.telephone || null;
    }

    console.log('📝 Mise à jour agent:', agentId, cleanData);

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

  /**
   * Crée un nouvel agent
   * v2.0: Inclut maintenant email et telephone
   * @returns {Object} L'agent créé avec son ID
   */
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

    // Ajouter email et téléphone (v2.0)
    if (agentData.email) {
      cleanData.email = agentData.email;
    }
    if (agentData.telephone) {
      cleanData.telephone = agentData.telephone;
    }

    console.log('✨ Création agent avec données:', cleanData);

    const { data, error } = await supabase
      .from('agents')
      .insert(cleanData)
      .select();
    
    if (error) {
      console.error('Erreur createAgent:', error);
      throw error;
    }
    
    console.log('✅ Agent créé:', data[0]);
    return data[0];
  }

  // ============================================
  // HABILITATIONS
  // ============================================

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

  // ============================================
  // PLANNING
  // ============================================

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
   * @param {string[]|null} postesSupplementaires - Liste des postes supplémentaires (italique)
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

  /**
   * Met à jour les postes supplémentaires d'une cellule de planning
   * @param {string} agentId - ID de l'agent
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string[]|null} postesSupplementaires - Liste des postes (null pour supprimer)
   */
  async updatePostesSupplementaires(agentId, date, postesSupplementaires) {
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
          postes_supplementaires: postesSupplementaires && postesSupplementaires.length > 0 
            ? postesSupplementaires 
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();
      
      if (error) {
        console.error('Erreur update postes supplémentaires:', error);
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

  // ============================================
  // POSTES FIGÉS
  // ============================================

  /**
   * Récupère les postes figés pour une date donnée
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Object} - Objet {creneau: {poste: status}}
   */
  async getPostesFiges(date) {
    const { data, error } = await supabase
      .from('postes_figes')
      .select('*')
      .eq('date', date);
    
    if (error) {
      console.error('Erreur getPostesFiges:', error);
      throw error;
    }

    // Reconstruire l'objet par créneau
    const result = {
      nuitAvant: {},
      matin: {},
      soir: {},
      nuitApres: {}
    };

    if (data) {
      data.forEach(row => {
        if (result[row.creneau]) {
          result[row.creneau][row.poste] = row.status;
        }
      });
    }

    return result;
  }

  /**
   * Sauvegarde ou met à jour un poste figé
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} creneau - ID du créneau (nuitAvant, matin, soir, nuitApres)
   * @param {string} poste - Code du poste (CRC, CCU, etc.)
   * @param {string} status - Statut (fige ou rapatrie)
   */
  async savePosteFige(date, creneau, poste, status) {
    const { data, error } = await supabase
      .from('postes_figes')
      .upsert({
        date: date,
        creneau: creneau,
        poste: poste,
        status: status,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date,creneau,poste'
      })
      .select();
    
    if (error) {
      console.error('Erreur savePosteFige:', error);
      throw error;
    }
    
    console.log(`✅ Poste figé sauvegardé: ${poste} ${status} (${creneau}) pour ${date}`);
    return data;
  }

  /**
   * Supprime un poste figé
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} creneau - ID du créneau
   * @param {string} poste - Code du poste
   */
  async deletePosteFige(date, creneau, poste) {
    const { error } = await supabase
      .from('postes_figes')
      .delete()
      .eq('date', date)
      .eq('creneau', creneau)
      .eq('poste', poste);
    
    if (error) {
      console.error('Erreur deletePosteFige:', error);
      throw error;
    }
    
    console.log(`🗑️ Poste figé supprimé: ${poste} (${creneau}) pour ${date}`);
    return true;
  }

  // ============================================
  // ANNUAIRE
  // ============================================

  /**
   * Récupère tous les contacts de l'annuaire
   * @returns {Promise<Array>} Liste des contacts groupés
   */
  async getAnnuaire() {
    const { data, error } = await supabase
      .from('annuaire')
      .select('*')
      .order('groupe, ordre_affichage, nom');
    
    if (error) {
      console.error('Erreur getAnnuaire:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Met à jour un contact de l'annuaire
   * @param {string} id - ID du contact
   * @param {Object} contactData - Données à mettre à jour (telephone, email)
   */
  async updateAnnuaireContact(id, contactData) {
    const updateData = {};
    
    // Ne mettre à jour que les champs fournis
    if (contactData.telephone !== undefined) {
      updateData.telephone = contactData.telephone || '';
    }
    if (contactData.email !== undefined) {
      updateData.email = contactData.email || '';
    }

    console.log('📇 Mise à jour annuaire:', id, updateData);

    const { data, error } = await supabase
      .from('annuaire')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('Erreur updateAnnuaireContact:', error);
      throw error;
    }
    
    console.log('✅ Contact annuaire mis à jour:', data);
    return data[0];
  }

  /**
   * Ajoute un nouveau contact à l'annuaire
   * @param {Object} contactData - Données du contact
   */
  async createAnnuaireContact(contactData) {
    const { data, error } = await supabase
      .from('annuaire')
      .insert({
        groupe: contactData.groupe,
        nom: contactData.nom,
        telephone: contactData.telephone || '',
        email: contactData.email || '',
        contact_groupe: contactData.contact_groupe || '',
        telephone_groupe: contactData.telephone_groupe || '',
        email_groupe: contactData.email_groupe || '',
        ordre_affichage: contactData.ordre_affichage || 0
      })
      .select();
    
    if (error) {
      console.error('Erreur createAnnuaireContact:', error);
      throw error;
    }
    return data[0];
  }

  /**
   * Supprime un contact de l'annuaire
   * @param {string} id - ID du contact
   */
  async deleteAnnuaireContact(id) {
    const { error } = await supabase
      .from('annuaire')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Erreur deleteAnnuaireContact:', error);
      throw error;
    }
    return true;
  }

  // ============================================
  // UPLOAD PDF
  // ============================================

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
