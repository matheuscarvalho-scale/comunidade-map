// Notifica Make.com sobre novos conteúdos publicados (formações, trilhas, aulas).
// Auth: requer header `x-internal-token` (gerado via verify_internal_token) OU JWT de usuário autenticado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-token",
};

const WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL")!;
// Hardcoded: Z-API novo formato para o grupo MAP Acelera
const GROUP_JID = "120363426700487684-group";
const API_KEY = Deno.env.get("MAKE_WEBHOOK_APIKEY")!;

const PALESTRANTE_INDEX: Record<string, number> = {
  "bruno leite": 1,
  "bruno mesquita": 2,
  "fabiana kaiuca": 3,
  "fernanda stussi": 4,
  "fernanda stüssi": 4,
  "larissa iraha": 5,
  "pablo ribeiro": 6,
  "pedro molina": 7,
  "phillipe lontra": 8,
  "raphael girardi": 9,
  "renan oliveira": 10,
  "rodrigo bitencourt": 11,
  "vinicius couto": 12,
  "vinicius do couto sousa": 12,
  "vinicius couto sousa": 12,
};

const NAME_BY_INDEX: Record<number, string> = {
  1: "Bruno Leite",
  2: "Bruno Mesquita",
  3: "Fabiana Kaiuca",
  4: "Fernanda Stüssi",
  5: "Larissa Iraha",
  6: "Pablo Ribeiro",
  7: "Pedro Molina",
  8: "Phillipe Lontra",
  9: "Raphael Girardi",
  10: "Renan Oliveira",
  11: "Rodrigo Bitencourt",
  12: "Vinicius do Couto Sousa",
};

function normalize(name?: string | null): string {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findIndex(name?: string | null): number | null {
  const n = normalize(name);
  if (!n) return null;
  if (PALESTRANTE_INDEX[n]) return PALESTRANTE_INDEX[n];
  for (const [k, v] of Object.entries(PALESTRANTE_INDEX)) {
    const nk = normalize(k);
    if (nk === n || n.includes(nk) || nk.includes(n)) return v;
  }
  return null;
}

const PLATFORM_BASE_URL = "https://acelera.mapeducacao.com";

function absolutizeLink(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `${PLATFORM_BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // --- Auth: x-internal-token OR valid user JWT ---
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const internalToken = req.headers.get("x-internal-token") || "";
    const authHeader = req.headers.get("Authorization") || "";
    let authorized = false;

    if (internalToken) {
      const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: ok } = await admin.rpc("verify_internal_token", { _name: "make_notify", _token: internalToken });
      if (ok === true) authorized = true;
    }
    if (!authorized && authHeader.startsWith("Bearer ")) {
      const sb = createClient(supaUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: u } = await sb.auth.getUser();
      if (u?.user?.id) {
        // Require admin/internal role — regular members must NOT trigger WhatsApp group messages.
        const admin2 = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: roles } = await admin2
          .from("user_roles")
          .select("role")
          .eq("user_id", u.user.id);
        const allowed = new Set(["admin", "admin_geral", "admin_conteudo", "marketing", "automacao"]);
        if ((roles ?? []).some((r: { role: string }) => allowed.has(r.role))) {
          authorized = true;
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const tipo = String(body.tipo ?? "novo_conteudo");
    const titulo = String(body.titulo ?? body.nome ?? "").trim();
    const source = String(body.source ?? tipo);
    const presenterRaw = body.presenter ? String(body.presenter).trim() : "";
    const link = body.link ? absolutizeLink(String(body.link)) : PLATFORM_BASE_URL;


    if (!titulo) {
      return new Response(JSON.stringify({ success: false, error: "missing titulo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idx = findIndex(presenterRaw);
    const palestrante = idx ? NAME_BY_INDEX[idx] : (presenterRaw || null);

    // Monta caption em PT-BR conforme o tipo
    let caption = "";
    if (tipo === "nova_formacao") {
      caption = `🎓 *Nova formação disponível na MAP Acelera!*\n\n*${titulo}*`;
      if (palestrante) caption += `\nCom ${palestrante}`;
    } else if (tipo === "nova_trilha") {
      caption = `🚀 *Nova trilha de conteúdo na MAP Acelera!*\n\n*${titulo}*`;
      if (palestrante) caption += `\nCom ${palestrante}`;
    } else if (tipo === "novo_recurso") {
      caption = `📂 *Novo recurso disponível na MAP Acelera!*\n\n*${titulo}*`;
      if (palestrante) caption += `\nPor ${palestrante}`;
    } else {
      caption = `🆕 *Novo conteúdo na MAP Acelera!*\n\n*${titulo}*`;
      if (palestrante) caption += `\nCom ${palestrante}`;
    }
    if (link) caption += `\n\n👉 Acesse agora: ${link}`;

    // nome = palestrante (igual ao webhook das mentorias). Título vai em "titulo".
    const payload: Record<string, unknown> = {
      groupJid: GROUP_JID,
      nome: palestrante ?? titulo,
      titulo,
      tipo,
      apikey: API_KEY,
      source,
      caption,
    };
    if (palestrante) payload.palestrante = palestrante;
    if (idx) payload.palestrante_idx = idx;
    if (link) payload.link = link;

    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("notify-make-new-content", { tipo, titulo, source, palestrante, idx, link, status: resp.status });

    return new Response(
      JSON.stringify({ success: true, status: resp.status, tipo, titulo, source, palestrante, palestrante_idx: idx, link, caption }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("notify-make-new-content error", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
