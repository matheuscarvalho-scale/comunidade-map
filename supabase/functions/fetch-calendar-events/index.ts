import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Reuse the same JWT logic from google-meet-integration
async function createServiceAccountJWT(clientEmail: string, privateKey: string, scopes: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: scopes,
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  let rawKey = privateKey;
  if ((rawKey.startsWith('"') && rawKey.endsWith('"')) || (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
    rawKey = rawKey.slice(1, -1);
  }

  let cleanKey = rawKey
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");

  while (cleanKey.length % 4 !== 0) {
    cleanKey += "=";
  }

  if (!cleanKey || cleanKey.length < 100) {
    throw new Error(`Private key appears invalid. Length: ${cleanKey.length}`);
  }

  const binaryString = atob(cleanKey);
  const binaryKey = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryKey[i] = binaryString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signatureBase64}`;
}

async function getAccessToken(clientEmail: string, privateKey: string, scopes: string): Promise<string> {
  const jwt = await createServiceAccountJWT(clientEmail, privateKey, scopes);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated user (JWT) — prevents anonymous enumeration of internal events
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_CLIENT_EMAIL = Deno.env.get("GOOGLE_EMAIL_CLIENT");
    const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const GOOGLE_CALENDAR_ID = Deno.env.get("GOOGLE_CALENDAR_ID");

    if (!GOOGLE_CLIENT_EMAIL) throw new Error("GOOGLE_EMAIL_CLIENT secret is not configured");
    if (!GOOGLE_PRIVATE_KEY) throw new Error("GOOGLE_PRIVATE_KEY secret is not configured");
    if (!GOOGLE_CALENDAR_ID) throw new Error("GOOGLE_CALENDAR_ID secret is not configured");

    // Parse optional request body for filtering
    let searchQuery: string | null = null;
    let filterSource = true; // default: filter by source=map-platform
    try {
      const body = await req.json();
      searchQuery = body?.q || null;
      if (body?.filterSource === false) filterSource = false;
    } catch {
      // No body or invalid JSON — use defaults
    }

    const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
    const accessToken = await getAccessToken(GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, CALENDAR_SCOPE);

    // Get events for the next 90 days and past 30 days
    const now = new Date();
    const timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });

    // If searching by text query, use Google Calendar's q parameter
    if (searchQuery) {
      params.set("q", searchQuery);
    }

    // Only filter by source if no search query and filterSource is true
    if (!searchQuery && filterSource) {
      params.set("privateExtendedProperty", "source=map-platform");
    }

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?${params}`;

    const response = await fetch(calendarUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    const events = (data.items || []).map((event: Record<string, unknown>) => {
      // Extract Meet link from conferenceData or hangoutLink
      const conferenceData = event.conferenceData as Record<string, unknown> | undefined;
      const entryPoints = conferenceData?.entryPoints as Array<Record<string, string>> | undefined;
      const meetLink = entryPoints?.find((ep) => ep.entryPointType === "video")?.uri
        || (event.hangoutLink as string | undefined)
        || null;

      return {
        id: event.id,
        title: event.summary || "Sem título",
        description: event.description || null,
        start: (event.start as Record<string, string>)?.dateTime || (event.start as Record<string, string>)?.date || null,
        end: (event.end as Record<string, string>)?.dateTime || (event.end as Record<string, string>)?.date || null,
        location: event.location || null,
        htmlLink: event.htmlLink || null,
        meetLink,
        updated: (event.updated as string | undefined) || null,
      };
    });

    return new Response(
      JSON.stringify({ success: true, events }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Fetch calendar events error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
