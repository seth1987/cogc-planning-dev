import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");

const MISTRAL_ENDPOINTS: Record<string, string> = {
  ocr: "https://api.mistral.ai/v1/ocr",
  chat: "https://api.mistral.ai/v1/chat/completions",
};

const ALLOWED_ORIGINS = [
  "https://cogcpn.netlify.app",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const cors = getCorsHeaders(req);

  try {
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY not configured");
    }

    const { target, body } = await req.json();

    if (!target || !MISTRAL_ENDPOINTS[target]) {
      return new Response(
        JSON.stringify({ error: "target must be 'ocr' or 'chat'" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (!body) {
      return new Response(
        JSON.stringify({ error: "body is required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const mistralResponse = await fetch(MISTRAL_ENDPOINTS[target], {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const responseData = await mistralResponse.text();

    return new Response(responseData, {
      status: mistralResponse.status,
      headers: {
        ...cors,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in mistral-proxy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
