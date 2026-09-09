// Admin-only: reenvia um pagamento para conta-azul-integration sem re-disparar
// o fluxo completo do asaas-webhook (sem welcome email, sem notificar Bruno).
// Usa o log do PAYMENT_CONFIRMED original para reconstruir o payload do cliente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const sb = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claims?.claims?.sub;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles || []).some((r) => ["admin", "admin_geral", "admin_financeiro"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { payment_log_id, email, amount_cents, product_name, customer_name, document, phone, person_type } = body;

    let resolvedEmail = email;
    let resolvedAmount = amount_cents;
    let resolvedName = customer_name;
    let resolvedDoc = document;
    let resolvedPhone = phone;
    let resolvedPersonType = person_type;
    let resolvedProductName = product_name;

    if (payment_log_id) {
      const { data: log } = await admin.from("webhook_logs").select("payload").eq("id", payment_log_id).maybeSingle();
      const p: any = log?.payload || {};
      resolvedEmail = resolvedEmail || p?.customer_email;
      const valueReais = p?.payment?.value;
      if (!resolvedAmount && typeof valueReais === "number") {
        resolvedAmount = Math.round(valueReais * 100);
      }
      resolvedProductName = resolvedProductName || p?.payment?.description || null;
    }

    if (!resolvedEmail || !resolvedAmount) {
      return new Response(JSON.stringify({ error: "email and amount_cents required (or payment_log_id with email in payload)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenta enriquecer com perfil
    if (!resolvedName) {
      const { data: profile } = await admin
        .from("profiles")
        .select("name, user_id")
        .ilike("user_id", "%") // no-op
        .limit(0);
      // melhor: lookup via auth admin
      const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const u = usersList?.users?.find((x: any) => (x.email || "").toLowerCase() === String(resolvedEmail).toLowerCase());
      if (u) {
        const { data: prof } = await admin.from("profiles").select("name").eq("user_id", u.id).maybeSingle();
        resolvedName = prof?.name || u.email?.split("@")[0];
        if (!resolvedPhone) {
          const { data: priv } = await admin.from("profiles_private").select("phone").eq("user_id", u.id).maybeSingle();
          resolvedPhone = priv?.phone || undefined;
        }
      }
    }

    const contaAzulPayload = {
      customer: {
        email: resolvedEmail,
        name: resolvedName || String(resolvedEmail).split("@")[0],
        phone: resolvedPhone,
        document: resolvedDoc || null,
        person_type: resolvedPersonType || null,
      },
      amount: resolvedAmount,
      product_name: resolvedProductName || undefined,
      replay: true,
    };

    const res = await fetch(`${supabaseUrl}/functions/v1/conta-azul-integration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(contaAzulPayload),
    });

    const text = await res.text();
    return new Response(JSON.stringify({
      replayed: true,
      sent_payload: contaAzulPayload,
      contaazul_status: res.status,
      contaazul_response: text,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
