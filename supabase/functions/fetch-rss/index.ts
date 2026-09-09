import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RSS_URL = "https://rss.app/feeds/txD0zWN9CPh41LuF.xml";

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source?: string;
  thumbnail?: string;
}

function normalizeForDedup(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";
    return parsed.toString().toLowerCase();
  } catch {
    return trimmed.split("#")[0].toLowerCase();
  }
}

function cleanImageUrl(url?: string): string {
  if (!url) return "";
  return url.trim()
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&#63;/g, "?");
}

function normalizeTitle(title?: string): string {
  if (!title) return "";
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLowQualityThumbnail(url?: string): boolean {
  if (!url) return true;
  const normalized = normalizeForDedup(url);
  return (
    normalized.includes("api.dino.com.br/v2/news/tr/") ||
    normalized.includes("placeholder") ||
    normalized.includes("no-image") ||
    normalized.includes("sem-imagem") ||
    normalized.includes("lgsegs") ||
    normalized.includes("img.dhost.cloud") ||
    // Detect malformed proxy URLs (e.g. https:/domain instead of https://domain)
    /\/https?:\/[^/]/.test(url)
  );
}

async function verifyThumbnail(url: string): Promise<boolean> {
  if (!url || isLowQualityThumbnail(url)) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ComunidadeMAP/1.0)" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    // Must be an image content-type
    if (!ct.startsWith("image/")) return false;
    // Reject tiny images (likely 1x1 tracking pixels or blank placeholders)
    const cl = parseInt(res.headers.get("content-length") || "0", 10);
    if (cl > 0 && cl < 1000) return false;
    return true;
  } catch {
    return false;
  }
}

function scoreNewsItem(item: RSSItem): number {
  let score = 0;
  if (item.thumbnail && !isLowQualityThumbnail(item.thumbnail)) score += 3;
  if (item.description && item.description.length > 40) score += 1;
  if (item.link && !normalizeForDedup(item.link).includes("dino")) score += 1;
  return score;
}

function resolveUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function parseRSStoJSON(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  const thumbnailCount: Record<string, number> = {};
  const rawItems: { item: RSSItem; thumbnail: string }[] = [];

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    const getTagContent = (tag: string): string => {
      const regex = new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
        "i",
      );
      const tagMatch = itemContent.match(regex);
      if (tagMatch) {
        return (tagMatch[1] || tagMatch[2] || "").trim();
      }
      return "";
    };

    const descriptionHtml = getTagContent("description");

    const candidates: string[] = [];
    const mediaMatch = itemContent.match(/<media:content[^>]*url=["']([^"']+)["']/i);
    const enclosureMatch = itemContent.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
    const imageMatches = [...descriptionHtml.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)];

    if (mediaMatch?.[1]) candidates.push(mediaMatch[1]);
    if (enclosureMatch?.[1]) candidates.push(enclosureMatch[1]);
    for (const imgM of imageMatches) {
      if (imgM[1]) candidates.push(imgM[1]);
    }

    let thumbnail = "";
    if (candidates.length > 0) {
      thumbnail = candidates.reduce((best, curr) => curr.length > best.length ? curr : best, candidates[0]);
    }

    if (thumbnail && /\/$/.test(thumbnail.split("?")[0])) {
      thumbnail = "";
    }

    let source = getTagContent("source") || getTagContent("dc:creator") || "";
    if (!source) {
      const linkMatch = getTagContent("link").match(/https?:\/\/(?:www\.)?([^\/]+)/i);
      if (linkMatch?.[1]) {
        source = linkMatch[1];
      }
    }

    const cleanThumb = cleanImageUrl(thumbnail);
    const dedupKey = normalizeForDedup(thumbnail);
    if (dedupKey) {
      thumbnailCount[dedupKey] = (thumbnailCount[dedupKey] || 0) + 1;
    }

    rawItems.push({
      thumbnail: dedupKey,
      item: {
        title: getTagContent("title"),
        link: getTagContent("link"),
        description: descriptionHtml.replace(/<[^>]*>/g, "").substring(0, 200),
        pubDate: getTagContent("pubDate") || getTagContent("pubdate"),
        source,
        thumbnail: cleanThumb,
      },
    });
  }

  const duplicateThreshold = 3;
  const seenLinks = new Set<string>();

  for (const raw of rawItems) {
    const linkKey = normalizeForDedup(raw.item.link);
    if (linkKey && seenLinks.has(linkKey)) continue;
    if (linkKey) seenLinks.add(linkKey);

    const thumb = raw.thumbnail;
    if (thumb && thumbnailCount[thumb] >= duplicateThreshold) {
      raw.item.thumbnail = "";
    }

    items.push(raw.item);
  }

  return items;
}

