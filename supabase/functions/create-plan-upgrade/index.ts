// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Annual plan values (in BRL) — source of truth
const PLAN_ANNUAL_VALUES: Record<string, number> = {
  basic: 2364,    // R$197/mês × 12
  starter: 2364,  // legacy alias
  pro: 4764,      // R$397/mês × 12
  business: 11964, // R$997/mês × 12
  enterprise: 11964, // legacy alias
};

// Plan hierarchy for validation (higher index = higher tier)
const PLAN_HIERARCHY = ["basic", "starter", "pro", "business", "enterprise"];

function getPlanTier(plan: string): number {
  const normalized = plan === "starter" ? "basic" : plan === "enterprise" ? "business" : plan;
  return PLAN_HIERARCHY.indexOf(normalized);
}

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    basic: "Basic", starter: "Basic",
    pro: "Pro",
    business: "Business", enterprise: "Business",
  };
  return labels[plan] || plan;
}

function getAnnualValue(plan: string): number {
  return PLAN_ANNUAL_VALUES[plan] ?? 0;
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
    // ── 1. Authenticate the user ──────────────────────────────────────
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 2. Parse request body ─────────────────────────────────────────
    const body = await req.json();
    const { new_plan, installments = 1 } = body;

    if (!new_plan || !PLAN_ANNUAL_VALUES[new_plan]) {
      return new Response(
        JSON.stringify({ error: "Plano inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (installments < 1 || installments > 12) {
      return new Response(
        JSON.stringify({ error: "Número de parcelas inválido (1-12)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Fetch current subscription ─────────────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_plan, subscription_status, subscription_start_date, subscription_end_date, name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Perfil não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (profile.subscription_status !== "active") {
      return new Response(
        JSON.stringify({ error: "Assinatura não está ativa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentPlan = profile.subscription_plan || "basic";

    // ── 4. Validate upgrade hierarchy ─────────────────────────────────
    if (getPlanTier(new_plan) <= getPlanTier(currentPlan)) {
      return new Response(
        JSON.stringify({ error: "O novo plano deve ser superior ao atual" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Calculate upgrade amount (delta anual cheio) ──────────────
    // Upgrade = nova compra complementar da diferença entre planos
    // Parcelamento anterior continua normalmente sem alteração
    const currentPlanValue = getAnnualValue(currentPlan);
    const newPlanValue = getAnnualValue(new_plan);
    const upgradeAmount = newPlanValue - currentPlanValue;

    if (upgradeAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "O valor do upgrade é inválido (diferença zero ou negativa)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[UPGRADE] Delta calc: current=${currentPlan}(${currentPlanValue}) → new=${new_plan}(${newPlanValue}) | delta=${upgradeAmount}`);

    // ── 6. Fetch Asaas customer ID ──────────────────────────────────
    // Note: subscription_id is NOT required — many clients are on installments
    const { data: paymentIds } = await supabaseAdmin
      .from("payment_identifiers")
      .select("asaas_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!paymentIds?.asaas_customer_id) {
      return new Response(
        JSON.stringify({ error: "Cliente Asaas não encontrado. Entre em contato com o suporte." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 7. Auto-expire stale pending upgrades ────────────────────────
    // If a previous upgrade got stuck in "pending" (function crashed before Asaas call),
    // expire it after 10 minutes so the user can retry.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: expiredRows } = await supabaseAdmin
      .from("plan_upgrades")
      .update({ 
        status: "failed", 
        failed_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      })
      .eq("user_id", userId)
      .eq("status", "pending")
      .lt("created_at", tenMinutesAgo)
      .select("id");

    if (expiredRows?.length) {
      console.log(`[UPGRADE] Auto-expired ${expiredRows.length} stale pending upgrade(s) for user ${userId}`);
    }

    // ── 8. Generate external reference ────────────────────────────────
    const externalReference = `upgrade_${userId}_${Date.now()}`;

    // ── 9. Create upgrade record in DB (with race condition protection) ─
    const { data: upgrade, error: upgradeError } = await supabaseAdmin
      .from("plan_upgrades")
      .insert({
        user_id: userId,
        current_plan: currentPlan,
        new_plan: new_plan,
        current_plan_value: currentPlanValue,
        new_plan_value: newPlanValue,
        amount_already_paid: currentPlanValue,
        upgrade_amount: upgradeAmount,
        installments,
        status: "pending",
        external_reference: externalReference,
      })
      .select()
      .single();

    if (upgradeError) {
      const isUniqueViolation = upgradeError.code === "23505";
      if (isUniqueViolation) {
        console.warn("Race condition detected: concurrent upgrade attempt for user", userId);
        return new Response(
          JSON.stringify({ error: "Já existe um upgrade pendente. Aguarde o processamento ou entre em contato com o suporte." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Failed to create upgrade record:", upgradeError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar registro de upgrade" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 9. Create charge in Asaas ────────────────────────────────────
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasApiKey) {
      console.error("ASAAS_API_KEY not configured");
      await supabaseAdmin
        .from("plan_upgrades")
        .update({ status: "failed", failed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", upgrade.id);
      return new Response(
        JSON.stringify({ error: "Configuração de pagamento indisponível" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentLabel = getPlanLabel(currentPlan);
    const newLabel = getPlanLabel(new_plan);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Note: We do NOT track or cancel previous subscriptions/installments.
    // The upgrade is a standalone complementary purchase. Old payments continue as-is.
    // Always uses CREDIT_CARD via /payments — treated as a single sale
    // with optional installments (installmentCount), NOT a subscription.

    // Use Math.floor to avoid overcharging (Asaas adjusts the last installment)
    const installmentValue = Math.floor((upgradeAmount / installments) * 100) / 100;

    const asaasPayload: Record<string, unknown> = {
      customer: paymentIds.asaas_customer_id,
      billingType: "CREDIT_CARD",
      value: upgradeAmount,
      dueDate: dueDateStr,
      description: installments > 1
        ? `Upgrade MAP Acelera: ${currentLabel} → ${newLabel} (${installments}x de R$${installmentValue.toFixed(2)})`
        : `Upgrade MAP Acelera: ${currentLabel} → ${newLabel}`,
      externalReference,
    };

    // Add installment fields when > 1x
    if (installments > 1) {
      asaasPayload.installmentCount = installments;
      asaasPayload.installmentValue = installmentValue;
    }

    console.log("Creating Asaas CREDIT_CARD charge:", JSON.stringify(asaasPayload));

    const asaasResponse = await fetch("https://api.asaas.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasApiKey,
      },
      body: JSON.stringify(asaasPayload),
    });

    const asaasData = await asaasResponse.json();

    if (!asaasResponse.ok) {
      console.error("Asaas payments API error:", JSON.stringify(asaasData));
      await supabaseAdmin
        .from("plan_upgrades")
        .update({ status: "failed", failed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", upgrade.id);
      return new Response(
        JSON.stringify({ error: "Erro ao criar cobrança no gateway de pagamento", details: asaasData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 10. Extract payment ID and invoice URL ────────────────────────
    const paymentId = asaasData.id || null;
    const invoiceUrl = asaasData.invoiceUrl || asaasData.paymentLink || null;

    // ── 11. Update upgrade record with Asaas data ─────────────────────
    const now = new Date().toISOString();
    const { data: updatedUpgrade, error: updateError } = await supabaseAdmin
      .from("plan_upgrades")
      .update({
        status: "payment_created",
        asaas_payment_id: paymentId,
        invoice_url: invoiceUrl,
        updated_at: now,
      })
      .eq("id", upgrade.id)
      .select("asaas_payment_id, invoice_url, external_reference")
      .single();

    if (updateError || !updatedUpgrade?.asaas_payment_id) {
      console.error("CRITICAL: Failed to persist Asaas data on upgrade record:", updateError);
      console.error("Asaas payment created but not persisted:", {
        upgradeId: upgrade.id,
        asaasPaymentId: paymentId,
        invoiceUrl,
        externalReference,
      });
    }

    console.log(`Upgrade created successfully: ${upgrade.id} | Asaas payment: ${paymentId} | Installments: ${installments} | External ref: ${externalReference}`);

    // ── 12. Return response to frontend ───────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        upgrade_id: upgrade.id,
        current_plan: currentPlan,
        new_plan: new_plan,
        current_plan_label: currentLabel,
        new_plan_label: newLabel,
        current_plan_value: currentPlanValue,
        new_plan_value: newPlanValue,
        upgrade_amount: upgradeAmount,
        installments,
        installment_value: Math.floor((upgradeAmount / installments) * 100) / 100,
        asaas_payment_id: paymentId,
        invoice_url: invoiceUrl,
        billing_type: "CREDIT_CARD",
        status: "payment_created",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Upgrade creation error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar upgrade", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
