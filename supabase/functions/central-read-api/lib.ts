// Helpers compartilhados da central-read-api (read-only, server-to-server).

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-actor, if-unmodified-since",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
};

export const PLACEHOLDER_PHONE = "99999999999";

export type PhoneInfo = {
  raw: string | null;
  e164: string | null;
  phone_key: string | null;
  valid: boolean;
  needs_review: boolean;
  review_reasons: string[];
  shared_with_user_ids: string[];
};

/**
 * Mesma régua da função public.phone_key() do CRM MAP Educação:
 * 1. só dígitos
 * 2. 12+ dígitos começando com "55" -> remove o prefixo
 * 3. 10+ dígitos restantes -> DDD (2 primeiros) + últimos 8
 * 4. caso contrário -> null
 */
export function phoneKey(raw: string | null | undefined): string | null {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length >= 10) return digits.slice(0, 2) + digits.slice(-8);
  return null;
}


/**
 * Normalização E.164 conservadora.
 * Só 11 dígitos (DDD + 9 dígitos) ou 13 com o 55 já incluso são confiáveis.
 * Qualquer outro tamanho (inclusive 10 dígitos, sem 9º dígito) NÃO é promovido
 * a E.164 — vai para needs_review para revisão manual.
 */
export function normalizePhone(raw: string | null | undefined): PhoneInfo {
  const value = (raw ?? "").trim();
  const digits = value.replace(/\D/g, "");
  const base: PhoneInfo = {
    raw: value || null,
    e164: null,
    phone_key: phoneKey(value),
    valid: false,
    needs_review: true,
    review_reasons: [],
    shared_with_user_ids: [],
  };

  if (!digits) {
    base.review_reasons.push("missing");
    return base;
  }
  if (digits === PLACEHOLDER_PHONE) {
    base.phone_key = null; // número de preenchimento, nunca deve casar com o CRM
    base.review_reasons.push("placeholder");
    return base;
  }

  if (digits.length === 11) {
    return { ...base, e164: `+55${digits}`, valid: true, needs_review: false };
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    return { ...base, e164: `+${digits}`, valid: true, needs_review: false };
  }
  base.review_reasons.push("unexpected_length");
  return base;
}

/** Marca telefones associados a mais de um user_id (sem escolher um "dono"). */
export function applySharedPhones(
  rows: { user_id: string; phone: PhoneInfo }[],
): void {
  const byE164 = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.phone.e164) continue;
    const list = byE164.get(row.phone.e164) ?? [];
    if (!list.includes(row.user_id)) list.push(row.user_id);
    byE164.set(row.phone.e164, list);
  }
  for (const row of rows) {
    if (!row.phone.e164) continue;
    const users = byE164.get(row.phone.e164) ?? [];
    if (users.length > 1) {
      row.phone.shared_with_user_ids = users;
      row.phone.needs_review = true;
      if (!row.phone.review_reasons.includes("shared_phone")) {
        row.phone.review_reasons.push("shared_phone");
      }
    }
  }
}

export type PhoneFilter = "valid" | "all" | "needs_review";

export function parsePhoneFilter(value: string | null): PhoneFilter | null {
  if (!value) return "valid";
  if (value === "valid" || value === "all" || value === "needs_review") return value;
  return null;
}

export function matchesPhoneFilter(phone: PhoneInfo, filter: PhoneFilter): boolean {
  if (filter === "all") return true;
  if (filter === "needs_review") return phone.needs_review;
  return phone.valid && !phone.needs_review;
}

export type Pagination = { page: number; perPage: number };

export function parsePagination(url: URL): Pagination | { error: string } {
  const rawPage = url.searchParams.get("page");
  const rawPerPage = url.searchParams.get("per_page");
  const page = rawPage === null ? 1 : Number(rawPage);
  const perPage = rawPerPage === null ? 100 : Number(rawPerPage);

  if (!Number.isInteger(page) || page < 1) {
    return { error: "page must be an integer >= 1" };
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 500) {
    return { error: "per_page must be an integer between 1 and 500" };
  }
  return { page, perPage };
}

