import { supabase } from '../lib/supabaseClient';

/**
 * Extrait le code de groupe (groupe_travail) depuis le nom complet du groupe
 * Utilisé pour synchroniser avec l'annuaire
 * 
 * @param {string} groupeComplet - Nom complet du groupe (ex: "ACR - ROULEMENT ACR COGC")
 * @returns {string} Code du groupe (ex: "ACR")
 */
const extractGroupeCode = (groupeComplet) => {
  if (!groupeComplet) return null;
  
  // Cas spéciaux pour les réserves
  if (groupeComplet.startsWith('RESERVE PCD')) return 'PCD';
  if (groupeComplet.startsWith('RESERVE REGULATEUR PN')) return 'RESERVE PN';
  if (groupeComplet.startsWith('RESERVE REGULATEUR DR')) return 'RESERVE DR';
  
  // Cas standard : extraire le préfixe avant " - "
  const dashIndex = groupeComplet.indexOf(' - ');
  if (dashIndex > 0) {
    return groupeComplet.substring(0, dashIndex);
  }
  
  // Fallback : retourner tel quel
  return groupeComplet;
};

/**
 * Service Supabase pour COGC Planning
 * @version 2.5.0 - Support complet texte libre (lecture/écriture)
 */
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
   * v2.1: Calcule automatiquement groupe_travail pour synchronisation annuaire
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

    // Calculer automatiquement groupe_travail depuis groupe (v2.1)
    if (agentData.groupe) {
      cleanData.groupe_travail = extractGroupeCode(agentData.groupe);
      console.log(`📇 groupe_travail calculé: "${agentData.groupe}" → "${cleanData.groupe_travail}"`);
    }

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
   * v2.1: Calcule automatiquement groupe_travail pour synchronisation annuaire
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

    // Calculer automatiquement groupe_travail depuis groupe (v2.1)
    if (agentData.groupe) {
      cleanData.groupe_travail = extractGroupeCode(agentData.groupe);
      console.log(`📇 groupe_travail calculé: "${agentData.groupe}" → "${cleanData.groupe_travail}"`);
    }

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

  /**
   * Récupère les entrées de planning pour une période donnée
   * @version 2.5.0 - Inclut texte_libre dans le SELECT
   * 
   * @param {string} startDate - Date de début (YYYY-MM-DD)
   * @param {string} endDate - Date de fin (YYYY-MM-DD)
   * @returns {Promise<Array>} Entrées de planning
   */
  async getPlanningForMonth(startDate, endDate) {
    console.log(`🔍 getPlanningForMonth: ${startDate} → ${endDate}`);
    
    // ✅ FIX v2.5.0: Inclure texte_libre dans le SELECT
    const { data, error, count } = await supabase
      .from('planning')
      .select('*, commentaire, postes_supplementaires, texte_libre', { count: 'exact' })
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .limit(2000); // FIX: Supabase limite par défaut à 1000 lignes!
    
    if (error) {
      console.error('❌ Erreur getPlanningForMonth:', error);
      throw error;
    }
    
    // Logs de débogage détaillés
    console.log(`📊 getPlanningForMonth: ${data?.length || 0} entrées récupérées (count exact: ${count})`);
    
    if (data && data.length > 0) {
      // Analyser la répartition par jour
      const byDay = {};
      let texteLibreCount = 0;
      data.forEach(entry => {
        const day = parseInt(entry.date.split('-')[2], 10);
        byDay[day] = (byDay[day] || 0) + 1;
        if (entry.texte_libre) texteLibreCount++;
      });
      console.log('📊 Répartition par jour:', byDay);
      console.log(`📝 Entrées avec texte_libre: ${texteLibreCount}`);
      
      // Vérifier spécifiquement les jours 23-31
      const endMonthEntries = data.filter(entry => {
        const day = parseInt(entry.date.split('-')[2], 10);
        return day >= 23;
      });
      console.log(`📊 Entrées jours 23-31: ${endMonthEntries.length}`);
      
      // Vérifier si la limite a été atteinte
      if (data.length >= 2000) {
        console.warn('⚠️ ATTENTION: Limite de 2000 entrées atteinte! Certaines données peuvent manquer.');
      }
    }
    
    return data || [];
  }

  /**
   * Sauvegarde une entrée de planning avec support des notes, postes supplémentaires et texte libre
   * @version 2.5.0 - Support texte_libre
   * 
   * @param {string} agentId - ID de l'agent
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} serviceCode - Code du service (-, O, X, RP, LIBRE, etc.)
   * @param {string|null} posteCode - Code du poste pour les réserves (CRC, CCU, etc.)
   * @param {string|null} note - Note/commentaire associé à cette cellule
   * @param {string[]|null} postesSupplementaires - Liste des postes supplémentaires (italique)
   * @param {string|null} texteLibre - Texte libre personnalisé
   */
  async savePlanning(agentId, date, serviceCode, posteCode = null, note = null, postesSupplementaires = null, texteLibre = null) {
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
      // ✅ FIX v2.5.0: Sauvegarder texte_libre
      texte_libre: texteLibre || null,
      statut: 'actif',
      updated_at: new Date().toISOString()
    };

    console.log('💾 savePlanning data:', planningData);

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
  // CROISEMENTS DE SERVICES
  // ============================================

  /**
   * Crée un enregistrement de croisement de services entre deux agents
   * @param {Object} croisementData - Données du croisement
   * @param {string} croisementData.date - Date au format YYYY-MM-DD
   * @param {string} croisementData.agent_1_id - ID du premier agent
   * @param {string} croisementData.agent_2_id - ID du second agent
   * @param {string} croisementData.agent_1_original_service - Service original de l'agent 1
   * @param {string} croisementData.agent_1_original_poste - Poste original de l'agent 1
   * @param {string} croisementData.agent_2_original_service - Service original de l'agent 2
   * @param {string} croisementData.agent_2_original_poste - Poste original de l'agent 2
   * @param {string} croisementData.created_by - Email de l'utilisateur créateur
   * @returns {Promise<Object>} L'enregistrement créé
   */
  async createCroisement(croisementData) {
    console.log('🔄 Création croisement:', croisementData);

    const { data, error } = await supabase
      .from('croisements')
      .insert({
        date: croisementData.date,
        agent_1_id: croisementData.agent_1_id,
        agent_2_id: croisementData.agent_2_id,
        agent_1_original_service: croisementData.agent_1_original_service || null,
        agent_1_original_poste: croisementData.agent_1_original_poste || null,
        agent_2_original_service: croisementData.agent_2_original_service || null,
        agent_2_original_poste: croisementData.agent_2_original_poste || null,
        created_by: croisementData.created_by || null
      })
      .select();
    
    if (error) {
      console.error('❌ Erreur createCroisement:', error);
      throw error;
    }
    
    console.log('✅ Croisement créé:', data[0]);
    return data[0];
  }

  /**
   * Récupère l'historique des croisements pour une date donnée
   * @param {string} date - Date au format YYYY-MM-DD
   * @returns {Promise<Array>} Liste des croisements
   */
  async getCroisementsForDate(date) {
    const { data, error } = await supabase
      .from('croisements')
      .select(`
        *,
        agent_1:agents!croisements_agent_1_id_fkey(id, nom, prenom),
        agent_2:agents!croisements_agent_2_id_fkey(id, nom, prenom)
      `)
      .eq('date', date)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erreur getCroisementsForDate:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Récupère l'historique des croisements pour un agent sur une période
   * @param {string} agentId - ID de l'agent
   * @param {string} startDate - Date de début (YYYY-MM-DD)
   * @param {string} endDate - Date de fin (YYYY-MM-DD)
   * @returns {Promise<Array>} Liste des croisements
   */
  async getCroisementsForAgent(agentId, startDate, endDate) {
    const { data, error } = await supabase
      .from('croisements')
      .select(`
        *,
        agent_1:agents!croisements_agent_1_id_fkey(id, nom, prenom),
        agent_2:agents!croisements_agent_2_id_fkey(id, nom, prenom)
      `)
      .or(`agent_1_id.eq.${agentId},agent_2_id.eq.${agentId}`)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Erreur getCroisementsForAgent:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Supprime un croisement (pour annulation)
   * @param {string} croisementId - ID du croisement
   * @returns {Promise<boolean>}
   */
  async deleteCroisement(croisementId) {
    const { error } = await supabase
      .from('croisements')
      .delete()
      .eq('id', croisementId);
    
    if (error) {
      console.error('Erreur deleteCroisement:', error);
      throw error;
    }
    
    console.log('🗑️ Croisement supprimé:', croisementId);
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
