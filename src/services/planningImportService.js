// Service d'import du planning dans la base de données
import { supabase } from '../lib/supabaseClient';

class PlanningImportService {
  constructor() {
    this.lastImportReport = null;
  }

  /**
   * Recherche un agent dans la base de données
   */
  async findAgent(nom, prenom) {
    console.log('🔍 Recherche agent:', nom, prenom);
    
    try {
      // Recherche insensible à la casse
      const { data: agents, error } = await supabase
        .from('agents')
        .select('id, nom, prenom, statut, site')
        .ilike('nom', nom)
        .ilike('prenom', prenom)
        .single();

      if (error || !agents) {
        // Essai avec variations de casse
        const { data: agentsAlt, error: errorAlt } = await supabase
          .from('agents')
          .select('id, nom, prenom, statut, site')
          .or(`nom.ilike.${nom.toLowerCase()},nom.ilike.${nom.toUpperCase()}`)
          .or(`prenom.ilike.${prenom.toLowerCase()},prenom.ilike.${prenom.toUpperCase()}`)
          .single();
        
        if (!errorAlt && agentsAlt) {
          console.log('✅ Agent trouvé (variante):', agentsAlt);
          return agentsAlt;
        }
        
        throw new Error(`Agent ${nom} ${prenom} non trouvé`);
      }

      console.log('✅ Agent trouvé:', agents);
      return agents;
      
    } catch (error) {
      console.error('❌ Erreur recherche agent:', error);
      throw error;
    }
  }

