// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY usada server-side apenas.
// Função admin-only para SIMULAR a emissão de NFe via Conta Azul sem efetivar a venda.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Planos disponíveis para simulação (mesma fonte de verdade do conta-azul-integration)
const TEST_PLANS: Record<string, { amount_cents: number; product_name: string; label: string }> = {
  basic_anual:     { amount_cents: 236400,  product_name: "MAP Acelera - Plano Basic Anual",    label: "Basic Anual (R$ 2.364,00)" },
  pro_anual:       { amount_cents: 596400,  product_name: "MAP Acelera - Plano Pro",            label: "Pro Anual (R$ 5.964,00)" },
  pro_recorrente:  { amount_cents: 716400,  product_name: "MAP Acelera - Pro Recorrente",       label: "Pro Recorrente (R$ 7.164,00)" },
  business_anual:  { amount_cents: 1196400, product_name: "MAP Acelera - Plano Business Anual", label: "Business Anual (R$ 11.964,00)" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── 1. Verify admin ─────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Read params ──────────────────────────────────────────────────
    let body: { plan?: string; live?: boolean } = {};
    try { body = await req.json(); } catch (_) { /* empty body */ }
    const planKey = body.plan;
    const live = body.live === true;

    if (live && !planKey) {
      return new Response(JSON.stringify({ error: "Live mode requires a specific 'plan'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const plansToTest = planKey && TEST_PLANS[planKey]
      ? { [planKey]: TEST_PLANS[planKey] }
      : TEST_PLANS;

    // ── 3. Call conta-azul-integration for each plan ───────────────────
    const serviceUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/conta-azul-integration`;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const results: Record<string, any> = {};

    for (const [key, plan] of Object.entries(plansToTest)) {
      try {
        const resp = await fetch(serviceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            dry_run: !live,
            customer: {
              email: `teste-integracao+${key}@mapeducacao.com`,
              name: live ? "TESTE INTEGRACAO - DELETAR" : "Cliente Simulação",
              phone: "11999999999",
              document: "12345678900",
              person_type: "FISICA",
            },
            amount: plan.amount_cents,
            product_name: plan.product_name,
            user_id: user.id,
          }),
        });
        const data = await resp.json();
        results[key] = { http_status: resp.status, label: plan.label, live, ...data };
      } catch (e) {
        results[key] = { label: plan.label, live, error: String(e) };
      }
    }

    return new Response(JSON.stringify({ results, live, tested_at: new Date().toISOString() }, null, 2), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
