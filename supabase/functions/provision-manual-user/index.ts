// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY usada nesta função. Uso exclusivo server-side.
// One-off provisioning helper — chamado manualmente para criar usuário + role + welcome email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ALLOWED_TOKEN = Deno.env.get("PROVISION_SECRET");
    if (!ALLOWED_TOKEN) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Accept secret via Authorization: Bearer <PROVISION_SECRET> (preferred)
    // or x-provision-secret header. Query-param token is no longer accepted
    // to avoid logging the secret in access logs / referrers.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    const headerSecret = req.headers.get("x-provision-secret") || "";
    const provided = bearer || headerSecret;
    if (!provided || provided !== ALLOWED_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim() || email.split("@")[0];
    const role = String(body.role || "pro");

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate provisional password
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    const password = Array.from(arr).map(b => chars[b % chars.length]).join("");

    // Check / create user
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find(u => (u.email || "").toLowerCase() === email);

    let userId: string;
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password });
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (cErr) throw cErr;
      userId = created.user!.id;
    }

    // Role
    await admin.from("user_roles").upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" }
    );

    // Profile
    const { data: prof } = await admin.from("profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!prof) {
      await admin.from("profiles").insert({ user_id: userId, name });
    }

    // Subscription fields → simulate PRO active purchase
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("profiles").update({
      subscription_plan: role,
      subscription_status: "active",
      subscription_start_date: startDate,
      subscription_end_date: endDate,
    }).eq("user_id", userId);

    // Onboarding row
    const { data: onb } = await admin.from("user_onboarding").select("id").eq("user_id", userId).maybeSingle();
    if (!onb) {
      await admin.from("user_onboarding").insert({ user_id: userId, current_step: 0, full_name: name });
    }

    // Welcome email + Bruno notification
    const isInternal = email.endsWith("@mapeducacao.com");
    const welcomeRes = await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        email,
        name,
        plan: role,
        platform_url: "https://acelera.mapeducacao.com",
        provisional_password: password,
        notify_bruno: !isInternal,
      }),
    });
    const welcomeData = await welcomeRes.json().catch(() => ({}));

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      email,
      role,
      provisional_password: password,
      welcome_email: { status: welcomeRes.status, data: welcomeData },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
