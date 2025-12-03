/**
 * BulletinParserService.js
 * Service optimisé pour l'extraction des bulletins de commande SNCF
 * 
 * ARCHITECTURE:
 * 1. PDF → Images PNG (via PDF.js + Canvas)
 * 2. Images → Mistral Pixtral OCR
 * 3. JSON → Données structurées COGC
 * 
 * @version 3.0.0
 * @date 2025-12-03
 */

class BulletinParserService {
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  
  // Clé API Mistral (à déplacer en .env en production)
  static API_KEY = process.env.REACT_APP_MISTRAL_API_KEY || 'WKZ6fHhJ7wW5rUruSkLFiUuLVpwmXfxz';
  static API_URL = 'https://api.mistral.ai/v1/chat/completions';
  static MODEL = 'pixtral-12b-2409';
  
  // Résolution du rendu PDF (DPI)
  static RENDER_SCALE = 2.0; // 2x = ~150 DPI, bon compromis qualité/taille
  
  // Codes de service SNCF valides
  static VALID_CODES = new Set([
    // CCU (Centre Commande Unique)
    'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005', 'CCU006',
    // CRC (Coordonnateur Régional Circulation)
    'CRC001', 'CRC002', 'CRC003',
    // ACR (Aide Coordonnateur Régional)
    'ACR001', 'ACR002', 'ACR003', 'ACR004',
    // REO (Référent Équipe Opérationnelle)
    'REO001', 'REO002', 'REO003', 'REO004', 'REO005',
    'REO006', 'REO007', 'REO008', 'REO009', 'REO010',
    // CENT (Centre Souffleur)
    'CENT001', 'CENT002', 'CENT003',
    // Codes spéciaux
    'RP', 'NU', 'DISPO', 'INACTIN', 'HAB-QF', 'HAB',
    'CA', 'CONGE', 'RTT', 'RQ', 'MAL', 'MA', 'VMT', 'VISIMED',
    'TRACTION', 'FORM', 'C', 'D'
  ]);

  // Labels des services
  static SERVICE_LABELS = {
    'CCU001': 'CRC/CCU DENFERT (Matin)',
    'CCU002': 'CRC/CCU DENFERT (Après-midi)',
    'CCU003': 'CRC/CCU DENFERT (Nuit)',
    'CCU004': 'Régulateur Table PARC Denfert (Matin)',
    'CCU005': 'Régulateur Table PARC Denfert (Après-midi)',
    'CCU006': 'Régulateur Table PARC Denfert (Nuit)',
    'CRC001': 'Coordonnateur Régional Circulation (Matin)',
    'CRC002': 'Coordonnateur Régional Circulation (Après-midi)',
    'CRC003': 'Coordonnateur Régional Circulation (Nuit)',
    'ACR001': 'Aide Coordonnateur Régional (Matin)',
    'ACR002': 'Aide Coordonnateur Régional (Après-midi)',
    'ACR003': 'Aide Coordonnateur Régional (Nuit)',
    'ACR004': 'Aide Coordonnateur Régional',
    'CENT001': 'Centre Souffleur (Matin)',
    'CENT002': 'Centre Souffleur (Après-midi)',
    'CENT003': 'Centre Souffleur (Nuit)',
    'RP': 'Repos Périodique',
    'NU': 'Non Utilisé',
    'DISPO': 'Disponible',
    'INACTIN': 'Inactif/Formation',
    'HAB-QF': 'Formation/Perfectionnement',
    'HAB': 'Habilitation',
    'CA': 'Congé Annuel',
    'CONGE': 'Congé',
    'RTT': 'RTT',
    'RQ': 'Repos Qualifié',
    'MAL': 'Maladie',
    'MA': 'Maladie',
    'VMT': 'Visite Médicale',
    'VISIMED': 'Visite Médicale',
    'TRACTION': 'Formation Traction',
    'FORM': 'Formation',
    'C': 'Congé',
    'D': 'Disponible'
  };

