import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://acelera.mapeducacao.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WebinarEmailPayload {
  to: string;
  user_name: string;
  webinar_title: string;
  webinar_description?: string;
  partner_name?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  type: 'checkin' | 'checkin_confirmation' | '48h_before' | '1d_before' | '1h_before' | '10min_before' | 'post_session';
  event_type?: 'webinar' | 'mentoring';
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  };
  return date.toLocaleDateString('pt-BR', options);
}

function getSubject(type: string, title: string, eventType: string): string {
  const label = eventType === 'mentoring' ? 'Mentoria' : 'Webinar';
  switch (type) {
    case 'checkin':
    case 'checkin_confirmation':
      return `✅ Check-in confirmado: ${title}`;
    case '48h_before':
      return `🗓️ Em 48h: ${title} - MAP Acelera`;
    case '1d_before':
      return `📅 Amanhã: ${title} - MAP Acelera`;
    case '1h_before':
      return `⏰ Em 1 hora: ${title} - MAP Acelera`;
    case '10min_before':
      return `🔴 Começa em 10 min: ${title} - Entre agora!`;
    case 'post_session':
      return `📝 Como foi? Avalie a ${label.toLowerCase()}: ${title}`;
    default:
      return `${label}: ${title}`;
  }
}

function buildEmailHtml(payload: WebinarEmailPayload): string {
  const {
    user_name,
    webinar_title,
    webinar_description,
    partner_name,
    scheduled_at,
    duration_minutes,
    meeting_url,
    type,
    event_type = 'webinar',
  } = payload;
  const isMentoring = event_type === 'mentoring';
  const eventLabel = isMentoring ? 'mentoria' : 'webinar';
  const EventLabel = isMentoring ? 'Mentoria' : 'Webinar';

  const formattedDate = formatDate(scheduled_at);

  const partnerBadge = partner_name
    ? `<span style="display:inline-block;background:#BFFF00;color:#000;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;margin-top:8px;">${partner_name}</span>`
    : '';

  const descriptionBlock = webinar_description
    ? `<p style="color:#ccc;font-size:14px;line-height:1.6;margin:12px 0 0;">${webinar_description}</p>`
    : '';

  let heroText = '';
  let ctaText = '';
  let ctaStyle = '';
  let urgencyBanner = '';

  switch (type) {
    case 'checkin':
    case 'checkin_confirmation':
      heroText = `<h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Check-in Confirmado! ✅</h2>
        <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${user_name}</strong>, seu check-in foi realizado com sucesso.</p>
        <p style="color:#aaa;font-size:13px;margin:8px 0 0;">Você receberá lembretes por e-mail antes do ${eventLabel} começar.</p>`;
      ctaText = '📅 Salvar na Agenda';
      ctaStyle = 'background:#BFFF00;color:#000;';
      break;
    case '48h_before':
      heroText = `<h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Faltam 48 horas! 🗓️</h2>
        <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${user_name}</strong>, a ${eventLabel} acontece em 2 dias. Já anote na agenda!</p>`;
      ctaText = '📅 Salvar na Agenda';
      ctaStyle = 'background:#BFFF00;color:#000;';
      break;
    case '1d_before':
      heroText = `<h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Amanhã tem ${eventLabel}! 📅</h2>
        <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${user_name}</strong>, o ${eventLabel} começa amanhã. Não esqueça!</p>`;
      ctaText = meeting_url ? `🔗 Ver detalhes da ${EventLabel}` : '📅 Salvar na Agenda';
      ctaStyle = 'background:#BFFF00;color:#000;';
      break;
    case '1h_before':
      heroText = `<h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Falta 1 hora! ⏰</h2>
        <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${user_name}</strong>, o ${eventLabel} começa em 1 hora. Prepare-se!</p>`;
      ctaText = `🔗 Acessar ${EventLabel}`;
      ctaStyle = 'background:#BFFF00;color:#000;';
      break;
    case '10min_before':
      heroText = `<h2 style="color:#ff4444;font-size:24px;margin:0 0 8px;">COMEÇA EM 10 MINUTOS! 🔴</h2>
        <p style="color:#fff;font-size:16px;margin:0;">Olá <strong>${user_name}</strong>, corra! O ${eventLabel} está prestes a começar!</p>`;
      ctaText = `🚀 ENTRAR NA ${EventLabel.toUpperCase()} AGORA`;
      ctaStyle = 'background:#BFFF00;color:#000;font-size:18px;padding:18px 40px;';
      urgencyBanner = `<div style="background:#ff4444;padding:12px;text-align:center;border-radius:8px;margin-bottom:20px;">
        <span style="color:#fff;font-weight:700;font-size:16px;">⚡ O ${eventLabel} começa em 10 minutos!</span>
      </div>`;
      break;
    case 'post_session':
      heroText = `<h2 style="color:#BFFF00;font-size:22px;margin:0 0 8px;">Como foi a ${eventLabel}? 📝</h2>
        <p style="color:#fff;font-size:15px;margin:0;">Olá <strong>${user_name}</strong>, esperamos que você tenha aproveitado!</p>
        <p style="color:#aaa;font-size:14px;margin:8px 0 0;">Sua opinião é muito importante para melhorarmos cada vez mais. Leva menos de 2 minutos!</p>`;
      ctaText = '📝 AVALIAR AGORA';
      ctaStyle = 'background:#BFFF00;color:#000;font-size:16px;padding:16px 36px;';
      break;
  }

  return `<!DOCTYPE html>
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
    ${urgencyBanner}
    ${heroText}
  </div>

  <!-- Webinar Card -->
  <div style="margin:0 24px 24px;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
    <h3 style="color:#fff;font-size:18px;margin:0 0 4px;">${webinar_title}</h3>
    ${partnerBadge}
    ${descriptionBlock}
    
    <div style="margin-top:20px;border-top:1px solid #333;padding-top:16px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#888;font-size:13px;width:30px;">📅</td>
          <td style="padding:6px 0;color:#fff;font-size:14px;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#888;font-size:13px;">⏱️</td>
          <td style="padding:6px 0;color:#fff;font-size:14px;">Duração: ${duration_minutes} minutos</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- CTA -->
  ${type === 'post_session' ? `<div style="padding:0 24px 32px;text-align:center;">
    <a href="https://www.mapeducacao.com/formulario-mentoria" target="_blank" style="display:inline-block;${ctaStyle}text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
      ${ctaText}
    </a>
  </div>` : meeting_url ? `<div style="padding:0 24px 32px;text-align:center;">
    <a href="${meeting_url}" target="_blank" style="display:inline-block;${ctaStyle}text-decoration:none;padding:14px 32px;border-radius:30px;font-weight:700;font-size:15px;">
      ${ctaText}
    </a>
  </div>` : ''}

  <!-- Footer -->
  <div style="background:#000;padding:20px 24px;text-align:center;border-top:1px solid #222;">
    <p style="color:#666;font-size:12px;margin:0;">© ${new Date().getFullYear()} MAP Educação. Todos os direitos reservados.</p>
    <p style="color:#555;font-size:11px;margin:4px 0 0;">Você recebeu este email porque fez check-in em um ${eventLabel} do MAP Acelera.</p>
  </div>

</div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: internal (SERVICE_ROLE_KEY / CRON_SECRET) OR logged-in user sending to own email
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const cronSecret = Deno.env.get('CRON_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  const isInternal = !!bearer && (bearer === serviceKey || bearer === cronSecret);

  let authedUserEmail: string | null = null;
  if (!isInternal && bearer) {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.0');
      const sb = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
      });
      const { data: { user } } = await sb.auth.getUser();
      if (user?.email) authedUserEmail = user.email.toLowerCase();
    } catch (_e) { /* ignore */ }
  }

  if (!isInternal && !authedUserEmail) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const payload: WebinarEmailPayload = await req.json();

    if (!payload.to || !payload.webinar_title || !payload.type) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, webinar_title, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isInternal && authedUserEmail && payload.to.toLowerCase() !== authedUserEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: can only send to your own email' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subject = getSubject(payload.type, payload.webinar_title, payload.event_type || 'webinar');
    const html = buildEmailHtml(payload);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MAP Educação <onboarding@mapeducacao.com>',
        to: [payload.to],
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ success: false, error: `Resend error [${resendResponse.status}]: ${JSON.stringify(resendData)}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error sending webinar email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
