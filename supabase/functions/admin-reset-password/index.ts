// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-provision-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const provSecret = Deno.env.get("PROVISION_SECRET")!;
    const admin = createClient(url, svc);

    // Auth: either admin JWT or PROVISION_SECRET header
    const provHeader = req.headers.get("x-provision-secret");
    let authorized = false;
    if (provHeader && provHeader === provSecret) {
      authorized = true;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
        const { data: u } = await caller.auth.getUser();
        if (u?.user?.id) {
          const { data: role } = await admin.from("user_roles").select("role")
            .eq("user_id", u.user.id).in("role", ["admin", "admin_geral"]).maybeSingle();
          if (role) authorized = true;
        }
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, password, new_email } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    const newPwd = password || Array.from(arr).map(b => chars[b % chars.length]).join("");

    const update: Record<string, unknown> = { password: newPwd };
    if (new_email) {
      update.email = String(new_email).toLowerCase().trim();
      update.email_confirm = true;
    }

    const { error } = await admin.auth.admin.updateUserById(user_id, update);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, password: newPwd, email: update.email ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
