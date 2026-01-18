/**
 * SimplePDFService.js - Service simplifié d'extraction PDF SNCF
 * Version: 2.0.0
 * 
 * CORRIGÉ: Utilise l'API OCR de Mistral (qui accepte les PDF)
 * puis structure en JSON via Chat.
 * 
 * Approche en 2 étapes:
 * 1. OCR (/v1/ocr) avec mistral-ocr-latest → Extrait le texte/markdown
 * 2. Chat avec response_format: json_object → Structure en JSON
 */

// Clé API Mistral via variables d'environnement
const MISTRAL_API_KEY = process.env.REACT_APP_MISTRAL_API_KEY;

// Endpoints API Mistral
const ENDPOINTS = {
  OCR: 'https://api.mistral.ai/v1/ocr',
  CHAT: 'https://api.mistral.ai/v1/chat/completions'
};

// Modèles
const MODELS = {
  OCR: 'mistral-ocr-latest',
  CHAT: 'mistral-small-latest'  // Rapide et efficace pour le JSON
};

// Codes services SNCF valides (pour validation)
const VALID_SERVICE_CODES = new Set([
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
]);

// Codes de nuit (pour décalage J+1)
const NIGHT_SERVICE_CODES = new Set([
  'ACR003', 'CAC003', 'CCU003', 'CCU006', 'CENT003',
  'CRC003', 'RC003', 'RE003', 'REO003', 'RO003', 'SOUF003', 'X'
]);

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
 * Prompt optimisé pour structuration JSON
 */
const STRUCTURATION_PROMPT = `Tu es un expert en extraction de données de bulletins de commande SNCF.

À partir du texte OCR ci-dessous, extrais et structure les données en JSON.

RÈGLES CRITIQUES:
1. Extrais TOUTES les dates entre la période de début et fin, SANS EXCEPTION
2. CHAQUE DATE doit avoir une entrée, même pour les repos (RP) ou non utilisé (NU)
3. IGNORE les lignes METRO, RS, TRACTION, N1100010CO72, NPT, RPP (ce sont des trajets/annotations)
4. ATTENTION aux formats condensés comme "Sam RP Repos périodique" → date + code RP
5. ATTENTION: Si une date a 2 services (ex: NU puis ACR003), garde les DEUX
6. Les codes valides: CCU001-006, CRC001-003, ACR001-003, CENT001-003, REO001-008, etc.
7. Absences: RP (repos périodique), NU (non utilisé), DISPO, INACTIN, CONGE, CA, RTT, etc.

FORMATS DE DATE À RECONNAÎTRE:
- "19/04/2025" suivi du service
- "Sam RP Repos périodique" = samedi avec code RP
- "Dim RP Repos périodique" = dimanche avec code RP
- "NU Utilisable non utilisé" = code NU

FORMAT JSON EXACT (retourne UNIQUEMENT ce JSON, rien d'autre):
{
  "agent": {
    "nom": "NOM PRENOM",
    "numeroCP": "0000000X ou null"
  },
  "periode": {
    "debut": "JJ/MM/AAAA",
    "fin": "JJ/MM/AAAA"
  },
  "dateEdition": "JJ/MM/AAAA",
  "services": [
    {
      "date": "JJ/MM/AAAA",
      "code": "CODE_SERVICE",
      "description": "Description si visible",
      "heureDebut": "HH:MM ou null",
      "heureFin": "HH:MM ou null"
    }
  ]
}

TEXTE OCR DU BULLETIN:
`;

/**
 * ÉTAPE 1: Extraction OCR du PDF
 */
async function extractTextFromPDF(base64Data) {
  console.log('📄 SimplePDFService: Appel API OCR...');
  
  const response = await fetch(ENDPOINTS.OCR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: MODELS.OCR,
      document: {
        type: 'document_url',
        document_url: `data:application/pdf;base64,${base64Data}`
      },
      include_image_base64: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API OCR: ${response.status} - ${errorText}`);
  }

  const ocrResult = await response.json();
  
  // Extraire le texte de toutes les pages
  let fullText = '';
  if (ocrResult.pages) {
    for (const page of ocrResult.pages) {
      if (page.markdown) {
        fullText += page.markdown + '\n\n';
      }
    }
  }
  
  console.log(`✅ OCR réussi: ${ocrResult.pages?.length || 0} page(s), ${fullText.length} caractères`);
  return fullText;
}

/**
 * ÉTAPE 2: Structuration JSON via Chat
 */
async function structureToJSON(ocrText) {
  console.log('🔄 SimplePDFService: Structuration JSON...');
  
  const response = await fetch(ENDPOINTS.CHAT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: MODELS.CHAT,
      messages: [
        {
          role: 'user',
          content: STRUCTURATION_PROMPT + ocrText
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur API Chat: ${response.status} - ${errorText}`);
  }

  const chatResult = await response.json();
  const content = chatResult.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('Réponse vide de l\'API Chat');
  }
  
  console.log('✅ Structuration JSON réussie');
  return JSON.parse(content);
}

