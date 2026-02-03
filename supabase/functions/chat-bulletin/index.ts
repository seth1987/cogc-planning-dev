/**
 * Edge Function: chat-bulletin
 * Agent IA Conversationnel pour l'import des bulletins PDF SNCF
 *
 * Utilise Mistral OCR + Mistral Small pour :
 * 1. Extraire le texte des PDF
 * 2. Parser et structurer les services
 * 3. Gérer la conversation pour résoudre les ambiguïtés
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildSystemPrompt,
  buildExtractionPrompt,
  buildCorrectionPrompt,
  buildConfirmationPrompt,
  buildQASystemPrompt,
  buildQAIntentPrompt,
  buildQAResponsePrompt,
  type ServiceCode,
  type QAIntent,
  type QAIntentType,
} from "./prompt.ts";

// Configuration
const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
const MISTRAL_OCR_URL = "https://api.mistral.ai/v1/ocr";
const MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_OCR_MODEL = "mistral-ocr-latest";
const MISTRAL_CHAT_MODEL = "mistral-small-latest";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Types
interface ChatRequest {
  agent_id: string;
  message?: string;
  pdf_base64?: string;
  pdf_filename?: string;
  conversation_id?: string;
  quick_reply?: {
    type: "select_code" | "confirm_import" | "cancel" | "resolve_conflicts";
    value: string;
    service_index?: number;
    conflict_strategy?: "overwrite_all" | "skip_existing";
  };
}

interface Conflict {
  date: string;
  existing: {
    service_code: string;
    poste_code: string | null;
  };
  incoming: {
    service_code: string;
    poste_code: string | null;
  };
}

interface DetectedAgent {
  id: string;
  nom: string;
  prenom: string;
  match_confidence: "exact" | "partial" | "none";
}

interface ChatResponse {
  success: boolean;
  conversation_id: string;
  message: string;
  services?: Service[];
  questions?: Question[];
  ready_to_import: boolean;
  conflicts?: Conflict[];
  detected_agent?: DetectedAgent;
  agent_mismatch?: boolean;
  import_result?: {
    count: number;
    success: boolean;
  };
  error?: string;
  // Q&A specific fields
  qa_response?: {
    type: QAIntentType;
    data?: PlanningEntry[];
    summary?: {
      count: number;
      period: string;
    };
  };
}

interface PlanningEntry {
  date: string;
  service_code: string;
  poste_code: string | null;
  commentaire?: string;
  day_name?: string;
}

interface Service {
  date: string;
  code: string;
  service_code: string;
  poste_code: string | null;
  horaires?: string;
  confidence: "high" | "medium" | "low" | "user_corrected";
  note?: string;
}

interface Question {
  index: number;
  text: string;
  options: { label: string; value: string }[];
}

interface MistralMessage {
  role: "system" | "user" | "assistant";
  content: string | MistralContentPart[];
}

interface MistralContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Point d'entrée de l'Edge Function
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'API key Mistral
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY not configured");
    }

    // Parser la requête
    const body: ChatRequest = await req.json();
    const { agent_id, message, pdf_base64, pdf_filename, conversation_id, quick_reply } = body;

    // Initialiser le client Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Charger les codes de service
    const codesServices = await loadCodesServices(supabase);

    // Récupérer ou créer la conversation
    let conversation = conversation_id
      ? await getConversation(supabase, conversation_id)
      : await createConversation(supabase, agent_id, pdf_filename);

    // Construire les messages pour Mistral
    const messages: MistralMessage[] = [
      { role: "system", content: buildSystemPrompt(codesServices) },
    ];

    // Ajouter l'historique de conversation (sans les champs extra comme timestamp)
    if (conversation.conversation_history) {
      const cleanHistory = conversation.conversation_history.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
      messages.push(...cleanHistory);
    }

    // Traiter la requête selon le type
    let userPrompt = "";

    if (pdf_base64) {
      // Nouvelle extraction PDF
      const ocrText = await extractPdfText(pdf_base64);
      userPrompt = buildExtractionPrompt(ocrText);

      // Sauvegarder le contexte PDF
      await updateConversation(supabase, conversation.id, {
        pdf_filename,
        extraction_data: { ocr_text: ocrText },
      });
    } else if (quick_reply) {
      // Réponse rapide (bouton)
      if (quick_reply.type === "confirm_import") {
        // Vérifier les conflits avant import
        const services = conversation.extraction_data?.services || [];
        const conflicts = await checkConflicts(supabase, agent_id, services);

        if (conflicts.length > 0) {
          // Il y a des conflits, demander à l'utilisateur comment procéder
          return jsonResponse({
            success: true,
            conversation_id: conversation.conversation_id,
            message: `⚠️ ${conflicts.length} conflit(s) détecté(s) avec des services existants. Comment souhaitez-vous procéder ?`,
            services,
            conflicts,
            ready_to_import: true,
          });
        }

        // Pas de conflits, lancer l'import directement
        const importResult = await importServices(supabase, agent_id, services);

        await updateConversation(supabase, conversation.id, {
          status: "imported",
          imported_at: new Date().toISOString(),
          services_imported: importResult.count,
        });

        return jsonResponse({
          success: true,
          conversation_id: conversation.conversation_id,
          message: `✅ ${importResult.count} services importés avec succès !`,
          ready_to_import: false,
          import_result: importResult,
        });
      } else if (quick_reply.type === "resolve_conflicts") {
        // L'utilisateur a choisi comment gérer les conflits
        const services = conversation.extraction_data?.services || [];
        const strategy = quick_reply.conflict_strategy || "overwrite_all";
        const importResult = await importServices(supabase, agent_id, services, strategy);

        await updateConversation(supabase, conversation.id, {
          status: "imported",
          imported_at: new Date().toISOString(),
          services_imported: importResult.count,
        });

        const strategyMessage = strategy === "overwrite_all"
          ? `${importResult.count} services importés (conflits écrasés)`
          : `${importResult.count} services importés (${importResult.skipped} ignorés)`;

        return jsonResponse({
          success: true,
          conversation_id: conversation.conversation_id,
          message: `✅ ${strategyMessage}`,
          ready_to_import: false,
          import_result: importResult,
        });
      } else if (quick_reply.type === "cancel") {
        await updateConversation(supabase, conversation.id, {
          status: "cancelled",
        });

        return jsonResponse({
          success: true,
          conversation_id: conversation.conversation_id,
          message: "Import annulé.",
          ready_to_import: false,
        });
      } else if (quick_reply.type === "select_code") {
        userPrompt = `L'utilisateur a sélectionné "${quick_reply.value}" pour le service #${quick_reply.service_index}`;
      }
    } else if (message) {
      // Vérifier si c'est une question Q&A ou une correction PDF
      const hasActiveExtraction = conversation.extraction_data?.services?.length > 0;

      if (!hasActiveExtraction) {
        // Pas d'extraction en cours → traiter comme Q&A
        const qaResult = await handleQAQuestion(supabase, agent_id, message);

        if (qaResult.isQA) {
          // C'est une question Q&A, retourner la réponse
          return jsonResponse({
            success: true,
            conversation_id: conversation.conversation_id,
            message: qaResult.message,
            ready_to_import: false,
            qa_response: qaResult.qa_response,
          });
        }

        // Pas une question Q&A → message d'aide
        return jsonResponse({
          success: true,
          conversation_id: conversation.conversation_id,
          message: "📎 Pour importer un bulletin, envoyez-moi un fichier PDF.\n\n💬 Vous pouvez aussi me poser des questions sur votre planning :\n• \"Quels sont mes services cette semaine ?\"\n• \"À quelle heure je commence demain ?\"\n• \"Combien d'heures j'ai travaillé ce mois ?\"",
          ready_to_import: false,
        });
      }

      // Message texte libre pendant une extraction
      const currentServices = conversation.extraction_data?.services || [];
      userPrompt = buildCorrectionPrompt(message, currentServices);
    } else {
      // Message de bienvenue
      return jsonResponse({
        success: true,
        conversation_id: conversation.conversation_id,
        message:
          "👋 Bonjour ! Je suis **Regul Bot**, votre assistant COGC.\n\n📎 **Import PDF** : Envoyez-moi votre bulletin de commande\n\n💬 **Questions** : Demandez-moi n'importe quoi sur votre planning :\n• \"Quels sont mes services cette semaine ?\"\n• \"C'est quand mon prochain repos ?\"\n• \"Combien d'heures ce mois ?\"",
        ready_to_import: false,
      });
    }

    // Ajouter le message utilisateur
    messages.push({ role: "user", content: userPrompt });

    // Appeler Mistral Chat
    const assistantResponse = await callMistralChat(messages);

    // Parser la réponse JSON
    const parsedResponse = parseAssistantResponse(assistantResponse);

    // Sauvegarder dans la conversation
    const updatedHistory = [
      ...(conversation.conversation_history || []),
      { role: "user", content: userPrompt, timestamp: new Date().toISOString() },
      {
        role: "assistant",
        content: assistantResponse,
        timestamp: new Date().toISOString(),
      },
    ];

    // Détecter l'agent depuis le nom extrait du PDF
    let detectedAgent: DetectedAgent | null = null;
    let agentMismatch = false;

    if (parsedResponse.metadata?.agent_name) {
      detectedAgent = await findAgentByName(
        supabase,
        parsedResponse.metadata.agent_name as string
      );

      // Vérifier si l'agent détecté est différent de l'agent connecté
      if (detectedAgent && detectedAgent.id !== agent_id) {
        agentMismatch = true;
      }
    }

    await updateConversation(supabase, conversation.id, {
      conversation_history: updatedHistory,
      extraction_data: {
        ...conversation.extraction_data,
        services: parsedResponse.services,
        metadata: parsedResponse.metadata,
        detected_agent: detectedAgent,
      },
      status: parsedResponse.ready_to_import ? "ready_to_import" : "in_progress",
    });

    return jsonResponse({
      success: true,
      conversation_id: conversation.conversation_id,
      message: parsedResponse.message,
      services: parsedResponse.services,
      questions: parsedResponse.questions,
      ready_to_import: parsedResponse.ready_to_import,
      detected_agent: detectedAgent || undefined,
      agent_mismatch: agentMismatch || undefined,
    });
  } catch (error) {
    console.error("Error in chat-bulletin:", error);
    return jsonResponse(
      {
        success: false,
        conversation_id: "",
        message: "Une erreur est survenue. Veuillez réessayer.",
        ready_to_import: false,
        error: error.message,
      },
      500
    );
  }
});

/**
 * Charge les codes de service depuis Supabase
 */
