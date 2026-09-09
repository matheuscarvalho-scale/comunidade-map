import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: CRON_SECRET ou SERVICE_ROLE_KEY
  const cronSecret = Deno.env.get("CRON_SECRET");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const providedSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!((cronSecret && providedSecret === cronSecret) || (serviceKey && bearerToken === serviceKey))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendKey);

    const spreadsheetUrl = "https://docs.google.com/spreadsheets/d/1WDHUBtc-pSPHmxk1vqGZ-bpEibvP0whbs4AnxWXwIyY/edit?usp=sharing";
    const logoUrl = "https://acelera.mapeducacao.com/images/logo-map-email.png";

    const now = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeZone: "America/Sao_Paulo",
    });
    const dateStr = formatter.format(now);

    const { data, error } = await resend.emails.send({
      from: "MAP Acelera <onboarding@mapeducacao.com>",
      to: ["brunomesquita@mapeducacao.com"],
      subject: `📊 Relatório Semanal - ${dateStr}`,
      html: `
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#141414;border-radius:16px;border:1px solid #222;">
<tr><td style="padding:40px 40px 20px;text-align:center;">
  <img src="${logoUrl}" alt="MAP Acelera" style="height:36px;" />
</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #2a2a2a;"></div></td></tr>
<tr><td style="padding:30px 40px 10px;">
  <h2 style="color:#ffffff;font-size:22px;margin:0 0 8px;">Olá Bruno 👋</h2>
  <p style="color:#a3a3a3;font-size:15px;line-height:1.7;margin:0;">
    Segue o relatório semanal atualizado. Clique no botão abaixo para acessar a planilha com os dados mais recentes.
  </p>
</td></tr>
<tr><td style="padding:24px 40px 30px;text-align:center;">
  <a href="${spreadsheetUrl}"
     style="background-color:#BFFF00;color:#0a0a0a;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;letter-spacing:0.3px;">
    📊 Abrir Planilha
  </a>
</td></tr>
<tr><td style="padding:0 40px;"><div style="border-top:1px solid #2a2a2a;"></div></td></tr>
<tr><td style="padding:20px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:10px;border:1px solid #2a2a2a;">
    <tr><td style="padding:16px 20px;">
      <p style="color:#a3a3a3;font-size:13px;margin:0;line-height:1.6;">
        🕐 <span style="color:#d4d4d4;">Enviado automaticamente</span> toda segunda-feira às 8h<br/>
        📅 <span style="color:#d4d4d4;">Data:</span> ${dateStr}
      </p>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:16px 40px 32px;text-align:center;">
  <p style="color:#525252;font-size:12px;margin:0;">MAP Educação LTDA · Este é um email automático</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Spreadsheet email sent successfully:", data);
    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
