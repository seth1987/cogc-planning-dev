// Service de parsing et extraction de PDF avec Mistral API
import mappingService from './mappingService';

class PDFParserService {
  constructor() {
    this.mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
  }

  /**
   * Convertit un fichier en base64
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Retourner l'URL data complète pour Mistral
        resolve(reader.result);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Parse le PDF avec Mistral API (sans SDK)
   */
  async parseWithMistralOCR(file, apiKey) {
    if (!apiKey) {
      throw new Error('Clé API Mistral requise pour l\'OCR');
    }

    try {
      console.log('🔍 Démarrage OCR avec Mistral API...');
      
      // Convertir le fichier en base64 data URL
      const dataUrl = await this.fileToBase64(file);
      
      // Appel à l'API Mistral via fetch
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'pixtral-12b-2024-09-04',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extrais tout le texte de ce document PDF, notamment :
                  - Le nom et prénom de l'agent (format: COGC PN NOM PRENOM)
                  - Toutes les dates (format JJ/MM/AAAA)
                  - Tous les codes de service (CRC001, ACR002, etc.)
                  - Les codes spéciaux (RP, C, HAB, MA, etc.)
                  - Présente le résultat en format markdown structuré
                  - Conserve EXACTEMENT les codes tels qu'ils apparaissent`
                },
                {
                  type: 'image_url',
                  image_url: dataUrl
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 8000
        })
      });

      if (!response.ok) {
        // Si pixtral échoue, essayer avec mistral-large
        if (response.status === 404 || response.status === 400) {
          console.log('⚠️ Modèle pixtral non disponible, tentative avec mistral-large...');
          return await this.parseWithMistralLarge(file, apiKey);
        }
        
        const error = await response.text();
        throw new Error(`Erreur API Mistral: ${response.status} - ${error}`);
      }

      const data = await response.json();
      console.log('✅ OCR terminé, parsing des résultats...');
      
      // Extraire le contenu de la réponse
      const ocrContent = data.choices[0].message.content;
      
      // Parser les résultats OCR
      return await this.parseOCRContent(ocrContent);
      
    } catch (err) {
      console.error('Erreur Mistral OCR:', err);
      
      // Gestion des erreurs spécifiques
      if (err.message?.includes('401')) {
        throw new Error('Clé API Mistral invalide. Vérifiez votre configuration.');
      } else if (err.message?.includes('429')) {
        throw new Error('Limite de requêtes Mistral atteinte. Réessayez plus tard.');
      } else if (err.message?.includes('413')) {
        throw new Error('Fichier PDF trop volumineux (max 50MB)');
      } else {
        throw new Error(`Erreur OCR: ${err.message || 'Erreur inconnue'}`);
      }
    }
  }

  /**
   * Fallback: Parse avec Mistral Large si pixtral n'est pas disponible
   */
  async parseWithMistralLarge(file, apiKey) {
    try {
      console.log('🔄 Utilisation de mistral-large-latest comme fallback...');
      
      // Pour mistral-large, on doit extraire le texte différemment
      // car il ne supporte pas les images directement
      const dataUrl = await this.fileToBase64(file);
      
      // Utiliser mistral-large avec une approche différente
      const response = await fetch(this.mistralApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: 'Tu es un système OCR spécialisé dans l\'extraction de données de bulletins de commande SNCF. Extrais EXACTEMENT le texte tel qu\'il apparaît, sans interprétation.'
            },
            {
              role: 'user',
              content: `Je vais te donner le contenu d'un bulletin de commande SNCF. Analyse et extrais :
              1. Le nom et prénom de l'agent (format: COGC PN NOM PRENOM)
              2. Toutes les dates au