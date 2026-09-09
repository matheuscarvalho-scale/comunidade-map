// Lista assinaturas recorrentes ativas no Asaas filtradas por valor (default R$ 497)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;
const ASAAS_BASE = "https://api.asaas.com/v3";

async function asaasFetch(path: string) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    headers: {
      access_token: ASAAS_API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "MAP-Acelera",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asaas ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: authErr } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub);
    const isAdmin = (roles || []).some(r => ["admin","admin_geral","admin_financeiro","cx"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const targetValue = Number(url.searchParams.get("value") ?? "497");
    const cycle = url.searchParams.get("cycle") ?? "MONTHLY";

    // Pagina por todas assinaturas ativas
    const all: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const data = await asaasFetch(
        `/subscriptions?status=ACTIVE&cycle=${cycle}&limit=${limit}&offset=${offset}`
      );
      all.push(...(data.data ?? []));
      hasMore = data.hasMore;
      offset += limit;
      if (offset > 5000) break; // safety
    }

    const filtered = all.filter((s) => Math.round(Number(s.value)) === Math.round(targetValue));

    // Enriquecer com dados do customer
    const customerCache = new Map<string, any>();
    const enriched = [];
    for (const sub of filtered) {
      let customer = customerCache.get(sub.customer);
      if (!customer) {
        try {
          customer = await asaasFetch(`/customers/${sub.customer}`);
          customerCache.set(sub.customer, customer);
        } catch (e) {
          customer = { name: "?", email: "?" };
        }
      }
      enriched.push({
        subscription_id: sub.id,
        customer_id: sub.customer,
        name: customer.name,
        email: customer.email,
        cpfCnpj: customer.cpfCnpj,
        value: sub.value,
        cycle: sub.cycle,
        status: sub.status,
        billingType: sub.billingType,
        nextDueDate: sub.nextDueDate,
        dateCreated: sub.dateCreated,
        description: sub.description,
      });
    }

    enriched.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    return new Response(
      JSON.stringify({
        total_active_subscriptions: all.length,
        filter: { value: targetValue, cycle },
        matched: enriched.length,
        subscriptions: enriched,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
