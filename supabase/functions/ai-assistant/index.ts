// AI Assistant da plataforma MAP Acelera
// Responde apenas sobre catálogo (formações, webinars, mentorias, parceiros, trilhas)
// e regras de negócio (planos, políticas). NUNCA expõe dados de usuários.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function classifyTopic(question: string): string {
  const value = question.toLocaleLowerCase("pt-BR");
  const topics: Array<[string, RegExp]> = [
    ["Precificação e margem", /pre[cç]o|precifica|margem|lucro|markup|rentab|custo/],
    ["Taxas e comissões", /taxa|comiss[aã]o|tarifa|percentual|cobran[cç]a/],
    ["Logística e frete", /frete|log[ií]st|envio|entrega|full|fulfillment|transport/],
    ["Tributação", /imposto|tribut|simples|mei|icms|fiscal|nota fiscal|cnpj/],
    ["Marketing e anúncios", /tr[aá]fego|an[uú]ncio|ads|campanha|marketing|publicidade|convers[aã]o/],
    ["Estoque e operação", /estoque|opera[cç][aã]o|curva abc|fornecedor|sku|produto/],
    ["Amazon", /amazon/],
    ["Mercado Livre", /mercado livre|meli/],
    ["Shopee", /shopee/],
    ["TikTok Shop", /tiktok/],
    ["Shein", /shein/],
    ["Formações e conteúdo", /forma[cç][aã]o|curso|trilha|aula|conte[uú]do|certificado/],
    ["Mentorias e webinars", /mentoria|webinar|evento|grava[cç][aã]o/],
    ["Recursos e ferramentas", /planilha|template|modelo|checklist|pdf|ferramenta|recurso/],
    ["Planos e assinatura", /plano|assinatura|cancel|reembolso|cashback|pagamento/],
    ["Plataforma MAP", /plataforma|map acelera|perfil|comunidade|networking|parceiro/],
  ];
  return topics.find(([, pattern]) => pattern.test(value))?.[0] ?? "Outros";
}

