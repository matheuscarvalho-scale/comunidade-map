// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
// One-shot backfill: envia todos os membros atuais para o banco centralizador da outra equipe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

// Mesma lista de src/lib/internalMembers.ts
const INTERNAL_USER_IDS = new Set<string>([
  "430cdde2-f2e4-49c8-8c96-f0c649519f00",
  "1894fbbc-eb90-45f3-9abb-c67065393c31",
  "e4e8f871-cedd-47ab-9e14-3c52eed7d40e",
  "9747c48e-ab50-4d33-82f6-36e8a4d94398",
  "69add853-127c-411d-8f68-2051f278e84c",
  "297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf",
  "634f99e0-131b-481c-816d-c14301568fe7",
  "b7783f1f-5e44-46ad-b1f9-17fe451d0689",
  "7a68fe88-1dec-4fec-af54-a9deed5e634e",
  "628785b5-36c9-4516-bf27-bea300165f1f",
  "498b0eb2-e4d4-418c-96ca-062d25675049",
  "44059506-de82-41e6-afd1-39bb3d7589c7",
  "36c7c50e-a909-426f-8a9b-6f4c4849406d",
  "ea125ab3-0740-4840-b325-63e9b042ccea",
  "f86279a9-1566-4216-a947-78159a50ab7f",
]);

const TEAM_ROLES = new Set<string>([
  "admin",
  "admin_geral",
  "admin_financeiro",
  "admin_conteudo",
  "cx",
  "comercial",
  "marketing",
  "automacao",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Auth
  const adminToken = req.headers.get("x-admin-token");
  const expected = Deno.env.get("CENTRAL_BACKFILL_TOKEN");
  if (!expected || !adminToken || adminToken !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { mode?: "gestao" | "all"; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }
  const mode: "gestao" | "all" = body.mode === "all" ? "all" : "gestao";
  const dryRun = body.dryRun === true;

  const endpoint = Deno.env.get("CENTRAL_MEMBERS_ENDPOINT");
  const token = Deno.env.get("CENTRAL_MEMBERS_TOKEN");
  if (!dryRun && (!endpoint || !token)) {
    return new Response(
      JSON.stringify({ error: "CENTRAL_MEMBERS_ENDPOINT / CENTRAL_MEMBERS_TOKEN not configured" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 1) Profiles (active/expired)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name, subscription_plan, subscription_status")
      .in("subscription_status", ["active", "expired"]);

    if (profilesError) throw profilesError;

    const excluded = new Set<string>();

    if (mode === "gestao") {
      // a) internal fixed list
      for (const id of INTERNAL_USER_IDS) excluded.add(id);

      // b) secondary logins
      const { data: secondary } = await supabase
        .from("secondary_logins")
        .select("secondary_user_id")
        .eq("is_active", true);
      for (const row of secondary || []) {
        if (row.secondary_user_id) excluded.add(row.secondary_user_id as string);
      }

      // c) team roles
      const { data: teamRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", Array.from(TEAM_ROLES));
      for (const row of teamRoles || []) {
        if (row.user_id) excluded.add(row.user_id as string);
      }
    }

    // 2) Build email index from auth.users (paginated)
    const emailByUserId = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users || [];
      for (const u of users) {
        if (u.id && u.email) emailByUserId.set(u.id, u.email);
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 50) break; // hard safety cap
    }

    // 2b) Whatsapp map from user_onboarding for filtered profiles
    const candidateUserIds = (profiles || [])
      .map((p) => p.user_id as string)
      .filter((id) => !(mode === "gestao" && excluded.has(id)));
    const phoneByUserId = new Map<string, string>();
    if (candidateUserIds.length > 0) {
      const { data: onboardings, error: onbErr } = await supabase
        .from("user_onboarding")
        .select("user_id, whatsapp")
        .in("user_id", candidateUserIds);
      if (onbErr) throw onbErr;
      for (const row of onboardings || []) {
        if (row.user_id && row.whatsapp) {
          phoneByUserId.set(row.user_id as string, row.whatsapp as string);
        }
      }
    }

    // 3) Filter + send
    const total = profiles?.length || 0;
    let sent = 0;
    let failed = 0;
    let skippedNoEmail = 0;
    let skippedExcluded = 0;
    const failures: { user_id: string; email: string | null; error: string }[] = [];

    for (const p of profiles || []) {
      const userId = p.user_id as string;
      if (mode === "gestao" && excluded.has(userId)) {
        skippedExcluded += 1;
        continue;
      }
      const email = emailByUserId.get(userId) || null;
      if (!email) {
        skippedNoEmail += 1;
        continue;
      }

      if (dryRun) {
        sent += 1;
        continue;
      }

      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-central-token": token,
          },
          body: JSON.stringify({
            name: p.name || email.split("@")[0],
            email,
            source: "backfill",
            plan: p.subscription_plan ?? null,
            phone: phoneByUserId.get(userId) ?? null,
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          failed += 1;
          failures.push({ user_id: userId, email, error: `${resp.status} ${errText}`.slice(0, 300) });
        } else {
          sent += 1;
        }
      } catch (err) {
        failed += 1;
        failures.push({ user_id: userId, email, error: String(err).slice(0, 300) });
      }
    }

    return new Response(
      JSON.stringify({
        mode,
        total,
        sent,
        failed,
        skipped_no_email: skippedNoEmail,
        skipped_excluded: skippedExcluded,
        dryRun,
        failures: failures.slice(0, 50),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
