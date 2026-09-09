// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend.
// Webhook de SAÍDA: notifica o Centralizador de Dados MAP em tempo real quando um
// membro (profiles / profiles_private / email) é alterado.
// Chamada apenas por triggers do banco ou por outras edge functions (service role).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DEFAULT_URL = "https://map-centralizador.vercel.app/api/public/eventos-origem";
const ORIGEM = "acelera";
const TIPO = "member.updated";
const RETRY_DELAYS_MS = [1000, 5000, 25000];
const TIMEOUT_MS = 10000;

type ChangeMap = Record<string, { antes: unknown; depois: unknown }> | null;

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(secret: string, timestamp: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return `sha256=${hex(mac)}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function deliver(rawBody: string, secret: string, url: string) {
  let lastStatus = 0;
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await sign(secret, timestamp, rawBody);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-map-timestamp": timestamp,
          "x-map-signature": signature,
        },
        body: rawBody,
        signal: controller.signal,
      });
      lastStatus = res.status;
      lastError = null;

      if (res.ok) return { ok: true, status: res.status, attempts: attempt + 1 };
      // 4xx: erro de contrato/assinatura — não repetir.
      if (res.status < 500) {
        const text = await res.text().catch(() => "");
        return { ok: false, status: res.status, attempts: attempt + 1, error: text.slice(0, 500) };
      }
      lastError = (await res.text().catch(() => "")).slice(0, 500);
    } catch (error) {
      lastError = (error as Error).message ?? String(error);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    ok: false,
    status: lastStatus,
    attempts: RETRY_DELAYS_MS.length + 1,
    error: lastError ?? "delivery failed",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!serviceKey || auth !== serviceKey) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("MAP_WEBHOOK_SECRET");
  const url = Deno.env.get("MAP_WEBHOOK_URL") || DEFAULT_URL;
  if (!secret) {
    console.warn("notify-centralizer: MAP_WEBHOOK_SECRET não configurado, ignorando evento");
    return new Response(JSON.stringify({ skipped: true, reason: "secret_not_configured" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recordId = typeof body.record_id === "string" ? body.record_id : null;
  if (!recordId) {
    return new Response(JSON.stringify({ error: "record_id é obrigatório" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawChanges = body.changes;
  const changes: ChangeMap =
    rawChanges && typeof rawChanges === "object" && Object.keys(rawChanges).length > 0
      ? (rawChanges as ChangeMap)
      : null;

  const payload = {
    event_id: typeof body.event_id === "string" ? body.event_id : crypto.randomUUID(),
    origem: ORIGEM,
    tipo: TIPO,
    occurred_at: typeof body.occurred_at === "string" ? body.occurred_at : new Date().toISOString(),
    record_id: recordId,
    updated_by: typeof body.updated_by === "string" ? body.updated_by : "sistema",
    changes,
  };

  const rawBody = JSON.stringify(payload);
  const result = await deliver(rawBody, secret, url);

  if (!result.ok) {
    console.error("notify-centralizer: falha na entrega", {
      event_id: payload.event_id,
      status: result.status,
      error: result.error,
    });
  }

  return new Response(JSON.stringify({ event_id: payload.event_id, ...result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