const PLATFORM_RULES = `
# MAP Acelera - Regras de Negócio

## Escopo atual de formações e trilhas (IMPORTANTE)
- HOJE, as seguintes formações estão liberadas/disponíveis na plataforma:
  1. Amazon
  2. TikTok Shop
  3. Mercado Livre
  4. Shopee
- Formações marcadas como EM BREVE (ainda não liberadas): Shein, Criação de Loja Virtual (Shopify + Nuvemshop), Tráfego Pago para E-commerce.
- As 3 trilhas estratégicas de conteúdo ("Os Primeiros 120 Dias", "Vendendo, mas Faturando Pouco", "Como Escalar Sem Quebrar") estão marcadas como EM BREVE e ainda NÃO estão disponíveis para consumir.
- Se o catálogo dinâmico listar outros títulos como "em breve" (coming soon), eles ainda não estão liberados.
- NUNCA invente formações/trilhas. Se o usuário perguntar sobre um tema que não está na lista acima, diga claramente que ainda não está disponível e que novos conteúdos são adicionados ao longo do tempo.

## Gravações de Webinars e Mentorias (IMPORTANTE — ATUALIZADO)
- As gravações das MENTORIAS ficam na aba **Mentorias**, em /mentorias (na própria página, junto do calendário das próximas sessões). NÃO estão mais em /trilha-conteudo e nunca estiveram em /formacoes.
- As gravações dos WEBINARS ficam na aba **Webinars**, em /webinars.
- NUNCA diga que as gravações de mentorias estão em /trilha-conteudo ou em /formacoes. A trilha "Mentorias" foi descontinuada.


## Recursos (/recursos)
- A página /recursos é a biblioteca de materiais práticos para os membros: PDFs, planilhas, templates e ferramentas, organizados por marketplace (Amazon, TikTok Shop, Mercado Livre, Shopee, Shein e outros gerais).
- Tipos disponíveis: Planilhas (controle financeiro, precificação, estoque etc.), Documentos/PDFs (guias, checklists, e-books), Templates (modelos prontos) e Ferramentas.
- Como usar: acessar /recursos, buscar pelo nome ou navegar pelo marketplace desejado, e clicar para baixar (download direto) ou abrir o link externo da ferramenta.
- Quando o membro pedir planilha, modelo, template, checklist, PDF ou ferramenta — sempre indique /recursos.

## O que é o MAP Acelera
- Ecossistema/comunidade premium da MAP Educação para empreendedores e sellers de e-commerce no Brasil.
- Une sellers, líderes e empreendedores para troca de conhecimento, networking, mentorias e eventos.
- Liderança: Pedro Spinelli (Cofundador e CEO) e João Valença (Cofundador e CFO, referência em precificação e gestão financeira). Idealizadores do MAP Experience, maior festival de e-commerce do RJ.
- Site institucional: https://www.mapeducacao.com/acelera | Plataforma logada: https://acelera.mapeducacao.com

## Planos disponíveis (assinatura anual, cobrança mensal)
- **Basic — R$197/mês**: acesso completo à plataforma, trilha de crescimento, formações e conteúdos exclusivos, networking com a comunidade, certificados de conclusão.
- **Pro — R$497/mês** (mais popular): tudo do Basic + mentorias em grupo semanais + webinars exclusivos com especialistas + grupo VIP no WhatsApp + VIP na próxima edição do MAP Experience + 50% off no MAP in Rio + evento presencial exclusivo "MAP.IA" + evento presencial exclusivo "Precifica MAP".
- **Business — R$997/mês**: tudo do Pro + 12 mentorias individuais com os fundadores da MAP (Pedro Spinelli e João Valença) + prioridade em todas as ações da comunidade.

## Benefícios principais
- Cashback em compras com parceiros (Amazon, TikTok Shop e outros) — pode recuperar até 100% da anuidade.
- Mais de R$ 7.000 em benefícios por membro/ano: ferramentas, formações, eventos, trilhas, suporte 360.
- Plataforma online 24/7 com trilhas de aprendizado, formações e certificados.
- Feed de notícias do e-commerce em tempo real.
- Mentorias semanais ao vivo com especialistas.
- Eventos presenciais exclusivos para membros.

## Parceiros oficiais
Amazon, TikTok Shop, Bling, Olist, BASE, Hands-On (gestão financeira), Iraha Contabilidade, Scale.IA.

## Mentores oficiais (especialistas)
- **Bruno Leite** — Empreendedor e investidor em tecnologia (e-commerce e IA).
- **Bruno Mesquita** — Coordenador de Operações MAP (e-commerce desde 2009).
- **Fabiana Kaiuca** — CEO Jump Solutions, especialista em vendas online, influenciadora Shein.
- **Fernanda Stüssi** — CEO/Founder Glarus Consultoria, ex-CFO Dharma AI, ex-VTEX (backoffice).
- **Larissa Iraha** — Mentora certificada Shopee, parceira Mercado Livre, influencer Shein.
- **Pablo Ribeiro** — Strategic Business Architect (escala e performance).
- **Pedro Molina** — CEO MV Intimate (escala em marketplaces).
- **Phillipe Lontra** — Fundador Magia dos Detalhes, modelo Disney de gestão.
- **Raphael Girardi** — CEO Hands ON Gestão Financeira Inteligente.
- **Renan Oliveira** — Mentor e especialista em vendas na Amazon (Desbravando as Vendas).
- **Rodrigo Bitencourt** — Consultor empresarial (gestão estratégica, RH, liderança).
- **Vinicius do Couto Sousa** — CEO Sousa e Couto, especialista em planejamento tributário.

## Política de reembolso
- Garantia incondicional de 7 dias: devolução de 100% do investimento sem perguntas.
- Assinaturas anuais têm fidelidade de 12 meses.
- Cancelamento via WhatsApp do suporte.

## Cashback
- Disponível em compras feitas com parceiros através da plataforma.
- Limite anual conforme o plano contratado.
- Objetivo: recuperar até 100% da anuidade ao longo do ano.

## Mentorias
- Semanais ao vivo via Google Meet, com especialistas oficiais.
- Disponíveis para planos Pro e Business.
- Plano Business inclui 12 mentorias individuais por ano com os fundadores (Pedro Spinelli e João Valença).
- Gravações ficam disponíveis depois da sessão, na própria aba [Mentorias](/mentorias).

## Webinars
- Última quinta-feira de cada mês, 19h (Brasília).
- Convidados especialistas do mercado, exclusivos para plano Pro+.

## Eventos presenciais
- **MAP Experience** — maior festival de e-commerce do RJ. Próxima edição: 21 e 22 de maio de 2027. Pro e Business têm acesso VIP.
- **MAP in Rio** — Pro e Business têm 50% off.
- **MAP.IA** e **Precifica MAP** — eventos presenciais exclusivos para Pro e Business.

## Certificados
- Emitidos automaticamente ao concluir formações.
- Podem ser validados publicamente em /validar-certificado.

## Comunidade
- Feed estilo rede social com posts, comentários e likes.
- Networking ativo com sellers e empreendedores.
- Moderação ativa por administradores.

## Para quem é
Empreendedores e sellers de e-commerce que buscam: crescimento acelerado, networking real, aprender com quem faz, e direcionamento claro para aumentar faturamento com lucratividade.
`;


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  let analyticsClient: any = null;
  let interactionId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    analyticsClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages: { role: "user" | "assistant"; content: string }[] = body.messages || [];
    const latestQuestion = [...messages].reverse().find((message) => message.role === "user")?.content?.trim();
    const conversationId =
      typeof body.conversationId === "string" && body.conversationId.trim()
        ? body.conversationId.trim().slice(0, 120)
        : crypto.randomUUID();

    if (!latestQuestion) {
      return new Response(JSON.stringify({ error: "Mensagem vazia" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: interaction, error: interactionError } = await analyticsClient
      .from("mapinha_interactions")
      .insert({
        user_id: userData.user.id,
        conversation_id: conversationId,
        question: latestQuestion.slice(0, 12000),
        topic: classifyTopic(latestQuestion),
        context_message_count: Math.max(1, messages.length),
      })
      .select("id")
      .single();
    if (interactionError) {
      // Analytics nunca deve impedir o membro de usar o assistente.
      console.error("Mapinha analytics insert error:", interactionError);
    } else {
      interactionId = interaction.id;
    }

    const searchQueries: string[] = [];
    const finishInteraction = async (
      status: "answered" | "error",
      details: { answer?: string; error?: string } = {},
    ) => {
      if (!interactionId) return;
      const { error } = await analyticsClient
        .from("mapinha_interactions")
        .update({
          status,
          answer: details.answer?.slice(0, 30000) ?? null,
          error_message: details.error?.slice(0, 2000) ?? null,
          latency_ms: Date.now() - startedAt,
          web_search_count: searchQueries.length,
          search_queries: searchQueries,
          answered_at: status === "answered" ? new Date().toISOString() : null,
        })
        .eq("id", interactionId);
      if (error) console.error("Mapinha analytics update error:", error);
    };

    // Buscar catálogo público (sem dados de usuários)
    const [formationsRes, webinarsRes, tracksRes, partnersRes, mentoringsRes, resourcesRes] = await Promise.all([
      supabase.from("formations").select("title, description, level, duration_hours, is_coming_soon").eq("is_published", true).limit(50),
      supabase.from("webinars").select("title, description, scheduled_at, presenter_name").eq("is_active", true).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(20),
      supabase.from("content_tracks").select("title, description, category, is_coming_soon").eq("is_active", true).limit(30),
      supabase.from("partners").select("name, description, category").limit(50),
      supabase.from("mentoring_sessions").select("title, description, scheduled_at, mentor_name").gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(10),
      supabase.from("resources").select("title, description, type, category").eq("is_active", true).limit(100),
    ]);

    const formacoesData = (formationsRes.data || []) as any[];
    const formacoesLiberadas = formacoesData.filter(f => !f.is_coming_soon);
    const formacoesEmBreve = formacoesData.filter(f => f.is_coming_soon);

    const tracksData = (tracksRes.data || []) as any[];
    const trilhasLiberadas = tracksData.filter(t => !t.is_coming_soon);
    const trilhasEmBreve = tracksData.filter(t => t.is_coming_soon);

    const catalog = {
      formacoes_liberadas_HOJE: formacoesLiberadas,
      formacoes_em_breve_NAO_DISPONIVEIS_AINDA: formacoesEmBreve,
      webinars_futuros: webinarsRes.data || [],
      trilhas_de_conteudo_liberadas_HOJE: trilhasLiberadas,
      trilhas_de_conteudo_em_breve_NAO_DISPONIVEIS_AINDA: trilhasEmBreve,
      parceiros: partnersRes.data || [],
      mentorias_agendadas: mentoringsRes.data || [],
      recursos_biblioteca: resourcesRes.data || [],
    };

    const systemPrompt = `Você é o Mapinha, o mentor de e-commerce da MAP Acelera — um consultor sênior, prático e direto, que ajuda empreendedores e sellers brasileiros a venderem mais e com lucro em marketplaces (Amazon, Mercado Livre, Shopee, TikTok Shop, Shein) e no e-commerce em geral.

## Sua missão
Ser um mentor de verdade, não apenas um guia da plataforma. Responda dúvidas reais de negócio: estratégia de vendas, precificação, margem e lucro, tributação (Simples, MEI, ICMS-ST etc.), operação e logística, anúncios e tráfego pago, curva ABC e estoque, atendimento, fluxo de caixa, gestão financeira e escala. Combine duas fontes em toda resposta relevante:
1. Seu conhecimento de e-commerce + a ferramenta \`web_search\` para trazer dados atuais, taxas, tendências, tutoriais e boas práticas do mercado brasileiro.
2. O conteúdo da plataforma MAP Acelera (formações, trilhas, mentorias, recursos, parceiros): sempre que houver algo relevante ao que o membro está perguntando, recomende e linke, conectando a orientação prática ao que ele já tem acesso lá dentro.

Aja como quem já vendeu e escalou de verdade — e que também conhece a MAP por dentro. Não limite suas respostas a "como usar a plataforma".

## REGRAS CRÍTICAS DE PRIVACIDADE
- Você NÃO TEM acesso a dados pessoais de nenhum usuário (nem mesmo do que está conversando agora).
- NUNCA invente, suponha ou exponha: nomes, e-mails, telefones, dados de pagamento, status de assinatura individual, progresso de outros membros, conversas privadas, ou qualquer informação pessoal.
- Se perguntarem "qual meu plano?", "quanto gastei?", "quem é o membro X?" — responda educadamente que você não tem acesso a dados pessoais e oriente a checar no perfil (/perfil) ou falar com o suporte.

## Tom
- Brasileiro, próximo, motivador, direto. Pode usar emojis com moderação.
- Respostas curtas e práticas, com markdown quando ajudar (listas, negrito).
- Quando recomendar conteúdo, sempre cite o título exato e oriente onde encontrar (ex: formações em /formacoes; gravações de mentorias em /mentorias; gravações de webinars em /webinars).
- SEMPRE que citar uma formação, trilha, mentoria ou qualquer conteúdo interno da plataforma, formate o NOME do conteúdo como link markdown clicável apontando para a rota interna, no formato exato [Nome](/rota). NUNCA envolva o link em crases (\`\`) — isso vira código e quebra o clique. Exemplos corretos (sem crases ao redor):
  - Formação: [Amazon na Prática](/formacoes) — vale para todas as formações (Amazon, TikTok Shop, Mercado Livre, Shopee etc.), sempre apontando para /formacoes.
  - Mentorias gravadas: [Mentorias](/mentorias). Webinars gravados: [Webinars](/webinars).
  - Trilha: [Nome da Trilha](/trilha-conteudo).
  - Recursos: [Nome do Recurso](/recursos).

  Nunca escreva o nome da formação/trilha/recurso sem link. Não escreva a rota solta no texto (ex: "em /formacoes") — embuta a rota no link do nome do conteúdo.

## Catálogo atual da plataforma
${JSON.stringify(catalog, null, 2)}

## Regras e políticas
${PLATFORM_RULES}

## Contexto geográfico (OBRIGATÓRIO)
- O público é 100% BRASILEIRO. Toda resposta, busca, exemplo, moeda (R$), taxa, imposto, marketplace, legislação e fonte DEVE ser do Brasil por padrão.
- Ao usar \`web_search\`, sempre inclua termos como "Brasil", "BR", "brasileiro" ou o ano atual em português na query, e priorize fontes brasileiras (sites .com.br, blogs oficiais dos marketplaces no Brasil, portais nacionais).
- IGNORE resultados de outros países (EUA, Europa, Ásia) a menos que o usuário peça explicitamente. Se só encontrar fonte estrangeira, diga isso claramente e busque de novo com foco Brasil.
- Nunca converta ou traga taxas/regras de marketplaces internacionais como se fossem do Brasil.
- RECÊNCIA: sempre priorize informações do ano corrente (2026) ou dos últimos 12 meses. Inclua "2026" ou "2025" na query quando fizer sentido. Se encontrar dado antigo (>1 ano), avise o usuário e sugira confirmar na fonte oficial.

## Escopo (mentor, não porteiro)
Seu domínio é e-commerce, marketplaces e gestão de negócio digital no Brasil — mentore livremente e com profundidade sobre esses temas, mesmo que a resposta não envolva nenhuma funcionalidade da plataforma. Puxar o membro para o conteúdo interno é um bônus, não uma obrigação em toda resposta. Só quando a pergunta for totalmente alheia a negócios/e-commerce (assuntos pessoais sem relação, temas técnicos fora do domínio), reconheça com simpatia e traga de volta para como você pode ajudar a alavancar as vendas e o negócio dele. As REGRAS DE PRIVACIDADE acima valem SEMPRE, em qualquer resposta.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await finishInteraction("error", { error: "AI key not configured" });
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    const tools = FIRECRAWL_API_KEY ? [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Busca informações atualizadas na internet. Use sempre que a resposta se beneficiar de dados atuais do mercado brasileiro: taxas e comissões de marketplaces (Shopee, Mercado Livre, Amazon, TikTok Shop, Shein etc.), tributação, estratégias e tendências de e-commerce, tráfego pago, logística, tutoriais, benchmarks, notícias e preços de mercado — qualquer coisa que mude com frequência ou que exija fonte externa para embasar a mentoria.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Consulta de busca em português, específica e objetiva." },
            },
            required: ["query"],
          },
        },
      },
    ] : undefined;

    async function runWebSearch(query: string): Promise<string> {
      searchQueries.push(query.slice(0, 500));
      try {
        const r = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            limit: 5,
            location: "Brazil",
            // cr:countryBR = restringe ao Brasil; qdr:y = apenas resultados do último ano (recência)
            tbs: "cr:countryBR,qdr:y",
            lang: "pt",
            country: "br",
          }),
        });
        if (!r.ok) {
          const errText = await r.text();
          console.error(`Firecrawl failed [${r.status}]: ${errText}`);
          return `Erro na busca: ${r.status} ${errText}`;
        }
        const j = await r.json();
        const results = j.data?.web || j.data || [];
        const trimmed = (Array.isArray(results) ? results : []).slice(0, 5).map((x: any) => ({
          title: x.title,
          url: x.url,
          snippet: (x.description || x.snippet || "").slice(0, 800),
        }));
        console.log(`Firecrawl web_search ok: query="${query}" results=${trimmed.length}`);
        return JSON.stringify(trimmed);
      } catch (e) {
        console.error("runWebSearch error:", e);
        return `Erro na busca: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    const convo: any[] = [
      { role: "system", content: systemPrompt + (FIRECRAWL_API_KEY ? `

## Busca na web (AÇÃO DIRETA — NÃO PEÇA PERMISSÃO)
Você tem a ferramenta \`web_search\` para consultar informações atualizadas da internet.

**REGRAS OBRIGATÓRIAS:**
- SEMPRE que a pergunta envolver dados externos (taxas, comissões, políticas, notícias, preços, regras de marketplaces como Shopee, Amazon, Mercado Livre, TikTok Shop, Shein, Magalu etc.), CHAME \`web_search\` IMEDIATAMENTE, sem pedir permissão.
- **PROIBIDO responder de memória sobre QUALQUER regra, política, limite, requisito, elegibilidade, cadastro, documentação ou quantidade permitida de um marketplace** (ex: "quantas lojas posso ter por CNPJ", "posso usar MEI?", "quais documentos preciso?", "posso ter 2 contas?"). Esse tipo de pergunta EXIGE \`web_search\` antes de qualquer afirmação, priorizando a fonte OFICIAL do marketplace (seller-br.tiktok.com, sellercentral.amazon.com.br, seller.shopee.com.br, ajuda/central do vendedor do Mercado Livre). Toda resposta desse tipo TEM que terminar com a seção **Fontes:**.
- **Logística/fulfillment e exigências fiscais também entram nessa regra**: Shopee Full/Envio pela Shopee, Mercado Livre Full, Amazon FBA, TikTok Shop FBT. Perguntas sobre requisitos para enviar estoque ao centro de distribuição (necessidade de filial, endereço/inscrição estadual no estado do CD — ex.: SP —, CFOP/NF de remessa, substituto tributário, custos) EXIGEM \`web_search\` na central oficial do vendedor antes de qualquer afirmação. É PROIBIDO afirmar que algo "não é obrigatório" sem fonte oficial citada — no Shopee Full, por exemplo, há exigência de regularidade fiscal/inscrição no estado do centro de distribuição para emitir a NF de remessa; se não encontrar a regra, diga isso e recomende confirmar com a central do vendedor e o contador.
- **PROIBIDO usar hedge/generalização** como "geralmente", "normalmente", "é uma política comum em marketplaces", "costuma ser", "acredito que" para afirmar uma regra. Ou você tem a fonte e cita o número/regra com o link, ou diz claramente: "não encontrei essa regra na documentação oficial — confirme em [link da central do vendedor]". Nunca deduza uma regra por analogia com outros marketplaces.
- Faça 1 busca focada por padrão. Só faça uma segunda busca se a primeira não trouxer o número/dado pedido. Máximo de 2 buscas por resposta (só use uma 3ª em último caso, quando o usuário pedir algo bem específico e as anteriores falharam). Em perguntas de regra/política, uma das buscas deve mirar a fonte oficial (ex: "site:seller-br.tiktok.com ...").
- Se as primeiras buscas não trouxerem números concretos, tente 1 termo mais preciso — não repita buscas parecidas.
- **NUNCA responda usando SOMENTE conteúdo interno da plataforma.** Mesmo quando o tema tiver formação/trilha/mentoria disponível internamente (ex: Amazon, TikTok Shop, Mercado Livre, Shopee), você DEVE: (a) mencionar e recomendar o conteúdo interno relevante com o caminho (/formacoes, /trilha-conteudo, /recursos etc.); E (b) OBRIGATORIAMENTE complementar com informações atuais buscadas na web (dados, taxas, novidades, artigos, tutoriais externos) trazendo links completos. Toda resposta precisa ter valor além do que já está na plataforma.

**COMO RESPONDER — PADRÃO DE QUALIDADE (OBRIGATÓRIO):**
Respostas curtas e genéricas são PROIBIDAS. Toda resposta sobre dados externos DEVE conter:

1. **Resposta direta** à pergunta em 1-2 linhas com o número principal em **negrito**.
2. **Detalhamento completo** com TODOS os componentes de custo/regra encontrados nas fontes, não apenas o percentual principal. Exemplos do que NUNCA pode faltar quando existir:
   - Taxa fixa por item / por pedido (ex: R$2 por item abaixo de R$79 no TikTok Shop)
   - Limites, tetos e condições (ex: bônus 60 dias limitado a R$17.000)
   - Taxas de frete / programa de envio e quem paga o quê
   - Comissão de afiliados / criadores quando aplicável
   - Prazo de liquidação / repasse
   - Diferenças por categoria/nicho quando existirem tabelas
   - Data de vigência da informação
3. **Fórmula ou exemplo numérico** sempre que a pergunta for sobre custo/comissão/precificação.
4. **Citação direta entre aspas** de pelo menos um trecho literal da fonte mais autoritativa (quando houver texto no snippet).
5. Se as fontes divergirem, mostre a divergência com os valores de cada uma.
6. Se algo não foi encontrado após as buscas, diga explicitamente "não encontrei X nas fontes consultadas" — não invente e não generalize.

Use tabelas markdown quando houver múltiplas categorias/faixas. Use tópicos com **negrito** nos números-chave. Mínimo esperado para perguntas sobre taxas de marketplace: ~150 palavras de conteúdo substantivo (fora as fontes).

**FORMATO DAS FONTES (SEMPRE AO FINAL):**
Adicione a seção \`**Fontes:**\` como último bloco, listando APENAS os links realmente consultados, em markdown clicável e com URL completa (https://):
- [Título curto da página](https://url-completa)` : "") },
      ...messages,
    ];

    let reply = "Não consegui gerar uma resposta agora.";
    for (let step = 0; step < 8; step++) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: convo,
          ...(tools ? { tools, tool_choice: "auto" } : {}),
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          await finishInteraction("error", { error: "Muitas requisições" });
          return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (status === 402) {
          await finishInteraction("error", { error: "Créditos de IA insuficientes" });
          return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const errText = await aiResponse.text();
        console.error("AI gateway error:", status, errText);
        await finishInteraction("error", { error: `AI gateway ${status}: ${errText}` });
        return new Response(JSON.stringify({ error: "Erro ao processar mensagem" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await aiResponse.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        convo.push(msg);
        for (const tc of toolCalls) {
          let result = "";
          if (tc.function?.name === "web_search") {
            const args = JSON.parse(tc.function.arguments || "{}");
            result = await runWebSearch(args.query || "");
          } else {
            result = "Ferramenta desconhecida";
          }
          convo.push({ role: "tool", tool_call_id: tc.id, content: result });
        }
        continue;
      }

      reply = msg.content || reply;
      break;
    }

    await finishInteraction("answered", { answer: reply });
    return new Response(JSON.stringify({ reply, interactionId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    if (analyticsClient && interactionId) {
      const { error } = await analyticsClient
        .from("mapinha_interactions")
        .update({
          status: "error",
          error_message: (e instanceof Error ? e.message : String(e)).slice(0, 2000),
          latency_ms: Date.now() - startedAt,
        })
        .eq("id", interactionId);
      if (error) console.error("Mapinha analytics catch update error:", error);
    }
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
