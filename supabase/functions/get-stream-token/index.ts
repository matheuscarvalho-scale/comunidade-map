// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Access level hierarchy ─────────────────────────────────

const PLAN_HIERARCHY: Record<string, number> = {
  basic: 1,
  starter: 1, // legacy
  pro: 2,
  business: 3,
  enterprise: 3, // legacy
};

const ACCESS_LEVEL_MIN_PLAN: Record<string, number> = {
  public: 0,
  members: 1,
  pro: 2,
  enterprise: 3,
};

function hasAccess(accessLevel: string, subscriptionPlan: string | null, subscriptionStatus: string | null): boolean {
  if (accessLevel === "public") return true;
  if (subscriptionStatus !== "active") return false;
  const requiredLevel = ACCESS_LEVEL_MIN_PLAN[accessLevel] ?? 1;
  const userLevel = PLAN_HIERARCHY[subscriptionPlan ?? ""] ?? 0;
  return userLevel >= requiredLevel;
}

// ── Main handler ───────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");

    // Parse body and validate user in parallel
    const [bodyResult, userResult] = await Promise.all([
      req.json(),
      supabaseUser.auth.getUser(token),
    ]);

    const { data: { user }, error: userError } = userResult;
    if (userError || !user) {
      return json({ error: "Invalid token" }, 401);
    }

    const userId = user.id;
    const { videoUid } = bodyResult;
    if (!videoUid || typeof videoUid !== "string") {
      return json({ error: "videoUid is required" }, 400);
    }

    // Run all DB queries in parallel
    const [videoResult, profileResult, rolesResult] = await Promise.all([
      supabaseAdmin
        .from("cloudflare_videos")
        .select("access_level")
        .eq("cloudflare_video_uid", videoUid)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("subscription_status, subscription_plan")
        .eq("user_id", userId)
        .single(),
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId),
    ]);

    let video = videoResult.data;

    // Auto-register unknown video UIDs
    if (!video) {
      const { data: newVideo } = await supabaseAdmin
        .from("cloudflare_videos")
        .insert({
          cloudflare_video_uid: videoUid,
          title: videoUid,
          access_level: "members",
          created_by: userId,
        })
        .select("access_level")
        .single();
      video = newVideo;
    }

    // Check admin / internal team (full access bypass)
    const userRoles = (rolesResult.data || []).map((r: { role: string }) => r.role);
    const INTERNAL_ROLES = ["admin", "admin_geral", "admin_financeiro", "admin_conteudo", "cx", "comercial", "marketing", "automacao"];
    const isInternal = userRoles.some((r) => INTERNAL_ROLES.includes(r));

    // Check access
    if (!isInternal) {
      const accessLevel = video?.access_level ?? "members";
      const profile = profileResult.data;
      if (!hasAccess(accessLevel, profile?.subscription_plan ?? null, profile?.subscription_status ?? null)) {
        return json({ error: "Insufficient permissions", requiredLevel: accessLevel }, 403);
      }
    }

    // Direct playback — no signed URLs needed, no Cloudflare API calls
    return json({ authorized: true, videoUid, signedRequired: false });
  } catch (error) {
    console.error("get-stream-token error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
