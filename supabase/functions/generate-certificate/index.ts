// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CertificateRequest {
  formationId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get auth header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { formationId } = await req.json() as CertificateRequest;
    
    if (!formationId) {
      return new Response(
        JSON.stringify({ error: 'formationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating certificate for formation:', formationId);

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get formation details
    const { data: formation, error: formationError } = await supabase
      .from('formations')
      .select('id, title')
      .eq('id', formationId)
      .single();

    if (formationError || !formation) {
      console.error('Formation error:', formationError);
      return new Response(
        JSON.stringify({ error: 'Formation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if formation is 100% complete
    const { data: modules } = await supabase
      .from('formation_modules')
      .select('id')
      .eq('formation_id', formationId);

    if (!modules || modules.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Formation has no modules' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const moduleIds = modules.map(m => m.id);

    const { count: totalLessons } = await supabase
      .from('formation_lessons')
      .select('id', { count: 'exact', head: true })
      .in('module_id', moduleIds);

    // Get completed lessons properly
    const { data: lessons } = await supabase
      .from('formation_lessons')
      .select('id')
      .in('module_id', moduleIds);

    const lessonIds = lessons?.map(l => l.id) || [];

    const { count: actualCompleted } = await supabase
      .from('formation_lesson_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('lesson_id', lessonIds);

    if ((actualCompleted || 0) < (totalLessons || 1)) {
      return new Response(
        JSON.stringify({ 
          error: 'Formation not completed',
          progress: Math.round(((actualCompleted || 0) / (totalLessons || 1)) * 100)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('id, certificate_number')
      .eq('user_id', user.id)
      .eq('formation_id', formationId)
      .single();

    if (existingCert) {
      console.log('Certificate already exists:', existingCert.certificate_number);
    }

    // Get completion date (latest lesson completion)
    const { data: lastCompletion } = await supabase
      .from('formation_lesson_progress')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .in('lesson_id', lessonIds)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    const completedAt = lastCompletion?.completed_at || new Date().toISOString();

    // Generate unique certificate number (or use existing)
    const certificateNumber = existingCert?.certificate_number || 
      `MAP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create certificate record if doesn't exist
    let certificate = existingCert;
    if (!existingCert) {
      const { data: newCert, error: certError } = await supabase
        .from('certificates')
        .insert({
          user_id: user.id,
          formation_id: formationId,
          formation_title: formation.title,
          user_name: profile.name,
          completed_at: completedAt,
          certificate_number: certificateNumber
        })
        .select()
        .single();

      if (certError) {
        console.error('Certificate creation error:', certError);
        return new Response(
          JSON.stringify({ error: 'Failed to create certificate' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      certificate = newCert;
      console.log('Certificate created successfully:', newCert.id);
    }

    // Sanitize user-controlled strings to prevent SVG/XSS injection
    const escapeXml = (str: string): string =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    const safeName = escapeXml(profile.name.toUpperCase());
    const safeTitle = escapeXml(formation.title);
    const safeCertNumber = escapeXml(certificateNumber);

    // Generate SVG certificate with MAP identity
    const completedDate = new Date(completedAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    // MAP Brand colors
    const bgColor = '#0a0a0a';
    const accentColor = '#BFFF00';
    const textColor = '#ffffff';
    const mutedColor = '#888888';
    const sealTextColor = '#000000';

    // New MAP logo URL (lowercase "map" with green pin "a")
    const logoUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663348192924/FysRjiCOPkbXTSzg.png';

    const certificateSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 850" width="100%" style="max-width:1200px; display:block; margin:0 auto">
        <defs>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&amp;display=swap');
          </style>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a1a" stroke-width="1"/>
          </pattern>
        </defs>

        <rect width="1200" height="850" fill="${bgColor}"/>
        <rect width="1200" height="850" fill="url(#grid)"/>

        <!-- Corner L marks -->
        <path d="M 30 90 L 30 30 L 90 30" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
        <path d="M 1170 30 L 1110 30" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
        <path d="M 1170 30 L 1170 90" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
        <path d="M 30 760 L 30 820 L 90 820" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
        <path d="M 1170 820 L 1110 820" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
        <path d="M 1170 820 L 1170 760" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>

        <!-- Logo -->
        <image x="510" y="45" width="180" height="75"
          href="${logoUrl}"
          xlink:href="${logoUrl}"/>

        <!-- Title -->
        <text x="600" y="195" text-anchor="middle" font-family="Sora, sans-serif" font-size="48" font-weight="800" fill="${textColor}">CERTIFICADO</text>
        <text x="600" y="240" text-anchor="middle" font-family="Sora, sans-serif" font-size="24" letter-spacing="4" fill="${accentColor}">DE CONCLUSÃO</text>

        <line x1="400" y1="270" x2="800" y2="270" stroke="${accentColor}" stroke-width="1"/>

        <text x="600" y="330" text-anchor="middle" font-family="Sora, sans-serif" font-size="20" fill="${mutedColor}">Certificamos que</text>

        <!-- Student name -->
        <text x="600" y="400" text-anchor="middle" font-family="Sora, sans-serif" font-size="44" font-weight="700" fill="${textColor}">${safeName}</text>

        <line x1="250" y1="420" x2="950" y2="420" stroke="${accentColor}" stroke-width="2"/>

        <text x="600" y="470" text-anchor="middle" font-family="Sora, sans-serif" font-size="16" fill="${mutedColor}">concluiu com êxito todas as aulas e atividades da formação</text>

        <!-- Formation name -->
        <text x="600" y="520" text-anchor="middle" font-family="Sora, sans-serif" font-size="32" font-weight="700" fill="${textColor}">${safeTitle}</text>

        <text x="600" y="570" text-anchor="middle" font-family="Sora, sans-serif" font-size="14" fill="${mutedColor}">demonstrando dedicação e comprometimento com seu desenvolvimento profissional no e-commerce.</text>

        <text x="600" y="620" text-anchor="middle" font-family="Sora, sans-serif" font-size="16" fill="${mutedColor}">Concluído em ${completedDate}</text>

        <!-- Signature group -->
        <g id="signature" transform="translate(600, 642)">
          <image
            href="https://res.cloudinary.com/dbnpjgskw/image/upload/v1773344219/ChatGPT_Image_12_de_mar._de_2026_16_36_39_nzxkcy.png"
            xlink:href="https://res.cloudinary.com/dbnpjgskw/image/upload/v1773344219/ChatGPT_Image_12_de_mar._de_2026_16_36_39_nzxkcy.png"
            x="-180" y="-18" width="360" height="84"
            preserveAspectRatio="xMidYMid meet"/>
          <line x1="-200" y1="72" x2="200" y2="72" stroke="${textColor}" stroke-width="1" opacity="0.6"/>
          <text x="0" y="98" text-anchor="middle" font-family="Sora, sans-serif" font-size="14" font-weight="700" fill="${textColor}">Pedro Spinelli</text>
          <text x="0" y="116" text-anchor="middle" font-family="Sora, sans-serif" font-size="11" fill="${mutedColor}">Cofundador e CEO da MAP Educação</text>
        </g>

        <!-- Validation URL -->
        <text x="600" y="840" text-anchor="middle" font-family="Sora, sans-serif" font-size="10" fill="${mutedColor}">Valide este certificado em: acelera.mapeducacao.com/validar-certificado?code=${safeCertNumber}</text>
      </svg>
    `;

    return new Response(
      JSON.stringify({ 
        success: true, 
        certificate,
        svg: certificateSVG
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating certificate:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
