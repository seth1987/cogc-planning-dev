/**
 * SimplePDFService.js - Service simplifié d'extraction PDF SNCF
 * Version: 1.0.0
 * 
 * Remplace les 1200 lignes de parsing regex par un appel direct
 * à l'API Mistral Vision avec demande de JSON structuré.
 */

// Clé API Mistral (déjà utilisée dans ton projet)
const MISTRAL_API_KEY = 'Kx84WAxDnne4YTTViVbWtPOedYLVHpo1';
const MISTRAL_ENDPOINT = 'https://api.mistral.ai/v1/chat/completions';

// Codes services SNCF valides
const VALID_SERVICE_CODES = [
  // Services opérationnels
  'ACR001', 'ACR002', 'ACR003',
  'CAC001', 'CAC002', 'CAC003',
  'CCU001', 'CCU002', 'CCU003', 'CCU004', 'CCU005', 'CCU006',
  'CENT001', 'CENT002', 'CENT003',
  'CRC001', 'CRC002', 'CRC003',
  'RC001', 'RC002', 'RC003',
  'RE001', 'RE002', 'RE003',
  'REO001', 'REO002', 'REO003', 'REO004', 'REO005', 'REO006', 'REO007', 'REO008',
  'RO001', 'RO002', 'RO003',
  'SOUF001', 'SOUF002', 'SOUF003',
  // Repos et absences
  'RP', 'RPP', 'RQ', 'NU', 'NP', 'DISPO', 'D', 'DN', 'DR',
  // Congés
  'C', 'CA', 'CONGE', 'RTT', 'RU', 'VT',
  // Inaction et formation
  'I', 'INACT', 'INACTIN', 'FO', 'FORM', 'HAB', 'HAB-QF',
  // Médical
  'MA', 'MAL', 'VM', 'VMT', 'VISIMED',
  // Autres
  'EAC', 'EIA', 'F', 'JF', 'PCD', 'VL',
  // Génériques
  '-', 'O', 'X'
];

/**
 * Convertit un fichier PDF en base64
 */
async function pdfToBase64(file) {
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
 * Prompt optimisé pour extraction directe en JSON
 */
const EXTRACTION_PROMPT = `Tu es un expert en extraction de données de bulletins de commande SNCF.

ANALYSE ce bulletin PDF et retourne UNIQUEMENT un objet JSON valide (pas de texte avant/après).

RÈGLES IMPORTANTES:
1. Extrais TOUTES les affectations de service (dates + codes)
2. IGNORE les lignes METRO, RS, TRACTION, N1100010CO72 (ce sont des trajets, pas des services)
3. Pour les services de NUIT (début ≥ 20h00), enregistre sur le LENDEMAIN
   Exemple: CCU003 le 24/04/2025 à 22:00-06:00 → enregistre le 25/04/2025
4. Codes valides: ${VALID_SERVICE_CODES.slice(0, 30).join(', ')}...

FORMAT JSON EXACT:
{
  "agent": {
    "nom": "NOM PRENOM",
    "numeroCP": "0000000X"
  },
  "periode": {
    "debut": "JJ/MM/AAAA",
    "fin": "JJ/MM/AAAA"
  },
  "services": [
    {
      "date": "JJ/MM/AAAA",
      "dateISO": "AAAA-MM-JJ",
      "code": "CODE_SERVICE",
      "description": "Description du service",
      "horaires": "HH:MM-HH:MM ou null",
      "estServiceNuit": false,
      "dateDorigine": "JJ/MM/AAAA ou null si pas décalé"
    }
  ]
}

Retourne UNIQUEMENT le JSON, sans markdown, sans explication.`;

/**
 * Extrait les données d'un PDF bulletin SNCF
 * @param {File} pdfFile - Le fichier PDF à analyser
 * @returns {Promise<Object>} Les données extraites
 */
export async function extractBulletinData(pdfFile) {
  console.log('📄 SimplePDFService: Début extraction', pdfFile.name);
  
  try {
    // 1. Convertir PDF en base64
    const base64Data = await pdfToBase64(pdfFile);
    console.log('✅ PDF converti en base64');
    
    // 2. Appel API Mistral Vision
    const response = await fetch(MISTRAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'pixtral-large-latest',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: EXTRACTION_PROMPT
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur API Mistral: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Réponse vide de l\'API');
    }

    // 3. Parser le JSON
    console.log('📥 Réponse brute:', content.substring(0, 200));
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Tenter d'extraire le JSON si entouré de texte
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Impossible de parser la réponse JSON');
      }
    }

    // 4. Valider et nettoyer les données
    const result = validateAndClean(parsed);
    
    console.log('✅ Extraction réussie:', {
      agent: result.agent?.nom,
      nbServices: result.services?.length
    });

    return {
      success: true,
      data: result,
      rawResponse: content
    };

  } catch (error) {
    console.error('❌ Erreur extraction:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Valide et nettoie les données extraites
 */
function validateAndClean(data) {
  const result = {
    agent: {
      nom: data.agent?.nom || 'INCONNU',
      numeroCP: data.agent?.numeroCP || ''
    },
    periode: {
      debut: data.periode?.debut || '',
      fin: data.periode?.fin || ''
    },
    services: []
  };

  if (Array.isArray(data.services)) {
    result.services = data.services
      .filter(s => s && s.code)
      .map(s => ({
        date: s.date || '',
        dateISO: s.dateISO || convertToISO(s.date),
        code: s.code?.toUpperCase() || '',
        description: s.description || '',
        horaires: s.horaires || null,
        estServiceNuit: s.estServiceNuit || false,
        dateDorigine: s.dateDorigine || null,
        // Flag de validation
        codeValide: VALID_SERVICE_CODES.includes(s.code?.toUpperCase())
      }));
  }

  return result;
}

/**
 * Convertit une date JJ/MM/AAAA en AAAA-MM-JJ
 */
function convertToISO(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

/**
 * Vérifie si l'API est configurée
 */
export function isAPIConfigured() {
  return !!MISTRAL_API_KEY;
}

/**
 * Retourne les codes valides pour référence
 */
export function getValidCodes() {
  return VALID_SERVICE_CODES;
}

export default {
  extractBulletinData,
  isAPIConfigured,
  getValidCodes
};