  // ═══════════════════════════════════════════════════════════════
  // MÉTHODE PRINCIPALE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse un fichier PDF bulletin de commande SNCF
   * @param {File} file - Fichier PDF
   * @returns {Promise<Object>} Données structurées
   */
  static async parseBulletin(file) {
    const startTime = Date.now();
    console.log('📄 ═══════════════════════════════════════════════');
    console.log('📄 BulletinParser: Début analyse', file.name);
    console.log('📄 ═══════════════════════════════════════════════');

    try {
      // 1. Convertir le PDF en images
      console.log('🖼️ Étape 1: Conversion PDF → Images...');
      const images = await this.pdfToImages(file);
      console.log(`✅ ${images.length} page(s) converties en images`);

      // 2. Envoyer à Mistral pour OCR
      console.log('🤖 Étape 2: OCR avec Mistral Pixtral...');
      let ocrResult = await this.callMistralOCR(images);

      // 3. Si échec API, fallback sur extraction locale
      if (!ocrResult.success) {
        console.log('⚠️ API Mistral échouée, fallback local...');
        ocrResult = await this.localExtraction(file);
      }

      // 4. Post-traitement et validation
      console.log('✨ Étape 3: Post-traitement...');
      const result = this.postProcess(ocrResult);

      // Stats finales
      const duration = Date.now() - startTime;
      result.stats = {
        ...result.stats,
        processingTimeMs: duration,
        fileName: file.name,
        fileSize: file.size,
        method: ocrResult.method || 'mistral-pixtral'
      };

      console.log('📊 ═══════════════════════════════════════════════');
      console.log('📊 RÉSULTAT FINAL:');
      console.log(`   Agent: ${result.metadata?.agent || 'Non détecté'}`);
      console.log(`   Période: ${result.metadata?.periodeDebut} → ${result.metadata?.periodeFin}`);
      console.log(`   Entrées: ${result.entries?.length || 0} (${result.stats?.valid || 0} valides)`);
      console.log(`   Durée: ${duration}ms`);
      console.log('📊 ═══════════════════════════════════════════════');

      return result;

    } catch (error) {
      console.error('❌ Erreur BulletinParser:', error);
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
  // CONVERSION PDF → IMAGES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Convertit un PDF en images PNG base64
   * @param {File} file - Fichier PDF
   * @returns {Promise<string[]>} Array de base64 images
   */
  static async pdfToImages(file) {
    const images = [];
    
    try {
      // Charger PDF.js
      const pdfjsLib = window.pdfjsLib || await import('pdfjs-dist');
      
      // Désactiver le worker pour éviter les problèmes CORS
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }

      // Lire le fichier
      const arrayBuffer = await file.arrayBuffer();
      
      // Charger le PDF
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        disableWorker: true,
        verbosity: 0
      }).promise;

      console.log(`📑 PDF chargé: ${pdf.numPages} page(s)`);

      // Rendre chaque page en image
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        
        // Obtenir les dimensions
        const viewport = page.getViewport({ scale: this.RENDER_SCALE });
        
        // Créer un canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Rendre la page
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Convertir en PNG base64
        const imageData = canvas.toDataURL('image/png');
        const base64 = imageData.split(',')[1];
        images.push(base64);

        console.log(`   📄 Page ${pageNum}: ${canvas.width}x${canvas.height}px`);
      }

