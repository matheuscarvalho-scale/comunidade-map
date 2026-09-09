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
    // 1. Validate auth
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

    // 2. Check admin/content roles
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const userRoles = (roles || []).map((r: { role: string }) => r.role);
    const allowedRoles = ["admin", "admin_geral", "admin_conteudo", "marketing"];
    const hasPermission = userRoles.some((r: string) => allowedRoles.includes(r));

    if (!hasPermission) {
      return json({ error: "Permissão insuficiente" }, 403);
    }

    // 3. Parse request
    const { title, maxDurationSeconds, accessLevel } = await req.json();

    if (!title || typeof title !== "string") {
      return json({ error: "title é obrigatório" }, 400);
    }

    // 4. Create Direct Creator Upload via Cloudflare API (TUS)
    const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID")!;
    const cfApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;

    const tusHeaders: Record<string, string> = {
      Authorization: `Bearer ${cfApiToken}`,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": "0", // Will be set by client
      "Upload-Metadata": btoa(JSON.stringify({
        name: title,
        requiresignedurls: "true",
      })),
    };

    if (maxDurationSeconds) {
      tusHeaders["Upload-Length"] = String(maxDurationSeconds);
    }

    // Use Cloudflare's Direct Creator Upload API (non-TUS, simpler)
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: maxDurationSeconds || 21600, // 6h default
          requireSignedURLs: true,
          meta: {
            name: title,
            created_by: userId,
          },
          // Enable TUS for resumable uploads
          tusResumable: "1.0.0",
        }),
      }
    );

    if (!cfResponse.ok) {
      const errorText = await cfResponse.text();
      console.error("Cloudflare API error:", errorText);
      return json({ error: "Erro ao criar upload na Cloudflare" }, 502);
    }

    const cfData = await cfResponse.json();

    if (!cfData.success || !cfData.result) {
      console.error("Cloudflare API unexpected response:", cfData);
      return json({ error: "Resposta inesperada da Cloudflare" }, 502);
    }

    const { uid, uploadURL } = cfData.result;

    // 5. Save video metadata to database
    const { data: videoRecord, error: dbError } = await supabaseAdmin
      .from("cloudflare_videos")
      .insert({
        cloudflare_video_uid: uid,
        title,
        access_level: accessLevel || "members",
        created_by: userId,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("DB insert error:", dbError);
      // Still return the upload URL — we can reconcile later
    }

    // 6. Return upload URL and video info
    return json({
      uploadUrl: uploadURL,
      videoUid: uid,
      videoId: videoRecord?.id ?? null,
    });
  } catch (error) {
    console.error("create-stream-upload error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
