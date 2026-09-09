import { supabase } from "@/integrations/supabase/client";

const PUBLIC_MARKER = "/object/public/resources/";
const SIGN_MARKER = "/object/sign/resources/";

/**
 * Extracts the object path inside the "resources" bucket from either a legacy
 * public URL, a signed URL, or a plain path.
 */
export function extractResourcePath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  for (const marker of [PUBLIC_MARKER, SIGN_MARKER]) {
    const idx = urlOrPath.indexOf(marker);
    if (idx !== -1) {
      const raw = urlOrPath.slice(idx + marker.length).split("?")[0];
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  // Not a storage URL of this bucket: treat as plain path unless it's an external URL
  if (/^https?:\/\//i.test(urlOrPath)) return null;
  return urlOrPath.replace(/^\/+/, "");
}

/**
 * Returns a temporary signed URL for a file stored in the private "resources"
 * bucket. Accepts legacy public URLs or plain object paths. Non-bucket URLs are
 * returned unchanged so external links keep working.
 */
export async function getSignedResourceUrl(
  urlOrPath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const path = extractResourcePath(urlOrPath);
  if (!path) return urlOrPath;

  const { data, error } = await supabase.storage
    .from("resources")
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) return urlOrPath;
  return data.signedUrl;
}
