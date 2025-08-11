// Service de parsing et extraction de PDF avec Mistral API
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
  }

  /**
   * Convertit un PDF en images via pdf.js
   */
  async pdfToImages(file) {
    try {
      // Charger pdf.js dynamiquement
      const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      
      if (!pdfjsLib) {
        throw new Error('PDF.js non disponible. Veuillez recharger la page.');
      }

      // Convertir le fichier en ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Charger le PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const images = [];
      const numPages = Math.min(pdf.numPages, 3); // Limiter à 3 pages max
      
      console.log(`📄 PDF chargé: ${numPages} pages`);
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Haute résolution
        
        // Créer un canvas pour rendre la page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Rendre la page PDF sur le canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convertir le canvas en base64
        const imageData = canvas.toDataURL('image/png');
        images.push(imageData);
        
        console.log(`✅ Page ${pageNum} convertie en image`);
      }
      
      return images;
    } catch (error) {
      console.error('Erreur conversion PDF:', error);
      throw new Error('Impossible de convertir le PDF en image. Assurez-vous que le fichier est un PDF valide.');
    }
  }

  /**
   * Parse le PDF avec Mistral API
   */
  async parseWithMistralOCR(file, apiKey) {
    if (!apiKey || apiKey === 'sk-proj-default-key' || apiKey.length < 10) {
      throw new Error('Clé API Mistral requise. Veuillez configurer votre clé API dans les variables d\'environnement.');
    }

    try {
      console.log('🔍 Conversion du PDF en images...');
      
      // Convertir le PDF en images
      const images = await this.pdfToImages(file);
      
      if (!images || images.length === 0) {
        throw new Error('Aucune image extraite du PDF');
      }
      
      console.log(`🔍 Démarrage OCR avec Mistral API sur ${images.length} page(s)...`);
      
      // Utiliser la première page pour l'extraction
      const imageData = images[0];
      
      // Prompt optimisé pour Mistral
      const prompt = `Analyse cette image d'un bulletin de commande SNCF.

EXTRACTION REQUISE:
1. Trouve l'agent : cherche "COGC PN" suivi du NOM et PRÉNOM
2. Identifie le mois et l'année du planning (souvent en haut du document)
3. Pour chaque jour du mois (colonnes 1 à 31), extrais le code de service

CODES POSSIBLES À DÉTECTER:
- Codes numériques seuls : 001, 002, 003, 004, 005, 006, 007, 008, 009, 010
- Codes avec préfixe : CRC001, ACR002, CCU003, CENT004, SOUF005, REO006, RC007, RE008, RO009, CAC010
- Codes spéciaux : RH, RP, CA, C, HAB, MA, NU, D, VMT, VISIMED, INACTIN

RETOURNE UN JSON STRUCTURÉ:
{
  "agent": {"nom": "NOM_EN_MAJUSCULES", "prenom": "Prenom"},
  "mois": "nom_du_mois_en_français",
  "annee": "2025",
  "planning": [
    {"jour": 1, "code": "001"},
    {"jour": 2, "code": "RH"},
    {"jour": 3, "code": "002"}
  ]
}

IMPORTANT:
- Retourne UNIQUEMENT le JSON, sans texte avant ou après
- N'invente pas de données, extrais seulement ce qui est visible
- Si un jour est vide, ne l'inclus pas dans le planning
- Garde les codes EXACTEMENT comme ils apparaissent (001 reste 001, CRC001 reste CRC001)`;

      // Appel à l'API Mistral avec pixtral-12b-2409
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2409', // Modèle correct pour l'OCR
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: imageData // Image PNG en base64
                }
              ]
            }
          ],
          temperature: 0,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Erreur Mistral:', error);
        throw new Error(`Erreur API Mistral: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Réponse Mistral reçue');
      
      // Extraire le contenu de la réponse
      const ocrContent = data.choices[0].message.content;
      
      // Log pour debug
      console.log('📄 Réponse OCR brute:', ocrContent);
      
      // Extraire le JSON de la réponse
      const jsonMatch = ocrContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[0]);
          return await this.formatExtractedData(parsedData);
        } catch (parseError) {
          console.error('JSON invalide, tentative de parsing manuel...');
        }
      }
      
      // Si pas de JSON valide, parser manuellement
      return await this.parseOCRContent(ocrContent);
      
    } catch (err) {
      console.error('Erreur Mistral OCR:', err);
      
      if (err.message?.includes('401')) {
        throw new Error('Clé API Mistral invalide. Vérifiez votre configuration.');
      } else if (err.message?.includes('429')) {
        throw new Error('Limite de requêtes Mistral atteinte. Réessayez plus tard.');
      } else {
        throw new Error(`Erreur OCR: ${err.message || 'Erreur inconnue'}`);
      }
    }
  }

  /**
   * Formater les données extraites du JSON
   */
  async formatExtractedData(data) {
    const result = {
      agent: { 
        nom: data.agent?.nom || '', 
        prenom: data.agent?.prenom || '' 
      },
      planning: []
    };

    console.log('👤 Agent extrait:', result.agent.nom, result.agent.prenom);

    // Obtenir le mois et l'année
    const mois = data.mois || new Date().toLocaleString('fr-FR', { month: 'long' });
    const annee = data.annee || new Date().getFullYear();
    
    // Convertir le nom du mois en numéro
    const moisMap = {
      'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
    };
    
    const moisNum = moisMap[mois.toLowerCase()] || String(new Date().getMonth() + 1).padStart(2, '0');

    // Traiter le planning
    if (data.planning && Array.isArray(data.planning)) {
      for (const entry of data.planning) {
        if (entry.jour && entry.code) {
          const jour = String(entry.jour).padStart(2, '0');
          const formattedDate = `${annee}-${moisNum}-${jour}`;
          const code = String(entry.code).trim().toUpperCase();
          
          console.log(`📅 Date: ${formattedDate}, Code: ${code}`);
          
          // Mapper le code avec le service de mapping
          const mapping = await mappingService.getPosteFromCode(code);
          
          if (mapping) {
            let targetDate = formattedDate;
            
            // IMPORTANT : Décaler les services de nuit au jour suivant
            if (mapping.service === 'X') {
              const currentDate = new Date(formattedDate + 'T12:00:00');
              currentDate.setDate(currentDate.getDate() + 1);
              targetDate = currentDate.toISOString().split('T')[0];
              console.log(`🌙 Service de nuit détecté, décalage au ${targetDate}`);
            }
            
            result.planning.push({
              date: targetDate,
              service_code: mapping.service,
              poste_code: mapping.poste,
              original_code: code,
              description: mapping.description
            });
          } else if (this.isSpecialCode(code)) {
            // Codes spéciaux sans mapping
            result.planning.push({
              date: formattedDate,
              service_code: code,
              poste_code: null,
              original_code: code,
              description: this.getSpecialCodeDescription(code)
            });
          } else {
            console.log(`⚠️ Code non reconnu: ${code}`);
          }
        }
      }
    }

    // Trier par date
    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`✅ Extraction terminée: ${result.planning.length} entrées trouvées`);
    
    return result;
  }

  /**
   * Parse le contenu OCR extrait par Mistral (méthode de secours)
   */
  async parseOCRContent(ocrContent) {
    const result = {
      agent: { nom: '', prenom: '' },
      planning: []
    };

    if (!ocrContent) {
      throw new Error('Aucun contenu extrait du PDF');
    }

    console.log('📄 Parsing manuel du contenu OCR...');

    // Extraction du nom de l'agent
    const agentPatterns = [
      /COGC\s+PN\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i,
      /Agent\s*:\s*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒ\-]+)/i
    ];

    for (const pattern of agentPatterns) {
      const match = ocrContent.match(pattern);
      if (match) {
        result.agent.nom = match[1];
        result.agent.prenom = match[2];
        console.log('👤 Agent détecté:', result.agent.nom, result.agent.prenom);
        break;
      }
    }

    // Détecter le mois et l'année
    const yearMatch = ocrContent.match(/20\d{2}/);
    const defaultYear = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
    
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    let defaultMonth = new Date().getMonth() + 1;
    
    for (let i = 0; i < monthNames.length; i++) {
      if (ocrContent.toLowerCase().includes(monthNames[i])) {
        defaultMonth = i + 1;
        console.log(`📅 Mois détecté: ${monthNames[i]}`);
        break;
      }
    }

    // Patterns pour extraire dates et codes
    const patterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*:?\s*([A-Z0-9]+)/gi,
      /(\d{1,2})[\/\-](\d{1,2})\s*:?\s*([A-Z0-9]+)/gi,
      /jour\s+(\d{1,2})\s*:?\s*([A-Z0-9]+)/gi,
      /^(\d{1,2})\s*:?\s*([A-Z0-9]+)/gim
    ];

    const lines = ocrContent.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;

      for (const pattern of patterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          let day, code;
          
          if (match.length === 5) {
            [, day, , , code] = match;
          } else if (match.length === 4) {
            [, day, , code] = match;
          } else if (match.length === 3) {
            [, day, code] = match;
          }

          if (day && code && parseInt(day) >= 1 && parseInt(day) <= 31) {
            const formattedDate = `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            code = code.trim().toUpperCase();
            
            if (this.isValidCode(code)) {
              console.log(`📅 Date: ${formattedDate}, Code: ${code}`);
              
              const mapping = await mappingService.getPosteFromCode(code);
              
              if (mapping) {
                let targetDate = formattedDate;
                
                // Décaler les services de nuit
                if (mapping.service === 'X') {
                  const currentDate = new Date(formattedDate + 'T12:00:00');
                  currentDate.setDate(currentDate.getDate() + 1);
                  targetDate = currentDate.toISOString().split('T')[0];
                }
                
                result.planning.push({
                  date: targetDate,
                  service_code: mapping.service,
                  poste_code: mapping.poste,
                  original_code: code,
                  description: mapping.description
                });
              } else if (this.isSpecialCode(code)) {
                result.planning.push({
                  date: formattedDate,
                  service_code: code,
                  poste_code: null,
                  original_code: code,
                  description: this.getSpecialCodeDescription(code)
                });
              }
            }
          }
        }
      }
    }

    result.planning.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log(`✅ Extraction terminée: ${result.planning.length} entrées trouvées`);
    
    return result;
  }

  /**
   * Vérifie si un code est valide
   */
  isValidCode(code) {
    // Code service avec numéros
    if (/^(CRC|ACR|CCU|CENT|SOUF|REO|RC|RE|RO|CAC)\d{3}$/i.test(code)) return true;
    // Code numérique seul (001-010)
    if (/^0(0[1-9]|10)$/.test(code)) return true;
    // Code spécial
    if (this.isSpecialCode(code)) return true;
    return false;
  }

  /**
   * Vérifie si c'est un code spécial
   */
  isSpecialCode(code) {
    const specialCodes = ['RH', 'RP', 'RPP', 'CA', 'C', 'D', 'HAB', 'MA', 'I', 'NU', 'INACTIN', 'VISIMED', 'VMT'];
    return specialCodes.includes(code.toUpperCase());
  }

  /**
   * Obtient la description d'un code spécial
   */
  getSpecialCodeDescription(code) {
    const descriptions = {
      'RH': 'RH',
      'RP': 'Repos périodique',
      'RPP': 'Repos périodique prolongé',
      'CA': 'Congé annuel',
      'C': 'Congé',
      'D': 'Disponible',
      'HAB': 'Formation/Habilitation',
      'MA': 'Maladie',
      'I': 'Indisponible',
      'NU': 'Non utilisé',
      'INACTIN': 'Inactivité',
      'VISIMED': 'Visite médicale',
      'VMT': 'Visite médicale'
    };
    
    return descriptions[code] || code;
  }

  /**
   * Valide les données parsées
   */
  validateParsedData(data) {
    const errors = [];
    const warnings = [];

    if (!data.agent || !data.agent.nom || !data.agent.prenom) {
      warnings.push('Agent non détecté dans le document');
    }

    if (!data.planning || data.planning.length === 0) {
      errors.push('Aucune entrée de planning trouvée dans le PDF');
    }

    const dateCounts = {};
    data.planning.forEach(entry => {
      const key = `${entry.date}_${entry.service_code}_${entry.poste_code}`;
      dateCounts[key] = (dateCounts[key] || 0) + 1;
    });

    const duplicates = Object.entries(dateCounts)
      .filter(([key, count]) => count > 1)
      .map(([key]) => key);

    if (duplicates.length > 0) {
      warnings.push(`Doublons détectés: ${duplicates.join(', ')}`);
    }

    if (data.planning && data.planning.length > 0) {
      const dates = data.planning.map(e => new Date(e.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const daysDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 45) {
        warnings.push('Période de planning supérieure à 45 jours');
      }
    }

    return { 
      isValid: errors.length === 0, 
      errors, 
      warnings 
    };
  }

  /**
   * Méthode principale
   */
  async parsePDF(file, apiKey) {
    if (!apiKey || apiKey === 'sk-proj-default-key' || apiKey.length < 10) {
      throw new Error('Module PDF désactivé : Clé API Mistral requise. Configurez REACT_APP_MISTRAL_API_KEY dans vos variables d\'environnement.');
    }
    
    return await this.parseWithMistralOCR(file, apiKey);
  }
}

export default new PDFParserService();