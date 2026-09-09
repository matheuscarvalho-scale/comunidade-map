// Dispara webhook do Make (tipo: novo_usuario) sem enviar email nem notificar Bruno.
// Apenas admin pode chamar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supaUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supaUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = new Set(["admin", "admin_geral"]);
    if (!(roles ?? []).some((r: { role: string }) => allowed.has(r.role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const phone = String(body.phone ?? "").replace(/\D/g, "");
    const name = String(body.name ?? "Teste MAP");
    const email = String(body.email ?? "teste@mapeducacao.com");
    const senha = String(body.senha ?? "TesteMAP@2026");

    if (!phone) {
      return new Response(JSON.stringify({ error: "missing phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneE164 = phone.startsWith("55") ? phone : `55${phone}`;
    const caption = `🔐 *Bem-vindo à MAP Acelera, ${name}!*\n\nSua conta foi criada com sucesso.\n\n📧 *E-mail:* ${email}\n🔑 *Senha provisória:*\n${senha}\n\n👉 Acesse agora: https://acelera.mapeducacao.com\n\n_Recomendamos alterar sua senha após o primeiro acesso em Perfil → Segurança._`;

    const resp = await fetch(Deno.env.get("MAKE_WEBHOOK_URL")!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "novo_usuario",
        source: "novo_usuario",
        apikey: Deno.env.get("MAKE_WEBHOOK_APIKEY")!,
        numero: phoneE164,
        nome: name,
        email,
        senha,
        caption,
      }),
    });

    const text = await resp.text().catch(() => "");
    console.log("test-make-novo-usuario", { status: resp.status, phone: phoneE164 });

    return new Response(
      JSON.stringify({ success: resp.ok, status: resp.status, response: text, sent_to: phoneE164 }),
      { status: resp.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