      return images;

    } catch (error) {
      console.error('❌ Erreur conversion PDF→Images:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OCR AVEC MISTRAL PIXTRAL
  // ═══════════════════════════════════════════════════════════════

  /**
   * Appelle l'API Mistral pour l'OCR
   * @param {string[]} images - Images base64
   * @returns {Promise<Object>} Résultat OCR
   */
  static async callMistralOCR(images) {
    try {
      // Construire le contenu avec toutes les images
      const content = [
        { type: 'text', text: this.createPrompt() }
      ];

      // Ajouter chaque image
      for (const base64 of images) {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${base64}` }
        });
      }

      console.log(`📤 Envoi de ${images.length} image(s) à Mistral...`);

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [{ role: 'user', content }],
          temperature: 0.1,
          max_tokens: 8000,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API Mistral:', response.status, errorText);
        return { success: false, error: `API: ${response.status}` };
      }

      const data = await response.json();
      const jsonContent = data.choices?.[0]?.message?.content;

      if (!jsonContent) {
        return { success: false, error: 'Réponse vide' };
      }

      console.log('✅ Réponse Mistral reçue');

      // Parser le JSON
      return this.parseOCRResponse(jsonContent);

    } catch (error) {
      console.error('❌ Erreur appel Mistral:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crée le prompt optimisé pour l'extraction SNCF
   */
  static createPrompt() {
    return `Tu es un expert en extraction de données pour les bulletins de commande SNCF (Société Nationale des Chemins de fer Français).

CONTEXTE: 
Ces bulletins sont des documents officiels listant les services affectés à un agent sur une période donnée.

STRUCTURE D'UN BULLETIN:
- En-tête: Agent, N° CP, UOP (unité opérationnelle)
- Période: "Commande allant du JJ/MM/AAAA au JJ/MM/AAAA"
- Entrées: Une date suivie du service et des horaires

POUR CHAQUE ENTRÉE DE SERVICE:
- La date est au format JJ/MM/AAAA
- Le jour de la semaine est indiqué (Lun, Mar, Mer, Jeu, Ven, Sam, Dim)
- Le code service est sur la ligne avec le jour (ex: "CCU004 Lun")
- Les horaires peuvent inclure METRO (trajet) et RS (pause)
- IGNORER les lignes METRO et RS, ce ne sont PAS des services

CODES DE SERVICE À IDENTIFIER:
- CCU001 à CCU006 : Centre Commande Unique (Denfert)
- CRC001 à CRC003 : Coordonnateur Régional Circulation
- ACR001 à ACR004 : Aide Coordonnateur Régional
- REO001 à REO010 : Référent Équipe Opérationnelle
- CENT001 à CENT003 : Centre Souffleur
- RP : Repos Périodique
- NU : Non Utilisé
- DISPO : Disponible
- INACTIN : Inactif/Formation
- HAB-QF, HAB : Formation/Habilitation
- CA, CONGE : Congé Annuel
- RTT, RQ : Repos compensateurs
- MAL, MA : Maladie
- TRACTION : Formation traction

SERVICES DE NUIT:
- Les services commençant après 21h (ex: 21:35 ou 22:00) sont des services de nuit
- Ils doivent être datés du JOUR DE DÉBUT, pas du lendemain
- Exemple: "24/04/2025 CCU003 22:00-06:00" → date = 24/04/2025

RETOURNE UNIQUEMENT UN JSON VALIDE (pas de markdown, pas de texte):
{
  "metadata": {
    "agent": "NOM PRENOM",
    "numeroCP": "XXXXXXXX",
    "dateEdition": "JJ/MM/AAAA",
    "periodeDebut": "JJ/MM/AAAA",
    "periodeFin": "JJ/MM/AAAA",
    "uop": "COGC PN"
  },
  "entries": [
    {
      "date": "JJ/MM/AAAA",
      "dayOfWeek": "Lun",
      "serviceCode": "CCU004",
      "description": "Régulateur Table PARC Denfert",
      "horaires": [
        {"debut": "06:00", "fin": "14:00"}
      ],
      "isNightService": false,
      "reference": "du CCU602"
    }
  ]
}

IMPORTANT:
- Extrais TOUTES les entrées de service du bulletin
- Ne confonds pas les références "du CCU602" avec le code service principal
- Les services avec 2 lignes d'horaires pour la même date sont 2 services distincts
- Retourne UNIQUEMENT le JSON, sans aucun texte avant ou après`;
  }

  /**
   * Parse la réponse JSON de Mistral
   */
  static parseOCRResponse(jsonString) {
    try {
      // Nettoyer le JSON (enlever markdown si présent)
      let cleanJson = jsonString
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\s*\n/gm, '')
        .trim();

      const data = JSON.parse(cleanJson);

      return {
        success: true,
        method: 'mistral-pixtral',
        metadata: data.metadata || {},
        entries: data.entries || []
      };

    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      console.log('JSON reçu:', jsonString.substring(0, 500));
      return { success: false, error: `JSON invalide: ${error.message}` };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXTRACTION LOCALE (FALLBACK)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Extraction locale en cas d'échec de l'API
   */
  static async localExtraction(file) {
    console.log('📝 Extraction locale avec PDF.js...');

    try {
      const pdfjsLib = window.pdfjsLib || await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        disableWorker: true
      }).promise;

      let fullText = '';

      // Extraire le texte de chaque page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Reconstruire le texte en respectant les positions Y
        let items = textContent.items.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5]
        }));

        // Trier par Y décroissant puis X croissant
        items.sort((a, b) => {
          const yDiff = b.y - a.y;
          if (Math.abs(yDiff) > 5) return yDiff;
          return a.x - b.x;
        });

        // Reconstruire avec détection de nouvelles lignes
        let lastY = null;
        let pageText = '';
        
        for (const item of items) {
          if (lastY !== null && Math.abs(item.y - lastY) > 8) {
            pageText += '\n';
          } else if (lastY !== null && item.x > 50) {
            pageText += ' ';
          }
          pageText += item.text;
          lastY = item.y;
        }
        
        fullText += pageText + '\n\n';
      }

      // Parser le texte extrait
      return this.parseTextLocally(fullText);

    } catch (error) {
      console.error('❌ Erreur extraction locale:', error);
      return { success: false, error: error.message, method: 'local-failed' };
    }
  }

  /**
   * Parse le texte extrait localement
   */
  static parseTextLocally(text) {
    const result = {
      success: true,
      method: 'local-pdfjs',
      metadata: {},
      entries: []
    };

    // Extraire métadonnées
    const agentMatch = text.match(/(?:Agent\s*:?\s*)?COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ][A-ZÀÂÄÉÈÊËÏÔÙÛÜÇ\s]+)/i);
    if (agentMatch) {
      result.metadata.agent = agentMatch[1].trim();
    }

    const cpMatch = text.match(/N[°o]?\s*CP\s*:?\s*([A-Z0-9]+)/i);
    if (cpMatch) {
      result.metadata.numeroCP = cpMatch[1];
    }

    const periodeMatch = text.match(/Commande\s+allant\s+du\s+(\d{2}\/\d{2}\/\d{4})\s+au\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (periodeMatch) {
      result.metadata.periodeDebut = periodeMatch[1];
      result.metadata.periodeFin = periodeMatch[2];
    }

    // Trouver toutes les dates de service
    const lines = text.split('\n');
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const jourRegex = /(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)/i;
    
    let currentEntry = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const dateMatch = line.match(dateRegex);
      
      if (dateMatch) {
        // Sauvegarder l'entrée précédente
        if (currentEntry && currentEntry.serviceCode) {
          result.entries.push(currentEntry);
        }

        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];

        currentEntry = {
          date: `${day}/${month}/${year}`,
          dayOfWeek: null,
          serviceCode: null,
          description: null,
          horaires: [],
          isNightService: false
        };

        // Chercher le jour
        const jourMatch = line.match(jourRegex);
        if (jourMatch) {
          currentEntry.dayOfWeek = jourMatch[1];
        }

        // Chercher le code service sur cette ligne ou les suivantes
        const codePatterns = [
          /\b(CCU00[1-6])\b/i,
          /\b(CRC00[1-3])\b/i,
          /\b(ACR00[1-4])\b/i,
          /\b(REO0(?:0[1-9]|10))\b/i,
          /\b(CENT00[1-3])\b/i,
          /\b(DISPO)\b/i,
          /\b(INACTIN)\b/i,
          /\b(HAB-QF)\b/i,
          /\b(RP)\s/i,
          /\b(NU)\s/i,
          /\b(CA)\b/i,
          /\b(CONGE)\b/i
        ];

        // Chercher dans les 3 lignes suivantes
        for (let j = i; j < Math.min(i + 4, lines.length); j++) {
          const searchLine = lines[j];
          for (const pattern of codePatterns) {
            const match = searchLine.match(pattern);
            if (match && !searchLine.includes('du ' + match[1])) {
              currentEntry.serviceCode = match[1].toUpperCase();
              break;
            }
          }
          if (currentEntry.serviceCode) break;
        }

      } else if (currentEntry) {
        // Chercher les horaires
        const horaireMatch = line.match(/(\d{2}:\d{2})\s+(\d{2}:\d{2})/);
        if (horaireMatch && !line.toUpperCase().includes('METRO') && !line.toUpperCase().includes(' RS ')) {
          currentEntry.horaires.push({
            debut: horaireMatch[1],
            fin: horaireMatch[2]
          });
          
          // Détecter service de nuit
          const heureDebut = parseInt(horaireMatch[1].split(':')[0]);
          if (heureDebut >= 21) {
            currentEntry.isNightService = true;
          }
        }

        // Chercher code service si pas encore trouvé
        if (!currentEntry.serviceCode) {
          for (const pattern of [/\b(CCU00[1-6])\b/i, /\b(CRC00[1-3])\b/i, /\b(ACR00[1-4])\b/i]) {
            const match = line.match(pattern);
            if (match && !line.includes('du ' + match[1])) {
              currentEntry.serviceCode = match[1].toUpperCase();
              break;
            }
          }
        }
      }
    }

    // Ne pas oublier la dernière entrée
    if (currentEntry && currentEntry.serviceCode) {
      result.entries.push(currentEntry);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // POST-TRAITEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Post-traitement et validation des données
   */
  static postProcess(rawResult) {
    const result = {
      success: rawResult.success,
      method: rawResult.method,
      metadata: rawResult.metadata || {},
      entries: [],
      stats: { total: 0, valid: 0, errors: 0, warnings: [] }
    };

    if (!rawResult.entries || !Array.isArray(rawResult.entries)) {
      result.stats.errors = 1;
      result.stats.warnings.push('Aucune entrée trouvée');
      return result;
    }

    // Traiter chaque entrée
    for (const entry of rawResult.entries) {
      const processed = this.processEntry(entry);
      result.entries.push(processed);
      
      result.stats.total++;
      if (processed.isValid) {
        result.stats.valid++;
      } else {
        result.stats.errors++;
      }
    }

    // Trier par date
    result.entries.sort((a, b) => {
      const dateA = this.parseDate(a.date);
      const dateB = this.parseDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateA - dateB;
    });

    return result;
  }

  /**
   * Traite une entrée individuelle
   */
  static processEntry(entry) {
    const processed = {
      date: entry.date,
      dateISO: this.convertToISO(entry.date),
      dayOfWeek: entry.dayOfWeek || null,
      serviceCode: entry.serviceCode?.toUpperCase() || 'INCONNU',
      serviceLabel: null,
      description: entry.description || null,
      horaires: entry.horaires || [],
      isNightService: entry.isNightService || false,
      reference: entry.reference || null,
      isValid: false,
      hasError: false,
      errorMessage: null
    };

    // Valider le code service
    if (this.VALID_CODES.has(processed.serviceCode)) {
      processed.isValid = true;
      processed.serviceLabel = this.SERVICE_LABELS[processed.serviceCode] || processed.serviceCode;
    } else if (processed.serviceCode === 'INCONNU') {
      processed.hasError = true;
      processed.errorMessage = 'Code service non détecté';
    } else {
      processed.hasError = true;
      processed.errorMessage = `Code inconnu: ${processed.serviceCode}`;
    }

    return processed;
  }

  /**
   * Convertit une date FR en ISO
   */
  static convertToISO(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  /**
   * Parse une date en objet Date
   */
  static parseDate(dateStr) {
    if (!dateStr) return null;
    const iso = this.convertToISO(dateStr);
    if (!iso) return null;
    return new Date(iso + 'T12:00:00');
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTHODES UTILITAIRES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Teste la connexion à l'API Mistral
   */
  static async testAPIConnection() {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10
        })
      });

      return {
        connected: response.ok,
        status: response.status,
        model: this.MODEL
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Vérifie si l'API est configurée
   */
  static isConfigured() {
    return !!this.API_KEY && this.API_KEY.length > 10;
  }

  /**
   * Obtient le label d'un code service
   */
  static getServiceLabel(code) {
    return this.SERVICE_LABELS[code?.toUpperCase()] || code;
  }

  /**
   * Vérifie si un code est valide
   */
  static isValidCode(code) {
    return this.VALID_CODES.has(code?.toUpperCase());
  }
}

export default BulletinParserService;
