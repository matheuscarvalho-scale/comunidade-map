// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = userData.user.id;

    // Fetch user data in parallel
    const [onboardingRes, profileRes, analyticsRes, formationsRes, webinarsRes, tracksRes, progressRes, contentProgressRes] = await Promise.all([
      supabase.from("user_onboarding").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("member_analytics").select("event_type, page_path, event_data, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("formations").select("id, title, description, level, duration_hours, is_coming_soon").eq("is_published", true).eq("is_coming_soon", false).order("order_index"),
      supabase.from("webinars").select("id, title, description, scheduled_at, presenter_name").eq("is_active", true).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(10),
      supabase.from("content_tracks").select("id, title, description, category, slug, is_coming_soon").eq("is_active", true).eq("is_coming_soon", false).order("order_index"),
      supabase.from("formation_lesson_progress").select("lesson_id, completed").eq("user_id", userId).eq("completed", true),
      supabase.from("content_item_progress").select("item_id, completed").eq("user_id", userId).eq("completed", true),
    ]);

    const onboarding = onboardingRes.data;
    const profile = profileRes.data;
    const analytics = analyticsRes.data || [];
    const formations = formationsRes.data || [];
    const webinars = webinarsRes.data || [];
    const tracks = tracksRes.data || [];
    const completedLessons = progressRes.data?.length || 0;
    const completedContentItems = contentProgressRes.data?.length || 0;

    // Check if there's any content available
    const hasContent = formations.length > 0 || webinars.length > 0 || tracks.length > 0;
    if (!hasContent) {
      return new Response(JSON.stringify({
        next_step: null,
        recommendations: [],
        motivational_message: "Estamos preparando conteúdos incríveis para você! Em breve sua trilha personalizada estará disponível. 🚀",
        no_content: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build content catalog with IDs for the AI to reference
    const contentCatalog = [
      ...formations.map(f => ({
        id: f.id,
        type: "formation",
        title: f.title,
        description: f.description || "",
        level: f.level,
        duration_hours: f.duration_hours,
        route: `/formacoes/${f.id}`,
      })),
      ...webinars.map(w => ({
        id: w.id,
        type: "webinar",
        title: w.title,
        description: w.description || "",
        scheduled_at: w.scheduled_at,
        presenter: w.presenter_name,
        route: `/webinars`,
      })),
      ...tracks.map(t => ({
        id: t.id,
        type: "track",
        title: t.title,
        description: t.description || "",
        category: t.category,
        route: t.slug ? `/trilha-conteudo/${t.slug}` : `/trilha-conteudo/${t.id}`,
      })),
    ];

    // Build user context
    const userContext = {
      name: profile?.name || "Usuário",
      experience_level: onboarding?.experience_level || profile?.experience_level || "não informado",
      main_goal: onboarding?.main_goal || "não informado",
      weekly_hours: onboarding?.weekly_hours || "não informado",
      revenue_goal: onboarding?.revenue_goal || "não informado",
      business_models: onboarding?.business_models || [],
      niche: profile?.niche || "não informado",
      completed_lessons: completedLessons,
      completed_content_items: completedContentItems,
      recent_activity: analytics.slice(0, 20).map(a => `${a.event_type} em ${a.page_path || "?"}`).join("; "),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `Você é um assistente de aprendizado do MAP Acelera. Analise o perfil do usuário e o catálogo de conteúdo disponível para gerar recomendações personalizadas. 

REGRAS IMPORTANTES:
1. SOMENTE recomende conteúdos que existam no catálogo fornecido. Use EXATAMENTE o "id" e "title" do catálogo.
2. Ordene por relevância ao perfil e objetivos do usuário.
3. O "next_step" deve ser o conteúdo mais urgente/relevante.
4. Priorize webinars futuros (têm data marcada) e formações não concluídas.
5. Seja motivador, prático e específico nas justificativas.
6. Responda em português do Brasil.`;

    const userPrompt = `## Perfil do Usuário
- Nome: ${userContext.name}
- Nível: ${userContext.experience_level}
- Objetivo: ${userContext.main_goal}
- Horas/semana: ${userContext.weekly_hours}
- Meta de receita: ${userContext.revenue_goal}
- Modelos de negócio: ${userContext.business_models.join(", ") || "não informado"}
- Nicho: ${userContext.niche}
- Aulas concluídas: ${userContext.completed_lessons}
- Itens de trilha concluídos: ${userContext.completed_content_items}
- Atividade recente: ${userContext.recent_activity || "nenhuma"}

## Catálogo de Conteúdo Disponível (use SOMENTE estes)
${JSON.stringify(contentCatalog, null, 2)}

Gere recomendações personalizadas usando APENAS conteúdos do catálogo acima.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_recommendations",
            description: "Gera recomendações personalizadas baseadas no catálogo real de conteúdo",
            parameters: {
              type: "object",
              properties: {
                next_step: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Título exato do conteúdo do catálogo" },
                    description: { type: "string", description: "Por que este é o próximo passo ideal" },
                    type: { type: "string", enum: ["formation", "webinar", "track"] },
                    content_id: { type: "string", description: "ID exato do conteúdo do catálogo" },
                    route: { type: "string", description: "Rota exata do conteúdo do catálogo" },
                  },
                  required: ["title", "description", "type", "content_id", "route"],
                },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Título exato do conteúdo do catálogo" },
                      description: { type: "string", description: "Breve descrição do conteúdo" },
                      type: { type: "string", enum: ["formation", "webinar", "track"] },
                      content_id: { type: "string", description: "ID exato do conteúdo do catálogo" },
                      route: { type: "string", description: "Rota exata do conteúdo do catálogo" },
                      priority: { type: "string", enum: ["alta", "media", "baixa"] },
                      reason: { type: "string", description: "Justificativa personalizada" },
                    },
                    required: ["title", "description", "type", "content_id", "route", "priority", "reason"],
                  },
                  description: "Lista de 3-6 recomendações do catálogo, ordenadas por prioridade",
                },
                motivational_message: { type: "string", description: "Mensagem motivacional personalizada de 1-2 frases" },
              },
              required: ["next_step", "recommendations", "motivational_message"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar recomendações" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let result;
    if (toolCall?.function?.arguments) {
      result = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      // Fallback using first available content
      const firstContent = contentCatalog[0];
      result = {
        next_step: firstContent ? {
          title: firstContent.title,
          description: "Comece por este conteúdo recomendado",
          type: firstContent.type,
          content_id: firstContent.id,
          route: firstContent.route,
        } : null,
        recommendations: [],
        motivational_message: "Continue aprendendo e evoluindo! 🚀",
      };
    }

    // Validate that recommended content_ids exist in catalog
    const catalogIds = new Set(contentCatalog.map(c => c.id));
    if (result.next_step?.content_id && !catalogIds.has(result.next_step.content_id)) {
      // Fix invalid next_step by using first catalog item
      const first = contentCatalog[0];
      if (first) {
        result.next_step = { title: first.title, description: first.description, type: first.type, content_id: first.id, route: first.route };
      }
    }
    if (result.recommendations) {
      result.recommendations = result.recommendations
        .filter((r: any) => catalogIds.has(r.content_id))
        .map((r: any, i: number) => ({
          ...r,
          priority: i < 2 ? "alta" : i < 4 ? "media" : "baixa",
        }));
    }

    // Upsert recommendations
    const { error: upsertError } = await supabase
      .from("user_recommendations")
      .upsert({
        user_id: userId,
        recommendations: result.recommendations || [],
        next_step: result.next_step || null,
        generated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertError) console.error("Upsert error:", upsertError);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
