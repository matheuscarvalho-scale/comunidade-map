// Admin-only: re-envia um payload de webhook do Asaas para a edge function asaas-webhook.
// Útil para reprocessar webhooks que falharam (ex.: integração Conta Azul).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedCron = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    const isCronAuth = cronSecret && expectedCron && cronSecret === expectedCron;

    if (!isCronAuth && !authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

    if (!webhookToken) {
      return new Response(JSON.stringify({ error: "ASAAS_WEBHOOK_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isCronAuth) {
      const sb = createClient(supabaseUrl, anon, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: claims } = await sb.auth.getClaims(authHeader!.replace("Bearer ", ""));
      const userId = claims?.claims?.sub;
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const adminCheck = createClient(supabaseUrl, serviceKey);
      const { data: roles } = await adminCheck.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles || []).some((r) => ["admin", "admin_geral", "admin_financeiro"].includes(r.role));
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { log_id, force_event_id } = body;
    if (!log_id) {
      return new Response(JSON.stringify({ error: "log_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: log, error } = await admin
      .from("webhook_logs")
      .select("payload")
      .eq("id", log_id)
      .maybeSingle();

    if (error || !log?.payload) {
      return new Response(JSON.stringify({ error: "Log not found or no payload", details: error }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: any = { ...log.payload };
    const suffix = `_replay_${Date.now()}`;
    payload.id = force_event_id || `${payload.id}${suffix}`;
    if (payload.payment?.id) {
      payload.payment = { ...payload.payment, id: `${payload.payment.id}${suffix}` };
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/asaas-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": webhookToken,
        "apikey": anon,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return new Response(JSON.stringify({
      replayed: true,
      forwarded_event_id: payload.id,
      status: res.status,
      response: text,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
