// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://acelera.mapeducacao.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: CRON_SECRET ou SERVICE_ROLE_KEY
  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const providedSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!((cronSecret && providedSecret === cronSecret) || (serviceKey && bearerToken === serviceKey))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch pending mentoring reminders where send_at <= now and sent = false
    const { data: reminders, error: fetchError } = await supabase
      .from('mentoring_email_reminders')
      .select('*, mentoring_sessions(title, description, mentor_name, scheduled_at, duration_minutes, meeting_url)')
      .eq('sent', false)
      .lte('send_at', new Date().toISOString())
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch reminders: ${fetchError.message}`);
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending reminders' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${reminders.length} pending mentoring reminders`);

    let sent = 0;
    let errors = 0;

    for (const reminder of reminders) {
      const session = (reminder as any).mentoring_sessions;
      if (!session) {
        await supabase
          .from('mentoring_email_reminders')
          .update({ sent: true, sent_at: new Date().toISOString(), error_message: 'Session not found' })
          .eq('id', reminder.id);
        errors++;
        continue;
      }

      const emailPayload = {
        to: reminder.user_email,
        user_name: reminder.user_name || 'Membro MAP',
        webinar_title: session.title,
        webinar_description: session.description,
        partner_name: session.mentor_name,
        scheduled_at: session.scheduled_at,
        duration_minutes: session.duration_minutes || 60,
        meeting_url: session.meeting_url || '',
        type: reminder.reminder_type,
        event_type: 'mentoring',
      };

      try {
        const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-webinar-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        const emailResult = await emailResponse.json();

        if (emailResponse.ok && emailResult.success) {
          await supabase
            .from('mentoring_email_reminders')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('id', reminder.id);
          sent++;
        } else {
          const errMsg = emailResult.error || `HTTP ${emailResponse.status}`;
          await supabase
            .from('mentoring_email_reminders')
            .update({ error_message: errMsg })
            .eq('id', reminder.id);
          errors++;
          console.error(`Failed to send mentoring reminder ${reminder.id}: ${errMsg}`);
        }
      } catch (emailError: unknown) {
        const errMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
        await supabase
          .from('mentoring_email_reminders')
          .update({ error_message: errMsg })
          .eq('id', reminder.id);
        errors++;
        console.error(`Error processing mentoring reminder ${reminder.id}: ${errMsg}`);
      }
    }

    console.log(`Processed: ${sent} sent, ${errors} errors`);

    return new Response(
      JSON.stringify({ success: true, processed: reminders.length, sent, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error processing mentoring reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
