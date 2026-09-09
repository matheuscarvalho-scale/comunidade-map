// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Escape user-controlled values before interpolating into HTML email templates.
function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAILS = [
  "sucesso@mapeducacao.com",
  "brunomesquita@mapeducacao.com",
];
const FROM_EMAIL = "MAP Acelera <onboarding@mapeducacao.com>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotifyPayload {
  type: "new_request" | "approved" | "rejected";
  requestId: string;
  primaryUserId: string;
  secondaryName: string;
  secondaryEmail: string;
  relationship: string;
  rejectionReason?: string;
  // legacy fields (ignored if primaryUserId is set)
  memberEmail?: string;
  memberName?: string;
}

async function sendEmail(to: string | string[], subject: string, html: string) {
  const recipients = Array.isArray(to) ? to : [to];
  const validRecipients = recipients.filter(r => r && r.includes("@"));
  if (validRecipients.length === 0) {
    console.error("sendEmail: no valid recipients:", to);
    return;
  }
  console.log("Sending email to:", validRecipients, "subject:", subject);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: validRecipients,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  } else {
    console.log("Email sent successfully to:", validRecipients);
  }
  return res;
}

function secureRandomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

function generatePassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  const chars: string[] = [];
  chars.push(upper[secureRandomInt(upper.length)]);
  chars.push(lower[secureRandomInt(lower.length)]);
  chars.push(digits[secureRandomInt(digits.length)]);
  chars.push(special[secureRandomInt(special.length)]);

  while (chars.length < length) {
    chars.push(all[secureRandomInt(all.length)]);
  }

  // Fisher-Yates shuffle with crypto RNG
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