export function parseIsoDate(url: URL, param: string): string | null | { error: string } {
  const raw = url.searchParams.get(param);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { error: `${param} must be a valid ISO-8601 timestamp` };
  }
  return parsed.toISOString();
}

/** Inteiro opcional de query string, com default e limites. */
export function parseIntParam(
  url: URL,
  param: string,
  fallback: number,
  min: number,
  max: number,
): number | { error: string } {
  const raw = url.searchParams.get(param);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return { error: `${param} must be an integer between ${min} and ${max}` };
  }
  return value;
}


export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message } }, status);
}

export function paginated<T>(items: T[], { page, perPage }: Pagination) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);
  return {
    data,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      has_more: start + data.length < total,
      generated_at: new Date().toISOString(),
    },
  };
}

// Mesma lista de src/lib/internalMembers.ts
export const INTERNAL_USER_IDS = new Set<string>([
  "430cdde2-f2e4-49c8-8c96-f0c649519f00",
  "1894fbbc-eb90-45f3-9abb-c67065393c31",
  "e4e8f871-cedd-47ab-9e14-3c52eed7d40e",
  "9747c48e-ab50-4d33-82f6-36e8a4d94398",
  "69add853-127c-411d-8f68-2051f278e84c",
  "297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf",
  "634f99e0-131b-481c-816d-c14301568fe7",
  "b7783f1f-5e44-46ad-b1f9-17fe451d0689",
  "7a68fe88-1dec-4fec-af54-a9deed5e634e",
  "628785b5-36c9-4516-bf27-bea300165f1f",
  "498b0eb2-e4d4-418c-96ca-062d25675049",
  "44059506-de82-41e6-afd1-39bb3d7589c7",
  "36c7c50e-a909-426f-8a9b-6f4c4849406d",
  "ea125ab3-0740-4840-b325-63e9b042ccea",
  "f86279a9-1566-4216-a947-78159a50ab7f",
]);

export const TEAM_ROLES = [
  "admin",
  "admin_geral",
  "admin_financeiro",
  "admin_conteudo",
  "cx",
  "comercial",
  "marketing",
  "automacao",
];

export const ROLE_PRIORITY = [
  "admin_geral",
  "admin",
  "admin_financeiro",
  "admin_conteudo",
  "cx",
  "comercial",
  "marketing",
  "automacao",
  "enterprise",
  "business",
  "pro",
  "starter",
  "basic",
];

export function pickHighestRole(roles: string[]): string | null {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return roles[0] ?? null;
}

/** Mesmo mapa de rótulos usado no painel (src/pages/AdminAnalytics.tsx). */
export const PAGE_NAME_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/formacoes": "Formações",
  "/mentorias": "Mentorias",
  "/webinars": "Webinars",
  "/comunidade": "Comunidade",
  "/networking": "Networking",
  "/conquistas": "Conquistas",
  "/recursos": "Recursos",
  "/parceiros": "Parceiros e Benefícios",
  "/noticias": "Notícias",
  "/trilha-conteudo": "Trilha de Conteúdo",
  "/perfil": "Perfil",
  "/meu-cashback": "Meu Cashback",
  "/certificados": "Certificados",
  "/sugestoes": "Sugestões",
  "/gestao-equipe": "Gestão de Equipe",
  "/meus-beneficios": "Parceiros e Benefícios",
  "/onboarding": "Onboarding",
  "/planos": "Planos",
};

/** Rótulos de tipo de elemento clicado, iguais ao ClicksDashboard. */
export const ELEMENT_TYPE_LABELS: Record<string, string> = {
  botao: "Botão",
  link: "Link",
  card: "Card",
  elemento: "Elemento",
  input: "Input",
  tab: "Aba",
  aba: "Aba",
  checkbox: "Checkbox",
  switch: "Switch",
  radio: "Radio",
  select: "Select",
  slider: "Slider",
  accordion: "Accordion",
  menu_item: "Menu",
};