  /**
   * Importe les données du planning dans la base
   */
  async importPlanning(parsedData) {
    const report = {
      agent: null,
      entriesProcessed: 0,
      entriesInserted: 0,
      entriesUpdated: 0,
      entriesSkipped: 0,
      errors: [],
      warnings: [],
      dateRange: { min: null, max: null }
    };

    try {
      // 1. Trouver l'agent
      const agent = await this.findAgent(
        parsedData.agent.nom,
        parsedData.agent.prenom
      );
      report.agent = agent;

      // 2. Regrouper les entrées par date et garder seulement la dernière
      const entriesByDate = this.consolidateEntriesByDate(parsedData.planning);
      
      // 3. Déterminer la plage de dates
      const dates = Object.keys(entriesByDate).sort();
      if (dates.length > 0) {
        report.dateRange.min = dates[0];
        report.dateRange.max = dates[dates.length - 1];
      }

      // 4. Traiter chaque date avec UPSERT
      for (const [date, entry] of Object.entries(entriesByDate)) {
        try {
          const result = await this.upsertPlanningEntry(
            agent.id,
            date,
            entry
          );
          
          report.entriesProcessed++;
          if (result.inserted) report.entriesInserted++;
          if (result.updated) report.entriesUpdated++;
          if (result.skipped) report.entriesSkipped++;
          
          if (result.warning) {
            report.warnings.push(result.warning);
          }
          
        } catch (error) {
          report.errors.push({
            date: date,
            error: error.message
          });
        }
      }

      // 5. Enregistrer l'upload dans l'historique
      await this.recordUpload(agent, parsedData, report);

      this.lastImportReport = report;
      return {
        success: report.errors.length === 0,
        ...report
      };
      
    } catch (error) {
      report.errors.push({
        global: true,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Consolide les entrées par date (garde seulement la dernière)
   */
  consolidateEntriesByDate(planning) {
    const consolidated = {};
    
    planning.forEach(entry => {
      // S'il y a plusieurs entrées pour la même date, on garde la dernière
      // ou on peut implémenter une logique pour combiner service et poste
      consolidated[entry.date] = entry;
    });
    
    return consolidated;
  }

  /**
   * Effectue un UPSERT pour une entrée de planning
   */
  async upsertPlanningEntry(agentId, date, entry) {
    const result = {
      inserted: false,
      updated: false,
      skipped: false,
      warning: null
    };

    try {
      // 1. Vérifier si une entrée existe déjà
      const { data: existing, error: fetchError } = await supabase
        .from('planning')
        .select('id, service_code, poste_code')
        .eq('agent_id', agentId)
        .eq('date', date)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = pas de résultat trouvé, ce qui est OK
        throw new Error(`Erreur vérification existant: ${fetchError.message}`);
      }

      const planningData = {
        agent_id: agentId,
        date: date,
        service_code: entry.service_code,
        poste_code: entry.poste_code,
        statut: 'actif',
        commentaire: null
      };

      if (existing) {
        // Mise à jour de l'entrée existante
        const { error: updateError } = await supabase
          .from('planning')
          .update({
            service_code: entry.service_code,
            poste_code: entry.poste_code,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          throw new Error(`Erreur mise à jour: ${updateError.message}`);
        }

        result.updated = true;
        
        // Avertir si on écrase des données différentes
        if (existing.service_code !== entry.service_code || 
            existing.poste_code !== entry.poste_code) {
          result.warning = `[${date}] Écrasement: ${existing.service_code}/${existing.poste_code} → ${entry.service_code}/${entry.poste_code}`;
        }
      } else {
        // Insertion d'une nouvelle entrée
        const { error: insertError } = await supabase
          .from('planning')
          .insert(planningData);

        if (insertError) {
          throw new Error(`Erreur insertion: ${insertError.message}`);
        }

        result.inserted = true;
      }

      return result;
      
    } catch (error) {
      console.error(`❌ Erreur UPSERT pour ${date}:`, error);
      throw error;
    }
  }

  /**
   * Enregistre l'upload dans l'historique
   */
  async recordUpload(agent, parsedData, report) {
    try {
      const { error } = await supabase
        .from('uploads_pdf')
        .insert({
          agent_id: agent.id,
          fichier_nom: `Import_${new Date().toISOString()}`,
          agent_nom: `${agent.nom} ${agent.prenom}`,
          services_count: report.entriesInserted + report.entriesUpdated,
          metadata: {
            agent: {
              id: agent.id,
              nom: agent.nom,
              prenom: agent.prenom,
              statut: agent.statut,
              site: agent.site
            },
            import_report: report,
            date_range: report.dateRange,
            parsing_mode: parsedData.parsing_mode || 'manual',
            original_entries: parsedData.planning.length,
            import_date: new Date().toISOString()
          },
          statut_extraction: 'traite',
          commande_a_temps: true
        });

      if (error) {
        console.error('Erreur enregistrement upload:', error);
        report.warnings.push('Upload non enregistré dans l\'historique');
      }
      
    } catch (error) {
      console.error('Erreur enregistrement upload:', error);
      report.warnings.push('Upload non enregistré dans l\'historique');
    }
  }

  /**
   * Valide les données avant import
   */
  validateBeforeImport(parsedData) {
    const errors = [];
    const warnings = [];

    // Vérifier l'agent
    if (!parsedData.agent?.nom || !parsedData.agent?.prenom) {
      errors.push('Agent manquant ou incomplet');
    }

    // Vérifier le planning
    if (!parsedData.planning || parsedData.planning.length === 0) {
      errors.push('Aucune donnée de planning à importer');
    }

    // Vérifier les dates
    const invalidDates = parsedData.planning.filter(entry => {
      const date = new Date(entry.date);
      return isNaN(date.getTime());
    });

    if (invalidDates.length > 0) {
      errors.push(`${invalidDates.length} dates invalides détectées`);
    }

    // Vérifier les codes service
    const invalidCodes = parsedData.planning.filter(entry => 
      !entry.service_code
    );

    if (invalidCodes.length > 0) {
      warnings.push(`${invalidCodes.length} entrées sans code service`);
    }

    // Détecter les doublons par date
    const dateCount = {};
    parsedData.planning.forEach(entry => {
      dateCount[entry.date] = (dateCount[entry.date] || 0) + 1;
    });
    
    const duplicateDates = Object.entries(dateCount)
      .filter(([date, count]) => count > 1)
      .map(([date, count]) => `${date} (${count} entrées)`);

    if (duplicateDates.length > 0) {
      warnings.push(`Dates avec plusieurs entrées: ${duplicateDates.join(', ')}`);
      warnings.push('⚠️ Une seule entrée par date sera conservée');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Récupère le dernier rapport d'import
   */
  getLastImportReport() {
    return this.lastImportReport;
  }

  /**
   * Annule le dernier import (rollback)
   */
  async rollbackLastImport() {
    if (!this.lastImportReport?.agent?.id) {
      throw new Error('Aucun import récent à annuler');
    }

    const { dateRange, agent } = this.lastImportReport;
    
    try {
      // Supprimer les entrées de la plage de dates
      const { error } = await supabase
        .from('planning')
        .delete()
        .eq('agent_id', agent.id)
        .gte('date', dateRange.min)
        .lte('date', dateRange.max);

      if (error) throw error;

      console.log('✅ Import annulé avec succès');
      this.lastImportReport = null;
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur annulation:', error);
      throw error;
    }
  }
}

// Export singleton
const planningImportService = new PlanningImportService();
export default planningImportService;
