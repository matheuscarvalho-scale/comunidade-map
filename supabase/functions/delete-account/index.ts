import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Snapshot para o log de exclusões (consumido pela API central via /deletions).
    let deletedEmail: string | null =
      (claimsData.claims.email as string | undefined) ?? null;
    let deletedName: string | null = null;
    try {
      const { data: profileSnapshot } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      deletedName = (profileSnapshot?.full_name as string | null) ?? null;
    } catch (e) {
      console.log("[delete-account] profile snapshot:", (e as Error).message);
    }




    // Best-effort cleanup of tables that may not have ON DELETE CASCADE.
    // Failures here are logged but do not block account deletion.
    const tables = [
      "push_tokens",
      "notifications",
      "notification_preferences",
      "member_analytics",
      "member_messages",
      "member_connections",
      "post_likes",
      "post_replies",
      "community_posts",
      "suggestion_votes",
      "suggestion_comments",
      "suggestions",
      "user_achievements",
      "achievement_notifications",
      "user_content_favorites",
      "user_content_notes",
      "user_recommendations",
      "content_item_progress",
      "growth_track_progress",
      "lesson_progress",
      
      "formation_lesson_progress",
      "enrollments",
      "certificates",
      "webinar_checkins",
      "webinar_email_reminders",
      "mentoring_checkins",
      "mentoring_email_reminders",
      "image_consent",
      "partner_clicks",
      "cashback_usage",
      "extra_benefits",
      "plan_upgrades",
      "secondary_login_requests",
      "secondary_logins",
      "terms_acceptance",
      "user_onboarding",
      "payment_identifiers",
      "payment_events",
      "pending_payments",
      "user_roles",
      "profiles_private",
      "profiles",
    ];

    for (const t of tables) {
      try {
        // @ts-ignore dynamic table
        const { error } = await admin.from(t).delete().eq("user_id", userId);
        if (error) {
          console.log(`[delete-account] cleanup ${t}:`, error.message);
        }
      } catch (e) {
        console.log(`[delete-account] cleanup ${t} threw:`, (e as Error).message);
      }
    }

    // Special tables that use different user FK
    try {
      await admin.from("member_messages").delete().eq("sender_id", userId);
      await admin.from("member_messages").delete().eq("receiver_id", userId);
    } catch (e) {
      console.log("[delete-account] messages cleanup:", (e as Error).message);
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("[delete-account] deleteUser error:", delErr.message);
      return new Response(
        JSON.stringify({ error: "Falha ao excluir conta" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    try {
      const { error: logErr } = await admin.from("member_deletions").upsert(
        {
          user_id: userId,
          email: deletedEmail ? deletedEmail.toLowerCase() : null,
          name: deletedName,
          reason: "self_service",
          deleted_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (logErr) {
        console.error("[delete-account] deletion log error:", logErr.message);
      }
    } catch (e) {
      console.error("[delete-account] deletion log threw:", (e as Error).message);
    }



    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[delete-account] unexpected:", (e as Error).message);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
