// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://acelera.mapeducacao.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  id: string;
  user_id: string;
  name: string;
  subscription_status: string | null;
  subscription_end_date: string | null;
  subscription_plan: string | null;
}

// Email templates
const CS_EMAILS = ["contato@mapeducacao.com", "sucesso@mapeducacao.com"];
const RENEWAL_LINK = "https://acelera.mapeducacao.com/planos";

function generateMemberExpirationEmail(
  name: string, 
  daysRemaining: number, 
  expirationDate: string
): { subject: string; html: string } {
  const formattedDate = new Date(expirationDate).toLocaleDateString('pt-BR');
  
  let subject: string;
  let statusMessage: string;
  let statusColor: string;
  
  if (daysRemaining <= 7) {
    subject = `🔔 Última semana! Sua anuidade expira em ${daysRemaining} dias`;
    statusMessage = `Sua anuidade expira em ${daysRemaining} dias (${formattedDate}). Renove agora para não perder o acesso!`;
    statusColor = "#f59e0b";
  } else if (daysRemaining <= 15) {
    subject = `📅 Sua anuidade expira em ${daysRemaining} dias`;
    statusMessage = `Sua anuidade expira em ${formattedDate}. Garanta a renovação com antecedência!`;
    statusColor = "#3b82f6";
  } else {
    subject = `📆 Sua anuidade expira em ${daysRemaining} dias`;
    statusMessage = `Sua anuidade expira em ${formattedDate}. Fique atento para não perder seu acesso!`;
    statusColor = "#3b82f6";
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid #333;">
        
        <!-- Header -->
        <div style="background-color: ${statusColor}; padding: 30px; text-align: center;">
          <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
          <h1 style="color: #fff; margin: 0; font-size: 24px;">
            📅 Aviso de Renovação
          </h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <p style="color: #fff; font-size: 18px; margin: 0 0 20px 0;">
            Olá <strong>${name}</strong>,
          </p>
          
          <div style="background-color: ${statusColor}22; border: 1px solid ${statusColor}; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
            <p style="color: #fff; font-size: 16px; margin: 0; line-height: 1.6;">
              ${statusMessage}
            </p>
          </div>

          <p style="color: #ccc; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
            Data de expiração: <strong style="color: #fff;">${formattedDate}</strong>
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${RENEWAL_LINK}" 
               style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); 
                      color: #000; 
                      padding: 16px 40px; 
                      text-decoration: none; 
                      border-radius: 30px; 
                      font-weight: bold; 
                      font-size: 16px;
                      display: inline-block;">
              Renovar Agora →
            </a>
          </div>

          <!-- Info Box -->
          <div style="background-color: #0d0d0d; border-radius: 12px; padding: 20px; margin-top: 30px;">
            <h3 style="color: #84cc16; margin: 0 0 10px 0; font-size: 16px;">
              ℹ️ Como Renovar
            </h3>
            <p style="color: #ccc; margin: 0; line-height: 1.8; font-size: 14px;">
              Clique no botão acima para ser redirecionado à página de pagamento. 
              Após a confirmação, seu acesso será renovado automaticamente.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #0d0d0d; padding: 20px 30px; text-align: center; border-top: 1px solid #333;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            MAP Acelera - Em caso de dúvidas, responda este email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

function generateCSNotificationEmail(
  membersNearExpiration: Array<{ name: string; email: string; daysRemaining: number; expirationDate: string }>
): { subject: string; html: string } {
  const subject = `📊 Relatório: ${membersNearExpiration.length} membros próximos da expiração`;
  
  const memberRows = membersNearExpiration.map(m => `
    <tr style="border-bottom: 1px solid #333;">
      <td style="padding: 12px; color: #fff;">${m.name}</td>
      <td style="padding: 12px; color: #ccc;">${m.email}</td>
      <td style="padding: 12px; color: ${m.daysRemaining <= 7 ? '#f59e0b' : '#3b82f6'}; font-weight: bold;">
        ${m.daysRemaining} dias
      </td>
      <td style="padding: 12px; color: #ccc;">${new Date(m.expirationDate).toLocaleDateString('pt-BR')}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; margin: 0; padding: 20px;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #1a1a1a; border-radius: 16px; overflow: hidden; border: 1px solid #333;">
        
        <!-- Header -->
        <div style="background-color: #84cc16; padding: 30px; text-align: center;">
          <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:48px;width:auto;" />
          <h1 style="color: #000; margin: 0; font-size: 24px;">
            📊 Membros Próximos da Expiração
          </h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="color: #ccc; font-size: 16px; margin: 0 0 20px 0;">
            Os seguintes membros têm assinaturas expirando em breve:
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #0d0d0d;">
                <th style="padding: 12px; text-align: left; color: #84cc16;">Nome</th>
                <th style="padding: 12px; text-align: left; color: #84cc16;">Email</th>
                <th style="padding: 12px; text-align: left; color: #84cc16;">Dias</th>
                <th style="padding: 12px; text-align: left; color: #84cc16;">Expira em</th>
              </tr>
            </thead>
            <tbody>
              ${memberRows}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color: #0d0d0d; padding: 20px 30px; text-align: center; border-top: 1px solid #333;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            Relatório automático - MAP Acelera
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

Deno.serve(async (req) => {
  console.log("Check subscription expiry - received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const cronSecret = Deno.env.get("CRON_SECRET");

    // Auth: require either service-role bearer or CRON_SECRET header
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const providedCron = req.headers.get("x-cron-secret") || "";
    const isAuthorized =
      (token && token === supabaseServiceKey) ||
      (cronSecret && providedCron === cronSecret);
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all profiles with subscription info
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, user_id, name, subscription_status, subscription_end_date, subscription_plan")
      .not("subscription_end_date", "is", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} profiles with subscription dates`);

    const results = {
      processed: 0,
      emailsSent: 0,
      statusUpdated: 0,
      errors: [] as string[],
    };

    const membersNearExpiration: Array<{ name: string; email: string; daysRemaining: number; expirationDate: string }> = [];
    const membersJustExpired: Array<{ name: string; email: string; plan: string | null; expirationDate: string }> = [];

    for (const profile of profiles || []) {
      try {
        const endDate = new Date(profile.subscription_end_date!);
        endDate.setHours(0, 0, 0, 0);
        
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const isExpired = daysRemaining < 0;

        // Update subscription status - IMMEDIATE block on expiration
        let newStatus = profile.subscription_status;
        if (isExpired) {
          newStatus = "expired";
        } else {
          newStatus = "active";
        }

        // Update status if changed
        if (newStatus !== profile.subscription_status) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ subscription_status: newStatus })
            .eq("id", profile.id);

          if (updateError) {
            console.error(`Error updating status for ${profile.name}:`, updateError);
            results.errors.push(`Status update failed for ${profile.name}`);
          } else {
            console.log(`Updated ${profile.name} status to ${newStatus}`);
            results.statusUpdated++;

            // Acabou de expirar (inadimplência / não renovou) → avisa o time
            if (newStatus === "expired") {
              let expiredEmail = "";
              try {
                const { data: u } = await supabase.auth.admin.getUserById(profile.user_id);
                expiredEmail = u?.user?.email || "";
              } catch { /* ignore */ }
              membersJustExpired.push({
                name: profile.name,
                email: expiredEmail,
                plan: profile.subscription_plan,
                expirationDate: profile.subscription_end_date!,
              });
            }
          }
        }

        // Send notification emails at 30, 15, 7 days before expiration
        const shouldNotify = daysRemaining === 30 || daysRemaining === 15 || daysRemaining === 7;

        if (shouldNotify) {
          // Get user email from auth.users
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);

          if (userError || !userData?.user?.email) {
            console.error(`Could not get email for user ${profile.user_id}:`, userError);
            results.errors.push(`Email not found for ${profile.name}`);
            continue;
          }

          const userEmail = userData.user.email;

          // Add to CS notification list
          membersNearExpiration.push({
            name: profile.name,
            email: userEmail,
            daysRemaining,
            expirationDate: profile.subscription_end_date!
          });

          const { subject, html } = generateMemberExpirationEmail(
            profile.name,
            daysRemaining,
            profile.subscription_end_date!
          );

          const { error: emailError } = await resend.emails.send({
             from: "MAP Acelera <contato@mapeducacao.com>",
            to: [userEmail],
            subject,
            html,
          });

          if (emailError) {
            console.error(`Error sending email to ${profile.name}:`, emailError);
            results.errors.push(`Email failed for ${profile.name}`);
          } else {
            console.log(`Notification email sent to ${profile.name} (${daysRemaining} days)`);
            results.emailsSent++;
          }
        }

        results.processed++;
      } catch (err) {
        console.error(`Error processing profile ${profile.name}:`, err);
        results.errors.push(`Processing failed for ${profile.name}`);
      }
    }

    // Send CS notification if there are members near expiration
    if (membersNearExpiration.length > 0) {
      const { subject, html } = generateCSNotificationEmail(membersNearExpiration);
      
      const { error: csEmailError } = await resend.emails.send({
        from: "MAP Acelera <contato@mapeducacao.com>",
        to: CS_EMAILS,
        subject,
        html,
      });

      if (csEmailError) {
        console.error("Error sending CS notification:", csEmailError);
        results.errors.push("CS notification email failed");
      } else {
        console.log(`CS notification sent with ${membersNearExpiration.length} members`);
      }
    }

    // Alerta de planos que acabaram de expirar (não pagou / não renovou)
    if (membersJustExpired.length > 0) {
      const rows = membersJustExpired
        .map(
          (m) => `
        <tr style="border-bottom:1px solid #333;">
          <td style="padding:12px;color:#fff;">${m.name}</td>
          <td style="padding:12px;color:#ccc;">${m.email || "N/A"}</td>
          <td style="padding:12px;color:#ccc;">${m.plan || "—"}</td>
          <td style="padding:12px;color:#ef4444;font-weight:bold;">${new Date(m.expirationDate).toLocaleDateString("pt-BR")}</td>
        </tr>`
        )
        .join("");

      const { error: expiredEmailError } = await resend.emails.send({
        from: "MAP Acelera <contato@mapeducacao.com>",
        to: CS_EMAILS,
        subject: `🚫 ${membersJustExpired.length} plano(s) expiraram — acesso bloqueado`,
        html: `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#0a0a0a;margin:0;padding:20px;">
  <div style="max-width:800px;margin:0 auto;background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #333;">
    <div style="background:#ef4444;padding:24px;text-align:center;">
      <img src="https://acelera.mapeducacao.com/images/logo-map-email.png" alt="MAP" style="height:44px;width:auto;" />
      <h1 style="color:#fff;margin:8px 0 0;font-size:22px;">Planos expirados</h1>
    </div>
    <div style="padding:24px;">
      <p style="color:#ccc;font-size:15px;margin:0 0 16px;">Os membros abaixo não renovaram a assinatura e tiveram o acesso bloqueado hoje:</p>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#0d0d0d;">
          <th style="padding:12px;text-align:left;color:#84cc16;">Nome</th>
          <th style="padding:12px;text-align:left;color:#84cc16;">Email</th>
          <th style="padding:12px;text-align:left;color:#84cc16;">Plano</th>
          <th style="padding:12px;text-align:left;color:#84cc16;">Expirou em</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="background:#0d0d0d;padding:16px 24px;text-align:center;border-top:1px solid #333;">
      <p style="color:#666;font-size:12px;margin:0;">Relatório automático - MAP Acelera</p>
    </div>
  </div>
</body></html>`,
      });

      if (expiredEmailError) {
        console.error("Error sending expired notification:", expiredEmailError);
        results.errors.push("Expired notification email failed");
      } else {
        console.log(`Expired notification sent with ${membersJustExpired.length} members`);
      }
    }

    console.log("Check subscription expiry completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        csNotified: membersNearExpiration.length > 0,
        membersNearExpiration: membersNearExpiration.length,
        membersJustExpired: membersJustExpired.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check subscription expiry error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