async function loadCodesServices(supabase: any): Promise<ServiceCode[]> {
  const { data, error } = await supabase
    .from("codes_services")
    .select("code, poste_code, service_code, description, horaires_type")
    .order("code");

  if (error) {
    console.error("Error loading codes_services:", error);
    return [];
  }

  return data || [];
}

/**
 * Recherche un agent par son nom extrait du PDF
 */
async function findAgentByName(
  supabase: any,
  agentName: string
): Promise<DetectedAgent | null> {
  if (!agentName || agentName.trim() === "") return null;

  // Normaliser et séparer nom/prénom
  const parts = agentName.trim().toUpperCase().split(/\s+/);
  if (parts.length < 2) return null;

  // Essayer différentes combinaisons (NOM PRENOM ou PRENOM NOM)
  const [part1, ...restParts] = parts;
  const part2 = restParts.join(" ");

  // Recherche exacte NOM PRENOM
  let { data: agents } = await supabase
    .from("agents")
    .select("id, nom, prenom")
    .ilike("nom", part1)
    .ilike("prenom", part2)
    .limit(1);

  if (agents && agents.length > 0) {
    return {
      id: agents[0].id,
      nom: agents[0].nom,
      prenom: agents[0].prenom,
      match_confidence: "exact",
    };
  }

  // Recherche inversée PRENOM NOM
  ({ data: agents } = await supabase
    .from("agents")
    .select("id, nom, prenom")
    .ilike("nom", part2)
    .ilike("prenom", part1)
    .limit(1));

  if (agents && agents.length > 0) {
    return {
      id: agents[0].id,
      nom: agents[0].nom,
      prenom: agents[0].prenom,
      match_confidence: "exact",
    };
  }

  // Recherche partielle (un seul terme correspond)
  ({ data: agents } = await supabase
    .from("agents")
    .select("id, nom, prenom")
    .or(`nom.ilike.%${part1}%,prenom.ilike.%${part1}%`)
    .limit(5));

  if (agents && agents.length === 1) {
    return {
      id: agents[0].id,
      nom: agents[0].nom,
      prenom: agents[0].prenom,
      match_confidence: "partial",
    };
  }

  return null;
}

