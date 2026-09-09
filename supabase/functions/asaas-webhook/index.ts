// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { classifyRefund, recordCancelReason } from "../_shared/cancelReason.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

// Escape user-controlled values before interpolating into HTML email templates.
// Prevents HTML injection via fields coming from external APIs (e.g. Asaas).
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Plan mapping by monthly and annual values (in BRL) — for SINGLE full payments
const PLAN_MAPPING: Record<number, string> = {
  // Mensal
  197: "basic",
  397: "pro",
  497: "pro",   // Recorrente mensal Pro
  597: "pro",     // Recorrente mensal Pro (variação)
  997: "business",
  // Anual
  2364: "basic",
  4764: "pro",
  5964: "pro",
  7164: "business",
  // Teste
  5: "pro",
};

// Monthly plan values — used to detect monthly recurring payments
const MONTHLY_PLAN_VALUES = new Set([197, 397, 497, 597, 997]);

// Annual full values per plan — used for accumulated payment threshold.
// IMPORTANT: ordered LOWEST-first. Logic picks the HIGHEST plan whose annual value
// is reached by the accumulated total (without inflating to a higher tier).
// This avoids classifying an unknown payment (e.g. R$3000) as "business" just
// because it's above the monthly business value (R$997).
const PLAN_ANNUAL_TIERS: { plan: string; value: number }[] = [
  { plan: "basic", value: 2364 },
  { plan: "pro", value: 4764 },
  { plan: "business", value: 11964 },
];

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function identifyPlan(amount: number, description?: string): string {
  const amountReais = Math.round(amount);
  if (PLAN_MAPPING[amountReais]) return PLAN_MAPPING[amountReais];

  if (description) {
    const desc = description.toLowerCase();
    if (desc.includes("enterprise") || desc.includes("business") || desc.includes("mapa")) return "business";
    if (desc.includes("pro")) return "pro";
    if (desc.includes("starter") || desc.includes("basic")) return "basic";
  }

  console.warn(`⚠️ Unrecognized payment value: R$${amount} (rounded: ${amountReais}). Defaulting to basic. Description: "${description || "N/A"}"`);
  return "basic";
}

// Check if a single payment matches a known full plan value
function isFullPlanPayment(amount: number): boolean {
  const rounded = Math.round(amount);
  return !!PLAN_MAPPING[rounded];
}

// Identify plan from accumulated total — returns { plan, shouldActivate }
// Uses ANNUAL tier thresholds (2364 / 4764 / 11964) and picks the HIGHEST plan
// whose annual value is reached, never inflating an unknown amount to a higher tier.
function identifyPlanFromTotal(total: number, description?: string): { plan: string; shouldActivate: boolean } {
  const rounded = Math.round(total);

  // Try to identify intended plan from description first
  let intendedPlan: string | null = null;
  if (description) {
    const desc = description.toLowerCase();
    if (desc.includes("business") || desc.includes("enterprise") || desc.includes("mapa")) intendedPlan = "business";
    else if (desc.includes("pro")) intendedPlan = "pro";
    else if (desc.includes("basic") || desc.includes("starter")) intendedPlan = "basic";
  }

  if (intendedPlan) {
    const tier = PLAN_ANNUAL_TIERS.find(p => p.plan === intendedPlan);
    if (tier) {
      // Allow 2% tolerance for rounding in installments
      const shouldActivate = rounded >= Math.floor(tier.value * 0.98);
      return { plan: intendedPlan, shouldActivate };
    }
  }

  // No description hint — pick the HIGHEST annual tier the total reaches (with 2% tolerance).
  // R$3000 → basic (reaches 2364, not pro 4764). R$5000 → pro. R$12000 → business.
  let matched: { plan: string; value: number } | null = null;
  for (const tier of PLAN_ANNUAL_TIERS) {
    if (rounded >= Math.floor(tier.value * 0.98)) {
      matched = tier;
    } else {
      break;
    }
  }

  if (matched) {
    return { plan: matched.plan, shouldActivate: true };
  }

  // Total doesn't reach any plan threshold yet — keep pending as basic
  return { plan: "basic", shouldActivate: false };
}

function generateProvisionalPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    basic: "Basic",
    starter: "Basic",
    pro: "Pro",
    business: "Business",
    enterprise: "Business",
  };
  return labels[plan] || "Basic";
}

// ─── Send welcome email with credentials ────────────────────────────────
async function sendWelcomeEmail(
  email: string,
  name: string,
  plan: string,
  provisionalPassword: string
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured — skipping welcome email");
    return;
  }

  const resend = new Resend(resendApiKey);
  const platformUrl = "https://acelera.mapeducacao.com";
  const planLabel = getPlanLabel(plan);

  const { error } = await resend.emails.send({
    from: "MAP Acelera <onboarding@mapeducacao.com>",
    to: [email],
    subject: `🎉 Bem-vindo ao MAP Acelera — Plano ${planLabel} ativado!`,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">

  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
  </div>

  <div style="padding:32px 24px 16px;">
    <h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Bem-vindo ao MAP Acelera! 🚀</h2>
    <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${escapeHtml(name)}</strong>, seu pagamento foi confirmado e seu <strong>Plano ${escapeHtml(planLabel)}</strong> já está ativo!</p>
  </div>

  <div style="margin:0 24px 24px;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Aqui estão seus dados de acesso à plataforma:
    </p>
    
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">E-mail</p>
      <p style="color:#fff;font-size:15px;font-weight:600;margin:0;">${escapeHtml(email)}</p>
    </div>
    
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:16px;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Senha Provisória</p>
      <p style="color:#BFFF00;font-size:18px;font-weight:700;font-family:monospace;margin:0;letter-spacing:2px;">${escapeHtml(provisionalPassword)}</p>
    </div>

    <p style="color:#999;font-size:12px;line-height:1.5;margin:16px 0 0;">
      ⚠️ Recomendamos que você altere sua senha após o primeiro acesso em <strong style="color:#ccc;">Perfil → Segurança</strong>.
    </p>
  </div>

  <div style="margin:0 24px 16px;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:20px;">
    <p style="color:#BFFF00;font-size:14px;font-weight:700;margin:0 0 12px;">✨ Seu Plano ${escapeHtml(planLabel)} inclui:</p>
    <ul style="color:#ccc;font-size:13px;line-height:2;margin:0;padding-left:20px;">
      <li>Acesso às formações e trilhas de conteúdo</li>
      <li>Mentorias ao vivo com especialistas</li>
      <li>Networking com outros sellers</li>
      <li>Recursos e ferramentas exclusivas</li>
      ${plan === "pro" || plan === "business" || plan === "enterprise" ? "<li>Benefícios e descontos com parceiros</li>" : ""}
      ${plan === "business" || plan === "enterprise" ? "<li>Suporte prioritário e consultoria</li>" : ""}
    </ul>
  </div>

  <div style="padding:0 24px 32px;text-align:center;">
    <a href="${escapeHtml(platformUrl)}" target="_blank" style="display:inline-block;background:#BFFF00;color:#000;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
      🚀 Acessar a Plataforma
    </a>
  </div>

  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} MAP Educação. Todos os direitos reservados.</p>
  </div>

</div>
</body>
</html>`,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Failed to send welcome email: ${JSON.stringify(error)}`);
  }

  console.log("Welcome email sent to:", email);
}

