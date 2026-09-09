// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Invalid token" }, 401);
    }

    const userId = claimsData.claims.sub as string;

    // Check admin roles
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: { role: string }) => r.role);
    const allowedRoles = ["admin", "admin_geral", "admin_conteudo", "marketing"];
    if (!userRoles.some((r: string) => allowedRoles.includes(r))) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    const { videoUid } = await req.json();
    if (!videoUid) return json({ error: "videoUid required" }, 400);

    const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!;
    const cfApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${videoUid}`,
      {
        headers: { Authorization: `Bearer ${cfApiToken}` },
      }
    );

    if (!cfResponse.ok) {
      const cfErrorText = await cfResponse.text().catch(() => "");
      console.error(
        `Cloudflare API error (${cfResponse.status}) for videoUid=${videoUid}:`,
        cfErrorText
      );
      // Video deletado / não encontrado no Cloudflare — devolve status amigável em vez de 502
      if (cfResponse.status === 404) {
        return json({
          status: "not_found",
          duration: null,
          thumbnail: null,
          readyToStream: false,
          pctComplete: null,
        });
      }
      return json(
        { error: "Erro ao consultar Cloudflare", cfStatus: cfResponse.status },
        502
      );
    }

    const cfData = await cfResponse.json();
    const video = cfData.result;

    // Update DB with duration and thumbnail if ready
    if (video?.status?.state === "ready") {
      const durationSeconds = Math.round(video.duration || 0);
      const durationMinutes = Math.ceil(durationSeconds / 60);

      await supabaseAdmin
        .from("cloudflare_videos")
        .update({
          duration: durationSeconds,
          thumbnail_url: video.thumbnail || null,
        })
        .eq("cloudflare_video_uid", videoUid);

      // Also sync duration to formation_lessons and content_items
      await supabaseAdmin
        .from("formation_lessons")
        .update({ duration_minutes: durationMinutes })
        .eq("cloudflare_video_uid", videoUid)
        .eq("duration_minutes", 0);

      await supabaseAdmin
        .from("content_items")
        .update({ duration_minutes: durationMinutes })
        .eq("cloudflare_video_uid", videoUid)
        .is("duration_minutes", null);
    }

    return json({
      status: video?.status?.state ?? "unknown",
      duration: video?.duration ?? null,
      thumbnail: video?.thumbnail ?? null,
      readyToStream: video?.readyToStream ?? false,
      pctComplete: video?.status?.pctComplete ?? null,
    });
  } catch (error) {
    console.error("cloudflare-video-status error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
