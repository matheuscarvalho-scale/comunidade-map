// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://acelera.mapeducacao.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  plan?: string;
  platform_url?: string;
  provisional_password?: string;
  notify_bruno?: boolean;
  phone?: string;
}

function generateProvisionalPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  const array = new Uint8Array(12);
  crypto.getRandomValues(array);
  for (let i = 0; i < 12; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

Deno.serve(async (req) => {
  console.log("Send welcome email received:", req.method);

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
    const authHeader = req.headers.get("Authorization");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth check: service role key or admin user
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const isServiceRole = token === serviceRoleKey;

      if (!isServiceRole) {
        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData, error: userError } = await callerClient.auth.getUser();
        if (userError || !userData?.user?.id) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: callerRole } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .in("role", ["admin", "admin_geral"])
          .maybeSingle();

        if (!callerRole) {
          return new Response(
            JSON.stringify({ error: "Forbidden" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Unauthorized: missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: WelcomeEmailRequest = await req.json();

    if (!payload.email || !payload.name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email and name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided provisional password or generate one
    const provisionalPassword = payload.provisional_password || generateProvisionalPassword();

    // Update the user's password to the provisional one
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find user by email and update password
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = existingUsers?.users?.find(u => u.email === payload.email);
    
    if (targetUser) {
      await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        password: provisionalPassword,
      });
      console.log("Updated user password to provisional for:", payload.email);
    }

    const userName = payload.name;
    const platformUrl = payload.platform_url || "https://acelera.mapeducacao.com";

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: "MAP Acelera <onboarding@mapeducacao.com>",
      to: [payload.email],
      subject: "🎉 Bem-vindo ao MAP Acelera! Seus dados de acesso",
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">

  <!-- Header -->
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
  </div>

  <!-- Hero -->
  <div style="padding:32px 24px 16px;">
    <h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Bem-vindo ao MAP Acelera! 🚀</h2>
    <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${userName}</strong>, sua conta foi criada com sucesso!</p>
  </div>

  <!-- Credentials Card -->
  <div style="margin:0 24px 24px;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Aqui estão seus dados de acesso à plataforma:
    </p>
    
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">E-mail</p>
      <p style="color:#fff;font-size:15px;font-weight:600;margin:0;">${payload.email}</p>
    </div>
    
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:16px;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Senha Provisória</p>
      <p style="color:#BFFF00;font-size:18px;font-weight:700;font-family:monospace;margin:0;letter-spacing:2px;">${provisionalPassword}</p>
    </div>

    <p style="color:#999;font-size:12px;line-height:1.5;margin:16px 0 0;">
      ⚠️ Recomendamos que você altere sua senha após o primeiro acesso em <strong style="color:#ccc;">Perfil → Segurança</strong>.
    </p>
  </div>

  <!-- CTA -->
  <div style="padding:0 24px 32px;text-align:center;">
    <a href="${platformUrl}" target="_blank" style="display:inline-block;background:#BFFF00;color:#000;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
      🚀 Acessar a Plataforma
    </a>
  </div>

  <!-- Footer -->
  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} MAP Educação. Todos os direitos reservados.</p>
  </div>

</div>
</body>
</html>`,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Welcome email with provisional password sent successfully:", data?.id);

    // Notify Bruno if requested
    let brunoNotified = false;
    if (payload.notify_bruno) {
      const planLabel = payload.plan === 'pro' ? 'PRO' : payload.plan === 'enterprise' ? 'Enterprise' : payload.plan === 'starter' ? 'Starter' : payload.plan || 'N/A';
      try {
        const { error: brunoError } = await resend.emails.send({
          from: "MAP Acelera <onboarding@mapeducacao.com>",
          to: ["brunomesquita@mapeducacao.com"],
          subject: `🚀 Novo membro criado manualmente — ${userName} (${planLabel})`,
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
      <p style="color:#ccc;font-size:14px;margin:0 0 8px;">👤 <strong>Nome:</strong> ${userName}</p>
      <p style="color:#ccc;font-size:14px;margin:0 0 8px;">📧 <strong>E-mail:</strong> ${payload.email}</p>
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
        if (brunoError) {
          console.error("Bruno notification error:", brunoError);
        } else {
          brunoNotified = true;
          console.log("Bruno notified successfully");
        }
      } catch (e) {
        console.error("Bruno notification failed:", e);
      }
    }

    // Notify Make webhook with credentials for WhatsApp delivery (same pattern as asaas-webhook)
    let whatsappNotified = false;
    try {
      const rawDigits = (payload.phone || "").replace(/\D/g, "");
      const phoneE164 = rawDigits
        ? (rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`)
        : "";
      if (phoneE164) {
        const caption = `🔐 *Bem-vindo à MAP Acelera, ${userName}!*\n\nSua conta foi criada com sucesso.\n\n📧 *E-mail:* ${payload.email}\n🔑 *Senha provisória:*\n${provisionalPassword}\n\n👉 Acesse agora: https://acelera.mapeducacao.com\n\n_Recomendamos alterar sua senha após o primeiro acesso em Perfil → Segurança._`;
        const makeRes = await fetch(Deno.env.get("MAKE_WEBHOOK_URL")!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: "novo_usuario",
            source: "novo_usuario",
            apikey: Deno.env.get("MAKE_WEBHOOK_APIKEY")!,
            numero: phoneE164,
            nome: userName,
            email: payload.email,
            senha: provisionalPassword,
            caption,
          }),
        });
        whatsappNotified = makeRes.ok;
        console.log("Make webhook (novo_usuario) status:", makeRes.status);
      } else {
        console.log("Skipping Make webhook (novo_usuario): no phone provided");
      }
    } catch (waErr) {
      console.warn("Make webhook (novo_usuario) failed (non-blocking):", waErr);
    }

    return new Response(
      JSON.stringify({ success: true, email_id: data?.id, provisional_password: provisionalPassword, bruno_notified: brunoNotified, whatsapp_notified: whatsappNotified }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});