/**
 * Génère toutes les dates entre deux dates ISO
 */
function getAllDatesBetween(startISO, endISO) {
  const dates = [];
  const current = new Date(startISO + 'T12:00:00');
  const end = new Date(endISO + 'T12:00:00');
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
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
 * Ajoute un jour à une date ISO
 */
function addOneDay(dateISO) {
  const date = new Date(dateISO + 'T12:00:00');
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Vérifie si un service doit être décalé au jour suivant (service de nuit)
 */
function shouldShiftToNextDay(service) {
  const code = service.code?.toUpperCase();
  
  // Code explicitement de nuit
  if (NIGHT_SERVICE_CODES.has(code)) return true;
  
  // Code finissant par 003
  if (code?.match(/003$/)) return true;
  
  // Horaire de nuit (début >= 20h)
  if (service.heureDebut) {
    const heure = parseInt(service.heureDebut.split(':')[0] || 0);
    if (heure >= 20) return true;
  }
  
  return false;
}

/**
 * Valide et transforme les données extraites
 */
function transformData(parsed) {
  const result = {
    agent: {
      nom: parsed.agent?.nom || 'INCONNU',
      numeroCP: parsed.agent?.numeroCP || ''
    },
    periode: {
      debut: parsed.periode?.debut || '',
      fin: parsed.periode?.fin || ''
    },
    dateEdition: parsed.dateEdition || '',
    services: []
  };

  let nightShiftedCount = 0;

  if (Array.isArray(parsed.services)) {
    for (const s of parsed.services) {
      if (!s || !s.code) continue;
      
      const code = s.code.toUpperCase();
      let dateISO = convertToISO(s.date);
      let dateDisplay = s.date;
      let shiftedFromNight = false;
      let originalDate = null;
      
      // Décalage J+1 pour services de nuit
      if (shouldShiftToNextDay(s)) {
        originalDate = dateISO;
        dateISO = addOneDay(dateISO);
        const parts = dateISO.split('-');
        dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
        shiftedFromNight = true;
        nightShiftedCount++;
        console.log(`   🌙 ${s.date} ${code} → décalé au ${dateDisplay}`);
      }
      
      result.services.push({
        date: dateDisplay,
        dateISO: dateISO,
        code: code,
        description: s.description || '',
        heureDebut: s.heureDebut || null,
        heureFin: s.heureFin || null,
        codeValide: VALID_SERVICE_CODES.has(code),
        shiftedFromNight: shiftedFromNight,
        originalDate: originalDate
      });
    }
  }

  // Trier par date
  result.services.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  
  // Détecter les dates manquantes
  let missingDates = [];
  if (result.periode.debut && result.periode.fin) {
    const startISO = convertToISO(result.periode.debut);
    const endISO = convertToISO(result.periode.fin);
    const allExpectedDates = getAllDatesBetween(startISO, endISO);
    const extractedDates = new Set(result.services.map(s => s.dateISO));
    
    missingDates = allExpectedDates.filter(d => !extractedDates.has(d));
    
    if (missingDates.length > 0) {
      console.warn(`⚠️ Dates manquantes détectées (${missingDates.length}):`, missingDates);
    }
  }
  
  result.stats = {
    total: result.services.length,
    valid: result.services.filter(s => s.codeValide).length,
    nightShifted: nightShiftedCount,
    missingDates: missingDates,
    missingCount: missingDates.length
  };

  return result;
}

/**
 * MÉTHODE PRINCIPALE - Extraction complète d'un bulletin PDF
 * @param {File} pdfFile - Le fichier PDF à analyser
 * @returns {Promise<Object>} Les données extraites
 */
export async function extractBulletinData(pdfFile) {
  const startTime = Date.now();
  console.log('📄 SimplePDFService v2.0: Début extraction', pdfFile.name);
  
  try {
    // 1. Convertir PDF en base64
    const base64Data = await pdfToBase64(pdfFile);
    console.log('✅ PDF converti en base64');
    
    // 2. Extraction OCR (API qui accepte les PDF!)
    const ocrText = await extractTextFromPDF(base64Data);
    
    if (!ocrText || ocrText.length < 50) {
      throw new Error('OCR n\'a pas retourné suffisamment de texte');
    }
    
    // 3. Structuration en JSON via Chat
    const parsed = await structureToJSON(ocrText);
    
    // 4. Transformation et validation
    const result = transformData(parsed);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ SimplePDFService: Extraction réussie en ${processingTime}ms`, {
      agent: result.agent?.nom,
      nbServices: result.services?.length,
      stats: result.stats
    });

    return {
      success: true,
      data: result,
      processingTimeMs: processingTime
    };

  } catch (error) {
    console.error('❌ SimplePDFService erreur:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
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
  return Array.from(VALID_SERVICE_CODES);
}

const SimplePDFService = {
  extractBulletinData,
  isAPIConfigured,
  getValidCodes
};

export default SimplePDFService;
