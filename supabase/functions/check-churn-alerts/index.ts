// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface InactiveMember {
  user_id: string;
  name: string;
  email: string;
  days_inactive: number;
  subscription_plan: string | null;
  last_activity: string | null;
}

async function getPhoneForUser(supabase: any, userId: string): Promise<string | null> {
  // Try to get phone from Asaas customer API
  const { data: paymentIds } = await supabase
    .from("payment_identifiers")
    .select("asaas_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (paymentIds?.asaas_customer_id) {
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    if (asaasApiKey) {
      try {
        const res = await fetch(`https://api.asaas.com/v3/customers/${paymentIds.asaas_customer_id}`, {
          headers: { access_token: asaasApiKey },
        });
        if (res.ok) {
          const data = await res.json();
          return data.mobilePhone || data.phone || null;
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}

async function sendChurnAlertEmail(
  members: { name: string; email: string; phone: string | null; days_inactive: number; alert_type: string }[]
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured — skipping churn alert email");
    return;
  }

  const resend = new Resend(resendApiKey);

  const rows = members
    .map(
      (m) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #333;color:#fff;">${m.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #333;color:#ccc;">${m.email}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #333;color:#ccc;">${m.phone || "N/A"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #333;text-align:center;">
          <span style="background:${m.alert_type === "60d" ? "#ef4444" : "#eab308"};color:${m.alert_type === "60d" ? "#fff" : "#000"};padding:4px 10px;border-radius:12px;font-size:12px;font-weight:700;">
            ${m.days_inactive}d
          </span>
        </td>
      </tr>`
    )
    .join("");

  const count30 = members.filter((m) => m.alert_type === "30d").length;
  const count60 = members.filter((m) => m.alert_type === "60d").length;

  const subject = `⚠️ Alerta de Churn — ${count30 > 0 ? `${count30} membros 30d` : ""}${count30 > 0 && count60 > 0 ? " | " : ""}${count60 > 0 ? `${count60} membros 60d` : ""}`;

  const { error } = await resend.emails.send({
    from: "MAP Acelera <onboarding@mapeducacao.com>",
    to: ["sucesso@mapeducacao.com"],
    subject,
    html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:700px;margin:0 auto;background:#1a1a1a;">
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
  </div>
  <div style="padding:24px;">
    <h2 style="color:#BFFF00;font-size:20px;margin:0 0 8px;">⚠️ Alerta de Churn</h2>
    <p style="color:#ccc;font-size:14px;margin:0 0 20px;">Os seguintes membros estão inativos e podem cancelar:</p>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#0a0a0a;">
          <th style="padding:10px 12px;text-align:left;color:#999;font-size:12px;text-transform:uppercase;">Nome</th>
          <th style="padding:10px 12px;text-align:left;color:#999;font-size:12px;text-transform:uppercase;">E-mail</th>
          <th style="padding:10px 12px;text-align:left;color:#999;font-size:12px;text-transform:uppercase;">Telefone</th>
          <th style="padding:10px 12px;text-align:center;color:#999;font-size:12px;text-transform:uppercase;">Inativo</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="background:#000;padding:16px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:11px;margin:0;">© ${new Date().getFullYear()} MAP Educação — Relatório automático de churn</p>
  </div>
</div>
</body>
</html>`,
  });

  if (error) {
    console.error("Failed to send churn alert email:", error);
    throw error;
  }

  console.log(`Churn alert email sent to Sucesso (${members.length} members)`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: aceita CRON_SECRET (cron job) ou SERVICE_ROLE_KEY (chamada interna)
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const providedSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isAuthorized =
    (!!cronSecret && providedSecret === cronSecret) ||
    (!!serviceKey && bearerToken === serviceKey);
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdmin();
  const alertsToSend: { name: string; email: string; phone: string | null; days_inactive: number; alert_type: string }[] = [];

  try {
    // Get members inactive 30+ days
    const { data: inactive30, error: err30 } = await supabase.rpc("get_inactive_members", {
      inactive_days: 30,
      limit_count: 200,
    });
    if (err30) throw err30;

    for (const member of (inactive30 || []) as InactiveMember[]) {
      const days = member.days_inactive || 0;
      const alertType = days >= 60 ? "60d" : "30d";

      // Check if we already sent this alert
      const { data: existing } = await supabase
        .from("churn_alert_logs")
        .select("id")
        .eq("user_id", member.user_id)
        .eq("alert_type", alertType)
        .maybeSingle();

      if (!existing) {
        const phone = await getPhoneForUser(supabase, member.user_id);
        alertsToSend.push({
          name: member.name,
          email: member.email,
          phone,
          days_inactive: days,
          alert_type: alertType,
        });

        // Log to prevent duplicate alerts
        await supabase.from("churn_alert_logs").insert({
          user_id: member.user_id,
          alert_type: alertType,
        });
      }
    }

    if (alertsToSend.length > 0) {
      await sendChurnAlertEmail(alertsToSend);
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_sent: alertsToSend.length,
        details: alertsToSend.map((a) => ({ name: a.name, alert_type: a.alert_type })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Churn alert error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
