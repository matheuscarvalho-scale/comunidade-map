// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CONTAAZUL_TOKEN_URL = "https://auth.contaazul.com/oauth2/token";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Handle GET (redirect from Conta Azul with code)
    if (req.method === "GET") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        const redirectUrl = `https://acelera.mapeducacao.com/admin/conta-azul-auth?error=${encodeURIComponent(error)}`;
        return new Response(null, {
          status: 302,
          headers: { Location: redirectUrl },
        });
      }

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing authorization code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientId = Deno.env.get("CONTAAZUL_CLIENT_ID");
      const clientSecret = Deno.env.get("CONTAAZUL_CLIENT_SECRET");
      const redirectUri = "https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/conta-azul-oauth-callback";

      // Exchange code for tokens
      const tokenResponse = await fetch(CONTAAZUL_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        const redirectUrl = `https://acelera.mapeducacao.com/admin/conta-azul-auth?error=${encodeURIComponent("Token exchange failed")}`;
        return new Response(null, {
          status: 302,
          headers: { Location: redirectUrl },
        });
      }

      const tokenData = await tokenResponse.json();
      const supabaseAdmin = getSupabaseAdmin();

      // Upsert token - delete old and insert new
      await supabaseAdmin.from("conta_azul_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      await supabaseAdmin.from("conta_azul_tokens").insert({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      });

      console.log("Conta Azul tokens saved successfully");

      // Redirect back to admin page with success
      const redirectUrl = `https://acelera.mapeducacao.com/admin/conta-azul-auth?success=true`;
      return new Response(null, {
        status: 302,
        headers: { Location: redirectUrl },
      });
    }

    // Handle POST (manual token refresh) — admin or service-role only
    if (req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const isServiceRole = !!authHeader && authHeader === `Bearer ${expectedKey}`;

      let isAdmin = false;
      if (!isServiceRole && authHeader?.startsWith("Bearer ")) {
        try {
          const userClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } },
          );
          const token = authHeader.replace("Bearer ", "");
          const { data: claimsRes } = await userClient.auth.getClaims(token);
          const uid = claimsRes?.claims?.sub;
          if (uid) {
            const admin = getSupabaseAdmin();
            const { data: roles } = await admin
              .from("user_roles")
              .select("role")
              .eq("user_id", uid);
            const allowed = new Set(["admin", "admin_geral", "admin_financeiro"]);
            isAdmin = !!roles?.some((r: any) => allowed.has(r.role));
          }
        } catch (e) {
          console.error("[oauth-callback POST] JWT check failed:", e);
        }
      }

      if (!isServiceRole && !isAdmin) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabaseAdmin = getSupabaseAdmin();

      const { data: tokenRecord } = await supabaseAdmin
        .from("conta_azul_tokens")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (!tokenRecord) {
        return new Response(
          JSON.stringify({ error: "No Conta Azul tokens found. Please authorize first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const clientId = Deno.env.get("CONTAAZUL_CLIENT_ID");
      const clientSecret = Deno.env.get("CONTAAZUL_CLIENT_SECRET");

      const refreshResponse = await fetch(CONTAAZUL_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenRecord.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error("Token refresh failed:", errorText);
        return new Response(
          JSON.stringify({ error: "Token refresh failed", details: errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newTokenData = await refreshResponse.json();

      await supabaseAdmin
        .from("conta_azul_tokens")
        .update({
          access_token: newTokenData.access_token,
          refresh_token: newTokenData.refresh_token || tokenRecord.refresh_token,
          expires_at: new Date(Date.now() + (newTokenData.expires_in || 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: "Token refreshed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
