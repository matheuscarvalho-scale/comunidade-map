import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Create a JWT for Google Service Account authentication
async function createServiceAccountJWT(clientEmail: string, privateKey: string, scopes: string, subject?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    iss: clientEmail,
    scope: scopes,
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  };
  // Impersonate the calendar owner so Meet conference is available
  if (subject) {
    payload.sub = subject;
  }

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

// Exchange JWT for access token
async function getAccessToken(clientEmail: string, privateKey: string, scopes: string, subject?: string): Promise<string> {
  const jwt = await createServiceAccountJWT(clientEmail, privateKey, scopes, subject);

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

interface MeetRequest {
  title?: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  cohost_email?: string;
  request_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: admin JWT OU service_role
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  let isAuthorized = false;
  if (bearerToken === serviceKey) {
    isAuthorized = true;
  } else if (bearerToken) {
    try {
      const supa = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await supa.auth.getClaims(bearerToken);
      const userId = claims?.claims?.sub;
      if (userId) {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        const allowed = new Set(["admin", "admin_geral"]);
        isAuthorized = (roles || []).some((r: any) => allowed.has(r.role));
      }
    } catch (_e) {
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const GOOGLE_CLIENT_EMAIL = Deno.env.get("GOOGLE_EMAIL_CLIENT");
    const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const GOOGLE_CALENDAR_ID = Deno.env.get("GOOGLE_CALENDAR_ID");

    if (!GOOGLE_CLIENT_EMAIL) throw new Error("GOOGLE_EMAIL_CLIENT secret is not configured");
    if (!GOOGLE_PRIVATE_KEY) throw new Error("GOOGLE_PRIVATE_KEY secret is not configured");
    if (!GOOGLE_CALENDAR_ID) throw new Error("GOOGLE_CALENDAR_ID secret is not configured");

    // Parse request body
    const body: MeetRequest = await req.json().catch(() => ({}));
    const title = body.title || "Reunião MAP";
    const description = body.description || "";
    const durationMinutes = body.duration_minutes || 60;
    const cohostEmail = body.cohost_email;
    const requestId = body.request_id || `map-${Date.now()}`;

    // Calculate start and end times
    const startTime = body.scheduled_at ? new Date(body.scheduled_at) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // Use full Calendar scope to create events with conferenceData
    const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
    // Do NOT pass subject — Domain-Wide Delegation is not configured for this service account.
    // The calendar must be shared with the service account email with "Make changes to events" permission.
    const accessToken = await getAccessToken(GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, CALENDAR_SCOPE);

    // Note: Service accounts cannot invite attendees without Domain-Wide Delegation
    // Attendees are skipped to avoid 403 errors

    // Create Calendar event with conferenceData to auto-generate Meet link
    const calendarEvent = {
      summary: title,
      description: description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      // attendees removed - service account limitation
      conferenceData: {
        createRequest: {
          requestId: requestId,
          conferenceSolutionKey: {
            type: "hangoutsMeet",
          },
        },
      },
      extendedProperties: {
        private: {
          source: "map-platform",
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=all`;

    const response = await fetch(calendarUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(calendarEvent),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
    }

    const eventData = await response.json();

    // Extract Meet link from conferenceData
    const meetLink = eventData.conferenceData?.entryPoints?.find(
      (ep: { entryPointType: string; uri: string }) => ep.entryPointType === "video"
    )?.uri;

    if (!meetLink) {
      throw new Error(`No Meet link generated. Conference status: ${eventData.conferenceData?.createRequest?.status?.statusCode || 'unknown'}`);
    }

    const eventId = eventData.id;
    const htmlLink = eventData.htmlLink;

    console.log(`✅ Calendar event created: ${eventId}, Meet: ${meetLink}`);

    return new Response(
      JSON.stringify({
        success: true,
        meeting_url: meetLink,
        event_id: eventId,
        calendar_link: htmlLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Google Meet/Calendar integration error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
