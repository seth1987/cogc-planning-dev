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

      // 2. Regrouper les entrées par date pour gérer les doublons
      const entriesByDate = this.groupEntriesByDate(parsedData.planning);
      
      // 3. Déterminer la plage de dates
      const dates = Object.keys(entriesByDate).sort();
      if (dates.length > 0) {
        report.dateRange.min = dates[0];
        report.dateRange.max = dates[dates.length - 1];
      }

      // 4. Traiter chaque date
      for (const [date, entries] of Object.entries(entriesByDate)) {
        try {
          const result = await this.processDateEntries(
            agent.id,
            date,
            entries
          );
          
          report.entriesProcessed += result.processed;
          report.entriesInserted += result.inserted;
          report.entriesUpdated += result.updated;
          report.entriesSkipped += result.skipped;
          
          if (result.warnings.length > 0) {
            report.warnings.push(...result.warnings);
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
      return report;
      
    } catch (error) {
      report.errors.push({
        global: true,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Regroupe les entrées par date
   */
  groupEntriesByDate(planning) {
    const grouped = {};
    
    planning.forEach(entry => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = [];
      }
      
      // Éviter les doublons exacts
      const exists = grouped[entry.date].some(e => 
        e.service_code === entry.service_code && 
        e.poste_code === entry.poste_code
      );
      
      if (!exists) {
        grouped[entry.date].push(entry);
      }
    });
    
    return grouped;
  }

  /**
   * Traite les entrées pour une date donnée
   */
  async processDateEntries(agentId, date, entries) {
    const result = {
      processed: entries.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      warnings: []
    };

    // 1. Récupérer les entrées existantes
    const { data: existing, error: fetchError } = await supabase
      .from('planning')
      .select('id, service_code, poste_code')
      .eq('agent_id', agentId)
      .eq('date', date);

    if (fetchError) {
      throw new Error(`Erreur récupération planning: ${fetchError.message}`);
    }

    // 2. Déterminer les opérations à effectuer
    const toInsert = [];
    const toUpdate = [];
    
    for (const entry of entries) {
      const existingEntry = existing?.find(e => 
        e.service_code === entry.service_code && 
        e.poste_code === entry.poste_code
      );

      if (existingEntry) {
        // Entrée existe déjà, skip
        result.skipped++;
        result.warnings.push(`${date}: ${entry.service_code}/${entry.poste_code} existe déjà`);
      } else {
        // Nouvelle entrée à insérer
        toInsert.push({
          agent_id: agentId,
          date: date,
          service_code: entry.service_code,
          poste_code: entry.poste_code,
          statut: 'actif',
          commentaire: entry.original_code ? `Import PDF: ${entry.original_code}` : null
        });
      }
    }

    // 3. Supprimer les anciennes entrées qui ne sont plus présentes
    const entriesToDelete = existing?.filter(e => 
      !entries.some(entry => 
        entry.service_code === e.service_code && 
        entry.poste_code === e.poste_code
      )
    ) || [];

    if (entriesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('planning')
        .delete()
        .in('id', entriesToDelete.map(e => e.id));

      if (deleteError) {
        throw new Error(`Erreur suppression: ${deleteError.message}`);
      }
      
      result.updated += entriesToDelete.length;
    }

    // 4. Insérer les nouvelles entrées
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('planning')
        .insert(toInsert);

      if (insertError) {
        throw new Error(`Erreur insertion: ${insertError.message}`);
      }
      
      result.inserted += toInsert.length;
    }

    return result;
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
          services_count: report.entriesInserted,
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

    // Détecter les doublons
    const seen = new Set();
    const duplicates = [];
    
    parsedData.planning.forEach(entry => {
      const key = `${entry.date}_${entry.service_code}_${entry.poste_code || ''}`;
      if (seen.has(key)) {
        duplicates.push(key);
      }
      seen.add(key);
    });

    if (duplicates.length > 0) {
      warnings.push(`${duplicates.length} doublons détectés`);
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
export default new PlanningImportService();
