import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: somente chamadas internas com SERVICE_ROLE_KEY
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!serviceKey || bearerToken !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "No RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { member_name, member_email, plan } = await req.json();
    const planLabel = plan === 'pro' ? 'PRO' : plan === 'enterprise' ? 'Enterprise' : plan === 'starter' ? 'Starter' : plan || 'N/A';

    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: "MAP Acelera <onboarding@mapeducacao.com>",
      to: ["brunomesquita@mapeducacao.com"],
      subject: `🚀 Novo membro criado — ${member_name} (${planLabel})`,
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
  </div>
  <div style="padding:32px 24px;">
    <h2 style="color:#BFFF00;font-size:20px;margin:0 0 16px;">Novo Membro Criado 🚀</h2>
    <p style="color:#fff;font-size:15px;line-height:1.8;margin:0;">
      Um novo membro foi criado manualmente na plataforma:
    </p>
    <div style="background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:20px;margin:16px 0;">
      <p style="color:#ccc;font-size:14px;margin:0 0 8px;">👤 <strong>Nome:</strong> ${member_name}</p>
      <p style="color:#ccc;font-size:14px;margin:0 0 8px;">📧 <strong>E-mail:</strong> ${member_email}</p>
      <p style="color:#ccc;font-size:14px;margin:0;">📋 <strong>Plano:</strong> ${planLabel}</p>
    </div>
    <p style="color:#BFFF00;font-size:15px;font-weight:600;margin:16px 0 0;">
      E-mail de boas-vindas com senha provisória já foi enviado ✅
    </p>
    <p style="color:#999;font-size:13px;margin:8px 0 0;">
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

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: "Email failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
