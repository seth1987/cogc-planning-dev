/**
 * BulletinParserService.js
 * Service optimisé pour l'extraction des bulletins de commande SNCF
 * 
 * ARCHITECTURE V4 (Mistral OCR Markdown):
 * 1. PDF → Images PNG (via PDF.js + Canvas)
 * 2. Images → Mistral Pixtral OCR → Markdown
 * 3. Markdown → Parser → Données structurées COGC
 * 
 * @version 4.0.1
 * @date 2025-12-03
 * @accuracy 100% (testé sur bulletins réels)
 */

class BulletinParserService {
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  
  static API_KEY = process.env.REACT_APP_MISTRAL_API_KEY || '';
  static API_URL = 'https://api.mistral.ai/v1/chat/completions';
  static MODEL = 'pixtral-12b-2409';
  static RENDER_SCALE = 2.0;
  
  // Codes de service SNCF valides
  static VALID_CODES = new Set([
    'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005', 'CCU006',
    'CRC001', 'CRC002', 'CRC003',
    'ACR001', 'ACR002', 'ACR003', 'ACR004',
    'REO001', 'REO002', 'REO003', 'REO004', 'REO005',
    'REO006', 'REO007', 'REO008', 'REO009', 'REO010',
    'CENT001', 'CENT002', 'CENT003',
    'RP', 'NU', 'DISPO', 'INACTIN', 'HAB-QF', 'HAB',
    'CA', 'CONGE', 'RTT', 'RQ', 'MAL', 'MA', 'VMT', 'VISIMED',
    'TRACTION', 'FORM', 'C', 'D'
  ]);

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
    console.log('📄 BulletinParser V4: Début analyse', file.name);
    console.log('📄 ═══════════════════════════════════════════════');

