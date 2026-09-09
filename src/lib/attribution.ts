// Captura de atribuição de origem (first-touch / last-touch).
// Roda em qualquer acesso (inclusive páginas públicas), antes de haver sessão.
// Ao autenticar, os dados são vinculados ao usuário em public.member_attribution.

const FIRST_KEY = "map_attribution_first";
const LAST_KEY = "map_attribution_last";

export interface AttributionData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landing_page: string | null;
  source_type: string | null;
  origin: string | null;
  touch_at: string;
}

const META_SOURCES = ["facebook", "fb", "instagram", "ig", "meta", "meta ads", "facebook.com", "instagram.com"];
const GOOGLE_SOURCES = ["google", "google.com", "youtube", "youtube.com", "adwords"];
const PAID_MEDIUMS = ["cpc", "ppc", "paid", "paid_social", "paidsocial", "ads", "ad", "lead_ad", "display"];

function param(sp: URLSearchParams, key: string): string | null {
  const value = sp.get(key);
  return value && value.trim() ? value.trim().slice(0, 500) : null;
}

/** Classifica a origem em (source_type, origin) legíveis para o consumidor da API. */
function classify(data: Omit<AttributionData, "source_type" | "origin" | "touch_at">) {
  const source = (data.utm_source ?? "").toLowerCase();
  const medium = (data.utm_medium ?? "").toLowerCase();
  const isPaidMedium = PAID_MEDIUMS.some((m) => medium.includes(m));

  if (data.fbclid || META_SOURCES.includes(source)) {
    return { source_type: data.fbclid || isPaidMedium ? "ad" : "social", origin: "Meta ADS" };
  }
  if (data.gclid || (GOOGLE_SOURCES.includes(source) && isPaidMedium)) {
    return { source_type: "ad", origin: "Google ADS" };
  }
  if (source === "tiktok" || source === "tiktok.com") {
    return { source_type: isPaidMedium ? "ad" : "social", origin: "TikTok" };
  }
  if (source && isPaidMedium) return { source_type: "ad", origin: data.utm_source };
  if (source) return { source_type: medium || "campaign", origin: data.utm_source };

  if (data.referrer) {
    try {
      const host = new URL(data.referrer).hostname.replace(/^www\./, "");
      if (host && !host.includes(window.location.hostname)) {
        return { source_type: "referral", origin: host };
      }
    } catch {
      // referrer inválido: cai em direto
    }
  }
  return { source_type: "direct", origin: "Direto" };
}

function readCurrentTouch(): AttributionData | null {
  const sp = new URLSearchParams(window.location.search);
  const base = {
    utm_source: param(sp, "utm_source"),
    utm_medium: param(sp, "utm_medium"),
    utm_campaign: param(sp, "utm_campaign"),
    utm_content: param(sp, "utm_content"),
    utm_term: param(sp, "utm_term"),
    gclid: param(sp, "gclid"),
    fbclid: param(sp, "fbclid"),
    referrer: document.referrer ? document.referrer.slice(0, 1000) : null,
    landing_page: window.location.href.slice(0, 1000),
  };

  const hasSignal = Boolean(
    base.utm_source || base.utm_medium || base.utm_campaign || base.gclid || base.fbclid || base.referrer,
  );
  if (!hasSignal) return null;

  return { ...base, ...classify(base), touch_at: new Date().toISOString() };
}

function safeRead(key: string): AttributionData | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AttributionData) : null;
  } catch {
    return null;
  }
}

/** Persiste o toque atual: first-touch nunca é sobrescrito, last-touch sempre. */
export function captureAttribution() {
  try {
    const touch = readCurrentTouch();
    if (!touch) return;
    if (!localStorage.getItem(FIRST_KEY)) {
      localStorage.setItem(FIRST_KEY, JSON.stringify(touch));
    }
    localStorage.setItem(LAST_KEY, JSON.stringify(touch));
  } catch {
    // localStorage indisponível (modo privado / iframe): ignora silenciosamente
  }
}

export function getStoredAttribution() {
  const first = safeRead(FIRST_KEY);
  const last = safeRead(LAST_KEY);
  if (!first && !last) return null;
  return { first: first ?? last!, last: last ?? first! };
}
