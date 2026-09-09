/**
 * Sanitizes a user-provided URL to prevent XSS via dangerous schemes
 * (javascript:, data:, vbscript:, etc.).
 *
 * - Returns the URL as-is if it starts with http:// or https://
 * - If it has no scheme but looks like a domain, prefixes with https://
 * - Otherwise returns "#" (safe no-op href)
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (!trimmed) return "#";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Looks like a bare domain (e.g. "example.com", "instagram.com/user")?
  // Require at least one dot and only safe URL chars before the first slash.
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/?#].*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return "#";
}

/**
 * Normalizes a URL for storage. Returns:
 *  - null if empty
 *  - the normalized https?:// URL if valid (adding https:// to bare domains)
 *  - undefined if the value is present but unsafe (caller should reject)
 */
export function normalizeUrlForStorage(
  url: string | null | undefined
): string | null | undefined {
  if (url === null || url === undefined) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  const safe = sanitizeUrl(trimmed);
  if (safe === "#") return undefined;
  return safe;
}
