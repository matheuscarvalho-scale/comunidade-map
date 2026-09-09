// Envia uma mensagem livre (tipo: nova_mensagem) para o Make → grupo do WhatsApp.
// Auth: requer JWT de admin/admin_geral.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = Deno.env.get("MAKE_WEBHOOK_URL")!;
// Hardcoded: Z-API novo formato para o grupo MAP Acelera
const GROUP_JID = "120363426700487684-group";
const INTERNAL_GROUP_JID =
  Deno.env.get("MAKE_WHATSAPP_INTERNAL_GROUP_JID") ?? "5522998735671-1614960109@g.us";
const API_KEY = Deno.env.get("MAKE_WEBHOOK_APIKEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supaUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supaUrl, serviceKey);

    // Allowlist de user_ids que podem usar a Dona Olga mesmo sem role admin.
    const DONA_OLGA_EXTRA_USER_IDS = new Set<string>([
      "44059506-de82-41e6-afd1-39bb3d7589c7", // Rodrigo Ferreira (rodrigoferreira@mapeducacao.com)
    ]);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);

    const allowed = new Set(["admin", "admin_geral"]);
    const hasAdminRole = (roles ?? []).some((r: { role: string }) => allowed.has(r.role));
    const ok = hasAdminRole || DONA_OLGA_EXTRA_USER_IDS.has(u.user.id);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mensagem = String(body.mensagem ?? body.caption ?? "").trim();
    const target = String(body.target ?? "acelera").toLowerCase();
    const mediaPath = body.mediaPath ? String(body.mediaPath) : null;
    const mediaTypeRaw = body.mediaType ? String(body.mediaType).toLowerCase() : null;
    const mediaType = mediaTypeRaw === "video" ? "video" : mediaTypeRaw === "image" ? "image" : null;

    if (!mensagem && !mediaPath) {
      return new Response(JSON.stringify({ success: false, error: "missing mensagem or media" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mediaUrl: string | null = null;
    if (mediaPath) {
      // Cria URL assinada de longa duração (7 dias) para o Make baixar o arquivo.
      const { data: signed, error: signErr } = await admin
        .storage
        .from("dona-olga-media")
        .createSignedUrl(mediaPath, 60 * 60 * 24 * 7);
      if (signErr || !signed?.signedUrl) {
        return new Response(
          JSON.stringify({ success: false, error: `Falha ao assinar mídia: ${signErr?.message ?? "unknown"}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      mediaUrl = signed.signedUrl;
    }

    const groupJid = target === "interno" ? INTERNAL_GROUP_JID : GROUP_JID;

    const source =
      mediaType === "image"
        ? "nova_mensagemimagem"
        : mediaType === "video"
        ? "nova_mensagemvideo"
        : "nova_mensagem";

    const payload = {
      groupJid,
      apikey: API_KEY,
      tipo: "nova_mensagem",
      source,
      target,
      caption: mensagem,
      mensagem,
      mediaType,
      mediaUrl,
    };

    const resp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await resp.text().catch(() => "");
    console.log("notify-make-message", { user: u.user.id, status: resp.status, len: mensagem.length });

    return new Response(
      JSON.stringify({ success: resp.ok, status: resp.status, response: text }),
      { status: resp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("notify-make-message error", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