/**
 * Récupère une conversation existante
 */
async function getConversation(supabase: any, conversationId: string) {
  const { data, error } = await supabase
    .from("pending_imports")
    .select("*")
    .eq("conversation_id", conversationId)
    .single();

  if (error) throw new Error(`Conversation not found: ${conversationId}`);
  return data;
}

/**
 * Crée une nouvelle conversation
 */
async function createConversation(
  supabase: any,
  agentId: string,
  pdfFilename?: string
) {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const { data, error } = await supabase
    .from("pending_imports")
    .insert({
      agent_id: agentId,
      conversation_id: conversationId,
      pdf_filename: pdfFilename,
      status: "in_progress",
      conversation_history: [],
      extraction_data: {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data;
}

/**
 * Met à jour une conversation
 */
async function updateConversation(
  supabase: any,
  id: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from("pending_imports")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
}

/**
 * Extrait le texte d'un PDF via Mistral OCR
 */
async function extractPdfText(pdfBase64: string): Promise<string> {
  const response = await fetch(MISTRAL_OCR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: MISTRAL_OCR_MODEL,
      document: {
        type: "document_url",
        document_url: `data:application/pdf;base64,${pdfBase64}`,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral OCR error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Extraire le texte des pages
  const pages = result.pages || [];
  const text = pages.map((p: any) => p.markdown || p.text || "").join("\n\n");

  return text;
}

/**
 * Appelle Mistral Chat pour le parsing conversationnel
 */
async function callMistralChat(messages: MistralMessage[]): Promise<string> {
  const response = await fetch(MISTRAL_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: MISTRAL_CHAT_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral Chat error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || "{}";
}

/**
 * Parse la réponse JSON de l'assistant
 */
function parseAssistantResponse(response: string): {
  message: string;
  services: Service[];
  questions: Question[];
  ready_to_import: boolean;
  metadata?: Record<string, unknown>;
} {
  try {
    const parsed = JSON.parse(response);
    return {
      message: parsed.message || "Analyse en cours...",
      services: parsed.services || [],
      questions: parsed.questions || [],
      ready_to_import: parsed.ready_to_import || false,
      metadata: parsed.metadata,
    };
  } catch {
    console.error("Failed to parse assistant response:", response);
    return {
      message: response,
      services: [],
      questions: [],
      ready_to_import: false,
    };
  }
}

/**
 * Vérifie les conflits entre les services à importer et les services existants
 */
async function checkConflicts(
  supabase: any,
  agentId: string,
  services: Service[]
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  // Extraire les dates uniques
  const dates = [...new Set(services.map((s) => s.date))];

  if (dates.length === 0) return conflicts;

  // Récupérer les services existants pour ces dates
  const { data: existingServices, error } = await supabase
    .from("planning")
    .select("date, service_code, poste_code")
    .eq("agent_id", agentId)
    .in("date", dates);

  if (error) {
    console.error("Error checking conflicts:", error);
    return conflicts;
  }

  // Créer un map des services existants par date
  const existingMap = new Map<string, { service_code: string; poste_code: string | null }>();
  for (const es of existingServices || []) {
    existingMap.set(es.date, {
      service_code: es.service_code,
      poste_code: es.poste_code,
    });
  }

  // Comparer avec les services à importer
  for (const service of services) {
    const existing = existingMap.get(service.date);
    if (existing) {
      // Il y a un conflit si les valeurs sont différentes
      if (
        existing.service_code !== service.service_code ||
        existing.poste_code !== service.poste_code
      ) {
        conflicts.push({
          date: service.date,
          existing: {
            service_code: existing.service_code,
            poste_code: existing.poste_code,
          },
          incoming: {
            service_code: service.service_code,
            poste_code: service.poste_code,
          },
        });
      }
    }
  }

  return conflicts;
}

/**
 * Importe les services dans la table planning
 */
async function importServices(
  supabase: any,
  agentId: string,
  services: Service[],
  conflictStrategy: "overwrite_all" | "skip_existing" = "overwrite_all"
): Promise<{ count: number; skipped: number; success: boolean }> {
  let count = 0;
  let skipped = 0;

  // Si stratégie skip_existing, vérifier les conflits d'abord
  let datesToSkip: Set<string> = new Set();
  if (conflictStrategy === "skip_existing") {
    const conflicts = await checkConflicts(supabase, agentId, services);
    datesToSkip = new Set(conflicts.map((c) => c.date));
  }

  for (const service of services) {
    // Skip si la date a un conflit et stratégie = skip_existing
    if (datesToSkip.has(service.date)) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("planning").upsert(
      {
        agent_id: agentId,
        date: service.date,
        service_code: service.service_code,
        poste_code: service.poste_code,
      },
      {
        onConflict: "agent_id,date",
      }
    );

    if (!error) count++;
  }

  return { count, skipped, success: count > 0 };
}

/**
 * Gère les questions Q&A sur le planning
 */
async function handleQAQuestion(
  supabase: any,
  agentId: string,
  message: string
): Promise<{
  isQA: boolean;
  message: string;
  qa_response?: {
    type: QAIntentType;
    data?: PlanningEntry[];
    summary?: { count: number; period: string };
  };
}> {
  try {
    // Étape 1: Analyser l'intention avec Mistral
    const intentMessages: MistralMessage[] = [
      { role: "system", content: buildQASystemPrompt() },
      { role: "user", content: buildQAIntentPrompt(message) },
    ];

    const intentResponse = await callMistralChat(intentMessages);
    const intentParsed = JSON.parse(intentResponse);

    // Si l'intention est inconnue, ce n'est pas une question Q&A
    if (!intentParsed.intent || intentParsed.intent.type === "unknown") {
      return { isQA: false, message: "" };
    }

    const intent: QAIntent = intentParsed.intent;

    // Gérer l'intent "help" directement sans requête DB
    if (intent.type === "help") {
      return {
        isQA: true,
        message: getHelpMessage(),
        qa_response: {
          type: "help",
          data: [],
          summary: { count: 0, period: "" },
        },
      };
    }

    // Étape 2: Récupérer les données du planning selon l'intention
    const planningData = await queryPlanningData(supabase, agentId, intent);

    // Étape 3: Générer la réponse avec Mistral
    const responseMessages: MistralMessage[] = [
      { role: "system", content: buildQASystemPrompt() },
      { role: "user", content: buildQAResponsePrompt(message, intent, planningData) },
    ];

    const finalResponse = await callMistralChat(responseMessages);
    const responseParsed = JSON.parse(finalResponse);

    // Enrichir les données avec les noms de jours
    const enrichedData = planningData.map((entry) => ({
      ...entry,
      day_name: formatDayName(entry.date),
    }));

    return {
      isQA: true,
      message: responseParsed.message || "Voici les informations demandées.",
      qa_response: {
        type: intent.type,
        data: enrichedData,
        summary: responseParsed.data_summary || {
          count: planningData.length,
          period: formatPeriod(intent),
        },
      },
    };
  } catch (error) {
    console.error("Error in Q&A handling:", error);
    return { isQA: false, message: "" };
  }
}

/**
 * Récupère les données du planning selon l'intention
 */
async function queryPlanningData(
  supabase: any,
  agentId: string,
  intent: QAIntent
): Promise<PlanningEntry[]> {
  const { type, params } = intent;
  const today = new Date();

  let startDate: string;
  let endDate: string;

  switch (type) {
    case "weekly_services": {
      // Semaine courante (lundi à dimanche)
      const monday = getMonday(today);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startDate = params.start_date || formatDate(monday);
      endDate = params.end_date || formatDate(sunday);
      break;
    }
    case "specific_date": {
      // Date spécifique
      startDate = params.date || formatDate(today);
      endDate = startDate;
      break;
    }
    case "monthly_hours":
    case "stats_summary": {
      // Mois courant ou spécifié
      const year = today.getFullYear();
      const month = today.getMonth();
      startDate = params.start_date || `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      endDate = params.end_date || `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;
      break;
    }
    case "next_service": {
      // Prochain service à partir d'aujourd'hui
      startDate = formatDate(today);
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      endDate = formatDate(nextMonth);
      break;
    }
    case "service_search": {
      // Recherche sur les 3 prochains mois
      startDate = formatDate(today);
      const threeMonths = new Date(today);
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      endDate = formatDate(threeMonths);
      break;
    }
    default:
      startDate = formatDate(today);
      endDate = startDate;
  }

  // Construire la requête
  let query = supabase
    .from("planning")
    .select("date, service_code, poste_code, commentaire")
    .eq("agent_id", agentId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  // Filtrer par code de service si spécifié
  if (params.service_code) {
    query = query.eq("service_code", params.service_code);
  }

  // Pour "next_service", on veut seulement les services de travail
  if (type === "next_service") {
    query = query.in("service_code", ["-", "O", "X"]);
    query = query.limit(5);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error querying planning:", error);
    return [];
  }

  return data || [];
}

/**
 * Formate une date en nom de jour français
 */
function formatDayName(dateStr: string): string {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const months = ["janvier", "février", "mars", "avril", "mai", "juin",
                  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const date = new Date(dateStr);
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

/**
 * Formate la période pour l'affichage
 */
function formatPeriod(intent: QAIntent): string {
  const { type, params } = intent;
  switch (type) {
    case "weekly_services":
      return "cette semaine";
    case "specific_date":
      return formatDayName(params.date || "");
    case "monthly_hours":
    case "stats_summary":
      return "ce mois";
    case "next_service":
      return "prochains jours";
    default:
      return "";
  }
}

/**
 * Obtient le lundi de la semaine
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Formate une date en YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Retourne le message d'aide décrivant les fonctionnalités
 */
function getHelpMessage(): string {
  return `🤖 **Regul Bot - Fonctionnalités**

📎 **Import de bulletins PDF**
Envoyez-moi votre bulletin de commande SNCF et je l'analyserai automatiquement pour extraire vos services. Je détecte :
• Les dates et codes de service
• Les postes (CRC, CCU, ACR...)
• Les services de nuit (avec décalage J+1)
• L'agent concerné par le bulletin

Si quelque chose n'est pas clair, je vous poserai des questions pour confirmer.

💬 **Questions sur votre planning**
Vous pouvez me poser des questions en langage naturel :

📅 *Services de la semaine*
• "Quels sont mes services cette semaine ?"
• "Mon planning de la semaine prochaine"

📆 *Date spécifique*
• "Quel service le 15 janvier ?"
• "Je travaille demain ?"
• "À quelle heure je commence lundi ?"

⏱️ *Heures travaillées*
• "Combien d'heures ce mois ?"
• "Mes heures de janvier"

🔜 *Prochain service*
• "C'est quand mon prochain service ?"
• "Quand est-ce que je travaille ?"

🔍 *Recherche*
• "Quand j'ai un CRC ?"
• "Mes prochains repos"
• "Prochaine nuit ?"

📊 *Statistiques*
• "Combien de repos ce mois ?"
• "Mes congés de l'année"

---
💡 *Astuce* : Vous pouvez aussi cliquer sur les services extraits pour les modifier manuellement !`;
}

/**
 * Helper pour créer une réponse JSON
 */
function jsonResponse(data: ChatResponse, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