// ─── Call Conta Azul integration ─────────────────────────────────────────
async function callContaAzulIntegration(
  customerEmail: string,
  customerName: string,
  customerPhone: string | null,
  amount: number,
  plan: string,
  userId: string,
  customerDocument: string | null,
  customerPersonType: string | null,
  asaasCustomerId: string | null = null,
  installments: number = 1
): Promise<void> {
  try {
    const contaAzulUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/conta-azul-integration`;
    const response = await fetch(contaAzulUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        customer: {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          document: customerDocument,
          person_type: customerPersonType,
          asaas_customer_id: asaasCustomerId,
        },
        amount: Math.round(amount * 100), // Convert BRL to cents
        product_name: `MAP Acelera - Plano ${getPlanLabel(plan)}`,
        user_id: userId,
        installments,
      }),
    });

    if (!response.ok) {
      console.warn("Conta Azul integration failed:", await response.text());
    } else {
      console.log("Conta Azul sale registered successfully");
    }
  } catch (err) {
    console.warn("Conta Azul integration error (non-blocking):", err);
  }
}

// ─── Send member data to Central DB (other team) ─────────────────────────
// Non-blocking. Any error is only logged and never thrown.
async function sendMemberToCentralDb(
  name: string,
  email: string,
  opts: { plan?: string | null; phone?: string | null } = {}
): Promise<string> {
  const endpoint = Deno.env.get("CENTRAL_MEMBERS_ENDPOINT");
  const token = Deno.env.get("CENTRAL_MEMBERS_TOKEN");
  if (!endpoint || !token) {
    return "skipped: not configured";
  }

  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-central-token": token,
      },
      body: JSON.stringify({
        name,
        email,
        source: "asaas",
        plan: opts.plan ?? null,
        phone: opts.phone ?? null,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      console.warn("Central DB sync failed:", resp.status, errText);
      return `error: ${resp.status}`;
    }
    return "ok";
  } catch (err) {
    console.warn("Central DB sync exception (non-blocking):", err);
    return `exception: ${String(err)}`;
  }
}



// ─── Main handler ────────────────────────────────────────────────────────
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

  const supabaseAdmin = getSupabaseAdmin();
  const steps: Record<string, string> = {};

  try {
    // ── 1. Validate webhook token ──────────────────────────────────────
    const webhookToken = req.headers.get("asaas-access-token");
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

    if (!webhookToken || webhookToken !== expectedToken) {
      console.error("Invalid webhook token");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json();
    const eventType = payload.event;
    const payment = payload.payment || {};

    // ── 2. Validate payload ────────────────────────────────────────────
    if (!eventType || typeof eventType !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required field: event" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payment.id || !payment.status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: payment.id, payment.status" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plan = identifyPlan(payment.value || 0, payment.description);

    // ── 3. Fetch customer data from Asaas API ───────────────────────
    let customerEmail: string | null = payment.customer?.email || null;
    let customerName: string = payment.customer?.name || "Usuário";
    let customerPhone: string | null = payment.customer?.phone || null;
    let customerDocument: string | null = payment.customer?.cpfCnpj || null;
    let customerPersonType: string | null = payment.customer?.personType || null;
    const asaasCustomerIdRaw: string | null = typeof payment.customer === "string"
      ? payment.customer
      : payment.customer?.id || payment.customer || null;

    if ((!customerEmail || !customerDocument) && asaasCustomerIdRaw) {
      try {
        console.log("Fetching customer from Asaas API:", asaasCustomerIdRaw);
        const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
        if (!asaasApiKey) {
          steps.fetch_customer = "skipped: ASAAS_API_KEY not configured";
        } else {
          const customerResponse = await fetch(
            `https://api.asaas.com/v3/customers/${asaasCustomerIdRaw}`,
            { headers: { "access_token": asaasApiKey } }
          );

          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            customerEmail = customerData.email || customerEmail;
            customerName = customerData.name || customerName;
            customerPhone = customerData.mobilePhone || customerData.phone || customerPhone;
            customerDocument = customerData.cpfCnpj || customerDocument;
            customerPersonType = customerData.personType || customerPersonType;
            steps.fetch_customer = "ok";
            console.log("Asaas customer fetched:", { email: customerEmail, name: customerName, document: customerDocument, personType: customerPersonType });
          } else {
            const errText = await customerResponse.text();
            steps.fetch_customer = `error: ${customerResponse.status} ${errText}`;
            console.error("Asaas customer API error:", customerResponse.status, errText);
          }
        }
      } catch (fetchErr) {
        steps.fetch_customer = `exception: ${String(fetchErr)}`;
        console.error("Failed to fetch Asaas customer:", fetchErr);
      }
    } else {
      steps.fetch_customer = customerEmail ? "email_in_payload" : "no_customer_id";
    }

    // ── 3b. Fallback: lookup via payment_identifiers if still no email ──
    if (!customerEmail && asaasCustomerIdRaw) {
      try {
        console.log("Fallback: looking up user via payment_identifiers for asaas_customer_id:", asaasCustomerIdRaw);
        const { data: piData } = await supabaseAdmin
          .from("payment_identifiers")
          .select("user_id")
          .eq("asaas_customer_id", asaasCustomerIdRaw)
          .maybeSingle();

        if (piData?.user_id) {
          // Get email from auth.users
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(piData.user_id);
          if (userData?.user?.email) {
            customerEmail = userData.user.email;
            steps.fallback_payment_identifiers = `ok: found email via user ${piData.user_id}`;
            console.log("Fallback success: email found via payment_identifiers:", customerEmail);

            // Also try to get name from profile if still default
            if (customerName === "Usuário") {
              const { data: profileData } = await supabaseAdmin
                .from("profiles")
                .select("name, phone")
                .eq("user_id", piData.user_id)
                .maybeSingle();
              if (profileData?.name) customerName = profileData.name;
              if (!customerPhone && profileData?.phone) customerPhone = profileData.phone;
            }
          } else {
            steps.fallback_payment_identifiers = "user found but no email";
          }
        } else {
          steps.fallback_payment_identifiers = "no match in payment_identifiers";
        }
      } catch (fallbackErr) {
        steps.fallback_payment_identifiers = `exception: ${String(fallbackErr)}`;
        console.error("Fallback payment_identifiers lookup failed:", fallbackErr);
      }
    }

    // ── 3c. Fallback: lookup via profiles by name (last resort) ──
    if (!customerEmail && customerName && customerName !== "Usuário") {
      try {
        console.log("Last resort fallback: looking up user by name:", customerName);
        const { data: profileByName } = await supabaseAdmin
          .from("profiles")
          .select("user_id")
          .ilike("name", customerName)
          .maybeSingle();

        if (profileByName?.user_id) {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profileByName.user_id);
          if (userData?.user?.email) {
            customerEmail = userData.user.email;
            steps.fallback_name_lookup = `ok: found email via name match (user ${profileByName.user_id})`;
            console.log("Name fallback success:", customerEmail);
          } else {
            steps.fallback_name_lookup = "user found but no email";
          }
        } else {
          steps.fallback_name_lookup = "no profile match by name";
        }
      } catch (nameErr) {
        steps.fallback_name_lookup = `exception: ${String(nameErr)}`;
        console.error("Name fallback failed:", nameErr);
      }
    }

    console.log(`Asaas webhook: ${eventType} | Payment: ${payment.id} | Value: R$${payment.value} | Plan: ${plan} | Email: ${customerEmail}`);

    // ── 4. Log event in payment_events ─────────────────────────────────
    try {
      await supabaseAdmin.from("payment_events").insert({
        event_type: eventType,
        payment_id: payment.id,
        customer_email: customerEmail,
        customer_name: customerName,
        amount: payment.value || null,
        plan,
        status: payment.status,
        raw_payload: payload,
      });
      steps.log_payment_event = "ok";
    } catch (logErr) {
      steps.log_payment_event = `error: ${String(logErr)}`;
      console.warn("Failed to log payment_event (non-blocking):", logErr);
    }

    // ── 4b. Espelhar o evento no CRM (projeto crm-map-educacao) ────────
    // Pagou -> lead vira Ganho. Venceu/estornou -> Perdido (Cancelamento).
    // Regularizou -> volta pra Ganho.
    //
    // FIRE-AND-FORGET DE PROPÓSITO: qualquer erro aqui é engolido. O acesso do
    // membro pagante não pode depender de o CRM estar de pé, e devolver erro
    // pro Asaas pausaria a fila inteira deste webhook.
    //
    // Desligar = remover a env CRM_API_URL. Sem ela, este bloco é no-op.
    {
      const CRM_GANHO: Record<string, string> = {
        PAYMENT_CONFIRMED: "Pagamento confirmado",
        PAYMENT_RECEIVED: "Pagamento recebido",
      };
      const CRM_PERDIDO: Record<string, string> = {
        PAYMENT_OVERDUE: "Vencido sem pagamento",
        PAYMENT_REFUNDED: "Pagamento estornado",
        PAYMENT_CHARGEBACK_REQUESTED: "Chargeback solicitado",
      };

      const detail = CRM_GANHO[eventType] ?? CRM_PERDIDO[eventType];

      // A conta Asaas é compartilhada entre a comunidade e as vendas do CRM.
      // Sem filtro, a mensalidade atrasada de um membro que um dia foi lead
      // jogaria esse lead pra "perdido" no CRM.
      const ref = String(payment.externalReference || "").trim().toLowerCase();
      // Marcador explícito: o SDR digita "crm" na Referência externa ao criar a
      // cobrança. Vence qualquer heurística — é a diferença entre a cobrança
      // DIZER de quem ela é e a gente adivinhar pelo valor. Sem isso, uma venda
      // que custe exatamente o preço de um plano (997, 397...) seria descartada
      // em silêncio, e com preço fixo isso não seria azar: seria toda venda.
      const ehVendaDoCrm = ref.startsWith("crm");
      // Heurística, usada só quando não há marcador. Reusa isFullPlanPayment(),
      // que já é a definição de "cobrança de plano nosso" usada acima.
      const ehDaComunidade = !ehVendaDoCrm && (
        !!payment.subscription
        || isFullPlanPayment(payment.value || 0)
        || ref.startsWith("upgrade_")
      );

      const crmUrl = Deno.env.get("CRM_API_URL");
      const crmKey = Deno.env.get("CRM_API_KEY");

      if (!detail) {
        steps.crm_sync = `skipped: evento ${eventType} não move lead`;
      } else if (ehDaComunidade) {
        steps.crm_sync = "skipped: cobrança da comunidade";
      } else if (!crmUrl || !crmKey) {
        steps.crm_sync = "skipped: CRM_API_URL/CRM_API_KEY não configuradas";
      } else {
        // Aceita CRM_API_URL com ou sem "/deals-api" no fim.
        const base = crmUrl.replace(/\/+$/, "").replace(/\/deals-api$/i, "");
        try {
          const resp = await fetch(`${base}/deals-api/payment-event`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${crmKey}`,
            },
            body: JSON.stringify({
              // Id do EVENTO, não do pagamento: pagou -> venceu -> pagou de
              // novo repetiria o id do pagamento e o CRM descartaria como
              // duplicado, deixando o lead preso em "perdido".
              event_id: payload.id || `${eventType}:${payment.id}`,
              event: eventType,
              payment_id: payment.id,
              outcome: CRM_GANHO[eventType] ? "ganho" : "perdido",
              detail,
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              value: payment.value,
              external_reference: payment.externalReference,
            }),
            signal: AbortSignal.timeout(8000),
          });
          steps.crm_sync = resp.ok
            ? `ok: ${JSON.stringify(await resp.json())}`
            : `http ${resp.status}: ${await resp.text()}`;
        } catch (crmErr) {
          steps.crm_sync = `exception: ${String(crmErr)}`;
          console.warn("CRM sync falhou (non-blocking):", crmErr);
        }
      }

      console.log(`[crm-sync] ${eventType} / ${payment.id} -> ${steps.crm_sync}`);
    }

    // ── 5. Handle PAYMENT_REFUNDED separately ─────────────────────
    // PAYMENT_REFUNDED needs special handling:
    //   - Upgrade refund within 7 days: cancel upgrade + revert to previous plan
    //   - Upgrade refund after 7 days: cancel upgrade only (no plan reversion)
    //   - Regular subscription refund: clear subscription entirely
    if (eventType === "PAYMENT_REFUNDED") {
      const externalRef = payment.externalReference || "";
      let isUpgradeRefund = false;
      let upgradeHandledPlanReversion = false;

      // 5a. If it's an upgrade refund, apply 7-day window logic
      if (externalRef.startsWith("upgrade_")) {
        isUpgradeRefund = true;
        const now = new Date().toISOString();
        try {
          // Find the upgrade record
          const { data: upgrade, error: upgradeErr } = await supabaseAdmin
            .from("plan_upgrades")
            .select("*")
            .eq("external_reference", externalRef)
            .single();

          if (upgradeErr || !upgrade) {
            steps.upgrade_refund = `not_found: ${upgradeErr?.message || "missing"}`;
            console.warn(`[UPGRADE REFUND] Record not found: ${externalRef}`);
          } else if (upgrade.status !== "paid") {
            // Upgrade was never paid — just cancel it
            await supabaseAdmin.from("plan_upgrades")
              .update({ status: "cancelled", cancelled_at: now, webhook_received_at: now, updated_at: now })
              .eq("id", upgrade.id)
              .in("status", ["pending", "payment_created"]);
            steps.upgrade_refund = "cancelled (not yet paid)";
            console.log(`[UPGRADE REFUND] ${externalRef} cancelled (was ${upgrade.status}) | payment: ${payment.id}`);
          } else {
            // Upgrade was paid — check 7-day refund window
            const paidAt = upgrade.paid_at ? new Date(upgrade.paid_at) : new Date(upgrade.updated_at);
            const refundAt = new Date();
            const daysSincePaid = (refundAt.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24);
            const withinWindow = daysSincePaid <= 7;

            // Mark upgrade as refunded
            await supabaseAdmin.from("plan_upgrades")
              .update({ status: "refunded", cancelled_at: now, webhook_received_at: now, updated_at: now })
              .eq("id", upgrade.id);

            if (withinWindow) {
              // WITHIN 7 DAYS: revert user to previous plan
              const previousPlan = upgrade.current_plan;
              await supabaseAdmin.from("profiles")
                .update({
                  subscription_plan: previousPlan,
                  subscription_status: "active",
                  updated_at: now,
                })
                .eq("user_id", upgrade.user_id);

              upgradeHandledPlanReversion = true;
              steps.upgrade_refund = `refunded_reverted (${daysSincePaid.toFixed(1)}d) → plan restored to ${previousPlan}`;
              console.log(`[UPGRADE REFUND] ${externalRef} refunded within window (${daysSincePaid.toFixed(1)}d). User ${upgrade.user_id} reverted to plan: ${previousPlan}`);

              // Notify user
              try {
                const planLabels: Record<string, string> = { basic: "Basic", pro: "Pro", business: "Business" };
                await supabaseAdmin.from("notifications").insert({
                  user_id: upgrade.user_id,
                  title: "Upgrade Reembolsado",
                  message: `Seu upgrade foi reembolsado e seu plano voltou para ${planLabels[previousPlan] || previousPlan}.`,
                  type: "subscription",
                });
              } catch (_) { /* non-blocking */ }
            } else {
              // AFTER 7 DAYS: cancel upgrade record but do NOT revert plan
              steps.upgrade_refund = `refunded_no_revert (${daysSincePaid.toFixed(1)}d) — outside 7-day window`;
              console.log(`[UPGRADE REFUND] ${externalRef} refunded outside window (${daysSincePaid.toFixed(1)}d). Plan NOT reverted. Manual review needed.`);
            }
          }
        } catch (e) {
          steps.upgrade_refund = `error: ${String(e)}`;
          console.error(`[UPGRADE REFUND] Error processing ${externalRef}:`, e);
        }
      }

      // 5b. Global refund: clear subscription from profile
      // Only runs for regular subscription refunds (NOT upgrade refunds that already handled plan reversion)
      if (!isUpgradeRefund) {
        try {
          let refundUserId: string | null = null;

          if (asaasCustomerIdRaw) {
            const { data: pi } = await supabaseAdmin
              .from("payment_identifiers")
              .select("user_id")
              .eq("asaas_customer_id", asaasCustomerIdRaw)
              .maybeSingle();
            refundUserId = pi?.user_id || null;
          }

          if (!refundUserId && customerEmail) {
            const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
            const matchedUser = userData?.users?.find(
              (u: any) => u.email?.toLowerCase() === customerEmail!.toLowerCase()
            );
            refundUserId = matchedUser?.id || null;
          }

          if (refundUserId) {
            await supabaseAdmin.from("profiles")
              .update({
                subscription_status: "refunded",
                subscription_end_date: null,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", refundUserId);
            steps.global_refund = `ok: user ${refundUserId}`;
            // Enriquecimento (fail-safe): motivo do cancelamento, nunca bloqueia o fluxo.
            try {
              const { data: refundProfile } = await supabaseAdmin
                .from("profiles")
                .select("subscription_start_date")
                .eq("user_id", refundUserId)
                .maybeSingle();
              await recordCancelReason(supabaseAdmin, {
                userId: refundUserId,
                reason: classifyRefund(refundProfile?.subscription_start_date) ?? "refund_requested",
                source: "asaas_webhook",
                detail: `Asaas ${eventType} | payment ${payment.id}`,
              });
            } catch (reasonErr) {
              console.error("[CANCEL_REASON] asaas refund:", String(reasonErr));
            }
            console.log(`[REFUND] Subscription cleared for user ${refundUserId} | payment: ${payment.id}`);
          } else {
            steps.global_refund = "skipped: user not found";
            console.warn(`[REFUND] Could not find user for refund | payment: ${payment.id} | email: ${customerEmail}`);
          }
        } catch (e) {
          steps.global_refund = `error: ${String(e)}`;
          console.error("[REFUND] Error processing global refund:", e);
        }
      } else {
        steps.global_refund = upgradeHandledPlanReversion
          ? "skipped: upgrade refund with plan reversion"
          : "skipped: upgrade refund (outside window, no reversion)";
      }

      // Log and return — refund fully handled above
      try {
        await supabaseAdmin.from("webhook_logs").insert({
          provider: "asaas",
          event_type: eventType,
          payload: payload,
          payment_id: payment.id,
          status: "success",
          customer_name: customerName,
          processed_at: new Date().toISOString(),
        });
      } catch (_) { /* ignore */ }

      return new Response(
        JSON.stringify({ success: true, message: "Refund processed", steps }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5c. Handle other upgrade-related negative events ────────────
    const UPGRADE_NEGATIVE_EVENTS: Record<string, { status: string; tsField: string }> = {
      PAYMENT_OVERDUE: { status: "failed", tsField: "failed_at" },
      PAYMENT_DELETED: { status: "cancelled", tsField: "cancelled_at" },
      PAYMENT_CHECKOUT_OVERDUE: { status: "failed", tsField: "failed_at" },
      PAYMENT_REPROVED_BY_RISK_ANALYSIS: { status: "failed", tsField: "failed_at" },
    };

    if (UPGRADE_NEGATIVE_EVENTS[eventType]) {
      const externalRef = payment.externalReference || "";
      if (externalRef.startsWith("upgrade_")) {
        const { status: newStatus, tsField } = UPGRADE_NEGATIVE_EVENTS[eventType];
        const now = new Date().toISOString();
        try {
          await supabaseAdmin.from("plan_upgrades")
            .update({ 
              status: newStatus, 
              [tsField]: now,
              webhook_received_at: now,
              updated_at: now,
            })
            .eq("external_reference", externalRef)
            .in("status", ["pending", "payment_created"]);
          steps.upgrade_negative_event = `${eventType} → ${newStatus}`;
          console.log(`[UPGRADE] ${externalRef} marked as ${newStatus} due to ${eventType} | payment: ${payment.id}`);
        } catch (e) {
          steps.upgrade_negative_event = `error: ${String(e)}`;
          console.error(`[UPGRADE] Failed to update status for ${externalRef}:`, e);
        }
      }
    }

    // ── 5d. Handle PAYMENT_OVERDUE for regular subscriptions ────────
    // When Asaas reports overdue, immediately expire the member and notify
    if (eventType === "PAYMENT_OVERDUE") {
      const externalRef = payment.externalReference || "";
      const invoiceUrl = payment.invoiceUrl || payment.bankSlipUrl || "";
      // Skip if it's an upgrade (already handled above)
      if (!externalRef.startsWith("upgrade_")) {
        let overdueUserId: string | null = null;
        let overdueUserEmail: string | null = customerEmail;
        let overdueUserName: string = customerName;

        // Find user by Asaas customer ID or email
        if (asaasCustomerIdRaw) {
          const { data: pi } = await supabaseAdmin
            .from("payment_identifiers")
            .select("user_id")
            .eq("asaas_customer_id", asaasCustomerIdRaw)
            .maybeSingle();
          overdueUserId = pi?.user_id || null;
        }

        if (!overdueUserId && customerEmail) {
          const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
          const matchedUser = userData?.users?.find(
            (u: any) => u.email?.toLowerCase() === customerEmail!.toLowerCase()
          );
          overdueUserId = matchedUser?.id || null;
          if (!overdueUserEmail) overdueUserEmail = matchedUser?.email || null;
        }

        if (overdueUserId) {
          const now = new Date().toISOString();

          // Get profile name
          const { data: profileData } = await supabaseAdmin
            .from("profiles")
            .select("name, subscription_plan, subscription_status")
            .eq("user_id", overdueUserId)
            .single();

          // Only expire if currently active
          if (profileData?.subscription_status === "active") {
            overdueUserName = profileData?.name || overdueUserName;
            const planLabel = getPlanLabel(profileData?.subscription_plan || "basic");

            // Expire the subscription
            await supabaseAdmin.from("profiles")
              .update({
                subscription_status: "expired",
                updated_at: now,
              })
              .eq("user_id", overdueUserId);

            // Enriquecimento (fail-safe): inadimplência como motivo.
            try {
              await recordCancelReason(supabaseAdmin, {
                userId: overdueUserId,
                reason: "payment_overdue",
                source: "asaas_webhook",
                detail: `Asaas PAYMENT_OVERDUE | payment ${payment.id}`,
              });
            } catch (reasonErr) {
              console.error("[CANCEL_REASON] asaas overdue:", String(reasonErr));
            }

            // In-app notification removed per business request

            // Send email to the member
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            if (resendApiKey && overdueUserEmail) {
              const resend = new (await import("https://esm.sh/resend@4.0.0")).Resend(resendApiKey);

              // Email to member
              try {
                await resend.emails.send({
                  from: "MAP Acelera <contato@mapeducacao.com>",
                  to: [overdueUserEmail],
                  subject: "⚠️ Sua assinatura foi suspensa — Regularize seu pagamento",
                  html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #f59e0b;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#f59e0b;font-size:22px;margin:0 0 16px;">Pagamento não identificado</h2>
    <p style="color:#fff;font-size:15px;line-height:1.6;margin:0 0 16px;">
      Olá <strong>${escapeHtml(overdueUserName)}</strong>, não identificamos o pagamento da sua assinatura <strong>Plano ${escapeHtml(planLabel)}</strong>.
    </p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Seu acesso à plataforma foi temporariamente suspenso. Para recuperar o acesso a todas as formações, mentorias e benefícios, regularize seu pagamento.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${escapeHtml(invoiceUrl || 'https://wa.me/5522992739203?text=Ol%C3%A1%2C%20preciso%20regularizar%20meu%20pagamento')}" style="display:inline-block;background:#BFFF00;color:#000;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
        Regularizar Pagamento →
      </a>
    </div>
    <p style="color:#999;font-size:13px;line-height:1.5;margin:0;">
      Se você já efetuou o pagamento, por favor aguarde a confirmação ou entre em contato conosco respondendo este email.
    </p>
  </div>
  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} MAP Educação. Todos os direitos reservados.</p>
  </div>
</div>
</body>
</html>`,
                });
                steps.overdue_member_email = "ok";
                console.log(`[OVERDUE] Email sent to member: ${overdueUserEmail}`);
              } catch (e) {
                steps.overdue_member_email = `error: ${String(e)}`;
                console.error("[OVERDUE] Failed to send member email:", e);
              }

              // Email to CS team
              try {
                await resend.emails.send({
                  from: "MAP Acelera <contato@mapeducacao.com>",
                  to: ["sucesso@mapeducacao.com"],
                  subject: `🚨 Inadimplência — ${escapeHtml(overdueUserName)} (Plano ${escapeHtml(planLabel)}) não efetuou o pagamento`,
                  html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #ef4444;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#ef4444;font-size:22px;margin:0 0 16px;">🚨 Membro não efetuou o pagamento</h2>
    <p style="color:#fff;font-size:15px;line-height:1.6;margin:0 0 24px;">
      O membro <strong>${escapeHtml(overdueUserName)}</strong> não efetuou o pagamento da assinatura. O acesso à plataforma foi suspenso automaticamente.
    </p>
    <div style="background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#999;padding:8px 0;font-size:14px;">Nome</td><td style="color:#fff;padding:8px 0;font-size:14px;font-weight:600;">${escapeHtml(overdueUserName)}</td></tr>
        <tr><td style="color:#999;padding:8px 0;font-size:14px;">Email</td><td style="color:#fff;padding:8px 0;font-size:14px;">${escapeHtml(overdueUserEmail)}</td></tr>
        <tr><td style="color:#999;padding:8px 0;font-size:14px;">Plano</td><td style="color:#fff;padding:8px 0;font-size:14px;">${escapeHtml(planLabel)}</td></tr>
        <tr><td style="color:#999;padding:8px 0;font-size:14px;">Valor pendente</td><td style="color:#fff;padding:8px 0;font-size:14px;">R$ ${escapeHtml(payment.value || "N/A")}</td></tr>
        <tr><td style="color:#999;padding:8px 0;font-size:14px;">Data da suspensão</td><td style="color:#fff;padding:8px 0;font-size:14px;">${new Date().toLocaleDateString("pt-BR")}</td></tr>
        <tr><td style="color:#999;padding:8px 0;font-size:14px;">Payment ID</td><td style="color:#fff;padding:8px 0;font-size:14px;font-family:monospace;">${escapeHtml(payment.id)}</td></tr>
        ${invoiceUrl ? `<tr><td style="color:#999;padding:8px 0;font-size:14px;">Fatura</td><td style="color:#fff;padding:8px 0;font-size:14px;"><a href="${escapeHtml(invoiceUrl)}" style="color:#BFFF00;text-decoration:underline;">Ver fatura no Asaas</a></td></tr>` : ""}
      </table>
    </div>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;">
      O membro já recebeu um email automático com o link para regularizar o pagamento. Entre em contato para tentar recuperar.
    </p>
  </div>
  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">Alerta automático — MAP Acelera</p>
  </div>
</div>
</body>
</html>`,
                });
                steps.overdue_cs_email = "ok";
                console.log(`[OVERDUE] CS notification sent to sucesso@mapeducacao.com`);
              } catch (e) {
                steps.overdue_cs_email = `error: ${String(e)}`;
                console.error("[OVERDUE] Failed to send CS email:", e);
              }
            }

            steps.overdue_expire = `ok: user ${overdueUserId} expired`;
            console.log(`[OVERDUE] Subscription expired for ${overdueUserName} (${overdueUserId}) | payment: ${payment.id}`);
          } else {
            steps.overdue_expire = `skipped: status is ${profileData?.subscription_status || "unknown"}`;
          }
        } else {
          steps.overdue_expire = "skipped: user not found";
          console.warn(`[OVERDUE] Could not find user | email: ${customerEmail} | payment: ${payment.id}`);
        }

        // Log webhook
        try {
          await supabaseAdmin.from("webhook_logs").insert({
            provider: "asaas",
            event_type: eventType,
            payload: payload,
            payment_id: payment.id,
            status: "success",
            customer_name: customerName,
            processed_at: new Date().toISOString(),
          });
        } catch (_) { /* ignore */ }

        return new Response(
          JSON.stringify({ success: true, message: "Overdue processed", steps }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 5e. Only process confirmed payments beyond this point ───────
    if (eventType !== "PAYMENT_CONFIRMED" && eventType !== "PAYMENT_RECEIVED") {
      console.log("Event logged but not processed:", eventType);
      return new Response(
        JSON.stringify({ success: true, message: "Event logged but not processed", steps }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5b. Check if this is an upgrade payment ───────────────────────
    const externalReference = payment.externalReference || "";
    if (externalReference.startsWith("upgrade_")) {
      console.log(`[UPGRADE] Processing confirmed payment: ${externalReference} | payment: ${payment.id}`);
      const now = new Date().toISOString();
      try {
        // Find the upgrade record
        const { data: upgrade, error: upgradeErr } = await supabaseAdmin
          .from("plan_upgrades")
          .select("*")
          .eq("external_reference", externalReference)
          .single();

        if (upgradeErr || !upgrade) {
          steps.upgrade_lookup = `error: ${upgradeErr?.message || "not found"}`;
          console.error("[UPGRADE] Record not found for:", externalReference);
        } else if (upgrade.status === "paid") {
          // Idempotência: upgrade já foi processado, retornar sucesso sem reprocessar
          steps.upgrade_lookup = "already_paid (idempotent)";
          console.log(`[UPGRADE] Already processed (idempotent): ${externalReference}`);
        } else {
          // Mark upgrade as paid with audit timestamps
          await supabaseAdmin.from("plan_upgrades")
            .update({ 
              status: "paid", 
              asaas_payment_id: payment.id,
              paid_at: now,
              webhook_received_at: now,
              updated_at: now,
            })
            .eq("id", upgrade.id);

          // Activate the new plan on the user's profile
          const newPlan = upgrade.new_plan;
          await supabaseAdmin.from("profiles")
            .update({
              subscription_plan: newPlan,
              subscription_status: "active",
              updated_at: now,
            })
            .eq("user_id", upgrade.user_id);

          steps.upgrade_activation = "ok";
          steps.upgrade_new_plan = newPlan;
          console.log(`[UPGRADE] Activated: user ${upgrade.user_id} → plan ${newPlan} | payment: ${payment.id}`);

          // ── Old payment (subscription or installment) is NOT touched ──
          // The upgrade is a standalone complementary charge.
          // Old payments continue as-is regardless of type.
          steps.cancel_previous_subscription = "skipped: upgrade is standalone charge, old payments untouched";
          console.log("[UPGRADE] Old payment plan untouched (standalone upgrade charge)");

          // Create notification for the user
          try {
            const planLabels: Record<string, string> = { basic: "Basic", pro: "Pro", business: "Business" };
            await supabaseAdmin.from("notifications").insert({
              user_id: upgrade.user_id,
              title: "Upgrade Confirmado! 🚀",
              message: `Seu plano foi atualizado para ${planLabels[newPlan] || newPlan}. Aproveite os novos benefícios!`,
              type: "subscription",
            });
            steps.upgrade_notification = "ok";
          } catch (e) {
            steps.upgrade_notification = `error: ${String(e)}`;
          }
        }

        // Log the webhook and return (skip normal user provisioning flow)
        try {
          await supabaseAdmin.from("webhook_logs").insert({
            provider: "asaas",
            event_type: eventType,
            payload: payload,
            payment_id: payment.id,
            status: "success",
            customer_name: customerName,
            processed_at: now,
          });
        } catch (_) { /* ignore */ }

        return new Response(
          JSON.stringify({ success: true, message: "Upgrade payment processed", steps }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        steps.upgrade_processing = `error: ${String(e)}`;
        console.error("[UPGRADE] Error processing payment:", e);
        // Fall through to normal processing as fallback
      }
    }

    // ── 5b. Atomic dedup: INSERT with unique constraint on payment_id ──
    let earlyLogId: string | null = null;
    try {
      const { data: logData, error: logError } = await supabaseAdmin.from("webhook_logs").insert({
        provider: "asaas",
        event_type: eventType,
        payload: payload,
        payment_id: payment.id,
        status: "processing",
        customer_name: customerName,
        processed_at: new Date().toISOString(),
      }).select("id").single();

      if (logError) {
        // Unique constraint violation = duplicate
        if (logError.code === "23505") {
          console.log(`Duplicate webhook detected for payment ${payment.id}. Skipping.`);
          return new Response(
            JSON.stringify({ success: true, message: "Duplicate webhook — already processed", payment_id: payment.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw logError;
      }

      earlyLogId = logData?.id || null;
      steps.dedup_check = "no_duplicate";
      steps.early_log = "ok";
    } catch (e: any) {
      if (e?.code === "23505") {
        console.log(`Duplicate webhook detected for payment ${payment.id}. Skipping.`);
        return new Response(
          JSON.stringify({ success: true, message: "Duplicate webhook — already processed", payment_id: payment.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      steps.dedup_check = `error: ${String(e)}`;
      console.warn("Dedup/log insert failed (proceeding cautiously):", e);
    }

    if (!customerEmail) {
      console.error("No customer email found after all attempts");
      // Update early log status
      if (earlyLogId) {
        await supabaseAdmin.from("webhook_logs").update({ status: "error", error_message: "Missing customer email" }).eq("id", earlyLogId);
      }
      return new Response(
        JSON.stringify({ success: false, error: "Missing customer email", steps }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const asaasCustomerId = asaasCustomerIdRaw;

    // ── 5e. Accumulated payment check ──────────────────────────────────
    // If single payment matches a known plan value, activate immediately.
    // If not (partial/installment), sum all confirmed payments for this customer
    // and only activate when total >= plan value.
    let shouldActivate = true;
    let activationPlan = plan;

    if (!isFullPlanPayment(payment.value || 0)) {
      try {
        // Sum all confirmed payments for this customer email
        const { data: previousPayments, error: sumErr } = await supabaseAdmin
          .from("payment_events")
          .select("amount")
          .eq("customer_email", customerEmail)
          .in("event_type", ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

        if (!sumErr && previousPayments) {
          const totalPaid = previousPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
          const result = identifyPlanFromTotal(totalPaid, payment.description);
          activationPlan = result.plan;
          shouldActivate = result.shouldActivate;
          steps.accumulated_total = `R$${totalPaid.toFixed(2)}`;
          steps.accumulated_plan = activationPlan;
          steps.accumulated_should_activate = String(shouldActivate);
          console.log(`[ACCUMULATION] Customer ${customerEmail}: total R$${totalPaid.toFixed(2)} → plan: ${activationPlan}, activate: ${shouldActivate}`);
        } else {
          steps.accumulated_check = `error: ${sumErr?.message || "no data"}`;
          console.warn("[ACCUMULATION] Failed to sum payments:", sumErr);
        }
      } catch (e) {
        steps.accumulated_check = `exception: ${String(e)}`;
        console.warn("[ACCUMULATION] Error checking accumulated payments:", e);
        // On error, don't activate (safe default)
        shouldActivate = false;
      }
    } else {
      steps.accumulated_check = "skipped: full plan payment";
    }

    // For existing active users receiving payments, always keep them active (renewal)
    // This check happens after we find the user below

    // ── 6. Find or create user ─────────────────────────────────────────
    let user: any = null;
    let provisionalPassword: string | null = null;
    let isNewUser = false;

    try {
      // 1) Try by asaas_customer_id (most reliable, immune to email changes)
      if (asaasCustomerId) {
        const { data: piRow } = await supabaseAdmin
          .from("payment_identifiers")
          .select("user_id")
          .eq("asaas_customer_id", asaasCustomerId)
          .maybeSingle();
        if (piRow?.user_id) {
          const { data: byId } = await supabaseAdmin.auth.admin.getUserById(piRow.user_id);
          if (byId?.user) user = byId.user;
        }
      }

      // 2) Fallback: paginated listUsers by email (perPage max 1000)
      if (!user && customerEmail) {
        const needle = customerEmail.toLowerCase();
        for (let page = 1; page <= 20 && !user; page++) {
          const { data: userData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
          const list = userData?.users || [];
          user = list.find((u: any) => u.email?.toLowerCase() === needle) || null;
          if (list.length < 1000) break;
        }
      }
      steps.find_user = user ? "found" : "not_found";
    } catch (e) {
      steps.find_user = `error: ${String(e)}`;
      console.error("Error looking up user:", e);
    }

    // For existing users with active subscription, always keep active (renewal payment)
    if (user && !shouldActivate) {
      try {
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("subscription_status")
          .eq("user_id", user.id)
          .single();
        
        if (existingProfile?.subscription_status === "active") {
          shouldActivate = true;
          steps.accumulated_override = "existing active user — treating as renewal";
          console.log(`[ACCUMULATION] User ${user.id} already active — keeping active (renewal)`);
        }
      } catch (_) { /* proceed with shouldActivate = false */ }
    }

    if (!user) {
      // Create new user
      isNewUser = true;
      provisionalPassword = generateProvisionalPassword();

      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: customerEmail,
          password: provisionalPassword,
          email_confirm: true,
          user_metadata: { name: customerName },
        });

        if (authError) {
          steps.create_user = `error: ${authError.message}`;
          console.error("Error creating user:", authError);
          // Save as pending payment
          try {
            await supabaseAdmin.from("pending_payments").insert({
              customer_email: customerEmail,
              customer_name: customerName,
              amount: payment.value || 0,
              plan: activationPlan,
              asaas_payment_id: payment.id,
            });
            steps.pending_payment = "saved";
          } catch (pp) {
            steps.pending_payment = `error: ${String(pp)}`;
          }
        } else {
          user = authData.user;
          steps.create_user = "ok";
          console.log("New user created:", user.id);
        }
      } catch (e) {
        steps.create_user = `exception: ${String(e)}`;
        console.error("Create user exception:", e);
      }
    }

    // ── 7. Create/update profile ───────────────────────────────────────
    // Determine renewal period:
    // - Parcela de plano anual parcelado (installmentCount > 1) → +365 dias
    // REGRA: Todo pagamento ativo concede acesso por 1 ANO (365 dias).
    // Se for recorrente mensal e o membro deixar de pagar, o webhook de
    // PAYMENT_OVERDUE/inadimplência expira e cancela o acesso automaticamente.
    const paymentAmount = Math.round(payment.value || 0);
    const installmentCount = Number(payment.installmentCount || 0);
    const installmentGroupId = payment.installment || null;
    const isInstallmentOfAnnual = installmentCount > 1 || !!installmentGroupId;

    const renewalDays = 365;
    steps.renewal_logic = `value=${paymentAmount} installmentCount=${installmentCount} installment=${installmentGroupId} → ${renewalDays}d (sempre 1 ano)`;

    const subscriptionStatus = shouldActivate ? "active" : "pending";
    const newComputedEndDate = shouldActivate
      ? new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Buscar end_date atual para nunca REDUZIR (proteção contra parcelas)
    let existingEndDate: string | null = null;
    let existingStartDate: string | null = null;
    let existingPlan: string | null = null;
    let planLocked = false;
    if (user) {
      try {
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("subscription_end_date, subscription_start_date, subscription_plan, plan_locked")
          .eq("user_id", user.id)
          .single();
        existingEndDate = existing?.subscription_end_date ?? null;
        existingStartDate = existing?.subscription_start_date ?? null;
        existingPlan = existing?.subscription_plan ?? null;
        planLocked = existing?.plan_locked === true;
      } catch (_) {}
    }

    // Se o plano estiver travado manualmente, NÃO sobrescrever o plano (mantém o atual)
    const finalPlan = planLocked && existingPlan ? existingPlan : activationPlan;
    if (planLocked) {
      steps.plan_locked = `kept ${existingPlan} (webhook would set ${activationPlan})`;
    }

    // Manter o end_date mais distante no futuro (nunca reduzir).
    // EXCEÇÃO: se for parcela de plano anual e já existe end_date, NÃO estender —
    // as parcelas mensais de um anual não devem somar +365d cada (gera 24+ meses).
    const subscriptionEndDate = (() => {
      if (!newComputedEndDate) return null;
      if (!existingEndDate) return newComputedEndDate;
      if (isInstallmentOfAnnual) {
        // Parcela de anual: mantém o end_date existente (não estende)
        steps.end_date_logic = `installment of annual: kept existing ${existingEndDate}`;
        return existingEndDate;
      }
      return new Date(existingEndDate) > new Date(newComputedEndDate)
        ? existingEndDate
        : newComputedEndDate;
    })();

    // Preservar o start_date original se já existir (não resetar em parcelas/renovações)
    const subscriptionStartDate = existingStartDate ?? new Date().toISOString();

    if (user) {
      try {
        if (isNewUser) {
          const profileData: any = {
            user_id: user.id,
            name: customerName,
            subscription_status: subscriptionStatus,
            subscription_plan: finalPlan,
            subscription_start_date: subscriptionStartDate,
          };
          if (subscriptionEndDate) {
            profileData.subscription_end_date = subscriptionEndDate;
          }
          const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
            profileData,
            { onConflict: "user_id" }
          );
          // Store payment identifier separately
          if (asaasCustomerId) {
            await supabaseAdmin.from("payment_identifiers").upsert({
              user_id: user.id,
              asaas_customer_id: asaasCustomerId,
            }, { onConflict: "user_id" });
          }
          steps.profile = profileErr ? `error: ${profileErr.message}` : `created (${subscriptionStatus})`;
          if (profileErr) console.error("Profile upsert error:", profileErr);
        } else {
          // Usuário existente: NÃO sobrescrever start_date (preserva data original da compra)
          const updateData: any = {
            subscription_status: subscriptionStatus,
            subscription_plan: finalPlan,
          };
          if (subscriptionEndDate) {
            updateData.subscription_end_date = subscriptionEndDate;
          }
          const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update(updateData)
            .eq("user_id", user.id);
          steps.profile = updateError ? `error: ${updateError.message}` : `updated (${subscriptionStatus})`;
          // Store payment identifier separately
          if (asaasCustomerId) {
            await supabaseAdmin.from("payment_identifiers").upsert({
              user_id: user.id,
              asaas_customer_id: asaasCustomerId,
            }, { onConflict: "user_id" });
          }
          if (updateError) console.error("Profile update error:", updateError);
        }
      } catch (e) {
        steps.profile = `exception: ${String(e)}`;
        console.error("Profile exception:", e);
      }

      // Onboarding + role for new users
      if (isNewUser) {
        try {
          await supabaseAdmin.from("user_onboarding").insert({
            user_id: user.id,
            current_step: 0,
            full_name: customerName,
            whatsapp: customerPhone || null,
          });
          steps.onboarding = "ok";
        } catch (e) {
          steps.onboarding = `error: ${String(e)}`;
        }

        try {
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: user.id, role: "user" },
            { onConflict: "user_id,role" }
          );
          steps.role = "ok";
        } catch (e) {
          steps.role = `error: ${String(e)}`;
        }
      }

      // Update whatsapp for existing users if we have a phone and they don't
      if (!isNewUser && customerPhone) {
        try {
          await supabaseAdmin
            .from("user_onboarding")
            .update({ whatsapp: customerPhone })
            .eq("user_id", user.id)
            .is("whatsapp", null);
          steps.update_whatsapp = "ok";
        } catch (e) {
          steps.update_whatsapp = `error: ${String(e)}`;
        }
      }

      // Existing users should not receive password reset on recurring payments
      if (!isNewUser) {
        steps.password_reset = "skipped: existing user";
      }
    }

    // ── 8. Send welcome email (NEW users only, with atomic lock, ONLY when activated) ────────
    if (isNewUser && user && provisionalPassword && shouldActivate) {
      let welcomeLockId: string | null = null;

      try {
        const { data: lockData, error: lockError } = await supabaseAdmin
          .from("webhook_logs")
          .insert({
            provider: "asaas",
            event_type: "WELCOME_EMAIL_SENT",
            payment_id: `welcome:${user.id}`,
            status: "processing",
            customer_name: customerName,
            payload: {
              user_id: user.id,
              customer_email: customerEmail,
              source_payment_id: payment.id,
            },
            processed_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (lockError) {
          if ((lockError as any)?.code === "23505") {
            steps.email = "skipped: already sent previously";
          } else {
            throw lockError;
          }
        } else {
          welcomeLockId = lockData?.id || null;
          await sendWelcomeEmail(customerEmail, customerName, finalPlan, provisionalPassword);
          steps.email = "ok";

          // Notify Make webhook with credentials for WhatsApp delivery
          try {
            const rawDigits = (customerPhone || "").replace(/\D/g, "");
            const phoneE164 = rawDigits
              ? (rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`)
              : "";
            if (phoneE164) {
              const caption = `🔐 *Bem-vindo à MAP Acelera, ${customerName}!*\n\nSua conta foi criada com sucesso.\n\n📧 *E-mail:* ${customerEmail}\n🔑 *Senha provisória:*\n${provisionalPassword}\n\n👉 Acesse agora: https://acelera.mapeducacao.com\n\n_Recomendamos alterar sua senha após o primeiro acesso em Perfil → Segurança._`;
              const makeRes = await fetch(Deno.env.get("MAKE_WEBHOOK_URL")!, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  tipo: "novo_usuario",
                  source: "novo_usuario",
                  apikey: Deno.env.get("MAKE_WEBHOOK_APIKEY")!,
                  numero: phoneE164,
                  nome: customerName,
                  email: customerEmail,
                  senha: provisionalPassword,
                  caption,
                }),
              });
              steps.notify_make_user = makeRes.ok ? "ok" : `error: ${makeRes.status}`;
              console.log("Make webhook (novo_usuario) sent:", { numero: phoneE164, status: makeRes.status });
            } else {
              steps.notify_make_user = "skipped: no phone from Asaas";
              console.log("Make webhook (novo_usuario) skipped: customer has no phone");
            }
          } catch (makeErr) {
            steps.notify_make_user = `error: ${String(makeErr)}`;
            console.warn("Make webhook (novo_usuario) failed (non-blocking):", makeErr);
          }

          if (welcomeLockId) {
            await supabaseAdmin
              .from("webhook_logs")
              .update({ status: "success" })
              .eq("id", welcomeLockId);
          }
        }
      } catch (emailErr) {
        steps.email = `error: ${String(emailErr)}`;
        console.warn("Welcome email failed (non-blocking):", emailErr);

        if (welcomeLockId) {
          await supabaseAdmin.from("webhook_logs").delete().eq("id", welcomeLockId);
        }
      }
    } else {
      steps.email = isNewUser 
        ? (shouldActivate ? "skipped: missing user/password" : "skipped: pending payment (not fully paid)")
        : "skipped: existing user";
    }

    // ── 9. Notify Bruno about payment (NEW users only, with atomic lock, ONLY when activated) ──
    if (isNewUser && user && customerEmail && shouldActivate) {
      let brunoLockId: string | null = null;

      try {
        const { data: lockData, error: lockError } = await supabaseAdmin
          .from("webhook_logs")
          .insert({
            provider: "asaas",
            event_type: "BRUNO_ONBOARDING_NOTIFIED",
            payment_id: `bruno:${user.id}`,
            status: "processing",
            customer_name: customerName,
            payload: {
              user_id: user.id,
              customer_email: customerEmail,
              source_payment_id: payment.id,
            },
            processed_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (lockError) {
          if ((lockError as any)?.code === "23505") {
            steps.notify_bruno = "skipped: already sent previously";
          } else {
            throw lockError;
          }
        } else {
          brunoLockId = lockData?.id || null;
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          if (resendApiKey) {
            const resend = new Resend(resendApiKey);
            const planLabel = getPlanLabel(finalPlan);
            await resend.emails.send({
              from: "MAP Acelera <onboarding@mapeducacao.com>",
              to: ["brunomesquita@mapeducacao.com"],
              subject: `💰 Confirmação de pagamento — ${escapeHtml(customerName)} (${escapeHtml(planLabel)})`,
              html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#BFFF00;font-size:20px;margin:0 0 16px;">Confirmação de Pagamento 💰</h2>
    <p style="color:#fff;font-size:15px;line-height:1.8;margin:0;">
      Tivemos a confirmação de pagamento do <strong>${escapeHtml(customerName)}</strong>
    </p>
    <div style="background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:20px;margin:16px 0;">
      <p style="color:#ccc;font-size:14px;margin:0 0 8px;">📞 <strong>Telefone:</strong> ${escapeHtml(customerPhone ? formatPhone(customerPhone) : "Não informado")}</p>
      <p style="color:#ccc;font-size:14px;margin:0 0 8px;">📧 <strong>E-mail:</strong> ${escapeHtml(customerEmail)}</p>
      <p style="color:#ccc;font-size:14px;margin:0;">📋 <strong>Plano:</strong> ${escapeHtml(planLabel)} (R$ ${escapeHtml(payment.value || 0)})</p>
    </div>
    <p style="color:#BFFF00;font-size:15px;font-weight:600;margin:16px 0 0;">
      Mande uma mensagem e agende uma reunião de onboarding 🚀
    </p>
  </div>
  <div style="background:#000;padding:16px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">Notificação interna — MAP Acelera</p>
  </div>
</div>
</body>
</html>`,
            });
            steps.notify_bruno = "ok";
          } else {
            steps.notify_bruno = "skipped: no RESEND_API_KEY";
          }

          if (brunoLockId) {
            await supabaseAdmin
              .from("webhook_logs")
              .update({ status: "success" })
              .eq("id", brunoLockId);
          }
        }
      } catch (e) {
        steps.notify_bruno = `error: ${String(e)}`;
        console.warn("Bruno notification email failed (non-blocking):", e);

        if (brunoLockId) {
          await supabaseAdmin.from("webhook_logs").delete().eq("id", brunoLockId);
        }
      }
    } else {
      steps.notify_bruno = isNewUser 
        ? (shouldActivate ? "skipped: missing user/email" : "skipped: pending payment (not fully paid)")
        : "skipped: existing user";
    }

    // ── 10. Conta Azul NFe integration ──────────────────────────────────
    // Três tipos de pagamento detectados pelo payload do Asaas:
    //   1) Recorrente   → payment.subscription presente. Venda mensal, 1x, valor = payment.value.
    //   2) Parcelado    → payment.installment presente. Cria venda só na 1ª parcela; valor TOTAL e
    //                     quantidade vêm de GET /v3/installments/{id} (webhook não manda installmentCount).
    //   3) À vista      → nem subscription nem installment. Valor = payment.value, 1 parcela.
    // Vencimento (installmentDueDate +2 meses) é mantido pela conta-azul-integration para todos.
    if (user) {
      const isRecurring = !!payment.subscription;
      const installmentGroupIdCa = payment.installment || null;
      const isInstallmentSale = !!installmentGroupIdCa;
      const installmentNumberCa = Number(payment.installmentNumber || 0);

      let shouldCreateSale = true;
      let saleAmount = Number(payment.value || 0); // valor da venda em REAIS
      let saleInstallments = 1;
      let saleTypeLabel: "recorrente" | "parcelado" | "a_vista" = "a_vista";

      if (isRecurring) {
        saleTypeLabel = "recorrente";
        saleAmount = Number(payment.value || 0);
        saleInstallments = 1;
      } else if (isInstallmentSale) {
        saleTypeLabel = "parcelado";
        if (installmentNumberCa > 1) {
          shouldCreateSale = false;
        } else {
          // Buscar contrato total na API do Asaas (webhook não envia installmentCount)
          try {
            const asaasKey = Deno.env.get("ASAAS_API_KEY");
            if (!asaasKey) throw new Error("ASAAS_API_KEY não configurada");
            const instResp = await fetch(
              `https://api.asaas.com/v3/installments/${installmentGroupIdCa}`,
              { headers: { "access_token": asaasKey, "Content-Type": "application/json" } }
            );
            if (!instResp.ok) {
              throw new Error(`Asaas /installments/${installmentGroupIdCa} → HTTP ${instResp.status}`);
            }
            const inst = await instResp.json();
            const totalValue = Number(inst.value);
            const totalCount = Number(inst.installmentCount);
            if (!Number.isFinite(totalValue) || totalValue <= 0 || !Number.isFinite(totalCount) || totalCount < 1) {
              throw new Error(`Asaas /installments resposta inválida: ${JSON.stringify(inst)}`);
            }
            // Usa o value TOTAL (sem multiplicação manual) para preservar centavos do contrato.
            saleAmount = totalValue;
            saleInstallments = totalCount;
          } catch (e) {
            // Fallback lossy: value × installmentCount do payload (pode perder centavos).
            const fallbackCount = Number(payment.installmentCount || 0);
            saleInstallments = fallbackCount > 0 ? fallbackCount : 1;
            saleAmount = fallbackCount > 0
              ? Number(payment.value || 0) * fallbackCount
              : Number(payment.value || 0);
            console.warn(`[CONTA_AZUL] fallback de installments para ${installmentGroupIdCa}:`, e);
          }
        }
      } else {
        saleTypeLabel = "a_vista";
        saleAmount = Number(payment.value || 0);
        saleInstallments = 1;
      }

      if (!shouldCreateSale) {
        steps.conta_azul = `skipped: parcela ${installmentNumberCa} (NFe emitida apenas na 1ª)`;
        console.log(`[CONTA_AZUL] skipping installment ${installmentNumberCa} for ${customerEmail}`);
      } else {
        // ── Validação de campos obrigatórios antes da Conta Azul ──
        const missing: string[] = [];
        if (!customerEmail) missing.push("customer.email");
        if (!customerName || customerName === "Usuário") missing.push("customer.name");
        if (!customerDocument) missing.push("customer.document (CPF/CNPJ)");
        if (!saleAmount || saleAmount <= 0) missing.push("amount > 0");

        if (missing.length > 0) {
          const msg = `[CONTA_AZUL] Venda NÃO criada — dados obrigatórios ausentes: ${missing.join(", ")} | payment: ${payment.id} | email: ${customerEmail} | doc: ${customerDocument} | phone: ${customerPhone}`;
          console.error(msg);
          steps.conta_azul = `blocked: missing ${missing.join(",")}`;
        } else {
          try {
            await callContaAzulIntegration(
              customerEmail,
              customerName,
              customerPhone,
              saleAmount,
              finalPlan,
              user.id,
              customerDocument,
              customerPersonType,
              asaasCustomerId,
              saleInstallments
            );
            steps.conta_azul = `ok (${saleTypeLabel}, R$${saleAmount.toFixed(2)}, ${saleInstallments}x)`;
          } catch (e) {
            steps.conta_azul = `error: ${String(e)}`;
            console.warn("Conta Azul failed (non-blocking):", e);
          }
        }
      }
    } else {
      steps.conta_azul = "skipped: no user";
    }

    // ── 10b. Central DB sync (other team) — non-blocking ────────────────
    if (
      (eventType === "PAYMENT_CONFIRMED" || eventType === "PAYMENT_RECEIVED") &&
      user &&
      customerEmail
    ) {
      try {
        steps.central_sync = await sendMemberToCentralDb(
          customerName,
          customerEmail,
          { plan: finalPlan, phone: customerPhone }
        );
      } catch (e) {
        steps.central_sync = `exception: ${String(e)}`;
        console.warn("Central DB sync top-level exception (non-blocking):", e);
      }
    } else {
      steps.central_sync = "skipped: not a confirmed payment or missing user/email";
    }



    // ── 11. Update early webhook log with final status ─────────────────
    if (earlyLogId) {
      try {
        await supabaseAdmin.from("webhook_logs").update({
          status: user ? "success" : "partial",
          customer_name: customerName,
          user_created_id: isNewUser && user ? user.id : null,
        }).eq("id", earlyLogId);
        steps.webhook_log = "updated";
      } catch (e) {
        steps.webhook_log = `error: ${String(e)}`;
      }
    }

    return new Response(
      JSON.stringify({
        success: !!user,
        activated: shouldActivate,
        message: !user
          ? "Payment processed but user creation failed"
          : !shouldActivate
          ? "Payment logged — awaiting full plan value to activate"
          : isNewUser
          ? "User created and subscription activated"
          : "Subscription activated",
        user_id: user?.id || null,
        plan: activationPlan,
        steps,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook top-level error:", error);

    // Even on unexpected errors, return 200
    try {
      await supabaseAdmin.from("webhook_logs").insert({
        provider: "asaas",
        event_type: "unknown",
        status: "error",
        error_message: String(error),
        processed_at: new Date().toISOString(),
      });
    } catch (_) { /* ignore */ }

    return new Response(
      JSON.stringify({ success: false, error: String(error), steps }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
