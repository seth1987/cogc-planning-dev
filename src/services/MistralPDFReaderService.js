/**
 * MistralPDFReaderService.js
 * Service de lecture de PDF SNCF utilisant l'API Mistral OCR
 * Optimisé pour les bulletins de commande COGC Paris Nord
 * 
 * @version 2.0.1
 * @date 2025-12-04
 */

class MistralPDFReaderService {
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION API MISTRAL
  // ═══════════════════════════════════════════════════════════════
  
  static MISTRAL_API_KEY = 'Kx84WAxDnne4YTTViVbWtPOedYLVHpo1';
  
  // Endpoints API Mistral
  static ENDPOINTS = {
    OCR: 'https://api.mistral.ai/v1/ocr',           // Nouvelle API OCR dédiée
    CHAT: 'https://api.mistral.ai/v1/chat/completions'  // Fallback Vision
  };
  
  // Modèles disponibles
  static MODELS = {
    OCR: 'mistral-ocr-latest',      // Modèle OCR dédié (recommandé)
    VISION: 'pixtral-12b-2409'      // Modèle Vision (fallback)
  };

  // ═══════════════════════════════════════════════════════════════
  // CODES SERVICES SNCF VALIDES
  // ═══════════════════════════════════════════════════════════════
  
  static VALID_SERVICE_CODES = new Set([
    // Centre Commande Unique (CCU)
    'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005',
    // Coordonnateur Régional Circulation (CRC)
    'CRC001', 'CRC002',
    // Aide Coordonnateur Régional (ACR)
    'ACR001', 'ACR002', 'ACR003',
    // Référent Équipe Opérationnelle (REO)
    'REO001', 'REO002',
    // Centre Souffleur (CENT)
    'CENT001', 'CENT002', 'CENT003',
    // Codes spéciaux
    'RP', 'NU', 'DISPO', 'INACTIN', 'HAB-QF', 
    'CA', 'CONGE', 'RTT', 'RQ', 'FORM', 'MAL'
  ]);

  // Labels descriptifs des services
  static SERVICE_LABELS = {
    'CCU001': 'CRC/CCU DENFERT',
    'CCU002': 'CRC/CCU DENFERT',
    'CCU003': 'CRC/CCU DENFERT',
    'CCU004': 'Régulateur Table PARC Denfert',
    'CCU005': 'Régulateur Table PARC Denfert',
    'CRC001': 'Coordonnateur Régional Circulation',
    'CRC002': 'Coordonnateur Régional Circulation',
    'ACR001': 'Aide Coordonnateur Régional',
    'ACR002': 'Aide Coordonnateur Régional',
    'ACR003': 'Aide Coordonnateur Régional',
    'REO001': 'Référent Équipe Opérationnelle',
    'REO002': 'Référent Équipe Opérationnelle',
    'CENT001': 'Centre Souffleur',
    'CENT002': 'Centre Souffleur',
    'CENT003': 'Centre Souffleur',
    'RP': 'Repos Périodique',
    'NU': 'Non Utilisé',
    'DISPO': 'Disponible',
    'INACTIN': 'Inactif/Formation',
    'HAB-QF': 'Formation/Perfectionnement',
    'CA': 'Congé Annuel',
    'CONGE': 'Congé Annuel',
    'RTT': 'Réduction Temps Travail',
    'RQ': 'Repos Qualifié',
    'FORM': 'Formation',
    'MAL': 'Maladie'
  };

  // Éléments à ignorer (non-services)
  static IGNORE_PATTERNS = ['METRO', 'RS', 'TRACTION', 'du CCU', 'du CRC'];

  // ═══════════════════════════════════════════════════════════════
  // MÉTHODE PRINCIPALE - LECTURE PDF
  // ═══════════════════════════════════════════════════════════════

