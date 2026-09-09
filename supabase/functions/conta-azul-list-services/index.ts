// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY usada server-side apenas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTAAZUL_AUTH_URL = "https://auth.contaazul.com";
const CONTAAZUL_API_URL = "https://api-v2.contaazul.com";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("CONTAAZUL_CLIENT_ID");
  const clientSecret = Deno.env.get("CONTAAZUL_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Conta Azul credentials missing");

  const admin = getSupabaseAdmin();
  const { data: tokenRecord, error } = await admin
    .from("conta_azul_tokens")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !tokenRecord) throw new Error("No Conta Azul tokens. Connect first.");

  const expiresAt = new Date(tokenRecord.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return tokenRecord.access_token;

  const resp = await fetch(`${CONTAAZUL_AUTH_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRecord.refresh_token,
    }),
  });
  if (!resp.ok) throw new Error(`Refresh failed: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  await admin.from("conta_azul_tokens").update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokenRecord.refresh_token,
    expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", tokenRecord.id);
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = getSupabaseAdmin();
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();

    // Fetch services (try with pagination)
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const endpoint = search
      ? `${CONTAAZUL_API_URL}/v1/servicos?search=${encodeURIComponent(search)}`
      : `${CONTAAZUL_API_URL}/v1/servicos?pagina=1&tamanho_pagina=100`;

    const resp = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const text = await resp.text();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Conta Azul API error", status: resp.status, details: text }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    const list = Array.isArray(data) ? data : (data?.itens ?? data?.data ?? data?.content ?? []);
    const simplified = (Array.isArray(list) ? list : []).map((s: any) => ({
      id: s.id ?? s.uuid,
      nome: s.descricao ?? s.nome ?? s.name,
      codigo: s.codigo ?? s.code,
      valor: s.preco ?? s.valor_venda ?? s.valor ?? s.value,
      situacao: s.status ?? s.situacao,
    }));

    return new Response(JSON.stringify({ services: simplified, total: simplified.length, raw: data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
