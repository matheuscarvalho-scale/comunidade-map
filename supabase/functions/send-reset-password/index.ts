// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [
    "https://acelera.mapeducacao.com",
    "https://comunidade-map.lovable.app",
  ];
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".lovable.app");
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// C2: Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Client IP (x-forwarded-for first value, fallback cf-connecting-ip)
    // Prefer cf-connecting-ip (set by the edge, not spoofable); otherwise take the
    // LAST value of x-forwarded-for, which is the one appended by our own proxy.
    const xff = (req.headers.get("x-forwarded-for") || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    const clientIp = req.headers.get("cf-connecting-ip") || (xff.length ? xff[xff.length - 1] : null);

    const tooManyResponse = () =>
      new Response(
        JSON.stringify({ error: "Muitas tentativas. Tente novamente em alguns minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // C2: Rate limiting - max 3 attempts per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("password_reset_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .gte("attempted_at", oneHourAgo);

    if (countError) {
      console.error("Rate limit check error:", countError);
    }

    if ((count ?? 0) >= 3) {
      console.warn("Rate limit (email) exceeded for:", normalizedEmail);
      return tooManyResponse();
    }

    // Rate limiting - max 20 attempts per IP per hour
    if (clientIp) {
      const { count: ipCount, error: ipError } = await supabaseAdmin
        .from("password_reset_attempts")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", clientIp)
        .gte("attempted_at", oneHourAgo);

      if (ipError) {
        console.error("Rate limit (ip) check error:", ipError);
      }

      if ((ipCount ?? 0) >= 20) {
        console.warn("Rate limit (ip) exceeded");
        return tooManyResponse();
      }
    }

    // Record this attempt
    await supabaseAdmin
      .from("password_reset_attempts")
      .insert({ email: normalizedEmail, ip_address: clientIp });

    // Housekeeping: drop attempts older than 24h (best-effort)
    supabaseAdmin
      .from("password_reset_attempts")
      .delete()
      .lt("attempted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .then(({ error }) => {
        if (error) console.error("Cleanup error:", error.message);
      });


    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: "https://acelera.mapeducacao.com/reset-password?mode=recovery",
      },
    });

    if (error) {
      console.error("Erro ao gerar link (pode ser email inexistente):", error.message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resetLink = data.properties?.action_link;
    if (!resetLink) {
      console.error("Link de recuperação não gerado");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const { error: emailError } = await resend.emails.send({
      from: "MAP Acelera <onboarding@mapeducacao.com>",
      to: normalizedEmail,
      subject: "Redefinição de senha – MAP Acelera",
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">

  <!-- Header -->
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
    <p style="color:#888;font-size:12px;margin:8px 0 0;text-transform:uppercase;letter-spacing:1px;">Comunidade de E-commerce</p>
  </div>

  <!-- Hero -->
  <div style="padding:32px 24px 16px;">
    <h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Redefinição de Senha 🔐</h2>
    <p style="color:#fff;font-size:15px;margin:0;">Recebemos uma solicitação para redefinir a senha da sua conta no <strong>MAP Acelera</strong>.</p>
  </div>

  <!-- Info Card -->
  <div style="margin:0 24px 24px;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong style="color:#fff;">1 hora</strong>.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
      Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanecerá a mesma.
    </p>
  </div>

  <!-- CTA -->
  <div style="padding:0 24px 32px;text-align:center;">
    <a href="${resetLink}" target="_blank" style="display:inline-block;background:#BFFF00;color:#000;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
      🔑 Redefinir minha senha
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} MAP Educação. Todos os direitos reservados.</p>
    <p style="color:#555;font-size:11px;margin:4px 0 0;">Você recebeu este email porque solicitou a redefinição de senha no MAP Acelera.</p>
  </div>

</div>
</body>
</html>`,
    });

    if (emailError) {
      console.error("Erro ao enviar email:", emailError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