  /**
   * Lit et extrait les données d'un fichier PDF SNCF
   * @param {File} file - Fichier PDF à analyser
   * @returns {Promise<Object>} Données structurées extraites
   */
  static async readPDF(file) {
    const startTime = Date.now();
    console.log('📄 MistralPDFReader: Début lecture PDF', file.name);

    try {
      // 1. Convertir le fichier en base64
      const base64Data = await this.fileToBase64(file);
      console.log('✅ Conversion base64 réussie:', Math.round(base64Data.length / 1024), 'KB');

      // 2. Essayer d'abord l'API OCR dédiée
      let result = await this.processWithOCR(base64Data);
      
      // 3. Si échec, fallback sur Vision
      if (!result.success) {
        console.log('⚠️ OCR échoué, tentative avec Vision Pixtral...');
        result = await this.processWithVision(base64Data);
      }

      // 4. Calculer les statistiques
      const processingTime = Date.now() - startTime;
      result.stats = {
        ...result.stats,
        processingTimeMs: processingTime,
        fileName: file.name,
        fileSize: file.size
      };

      console.log(`✅ Extraction terminée en ${processingTime}ms:`, result.stats);
      return result;

    } catch (error) {
      console.error('❌ Erreur lecture PDF:', error);
      return {
        success: false,
        error: error.message,
        metadata: {},
        entries: [],
        stats: { total: 0, valid: 0, errors: 1 }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // API OCR DÉDIÉE (RECOMMANDÉE)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Traite le PDF avec la nouvelle API OCR Mistral
   * @param {string} base64Data - PDF encodé en base64
   * @returns {Promise<Object>} Résultat de l'extraction
   */
  static async processWithOCR(base64Data) {
    console.log('🔍 Traitement avec API OCR (mistral-ocr-latest)...');

    try {
      const response = await fetch(this.ENDPOINTS.OCR, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: this.MODELS.OCR,
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${base64Data}`
          },
          include_image_base64: false  // Pas besoin des images pour les bulletins texte
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API OCR:', response.status, errorText);
        return { success: false, error: `API OCR: ${response.status}` };
      }

      const ocrResult = await response.json();
      console.log('✅ Réponse OCR reçue:', ocrResult.pages?.length, 'page(s)');

      // Extraire le markdown de toutes les pages
      let fullMarkdown = '';
      if (ocrResult.pages) {
        for (const page of ocrResult.pages) {
          if (page.markdown) {
            fullMarkdown += page.markdown + '\n\n';
          }
        }
      }

      // Parser le markdown pour extraire les données SNCF
      return this.parseMarkdownToSNCF(fullMarkdown, 'mistral-ocr-latest');

    } catch (error) {
      console.error('❌ Erreur processWithOCR:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FALLBACK VISION (PIXTRAL)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Traite le PDF avec l'API Vision comme fallback
   * @param {string} base64Data - PDF encodé en base64
   * @returns {Promise<Object>} Résultat de l'extraction
   */
  static async processWithVision(base64Data) {
    console.log('🔍 Traitement avec Vision Pixtral (fallback)...');

    const prompt = this.createExtractionPrompt();

    try {
      const response = await fetch(this.ENDPOINTS.CHAT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: this.MODELS.VISION,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { url: `data:application/pdf;base64,${base64Data}` }
              }
            ]
          }],
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API Vision:', response.status, errorText);
        return { success: false, error: `API Vision: ${response.status}` };
      }

      const visionResult = await response.json();
      const content = visionResult.choices?.[0]?.message?.content;

      if (!content) {
        return { success: false, error: 'Réponse Vision vide' };
      }

      // Parser directement le JSON retourné
      return this.parseVisionResponse(content);

    } catch (error) {
      console.error('❌ Erreur processWithVision:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSING DU MARKDOWN OCR
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse le markdown OCR pour extraire les données SNCF structurées
   * @param {string} markdown - Texte markdown retourné par l'OCR
   * @param {string} method - Méthode utilisée
   * @returns {Object} Données structurées
   */
  static parseMarkdownToSNCF(markdown, method) {
    console.log('📊 Parsing du markdown...');

    const result = {
      success: true,
      method: method,
      metadata: {},
      entries: [],
      stats: { total: 0, valid: 0, errors: 0 }
    };

    try {
      // 1. Extraire les métadonnées agent
      result.metadata = this.extractAgentMetadata(markdown);

      // 2. Extraire les entrées de planning
      result.entries = this.extractPlanningEntries(markdown);

      // 3. Calculer les stats
      result.stats.total = result.entries.length;
      result.stats.valid = result.entries.filter(e => e.isValid).length;
      result.stats.errors = result.entries.filter(e => e.hasError).length;

      console.log('✅ Parsing terminé:', result.stats);
      return result;

    } catch (error) {
      console.error('❌ Erreur parsing:', error);
      result.success = false;
      result.error = error.message;
      return result;
    }
  }

  /**
   * Extrait les métadonnées de l'agent depuis le texte
   */
  static extractAgentMetadata(text) {
    const metadata = {
      agent: null,
      numeroCP: null,
      dateEdition: null,
      periodeDebut: null,
      periodeFin: null
    };

    // Nom de l'agent
    const agentPatterns = [
      /Agent\s*:?\s*\n?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ\s]+)/i,
      /COGC\s+PN\s*\n?\s*([A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ\s]+)/i
    ];
    
    for (const pattern of agentPatterns) {
      const match = text.match(pattern);
      if (match) {
        metadata.agent = match[1].trim();
        break;
      }
    }

    // Numéro CP
    const cpMatch = text.match(/N°\s*CP\s*:?\s*([A-Z0-9]+)/i);
    if (cpMatch) {
      metadata.numeroCP = cpMatch[1];
    }

    // Date d'édition
    const editionMatch = text.match(/Edition\s+le\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (editionMatch) {
      metadata.dateEdition = editionMatch[1];
    }

    // Période de commande
    const periodeMatch = text.match(/Commande\s+allant\s+du\s+(\d{2}\/\d{2}\/\d{4})\s+au\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (periodeMatch) {
      metadata.periodeDebut = periodeMatch[1];
      metadata.periodeFin = periodeMatch[2];
    }

    console.log('📋 Métadonnées extraites:', metadata);
    return metadata;
  }

  /**
   * Extrait toutes les entrées de planning depuis le texte
   */
  static extractPlanningEntries(text) {
    const entries = [];
    
    // Pattern pour détecter une ligne de date avec service
    // Format: JJ/MM/AAAA ... CODE_SERVICE Jour
    const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
    const lines = text.split('\n');
    
    let currentEntry = null;
    let currentDate = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Chercher une date
      const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      
      if (dateMatch) {
        // Sauvegarder l'entrée précédente si elle existe
        if (currentEntry) {
          entries.push(currentEntry);
        }

        const day = dateMatch[1];
        const month = dateMatch[2];
        const year = dateMatch[3];
        currentDate = `${year}-${month}-${day}`;
        const dateDisplay = `${day}/${month}/${year}`;

        // Chercher le jour de la semaine
        const dayMatch = line.match(/(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)/i);
        const dayOfWeek = dayMatch ? dayMatch[1] : null;

        // Chercher le code service sur cette ligne ou la suivante
        let serviceCode = this.findServiceCode(line);
        if (!serviceCode && i + 1 < lines.length) {
          serviceCode = this.findServiceCode(lines[i + 1]);
        }

        // Chercher les horaires
        const horaires = this.extractHoraires(line);
        
        // Vérifier si c'est un service de nuit
        const isNightService = this.isNightService(horaires);

        currentEntry = {
          date: currentDate,
          dateDisplay: dateDisplay,
          dayOfWeek: dayOfWeek,
          serviceCode: serviceCode || 'INCONNU',
          serviceLabel: this.SERVICE_LABELS[serviceCode] || serviceCode || 'À vérifier',
          horaires: horaires,
          isNightService: isNightService,
          isValid: serviceCode ? this.VALID_SERVICE_CODES.has(serviceCode) : false,
          hasError: !serviceCode,
          rawText: line
        };

      } else if (currentEntry) {
        // Ligne de continuation - chercher des infos supplémentaires
        
        // Chercher un code service si pas encore trouvé
        if (currentEntry.serviceCode === 'INCONNU') {
          const serviceCode = this.findServiceCode(line);
          if (serviceCode) {
            currentEntry.serviceCode = serviceCode;
            currentEntry.serviceLabel = this.SERVICE_LABELS[serviceCode] || serviceCode;
            currentEntry.isValid = this.VALID_SERVICE_CODES.has(serviceCode);
            currentEntry.hasError = false;
          }
        }

        // Chercher des horaires supplémentaires
        const additionalHoraires = this.extractHoraires(line);
        if (additionalHoraires.length > 0) {
          currentEntry.horaires = [...currentEntry.horaires, ...additionalHoraires];
          currentEntry.isNightService = this.isNightService(currentEntry.horaires);
        }

        // Ajouter le texte brut
        currentEntry.rawText += ' ' + line;
      }
    }

    // Ne pas oublier la dernière entrée
    if (currentEntry) {
      entries.push(currentEntry);
    }

    // Post-traitement : nettoyer les entrées
    return entries.map(entry => this.cleanEntry(entry));
  }

  /**
   * Cherche un code service dans une ligne de texte
   */
  static findServiceCode(line) {
    // Pattern pour les codes services structurés
    const codePatterns = [
      /\b(CCU00[1-5])\b/i,
      /\b(CRC00[1-2])\b/i,
      /\b(ACR00[1-3])\b/i,
      /\b(REO00[1-2])\b/i,
      /\b(CENT00[1-3])\b/i,
      /\b(RP)\b(?!\s*:)/,
      /\b(NU)\b(?!\s*:)/,
      /\b(DISPO)\b/i,
      /\b(INACTIN)\b/i,
      /\b(HAB-QF)\b/i,
      /\b(CA)\b(?=\s|$)/,
      /\b(CONGE)\b/i,
      /\b(RTT)\b/,
      /\b(RQ)\b/,
      /\b(FORM)\b/i,
      /\b(MAL)\b/i
    ];

    for (const pattern of codePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    // Vérifier les descriptions de service
    if (/Repos\s+périodique/i.test(line)) return 'RP';
    if (/Non\s+Utilisé|Utilisable\s+non\s+utilisé/i.test(line)) return 'NU';
    if (/Disponible/i.test(line)) return 'DISPO';
    if (/Inactif|Formation/i.test(line) && !/HAB/i.test(line)) return 'INACTIN';

    return null;
  }

  /**
   * Extrait les horaires d'une ligne
   */
  static extractHoraires(line) {
    const horaires = [];
    const timePattern = /(\d{2}:\d{2})\s+(\d{2}:\d{2})/g;
    let match;

    while ((match = timePattern.exec(line)) !== null) {
      // Vérifier que ce n'est pas un horaire METRO ou RS (à ignorer)
      const context = line.substring(Math.max(0, match.index - 20), match.index);
      const isIgnored = this.IGNORE_PATTERNS.some(p => context.includes(p));

      if (!isIgnored) {
        horaires.push({
          debut: match[1],
          fin: match[2]
        });
      }
    }

    return horaires;
  }

  /**
   * Détermine si c'est un service de nuit
   */
  static isNightService(horaires) {
    if (!horaires || horaires.length === 0) return false;
    
    for (const h of horaires) {
      const debut = parseInt(h.debut.split(':')[0]);
      const fin = parseInt(h.fin.split(':')[0]);
      
      // Service de nuit si début après 20h ou fin avant 8h avec début après-midi
      if (debut >= 20 || (debut > 12 && fin < 8)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Nettoie et valide une entrée
   */
  static cleanEntry(entry) {
    // Supprimer le texte brut pour alléger
    delete entry.rawText;

    // S'assurer que le code est en majuscules
    if (entry.serviceCode) {
      entry.serviceCode = entry.serviceCode.toUpperCase();
    }

    // Mettre à jour la validation
    entry.isValid = this.VALID_SERVICE_CODES.has(entry.serviceCode);

    return entry;
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSING RÉPONSE VISION (JSON)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse la réponse JSON de l'API Vision
   */
  static parseVisionResponse(jsonString) {
    try {
      // Nettoyer le JSON si nécessaire
      let cleanJson = jsonString
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const data = JSON.parse(cleanJson);

      const result = {
        success: true,
        method: 'pixtral-12b-2409',
        metadata: data.metadata || {},
        entries: [],
        stats: { total: 0, valid: 0, errors: 0 }
      };

      // Traiter les entrées
      if (data.entries && Array.isArray(data.entries)) {
        result.entries = data.entries.map(entry => {
          const serviceCode = entry.serviceCode?.toUpperCase();
          return {
            date: this.convertDateToISO(entry.date),
            dateDisplay: entry.date,
            dayOfWeek: entry.dayOfWeek,
            serviceCode: serviceCode || 'INCONNU',
            serviceLabel: this.SERVICE_LABELS[serviceCode] || entry.serviceLabel || serviceCode,
            horaires: entry.horaires || [],
            isNightService: this.isNightService(entry.horaires),
            isValid: this.VALID_SERVICE_CODES.has(serviceCode),
            hasError: !serviceCode
          };
        });
      }

      result.stats.total = result.entries.length;
      result.stats.valid = result.entries.filter(e => e.isValid).length;
      result.stats.errors = result.entries.filter(e => e.hasError).length;

      return result;

    } catch (error) {
      console.error('❌ Erreur parsing JSON Vision:', error);
      return {
        success: false,
        error: `Parsing JSON: ${error.message}`,
        method: 'pixtral-12b-2409',
        metadata: {},
        entries: [],
        stats: { total: 0, valid: 0, errors: 1 }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Convertit un fichier en base64
   */
  static async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convertit une date FR (JJ/MM/AAAA) en ISO (AAAA-MM-JJ)
   */
  static convertDateToISO(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  /**
   * Crée le prompt optimisé pour l'extraction via Vision
   */
  static createExtractionPrompt() {
    return `Tu es un expert en extraction de données pour les bulletins de commande SNCF.

INSTRUCTIONS CRITIQUES :
1. Extrais TOUTES les informations du bulletin
2. Retourne UNIQUEMENT un JSON valide, sans texte autour
3. Ignore les lignes METRO et RS (ce ne sont pas des services)

CODES DE SERVICE VALIDES :
- CCU001-005 : Centre Commande Unique Denfert
- CRC001-002 : Coordonnateur Régional Circulation
- ACR001-003 : Aide Coordonnateur Régional
- REO001-002 : Référent Équipe Opérationnelle
- CENT001-003 : Centre Souffleur
- RP : Repos Périodique
- NU : Non Utilisé
- DISPO : Disponible
- INACTIN : Inactif/Formation
- CA/CONGE : Congé Annuel

FORMAT JSON ATTENDU :
{
  "metadata": {
    "agent": "NOM PRENOM",
    "numeroCP": "XXXXXXXX",
    "periodeDebut": "JJ/MM/AAAA",
    "periodeFin": "JJ/MM/AAAA"
  },
  "entries": [
    {
      "date": "JJ/MM/AAAA",
      "dayOfWeek": "Lun",
      "serviceCode": "CCU003",
      "serviceLabel": "Description",
      "horaires": [
        {"debut": "HH:MM", "fin": "HH:MM"}
      ]
    }
  ]
}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTHODE DE TEST
  // ═══════════════════════════════════════════════════════════════

  /**
   * Teste le service avec un fichier
   * @param {File} file - Fichier PDF à tester
   */
  static async testExtraction(file) {
    console.log('🧪 Test d\'extraction Mistral PDF Reader');
    console.log('═'.repeat(50));
    
    const result = await this.readPDF(file);
    
    console.log('\n📊 RÉSULTAT:');
    console.log('Succès:', result.success);
    console.log('Méthode:', result.method);
    console.log('Agent:', result.metadata?.agent);
    console.log('Période:', result.metadata?.periodeDebut, '-', result.metadata?.periodeFin);
    console.log('\n📅 ENTRÉES:');
    
    result.entries.forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.dateDisplay} (${entry.dayOfWeek}) - ${entry.serviceCode} ${entry.isValid ? '✅' : '❌'}`);
    });
    
    console.log('\n📈 STATS:', result.stats);
    console.log('═'.repeat(50));
    
    return result;
  }
}

export default MistralPDFReaderService;
