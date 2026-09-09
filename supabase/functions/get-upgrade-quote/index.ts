// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Annual plan values (in BRL) — single source of truth (server-side only)
const PLAN_ANNUAL_VALUES: Record<string, number> = {
  basic: 2364,
  starter: 2364,
  pro: 4764,
  business: 11964,
  enterprise: 11964,
};

const PLAN_MONTHLY: Record<string, number> = {
  basic: 197,
  starter: 197,
  pro: 397,
  business: 997,
  enterprise: 997,
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic", starter: "Basic",
  pro: "Pro",
  business: "Business", enterprise: "Business",
};

const PLAN_HIERARCHY = ["basic", "starter", "pro", "business", "enterprise"];

function normalizePlan(plan: string): string {
  if (plan === "starter") return "basic";
  if (plan === "enterprise") return "business";
  return plan;
}

function getPlanTier(plan: string): number {
  return PLAN_HIERARCHY.indexOf(normalizePlan(plan));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // 2. Parse body
    const body = await req.json();
    const targetPlan = typeof body.target_plan === "string" ? body.target_plan.trim().toLowerCase() : "";

    if (!targetPlan || !PLAN_ANNUAL_VALUES[targetPlan]) {
      return new Response(
        JSON.stringify({ error: "Plano alvo inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch current plan
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_plan, subscription_status")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Perfil não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentPlan = profile.subscription_plan || "basic";

    // 4. Validate hierarchy
    if (getPlanTier(targetPlan) <= getPlanTier(currentPlan)) {
      return new Response(
        JSON.stringify({ error: "Downgrade não permitido. O plano alvo deve ser superior ao atual." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Calculate delta
    const currentAnnual = PLAN_ANNUAL_VALUES[currentPlan] ?? PLAN_ANNUAL_VALUES[normalizePlan(currentPlan)] ?? 0;
    const targetAnnual = PLAN_ANNUAL_VALUES[targetPlan] ?? 0;
    const upgradeAmount = targetAnnual - currentAnnual;

    // 6. Build installment options (1-12x)
    const installment_options = [];
    for (let i = 1; i <= 12; i++) {
      installment_options.push({
        installments: i,
        installment_value: Math.floor((upgradeAmount / i) * 100) / 100,
        total: upgradeAmount,
      });
    }

    const normalizedCurrent = normalizePlan(currentPlan);
    const normalizedTarget = normalizePlan(targetPlan);

    return new Response(
      JSON.stringify({
        current_plan: currentPlan,
        current_plan_label: PLAN_LABELS[currentPlan] || currentPlan,
        current_plan_monthly: PLAN_MONTHLY[currentPlan] ?? PLAN_MONTHLY[normalizedCurrent] ?? 0,
        current_plan_annual: currentAnnual,
        target_plan: targetPlan,
        target_plan_label: PLAN_LABELS[targetPlan] || targetPlan,
        target_plan_monthly: PLAN_MONTHLY[targetPlan] ?? PLAN_MONTHLY[normalizedTarget] ?? 0,
        target_plan_annual: targetAnnual,
        upgrade_amount: upgradeAmount,
        installment_options,
        subscription_active: profile.subscription_status === "active",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("get-upgrade-quote error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
