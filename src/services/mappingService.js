// Service de gestion du mapping des codes SNCF
// Utilise la table codes_services pour convertir les codes bulletin
import { supabase } from '../lib/supabaseClient';

class MappingService {
  constructor() {
    this.mappingCache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Récupère le mapping depuis la base de données avec mise en cache
   */
  async getMappingFromDB() {
    // Vérifier le cache
    if (this.mappingCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      console.log('📝 Utilisation du cache mapping');
      return this.mappingCache;
    }

    console.log('🔄 Chargement du mapping depuis la BDD...');
    
    try {
      const { data, error } = await supabase
        .from('codes_services')
        .select('*')
        .order('code');

      if (error) throw error;

      // Créer un Map pour accès O(1)
      const mapping = new Map();
      
      data.forEach(item => {
        mapping.set(item.code.toUpperCase(), {
          service: item.service_code,
          poste: item.poste_code,
          description: item.description,
          original: item
        });
      });

      // Mettre en cache
      this.mappingCache = mapping;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      console.log(`✅ ${mapping.size} codes chargés depuis la BDD`);
      return mapping;
      
    } catch (error) {
      console.error('❌ Erreur chargement mapping:', error);
      // Fallback sur mapping minimal si BDD inaccessible
      return this.getFallbackMapping();
    }
  }

  /**
   * Mapping de secours si la BDD est inaccessible
   */
  getFallbackMapping() {
    console.warn('⚠️ Utilisation du mapping de secours');
    const fallback = new Map();
    
    // Codes essentiels uniquement
    const essentialCodes = [
      { code: 'CRC001', service: '-', poste: 'CRC' },
      { code: 'CRC002', service: 'O', poste: 'CRC' },
      { code: 'CRC003', service: 'X', poste: 'CRC' },
      { code: 'ACR001', service: '-', poste: 'ACR' },
      { code: 'ACR002', service: 'O', poste: 'ACR' },
      { code: 'ACR003', service: 'X', poste: 'ACR' },
      { code: 'CCU001', service: '-', poste: 'CCU' },
      { code: 'CCU002', service: 'O', poste: 'CCU' },
      { code: 'CCU003', service: 'X', poste: 'CCU' },
      { code: 'CCU004', service: '-', poste: 'RE' },
      { code: 'CCU005', service: 'O', poste: 'RE' },
      { code: 'CCU006', service: 'X', poste: 'RE' },
      { code: 'CENT001', service: '-', poste: 'RC' },
      { code: 'CENT002', service: 'O', poste: 'RC' },
      { code: 'CENT003', service: 'X', poste: 'RC' },
      { code: 'REO007', service: '-', poste: 'RO' },
      { code: 'REO008', service: 'O', poste: 'RO' },
      { code: 'SOUF001', service: '-', poste: 'SOUF' },
      { code: 'SOUF002', service: 'O', poste: 'SOUF' },
      { code: 'RP', service: 'RP', poste: null },
      { code: 'RPP', service: 'RP', poste: null },
      { code: 'C', service: 'C', poste: null },
      { code: 'NU', service: 'NU', poste: null },
      { code: 'D', service: 'D', poste: null },
      { code: 'DISPO', service: 'D', poste: null },
      { code: 'HAB', service: 'HAB', poste: null },
      { code: 'HAB-QF', service: 'HAB', poste: null },
      { code: 'I', service: 'I', poste: null },
      { code: 'INACTIN', service: 'I', poste: null },
      { code: 'VISIMED', service: 'I', poste: null },
      { code: 'VMT', service: 'I', poste: null }
    ];

    essentialCodes.forEach(item => {
      fallback.set(item.code, {
        service: item.service,
        poste: item.poste,
        description: `${item.code} - Fallback`
      });
    });

    return fallback;
  }

  /**
   * Convertit un code bulletin en service/poste
   */
  async getPosteFromCode(code) {
    if (!code) return null;
    
    const mapping = await this.getMappingFromDB();
    const upperCode = code.toUpperCase();
    
    const result = mapping.get(upperCode);
    
    if (result) {
      console.log(`✅ Mapping ${code} → Service: ${result.service}, Poste: ${result.poste || '-'}`);
      return {
        service: result.service,
        poste: result.poste,
        description: result.description
      };
    }
    
    console.warn(`⚠️ Pas de mapping pour ${code}`);
    return null;
  }

  /**
   * Convertit plusieurs codes en une fois (batch)
   */
  async getMultipleMappings(codes) {
    const mapping = await this.getMappingFromDB();
    const results = {};
    
    codes.forEach(code => {
      const upperCode = code.toUpperCase();
      results[code] = mapping.get(upperCode) || null;
    });
    
    return results;
  }

  /**
   * Invalide le cache (après une mise à jour par exemple)
   */
  invalidateCache() {
    this.mappingCache = null;
    this.cacheExpiry = null;
    console.log('🗑️ Cache mapping invalidé');
  }

  /**
   * Vérifie si un code existe dans le mapping
   */
  async codeExists(code) {
    const mapping = await this.getMappingFromDB();
    return mapping.has(code.toUpperCase());
  }

  /**
   * Récupère tous les codes pour un poste donné
   */
  async getCodesForPoste(poste) {
    const mapping = await this.getMappingFromDB();
    const codes = [];
    
    mapping.forEach((value, key) => {
      if (value.poste === poste) {
        codes.push({
          code: key,
          service: value.service,
          description: value.description
        });
      }
    });
    
    return codes;
  }

  /**
   * Récupère les statistiques du mapping
   */
  async getStats() {
    const mapping = await this.getMappingFromDB();
    
    const stats = {
      totalCodes: mapping.size,
      byPoste: {},
      byService: {},
      withoutPoste: 0
    };
    
    mapping.forEach(value => {
      // Par poste
      if (value.poste) {
        stats.byPoste[value.poste] = (stats.byPoste[value.poste] || 0) + 1;
      } else {
        stats.withoutPoste++;
      }
      
      // Par service
      stats.byService[value.service] = (stats.byService[value.service] || 0) + 1;
    });
    
    // Ajouter les champs attendus par l'interface
    stats.total = stats.totalCodes;
    stats.mapped = stats.totalCodes - stats.withoutPoste;
    
    return stats;
  }
}

// Export singleton
const mappingService = new MappingService();
export default mappingService;