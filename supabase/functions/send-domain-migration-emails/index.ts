// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://acelera.mapeducacao.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEW_DOMAIN = "https://acelera.mapeducacao.com";
const LOGO_URL = `${NEW_DOMAIN}/images/logo-map-email.png`;

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

function buildWelcomeEmail(name: string, email: string, password: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="${LOGO_URL}" alt="MAP" style="height:48px;width:auto;" />
  </div>
  <div style="padding:32px 24px 16px;">
    <h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Bem-vindo ao MAP Acelera! 🚀</h2>
    <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${name}</strong>, sua conta está pronta para uso!</p>
  </div>
  <div style="margin:0 24px 24px;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Notamos que você ainda não acessou a plataforma. Aqui estão seus dados de acesso no nosso <strong style="color:#BFFF00;">novo endereço</strong>:
    </p>
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:16px;margin-bottom:12px;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Novo Link</p>
      <p style="color:#BFFF00;font-size:15px;font-weight:600;margin:0;">${NEW_DOMAIN}</p>
    </div>
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:16px;margin-bottom:12px;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">E-mail</p>
      <p style="color:#fff;font-size:15px;font-weight:600;margin:0;">${email}</p>
    </div>
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:16px;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Senha Provisória</p>
      <p style="color:#BFFF00;font-size:18px;font-weight:700;font-family:monospace;margin:0;letter-spacing:2px;">${password}</p>
    </div>
    <p style="color:#999;font-size:12px;line-height:1.5;margin:16px 0 0;">
      ⚠️ Recomendamos que você altere sua senha após o primeiro acesso em <strong style="color:#ccc;">Perfil → Segurança</strong>.
    </p>
  </div>
  <div style="padding:0 24px 32px;text-align:center;">
    <a href="${NEW_DOMAIN}" target="_blank" style="display:inline-block;background:#BFFF00;color:#000;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
      🚀 Acessar a Plataforma
    </a>
  </div>
  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} MAP Educação. Todos os direitos reservados.</p>
  </div>
</div>
</body>
</html>`;
}

function buildDomainChangeEmail(name: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#1a1a1a;">
  <div style="padding:28px 24px;text-align:center;border-bottom:2px solid #BFFF00;">
    <img src="${LOGO_URL}" alt="MAP" style="height:48px;width:auto;" />
  </div>
  <div style="padding:32px 24px 16px;">
    <h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Novo Endereço da Plataforma 🔗</h2>
    <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${name}</strong>, temos uma novidade!</p>
  </div>
  <div style="margin:0 24px 24px;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
      A plataforma MAP Acelera agora tem um <strong style="color:#BFFF00;">novo endereço</strong>! Atualize seus favoritos:
    </p>
    <div style="background:#1a1a1a;border:1px solid #444;border-radius:8px;padding:20px;margin-bottom:16px;text-align:center;">
      <p style="color:#999;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Novo Link de Acesso</p>
      <p style="color:#BFFF00;font-size:20px;font-weight:700;margin:0;">${NEW_DOMAIN}</p>
    </div>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 8px;">
      ✅ Seu <strong style="color:#fff;">e-mail e senha continuam os mesmos</strong>
    </p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 8px;">
      ✅ Todos os seus dados, progresso e conquistas foram mantidos
    </p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;">
      ✅ Basta acessar pelo novo link e fazer login normalmente
    </p>
  </div>
  <div style="padding:0 24px 32px;text-align:center;">
    <a href="${NEW_DOMAIN}" target="_blank" style="display:inline-block;background:#BFFF00;color:#000;text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
      🔗 Acessar pelo Novo Link
    </a>
  </div>
  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} MAP Educação. Todos os direitos reservados.</p>
  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: only admin or service role
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceRoleKey) {
      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await callerClient.auth.getUser();
      if (userError || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Optional: dry_run mode and filters
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    // Get all users with active subscriptions (not admin/internal roles)
    const { data: activeProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name")
      .eq("subscription_status", "active");

    if (profilesError) throw profilesError;

    // Get all auth users to check last_sign_in_at
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });
    if (authError) throw authError;

    const authUsersMap = new Map<string, { email: string; last_sign_in_at: string | null }>();
    for (const u of authData.users) {
      authUsersMap.set(u.id, {
        email: u.email || "",
        last_sign_in_at: u.last_sign_in_at || null,
      });
    }

    // Filter out admin/internal roles
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "admin_geral", "admin_financeiro", "admin_conteudo", "cx", "comercial", "marketing", "automacao"]);

    const adminUserIds = new Set((adminRoles || []).map((r) => r.user_id));

    const results = {
      never_logged_in: [] as { email: string; name: string }[],
      already_logged_in: [] as { email: string; name: string }[],
      errors: [] as { email: string; error: string }[],
    };

    for (const profile of activeProfiles || []) {
      if (adminUserIds.has(profile.user_id)) continue;

      const authUser = authUsersMap.get(profile.user_id);
      if (!authUser || !authUser.email) continue;

      const neverLoggedIn = !authUser.last_sign_in_at;
      const name = profile.name || "Membro";

      if (dryRun) {
        if (neverLoggedIn) {
          results.never_logged_in.push({ email: authUser.email, name });
        } else {
          results.already_logged_in.push({ email: authUser.email, name });
        }
        continue;
      }

      try {
        if (neverLoggedIn) {
          // Generate new provisional password and update user
          const newPassword = generateProvisionalPassword();
          await supabase.auth.admin.updateUserById(profile.user_id, {
            password: newPassword,
          });

          await resend.emails.send({
            from: "MAP Acelera <onboarding@mapeducacao.com>",
            to: [authUser.email],
            subject: "🚀 Seus dados de acesso ao MAP Acelera (novo endereço!)",
            html: buildWelcomeEmail(name, authUser.email, newPassword),
          });

          results.never_logged_in.push({ email: authUser.email, name });
        } else {
          await resend.emails.send({
            from: "MAP Acelera <onboarding@mapeducacao.com>",
            to: [authUser.email],
            subject: "🔗 MAP Acelera tem um novo endereço!",
            html: buildDomainChangeEmail(name),
          });

          results.already_logged_in.push({ email: authUser.email, name });
        }

        // Rate limiting: small delay between emails
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error sending to ${authUser.email}:`, err);
        results.errors.push({ email: authUser.email, error: String(err) });
      }
    }

    console.log(
      `Domain migration emails: ${results.never_logged_in.length} welcome, ${results.already_logged_in.length} change notice, ${results.errors.length} errors`
    );

    return new Response(
      JSON.stringify({
        success: true,
        dry_run: dryRun,
        summary: {
          never_logged_in: results.never_logged_in.length,
          already_logged_in: results.already_logged_in.length,
          errors: results.errors.length,
        },
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Domain migration error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