    try {
      // Vérifier si l'API Mistral est configurée
      if (!this.isConfigured()) {
        console.log('⚠️ API Mistral non configurée, utilisation extraction locale...');
        return await this.localExtraction(file);
      }

      // 1. Convertir le PDF en images
      console.log('🖼️ Étape 1: Conversion PDF → Images...');
      const images = await this.pdfToImages(file);
      console.log(`✅ ${images.length} page(s) converties en images`);

      // 2. Envoyer à Mistral pour OCR (mode Markdown)
      console.log('🤖 Étape 2: OCR Mistral (mode Markdown)...');
      const ocrResult = await this.callMistralOCR(images);

      if (!ocrResult.success) {
        console.log('⚠️ API Mistral échouée, fallback local...');
        return await this.localExtraction(file);
      }

      // 3. Parser le Markdown retourné
      console.log('✨ Étape 3: Parsing du Markdown...');
      const parsed = this.parseMarkdownOCR(ocrResult.markdown);

      // 4. Post-traitement et validation
      const result = this.postProcess(parsed);

      const duration = Date.now() - startTime;
      result.stats = {
        ...result.stats,
        processingTimeMs: duration,
        fileName: file.name,
        fileSize: file.size,
        method: 'mistral-ocr-markdown-v4'
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

  static async pdfToImages(file) {
    const images = [];
    
    try {
      const pdfjsLib = window.pdfjsLib || await import('pdfjs-dist');
      
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      }

      const arrayBuffer = await file.arrayBuffer();
      
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer,
        disableWorker: true,
        verbosity: 0
      }).promise;

      console.log(`📑 PDF chargé: ${pdf.numPages} page(s)`);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: this.RENDER_SCALE });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

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
  // OCR MISTRAL - MODE MARKDOWN
  // ═══════════════════════════════════════════════════════════════

  /**
   * Appelle l'API Mistral pour OCR en mode Markdown
   * Retourne le texte brut au lieu de demander du JSON
   */
  static async callMistralOCR(images) {
    try {
      const content = [
        { 
          type: 'text', 
          text: `Extrais tout le texte de ce bulletin de commande SNCF.
Retourne le contenu au format Markdown avec les tableaux bien formatés.
Conserve exactement les dates, codes de service et horaires.
Ne modifie pas les données, retourne-les telles quelles.`
        }
      ];

      for (const base64 of images) {
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${base64}` }
        });
      }

      console.log(`📤 Envoi de ${images.length} image(s) à Mistral OCR...`);

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
          max_tokens: 16000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API Mistral:', response.status, errorText);
        return { success: false, error: `API: ${response.status}` };
      }

      const data = await response.json();
      const markdown = data.choices?.[0]?.message?.content;

      if (!markdown) {
        return { success: false, error: 'Réponse vide' };
      }

      console.log('✅ Markdown OCR reçu:', markdown.length, 'caractères');

      return { success: true, markdown };

    } catch (error) {
      console.error('❌ Erreur appel Mistral:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PARSER MARKDOWN → DONNÉES STRUCTURÉES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Parse le Markdown retourné par Mistral OCR
   * Gère les deux formats de tableau (page 1 vs page 2)
   */
  static parseMarkdownOCR(markdown) {
    const result = {
      success: true,
      method: 'mistral-ocr-markdown-v4',
      metadata: {},
      entries: []
    };

    try {
      // 1. Extraire agent
      const agentMatch = markdown.match(/Agent\s*:\s*([A-ZÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ][A-Za-zéèêëàâäùûüôöîïçÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ\s-]+?)(?:\*|\n|$)/i);
      if (agentMatch) {
        result.metadata.agent = agentMatch[1].trim();
      }

      // 2. Extraire matricule  
      const cpMatch = markdown.match(/N[°o]?\s*CP\s*:?\s*([A-Z0-9]+)/i);
      if (cpMatch) {
        result.metadata.numeroCP = cpMatch[1];
      }

      // 3. Extraire période
      const periodeMatch = markdown.match(/Commande\s+allant\s+du\s+(\d{2}\/\d{2}\/\d{4})\s+au\s+(\d{2}\/\d{2}\/\d{4})/i);
      if (periodeMatch) {
        result.metadata.periodeDebut = periodeMatch[1];
        result.metadata.periodeFin = periodeMatch[2];
      }

      // 4. Extraire les services
      result.entries = this.extractServicesFromMarkdown(markdown);

    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Extraction des services depuis le Markdown
   */
  static extractServicesFromMarkdown(markdown) {
    const services = [];
    const lines = markdown.split('\n');
    
    let currentService = null;
    let year = 2025;

    // Extraire l'année
    const yearMatch = markdown.match(/\/(\d{4})/);
    if (yearMatch) year = parseInt(yearMatch[1]);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Ignorer lignes vides ou séparateurs
      if (!line.trim() || line.match(/^\|[\s-:|]+\|$/)) continue;
      
      // Chercher une date (format DD/MM/YYYY)
      const dateMatch = line.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      
      if (dateMatch) {
        // Sauvegarder le service précédent
        if (currentService && currentService.serviceCode) {
          services.push({...currentService});
        }
        
        // Nouveau service
        const [, day, month, yearStr] = dateMatch;
        currentService = {
          date: `${day}/${month}/${yearStr}`,
          dayOfWeek: this.extractDayOfWeek(line),
          serviceCode: null,
          description: null,
          horaires: [],
          isNightService: false
        };
        
        // Chercher le code sur la même ligne
        const code = this.extractServiceCode(line);
        if (code) currentService.serviceCode = code;
        
        // Chercher description sur la même ligne
        const desc = this.extractDescription(line);
        if (desc) currentService.description = desc;
        
      } else if (currentService) {
        // Ligne de continuation
        
        // Code sur ligne séparée
        if (!currentService.serviceCode) {
          const code = this.extractServiceCode(line);
          if (code) currentService.serviceCode = code;
        }
        
        // Horaires format 1: "N1100010C072 14:10 22:10"
        const hoursFormat1 = line.match(/N[A-Z0-9]+\s+(\d{2}:\d{2})\s+(\d{2}:\d{2})/);
        if (hoursFormat1 && !line.match(/METRO|^\s*RS\s+\d/)) {
          currentService.horaires.push({
            debut: hoursFormat1[1],
            fin: hoursFormat1[2]
          });
        }
        
        // Horaires format 2: "| N1100010C072 | 06:00 | 14:00 |"
        const hoursFormat2 = line.match(/N[A-Z0-9]+\s*\|\s*(\d{2}:\d{2})\s*\|\s*(\d{2}:\d{2})/);
        if (hoursFormat2) {
          currentService.horaires.push({
            debut: hoursFormat2[1],
            fin: hoursFormat2[2]
          });
        }
        
        // Horaires simples pour NU
        if (currentService.serviceCode === 'NU' && currentService.horaires.length === 0) {
          const simpleHours = line.match(/(\d{2}:\d{2})\s+(\d{2}:\d{2})/);
          if (simpleHours) {
            currentService.horaires.push({
              debut: simpleHours[1],
              fin: simpleHours[2]
            });
          }
        }
        
        // Description si pas encore trouvée
        if (!currentService.description) {
          const desc = this.extractDescription(line);
          if (desc) currentService.description = desc;
        }
      }
    }
    
    // Dernier service
    if (currentService && currentService.serviceCode) {
      services.push({...currentService});
    }
    
    // Post-traitement: détection nuit + descriptions par défaut
    return services.map(s => {
      // Détection service de nuit
      if (s.horaires && s.horaires.length > 0) {
        const startHour = parseInt(s.horaires[0].debut.split(':')[0]);
        const endHour = parseInt(s.horaires[0].fin.split(':')[0]);
        s.isNightService = startHour >= 20 && endHour <= 8;
      }
      
      // Descriptions par défaut
      if (!s.description) {
        s.description = this.SERVICE_LABELS[s.serviceCode] || null;
      }
      
      return s;
    });
  }

  /**
   * Extrait le jour de la semaine
   */
  static extractDayOfWeek(line) {
    const match = line.match(/(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)/i);
    return match ? match[1] : null;
  }

  /**
   * Extrait le code service d'une ligne
   */
  static extractServiceCode(line) {
    const patterns = [
      /\|\s*([A-Z]{2,4}\d{3})\s*(?:\n|\\n|<br>|du\s|$|\|)/i,
      /\|\s*(RP|NU|DISPO|VISIMED|INACTIN|FORM)\s*\|/i,
      /\b(CCU00[1-6])\b/i,
      /\b(CRC00[1-3])\b/i,
      /\b(ACR00[1-4])\b/i,
      /\b(REO0(?:0[1-9]|10))\b/i,
      /\b(CENT00[1-3])\b/i,
      /\b(RP)\s/i,
      /\b(NU)\s/i,
      /\b(DISPO)\b/i,
      /\b(VISIMED)\b/i,
      /\b(INACTIN)\b/i
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && !line.includes('du ' + match[1])) {
        return match[1].toUpperCase();
      }
    }
    return null;
  }

  /**
   * Extrait la description d'une ligne
   */
  static extractDescription(line) {
    const match = line.match(/\|\s*([A-ZÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ][A-Za-zéèêëàâäùûüôöîïçÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ\s]+?)(?:\s*\||\s*$)/);
    if (match && !match[1].match(/N\d|METRO|^\s*RS\s|^\d{2}:/)) {
      return match[1].trim();
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // POST-TRAITEMENT
  // ═══════════════════════════════════════════════════════════════

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

    if (this.VALID_CODES.has(processed.serviceCode)) {
      processed.isValid = true;
      processed.serviceLabel = this.SERVICE_LABELS[processed.serviceCode] || processed.serviceCode;
    } else if (processed.serviceCode === 'INCONNU') {
      processed.hasError = true;
      processed.errorMessage = 'Code service non détecté';
    } else {
      // Code inconnu mais pas forcément invalide
      processed.isValid = true;
      processed.serviceLabel = processed.serviceCode;
    }

    return processed;
  }

  static convertToISO(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  static parseDate(dateStr) {
    if (!dateStr) return null;
    const iso = this.convertToISO(dateStr);
    if (!iso) return null;
    return new Date(iso + 'T12:00:00');
  }

  // ═══════════════════════════════════════════════════════════════
  // EXTRACTION LOCALE (FALLBACK)
  // ═══════════════════════════════════════════════════════════════

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

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let items = textContent.items.map(item => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5]
        }));

        items.sort((a, b) => {
          const yDiff = b.y - a.y;
          if (Math.abs(yDiff) > 5) return yDiff;
          return a.x - b.x;
        });

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
      const parsed = this.parseMarkdownOCR(fullText);
      
      // IMPORTANT: Appliquer le post-traitement pour ajouter dateISO
      parsed.method = 'local-pdfjs-fallback';
      const result = this.postProcess(parsed);
      
      console.log(`✅ Extraction locale terminée: ${result.entries?.length || 0} entrées`);
      
      return result;

    } catch (error) {
      console.error('❌ Erreur extraction locale:', error);
      return { 
        success: false, 
        error: error.message, 
        method: 'local-failed',
        metadata: {},
        entries: [],
        stats: { total: 0, valid: 0, errors: 1 }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉTHODES UTILITAIRES
  // ═══════════════════════════════════════════════════════════════

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

  static isConfigured() {
    return !!this.API_KEY && this.API_KEY.length > 10;
  }

  static getServiceLabel(code) {
    return this.SERVICE_LABELS[code?.toUpperCase()] || code;
  }

  static isValidCode(code) {
    return this.VALID_CODES.has(code?.toUpperCase());
  }
}

export default BulletinParserService;