function extractMetaImage(html: string, key: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

async function fetchFallbackThumbnail(link: string): Promise<string> {
  if (!link) return "";

  try {
    const response = await fetch(link, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ComunidadeMAP/1.0)",
      },
    });

    if (!response.ok) return "";

    const html = await response.text();

    const ogImage = extractMetaImage(html, "og:image");
    if (ogImage) return resolveUrl(ogImage, link);

    const twitterImage = extractMetaImage(html, "twitter:image");
    if (twitterImage) return resolveUrl(twitterImage, link);

    const firstImageMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
    if (firstImageMatch?.[1]) return resolveUrl(firstImageMatch[1], link);

    return "";
  } catch {
    return "";
  }
}

async function ensureUniqueThumbnails(items: RSSItem[]): Promise<RSSItem[]> {
  const seenThumbnails = new Set<string>();
  const seenTitles = new Set<string>();
  const result: RSSItem[] = [];

  const parseDate = (d?: string) => {
    if (!d) return 0;
    const t = new Date(d).getTime();
    return isNaN(t) ? 0 : t;
  };
  // Priorizar sempre as mais recentes; usar score apenas como desempate
  const sortedItems = [...items].sort((a, b) => {
    const diff = parseDate(b.pubDate) - parseDate(a.pubDate);
    if (diff !== 0) return diff;
    return scoreNewsItem(b) - scoreNewsItem(a);
  });



  for (const item of sortedItems) {
    const titleKey = normalizeTitle(item.title);
    if (titleKey && seenTitles.has(titleKey)) {
      continue;
    }

    const initialThumbnail = isLowQualityThumbnail(item.thumbnail) ? "" : item.thumbnail || "";
    const dedupKey = normalizeForDedup(initialThumbnail);

    let finalThumb = "";

    if (dedupKey && !seenThumbnails.has(dedupKey)) {
      // Verify the thumbnail actually works
      const isValid = await verifyThumbnail(cleanImageUrl(initialThumbnail));
      if (isValid) {
        seenThumbnails.add(dedupKey);
        finalThumb = cleanImageUrl(initialThumbnail);
      }
    }

    // If no valid thumbnail yet, try og:image fallback
    if (!finalThumb) {
      const fallbackRaw = await fetchFallbackThumbnail(item.link);
      const fallbackDedup = normalizeForDedup(fallbackRaw);

      if (fallbackDedup && !seenThumbnails.has(fallbackDedup) && !isLowQualityThumbnail(fallbackRaw)) {
        const isValid = await verifyThumbnail(cleanImageUrl(fallbackRaw));
        if (isValid) {
          seenThumbnails.add(fallbackDedup);
          finalThumb = cleanImageUrl(fallbackRaw);
        }
      }
    }

    result.push({ ...item, thumbnail: finalThumb });
    if (titleKey) {
      seenTitles.add(titleKey);
    }
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching RSS feed from:", RSS_URL);

    const response = await fetch(RSS_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ComunidadeMAP/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log("RSS feed fetched successfully, parsing...");

    const parsedItems = parseRSStoJSON(xmlText);
    const items = await ensureUniqueThumbnails(parsedItems);

    console.log(`Parsed ${items.length} items from RSS feed`);

    return new Response(JSON.stringify({ items, fetchedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching RSS:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage, items: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
