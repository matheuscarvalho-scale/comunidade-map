// GA4 custom event helpers

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface BenefitClickParams {
  partner_name: string;
  benefit_type: string;
  user_plan: string;
  utm_campaign: string;
}

interface CashbackConfirmedParams {
  partner_name: string;
  purchase_value: number;
  cashback_value: number;
  user_plan: string;
}

export function trackBenefitClick(params: BenefitClickParams) {
  if (window.gtag) {
    window.gtag("event", "benefit_click", params);
  }
}

export function trackCashbackConfirmed(params: CashbackConfirmedParams) {
  if (window.gtag) {
    window.gtag("event", "cashback_confirmed", params);
  }
}

/** Extract utm_campaign from a URL string, returns empty string if not found */
export function extractUtmCampaign(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("utm_campaign") || "";
  } catch {
    return "";
  }
}

/** Extract utm_source from a URL string */
export function extractUtmSource(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("utm_source") || "";
  } catch {
    return "";
  }
}

/** Extract utm_medium from a URL string */
export function extractUtmMedium(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("utm_medium") || "";
  } catch {
    return "";
  }
}

/** Derive benefit_type label from discount_percentage */
export function deriveBenefitType(discountPercentage: number | null | undefined): string {
  if (!discountPercentage || discountPercentage <= 0) return "Exclusivo";
  return `Desconto ${discountPercentage}%`;
}