const relationshipLabels: Record<string, string> = {
  socio: "Sócio(a)",
  funcionario: "Funcionário(a)",
  familiar: "Familiar",
  assistente: "Assistente",
  outro: "Outro",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AuthN/AuthZ: require admin JWT or service role bearer
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: userData, error: userErr } = await authClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const adminCheck = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: roles } = await adminCheck.from("user_roles").select("role").eq("user_id", userData.user.id);
      const isAllowed = (roles || []).some((r: { role: string }) =>
        r.role === "admin" || r.role === "admin_geral" || r.role === "cx"
      );
      if (!isAllowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const payload: NotifyPayload = await req.json();
    const { type, requestId, primaryUserId, secondaryName, secondaryEmail, relationship, rejectionReason } = payload;

    console.log("notify-secondary-login called for requestId:", requestId);

    const relationshipLabel = relationshipLabels[relationship] || relationship;

    // Admin client with service role
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Resolve member email and name via service role (bypasses RLS)
    let memberEmail = payload.memberEmail || "";
    let memberName = payload.memberName || "Membro";

    if (primaryUserId) {
      // Fetch name from profiles
      const { data: profile } = await adminClient
        .from("profiles")
        .select("name")
        .eq("user_id", primaryUserId)
        .single();

      if (profile?.name) memberName = profile.name;

      // Fetch email from auth.users via admin API
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(primaryUserId);
      if (userError) {
        console.error("Error fetching user by id:", userError);
      } else {
        memberEmail = userData?.user?.email || "";
      }
    }

    console.log("Resolved memberEmail:", memberEmail, "memberName:", memberName);

    if (type === "new_request") {
      const adminHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 12px;">
          <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
            <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
            <h1 style="color: #fff; margin: 0; font-size: 22px;">🔐 Nova Solicitação de Login Secundário</h1>
          </div>
          <div style="background: #fff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
              Um membro solicitou um novo login secundário para revisão.
            </p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; width: 40%;">Membro solicitante</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; font-size: 14px;">${escapeHtml(memberName)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Email do membro</td>
                <td style="padding: 12px 0; color: #111827; font-size: 14px;">${escapeHtml(memberEmail)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Nome do login secundário</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 600; font-size: 14px;">${escapeHtml(secondaryName)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Email do login secundário</td>
                <td style="padding: 12px 0; color: #111827; font-size: 14px;">${escapeHtml(secondaryEmail)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Relacionamento</td>
                <td style="padding: 12px 0;">
                  <span style="background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 999px; font-size: 13px; font-weight: 600;">${escapeHtml(relationshipLabel)}</span>
                </td>
              </tr>
            </table>
            <div style="margin-top: 28px; text-align: center;">
              <a href="https://acelera.mapeducacao.com/admin/logins-secundarios"
                 style="background: #2563eb; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Revisar Solicitação
              </a>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            MAP Acelera · Este é um email automático, não é necessário responder.
          </p>
        </div>
      `;

      await sendEmail(ADMIN_EMAILS, `🔐 Nova solicitação de login secundário — ${memberName}`, adminHtml);

    } else if (type === "approved") {
      // Fetch primary user's subscription data
      const { data: primaryProfile } = await adminClient
        .from("profiles")
        .select("subscription_plan, subscription_status, subscription_end_date, subscription_start_date")
        .eq("user_id", primaryUserId)
        .single();

      const subscriptionData = {
        subscription_plan: primaryProfile?.subscription_plan ?? null,
        subscription_status: primaryProfile?.subscription_status ?? null,
        subscription_end_date: primaryProfile?.subscription_end_date ?? null,
        subscription_start_date: primaryProfile?.subscription_start_date ?? null,
      };

      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === secondaryEmail);

      let tempPassword: string | null = null;
      let createdUserId: string | null = null;

      if (existingUser) {
        createdUserId = existingUser.id;
        await adminClient
          .from("profiles")
          .update({ ...subscriptionData, updated_at: new Date().toISOString() })
          .eq("user_id", createdUserId);
      } else {
        tempPassword = generatePassword();
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: secondaryEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name: secondaryName },
        });

        if (createError) {
          console.error("Error creating user:", createError);
        } else {
          createdUserId = newUser.user?.id || null;
          if (createdUserId) {
            await adminClient.from("profiles").upsert({
              user_id: createdUserId,
              name: secondaryName,
              ...subscriptionData,
            });
          }
        }
      }

      // Link the user_id in secondary_logins
      if (createdUserId && requestId) {
        await adminClient
          .from("secondary_logins")
          .update({ secondary_user_id: createdUserId })
          .eq("request_id", requestId);
      }

      const credentialsBlock = tempPassword
        ? `
          <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #166534; font-size: 14px; margin: 0 0 12px 0; font-weight: 700;">🔑 Credenciais de Acesso</p>
            <p style="color: #166534; font-size: 15px; margin: 0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(secondaryEmail)}</p>
            <p style="color: #166534; font-size: 15px; margin: 0 0 12px 0;"><strong>Senha provisória:</strong> 
              <span style="font-family: monospace; background: #dcfce7; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px;">${escapeHtml(tempPassword)}</span>
            </p>
            <p style="color: #15803d; font-size: 13px; margin: 0;">⚠️ Recomendamos alterar a senha no primeiro acesso.</p>
          </div>
        `
        : `
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <p style="color: #1e40af; font-size: 14px; margin: 0;">ℹ️ Esta conta já possui cadastro na plataforma. Use seu email e senha existentes para acessar.</p>
          </div>
        `;

      const memberHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 12px;">
          <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
            <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
            <h1 style="color: #fff; margin: 0; font-size: 22px;">✅ Login Secundário Aprovado!</h1>
          </div>
          <div style="background: #fff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">
              Olá, <strong>${escapeHtml(memberName)}</strong>! 🎉
            </p>
            <p style="color: #374151; font-size: 15px; margin-bottom: 20px;">
              Sua solicitação de login secundário para <strong>${escapeHtml(secondaryName)}</strong> foi <strong style="color: #16a34a;">aprovada</strong>!
            </p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Detalhes do acesso</p>
              <p style="color: #111827; font-size: 14px; margin: 0 0 4px 0;"><strong>Nome:</strong> ${escapeHtml(secondaryName)}</p>
              <p style="color: #111827; font-size: 14px; margin: 0 0 4px 0;"><strong>Email:</strong> ${escapeHtml(secondaryEmail)}</p>
              <p style="color: #111827; font-size: 14px; margin: 0;"><strong>Tipo:</strong> ${escapeHtml(relationshipLabel)}</p>
            </div>
            ${credentialsBlock}
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://acelera.mapeducacao.com/auth"
                 style="background: #16a34a; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Acessar a Plataforma
              </a>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            MAP Acelera · Este é um email automático, não é necessário responder.
          </p>
        </div>
      `;

      if (memberEmail) {
        await sendEmail(memberEmail, `✅ Login secundário aprovado — ${secondaryName}`, memberHtml);
      }

      if (secondaryEmail && secondaryEmail !== memberEmail) {
        const secondaryHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 12px;">
            <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
              <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
              <h1 style="color: #fff; margin: 0; font-size: 22px;">🎉 Bem-vindo(a) ao MAP Acelera!</h1>
            </div>
            <div style="background: #fff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
              <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">
                Olá, <strong>${escapeHtml(secondaryName)}</strong>!
              </p>
              <p style="color: #374151; font-size: 15px; margin-bottom: 20px;">
                Você recebeu acesso ao <strong>MAP Acelera</strong> através de <strong>${escapeHtml(memberName)}</strong>.
              </p>
              ${credentialsBlock}
              <div style="margin-top: 24px; text-align: center;">
                <a href="https://acelera.mapeducacao.com/auth"
                   style="background: #2563eb; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                  Acessar Agora
                </a>
              </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              MAP Acelera · Este é um email automático, não é necessário responder.
            </p>
          </div>
        `;
        await sendEmail(secondaryEmail, `🎉 Seu acesso ao MAP Acelera está pronto!`, secondaryHtml);
      }

    } else if (type === "rejected") {
      const memberHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 12px;">
          <div style="background: #1a1a2e; padding: 24px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
            <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
            <h1 style="color: #fff; margin: 0; font-size: 22px;">❌ Solicitação Não Aprovada</h1>
          </div>
          <div style="background: #fff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">
              Olá, <strong>${escapeHtml(memberName)}</strong>!
            </p>
            <p style="color: #374151; font-size: 15px; margin-bottom: 20px;">
              Infelizmente, sua solicitação de login secundário para <strong>${escapeHtml(secondaryName)}</strong> não foi aprovada.
            </p>
            ${rejectionReason ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <p style="color: #991b1b; font-size: 14px; margin: 0 0 6px 0; font-weight: 600;">Motivo:</p>
              <p style="color: #991b1b; font-size: 14px; margin: 0;">${escapeHtml(rejectionReason)}</p>
            </div>
            ` : ""}
            <p style="color: #6b7280; font-size: 14px;">
              Se tiver dúvidas, entre em contato com nossa equipe ou faça uma nova solicitação.
            </p>
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://acelera.mapeducacao.com/gestao-equipe"
                 style="background: #2563eb; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                Ver Gestão de Equipe
              </a>
            </div>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            MAP Acelera · Este é um email automático, não é necessário responder.
          </p>
        </div>
      `;
      if (memberEmail) {
        await sendEmail(memberEmail, `Atualização sobre seu pedido de login secundário — ${secondaryName}`, memberHtml);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-secondary-login:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
