// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://acelera.mapeducacao.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Conta Azul API URLs
const CONTAAZUL_AUTH_URL = "https://auth.contaazul.com";
const CONTAAZUL_API_URL = "https://api-v2.contaazul.com";

// Product mapping by price in reais (amount is in cents from webhook)
// Prices reflect the actual services cadastrados na Conta Azul (campo "preco")
const PRODUCT_MAPPING: Record<number, { name: string; plan: string }> = {
  2364: { name: "MAP Acelera - Plano Basic Anual", plan: "basic_anual" },
  5964: { name: "MAP Acelera - Plano Pro", plan: "pro_anual" },
  7164: { name: "MAP Acelera - Pro Recorrente", plan: "pro_recorrente" },
  11964: { name: "MAP Acelera - Plano Business Anual", plan: "business_anual" },
};

// Direct mapping of Conta Azul service UUIDs by product name.
// Source: /admin/conta-azul-auth → Listar Serviços.
const SERVICE_UUIDS: Record<string, string> = {
  "MAP Acelera - Plano Basic Anual": "d14370f8-5647-4c0d-a132-8c23142ed8b1",
  "MAP Acelera - Plano Pro": "3fefac09-e5ba-48e3-acdf-64b6ae93e40a",
  "MAP Acelera - Pro Recorrente": "33063b0a-8e79-47e2-acb3-5d77448c0a28",
  "MAP Acelera - Plano Business Anual": "3b3b7cc9-3aa6-44a9-bcfd-dde9682fcf3f",
};

interface ContaAzulTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface CustomerData {
  email: string;
  name: string;
  phone?: string;
  document?: string | null;
  person_type?: string | null;
}

interface SaleData {
  customer_id: string;
  product_name: string;
  amount: number;
  plan: string;
  installments?: number;
}

// Get Supabase admin client
function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Get access token from DB (conta_azul_tokens), refresh automatically if expired
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("CONTAAZUL_CLIENT_ID");
  const clientSecret = Deno.env.get("CONTAAZUL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Conta Azul credentials not configured (CONTAAZUL_CLIENT_ID/SECRET)");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: tokenRecord, error } = await supabaseAdmin
    .from("conta_azul_tokens")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !tokenRecord) {
    throw new Error("No Conta Azul tokens found in DB. Please complete OAuth flow at /admin/conta-azul-auth first.");
  }

  const expiresAt = new Date(tokenRecord.expires_at).getTime();
  const now = Date.now();

  // If still valid for more than 60s, use cached token
  if (expiresAt - now > 60_000) {
    console.log("Using cached access token from DB");
    return tokenRecord.access_token;
  }

  console.log("Access token expired/expiring, refreshing via refresh_token...");
  const response = await fetch(`${CONTAAZUL_AUTH_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRecord.refresh_token,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to refresh token:", errorText);
    throw new Error(`Failed to refresh Conta Azul token: ${response.status} - ${errorText}`);
  }

  const data: ContaAzulTokenResponse = await response.json();

  await supabaseAdmin
    .from("conta_azul_tokens")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokenRecord.refresh_token,
      expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenRecord.id);

  console.log("Successfully refreshed and saved access token");
  return data.access_token;
}

// Search for existing customer by email
async function findCustomerByEmail(accessToken: string, email: string): Promise<string | null> {
  console.log("Searching for customer by email:", email);

  const response = await fetch(
    `${CONTAAZUL_API_URL}/v1/pessoas?emails=${encodeURIComponent(email)}&tipo_perfil=Cliente&tamanho_pagina=10`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    console.error("Failed to search customers:", await response.text());
    return null;
  }

  const data = await response.json();
  const customers = Array.isArray(data) ? data : (data?.items ?? []);

  if (customers && customers.length > 0) {
    const customer = customers.find((c: any) =>
      String(c.email || "").toLowerCase().split(",").map((e) => e.trim()).includes(email.toLowerCase())
    );
    if (customer) {
      console.log("Found existing customer by email:", customer.id);
      return customer.id;
    }
  }

  return null;
}

// Search for existing customer by CPF/CNPJ document (digits only).
async function findCustomerByDocument(accessToken: string, document: string): Promise<string | null> {
  const docDigits = (document || "").replace(/\D/g, "");
  if (docDigits.length !== 11 && docDigits.length !== 14) return null;

  const field = docDigits.length === 11 ? "cpf" : "cnpj";
  console.log(`Searching for customer by ${field}:`, docDigits);

  const url = `${CONTAAZUL_API_URL}/v1/pessoas?${field}=${docDigits}&tipo_perfil=Cliente&tamanho_pagina=10`;
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.warn(`Failed to search customers by ${field}:`, response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const customers = Array.isArray(data) ? data : (data?.items ?? []);
  if (!Array.isArray(customers) || customers.length === 0) return null;

  const match = customers.find((c: any) => {
    const cpf = String(c?.cpf || "").replace(/\D/g, "");
    const cnpj = String(c?.cnpj || "").replace(/\D/g, "");
    return cpf === docDigits || cnpj === docDigits;
  });

  if (match?.id) {
    console.log("Found existing customer by document:", match.id);
    return match.id;
  }
  console.warn(`No customer matched document ${docDigits} (API returned ${customers.length} items, none with matching cpf/cnpj). Skipping fallback.`);
  return null;
}

// ── Mapping helpers (DB-backed cache of asaas/email/document → conta_azul_customer_id) ──
type MappingHit = {
  conta_azul_customer_id: string;
  matched_by: "asaas_customer_id" | "document" | "email";
};

async function lookupCustomerMapping(params: {
  email?: string | null;
  document?: string | null;
  asaasCustomerId?: string | null;
}): Promise<MappingHit | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const docDigits = (params.document || "").replace(/\D/g, "") || null;
  const emailLower = (params.email || "").toLowerCase().trim() || null;
  const asaasId = (params.asaasCustomerId || "").trim() || null;

  // 1) asaas_customer_id (most precise)
  if (asaasId) {
    const { data } = await supabaseAdmin
      .from("conta_azul_customer_mapping")
      .select("conta_azul_customer_id")
      .eq("asaas_customer_id", asaasId)
      .maybeSingle();
    if (data?.conta_azul_customer_id) {
      return { conta_azul_customer_id: data.conta_azul_customer_id, matched_by: "asaas_customer_id" };
    }
  }

  // 2) document
  if (docDigits) {
    const { data } = await supabaseAdmin
      .from("conta_azul_customer_mapping")
      .select("conta_azul_customer_id")
      .eq("document", docDigits)
      .maybeSingle();
    if (data?.conta_azul_customer_id) {
      return { conta_azul_customer_id: data.conta_azul_customer_id, matched_by: "document" };
    }
  }

  // 3) email
  if (emailLower) {
    const { data } = await supabaseAdmin
      .from("conta_azul_customer_mapping")
      .select("conta_azul_customer_id")
      .ilike("email", emailLower)
      .maybeSingle();
    if (data?.conta_azul_customer_id) {
      return { conta_azul_customer_id: data.conta_azul_customer_id, matched_by: "email" };
    }
  }

  return null;
}

async function saveCustomerMapping(params: {
  email: string;
  document?: string | null;
  asaasCustomerId?: string | null;
  contaAzulCustomerId: string;
}): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const docDigits = (params.document || "").replace(/\D/g, "") || null;
  const emailLower = params.email.toLowerCase().trim();
  const asaasId = (params.asaasCustomerId || "").trim() || null;

  try {
    // Upsert by lowercase email (unique index on lower(email))
    const { error } = await supabaseAdmin
      .from("conta_azul_customer_mapping")
      .upsert(
        {
          email: emailLower,
          document: docDigits,
          asaas_customer_id: asaasId,
          conta_azul_customer_id: params.contaAzulCustomerId,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    if (error) {
      console.warn("[saveCustomerMapping] upsert failed (non-blocking):", error.message);
    } else {
      console.log("[saveCustomerMapping] saved mapping:", emailLower, "→", params.contaAzulCustomerId);
    }
  } catch (e) {
    console.warn("[saveCustomerMapping] exception (non-blocking):", e);
  }
}

// Verify that a customer id can actually be used in /v1/venda.
// Returns true only if the person exists, is active, and has perfil "Cliente".
async function verifyCustomerCanBeUsedInSale(accessToken: string, customerId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CONTAAZUL_API_URL}/v1/pessoas/${customerId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[verifyCustomer] GET /v1/pessoas/${customerId} returned ${response.status}`);
      return false;
    }

    const person: any = await response.json();
    const ativo = person?.ativo !== false; // default to true when undefined
    const perfis: any[] = Array.isArray(person?.perfis) ? person.perfis : [];
    const isCliente = perfis.some((p) => String(p?.tipo_perfil || "").toLowerCase() === "cliente");

    if (!ativo || !isCliente) {
      console.warn(`[verifyCustomer] customer ${customerId} invalid for sale (ativo=${ativo}, isCliente=${isCliente})`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[verifyCustomer] error:", e);
    return false;
  }
}

// Create new customer in Conta Azul
async function createCustomer(accessToken: string, customerData: CustomerData): Promise<string> {
  console.log("Creating new customer:", customerData.email);

  // Normalize document (only digits) and infer person type
  const docDigits = (customerData.document || "").replace(/\D/g, "");
  let tipoPessoa: "Física" | "Jurídica" | "Estrangeira";
  if (customerData.person_type === "JURIDICA" || customerData.person_type === "Jurídica") {
    tipoPessoa = "Jurídica";
  } else if (customerData.person_type === "FISICA" || customerData.person_type === "Física") {
    tipoPessoa = "Física";
  } else if (docDigits.length === 14) {
    tipoPessoa = "Jurídica";
  } else if (docDigits.length === 11) {
    tipoPessoa = "Física";
  } else {
    tipoPessoa = "Física"; // fallback default for BR
  }

  const body: Record<string, unknown> = {
    ativo: true,
    nome: customerData.name,
    email: customerData.email,
    tipo_pessoa: tipoPessoa,
    perfis: [{ tipo_perfil: "Cliente" }],
  };
  if (docDigits.length === 11) {
    body.cpf = docDigits;
  } else if (docDigits.length === 14) {
    body.cnpj = docDigits;
  }
  if (customerData.phone) {
    body.telefone_celular = customerData.phone.replace(/\D/g, "");
  }

  console.log("Conta Azul createCustomer payload:", JSON.stringify(body));

  const response = await fetch(`${CONTAAZUL_API_URL}/v1/pessoas`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to create customer (status ${response.status}):`, errorText);
    if (response.status === 401) {
      console.error("[Conta Azul 401] Token sem permissão. Response body completo:", errorText);
      console.error("[Conta Azul 401] Headers:", JSON.stringify(Object.fromEntries(response.headers.entries())));
      throw new Error(`Failed to create customer: 401 Unauthorized. Token OAuth provavelmente não tem scope 'sales'. Reconecte em /admin/conta-azul-auth. Detalhes: ${errorText}`);
    }
    throw new Error(`Failed to create customer: ${response.status} - ${errorText}`);
  }

  const customer = await response.json();
  console.log("Created customer:", customer.id);
  return customer.id;
}

// Obtém o próximo número sequencial de venda via RPC no Supabase.
async function getNextSaleNumber(): Promise<number> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc("next_conta_azul_sale_number");
  if (error) {
    console.error("[getNextSaleNumber] RPC error:", error);
    throw new Error(`Failed to get next sale number: ${error.message}`);
  }
  const numero = Number(data);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(`Invalid sale number returned by RPC: ${JSON.stringify(data)}`);
  }
  return numero;
}

// Divide um total em N parcelas (em centavos) sem perder centavos.
// A última parcela absorve o resto da divisão inteira.
function splitInstallments(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  const parts: number[] = [];
  for (let i = 0; i < count; i++) {
    parts.push(i === count - 1 ? base + remainder : base);
  }
  return parts;
}

// Calcula a data de vencimento da parcela i (0-indexed) a partir de uma data base.
// Primeiro vencimento (i=0) = 2 meses após a data base; demais mês a mês.
function installmentDueDate(baseDate: Date, i: number): string {
  const d = new Date(baseDate.getTime());
  d.setMonth(d.getMonth() + 2 + i);
  return d.toISOString().split("T")[0];
}


// ── Lookup por NOME na Conta Azul (categoria financeira, centro de custo, conta de recebimento) ──
// Nomes EXATOS esperados (fonte de verdade: cadastro manual na Conta Azul).
// Os nomes na Conta Azul usam EN DASH (U+2013) em vez de hífen ASCII. A normalização abaixo
// trata en-dash/em-dash/figure-dash como hífen normal, então tanto "-" quanto "–" funcionam.
const CONTAAZUL_FINANCIAL_CATEGORY_NAME = "3.3.4.2 MAP - Receita MAP Acelera - Plano Pro";
const CONTAAZUL_COST_CENTER_NAME = "MAP Educação";
const CONTAAZUL_RECEIPT_ACCOUNT_NAME = "ASAAS - MAP";

// Cache em memória (somente otimização — pode ser perdido a qualquer restart do worker).
type LookupCacheEntry = { id: string | null; fetchedAt: number };
const lookupCache = new Map<string, LookupCacheEntry>();
const LOOKUP_TTL_MS = 10 * 60 * 1000; // 10 min

function normalizeName(s: string): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")          // remove acentos
    .replace(/[\u2010-\u2015\u2212]/g, "-")  // en-dash, em-dash, figure-dash, hyphen, minus → "-"
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function fetchAllPaged(accessToken: string, basePath: string): Promise<any[]> {
  // Tenta paginação por ?pagina=N&tamanho_pagina=100 (padrão Conta Azul v1).
  const items: any[] = [];
  for (let pagina = 1; pagina <= 50; pagina++) {
    const sep = basePath.includes("?") ? "&" : "?";
    const url = `${CONTAAZUL_API_URL}${basePath}${sep}pagina=${pagina}&tamanho_pagina=100`;
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      console.warn(`[fetchAllPaged] ${url} -> ${res.status}`, await res.text());
      break;
    }
    const data = await res.json();
    const pageItems = Array.isArray(data) ? data : (data?.itens ?? data?.items ?? data?.data ?? []);
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    items.push(...pageItems);
    if (pageItems.length < 100) break;
  }
  return items;
}

// MATCH ESTRITAMENTE EXATO (normalizado: trim, espaços, acentos, caixa).
// Se houver múltiplos candidatos "parecidos", só conta o exato.
function findExactByName(items: any[], targetName: string): string | null {
  const target = normalizeName(targetName);
  const exact = items.find((it) => normalizeName(it?.nome ?? it?.descricao ?? it?.name ?? "") === target);
  if (!exact) return null;
  return exact.id ?? exact.uuid ?? null;
}

type LookupResult = {
  field: "categoria_financeira" | "centro_de_custo" | "conta_recebimento";
  searched_name: string;
  id: string | null;
  found: boolean;
  source: "cache" | "api";
};

async function lookupExactByName(
  accessToken: string,
  cacheKey: string,
  basePath: string | string[],
  targetName: string,
  field: LookupResult["field"],
): Promise<LookupResult> {
  // Cache (apenas otimização)
  const cached = lookupCache.get(cacheKey);
  if (cached && cached.id && Date.now() - cached.fetchedAt < LOOKUP_TTL_MS) {
    return { field, searched_name: targetName, id: cached.id, found: true, source: "cache" };
  }

  // Cada `basePath` é um endpoint candidato (alguns recursos têm mais de uma rota possível).
  const paths = Array.isArray(basePath) ? basePath : [basePath];
  let sample: string[] = [];
  for (const path of paths) {
    const items = await fetchAllPaged(accessToken, path);
    if (items.length > 0 && sample.length === 0) {
      sample = items.slice(0, 10).map((it) => String(it?.nome ?? it?.descricao ?? it?.name ?? ""));
    }
    const id = findExactByName(items, targetName);
    if (id) {
      console.log(`[lookupExactByName] "${targetName}" -> ${id} (via ${path})`);
      lookupCache.set(cacheKey, { id, fetchedAt: Date.now() });
      return { field, searched_name: targetName, id, found: true, source: "api" };
    }
  }
  console.warn(`[lookupExactByName] "${targetName}" NÃO encontrado (match exato). Amostra:`, sample);
  return { field, searched_name: targetName, id: null, found: false, source: "api" };
}

async function resolveContaAzulMetadata(accessToken: string): Promise<{
  categoria: LookupResult;
  centroCusto: LookupResult;
  contaRecebimento: LookupResult;
}> {
  // Prefer secrets when present (CONTAAZUL_*_ID). Fallback to API lookup by name.
  const envCategoria = Deno.env.get("CONTAAZUL_FINANCIAL_CATEGORY_ID");
  const envCentroCusto = Deno.env.get("CONTAAZUL_COST_CENTER_ID");
  const envContaReceb = Deno.env.get("CONTAAZUL_RECEIPT_ACCOUNT_ID");

  const fromEnv = (
    field: LookupResult["field"],
    name: string,
    id: string | undefined,
  ): LookupResult | null =>
    id && id.trim().length > 0
      ? { field, searched_name: name, id: id.trim(), found: true, source: "cache" }
      : null;

  const [categoria, centroCusto, contaRecebimento] = await Promise.all([
    fromEnv("categoria_financeira", CONTAAZUL_FINANCIAL_CATEGORY_NAME, envCategoria) ??
      lookupExactByName(accessToken, "categoria_receita", "/v1/categorias?tipo=RECEITA",
        CONTAAZUL_FINANCIAL_CATEGORY_NAME, "categoria_financeira"),
    fromEnv("centro_de_custo", CONTAAZUL_COST_CENTER_NAME, envCentroCusto) ??
      lookupExactByName(accessToken, "centro_de_custo", "/v1/centro-de-custo",
        CONTAAZUL_COST_CENTER_NAME, "centro_de_custo"),
    fromEnv("conta_recebimento", CONTAAZUL_RECEIPT_ACCOUNT_NAME, envContaReceb) ??
      lookupExactByName(accessToken, "conta_financeira",
        ["/v1/conta-financeira", "/v1/contas-financeiras"],
        CONTAAZUL_RECEIPT_ACCOUNT_NAME, "conta_recebimento"),
  ]);
  return { categoria, centroCusto, contaRecebimento };
}

function missingMetadataFields(meta: {
  categoria: LookupResult;
  centroCusto: LookupResult;
  contaRecebimento: LookupResult;
}): string[] {
  const missing: string[] = [];
  if (!meta.categoria.found) missing.push(`categoria_financeira ("${meta.categoria.searched_name}")`);
  if (!meta.centroCusto.found) missing.push(`centro_de_custo ("${meta.centroCusto.searched_name}")`);
  if (!meta.contaRecebimento.found) missing.push(`conta_recebimento ("${meta.contaRecebimento.searched_name}")`);
  return missing;
}

// Monta o payload da venda exatamente como o formulário manual da Conta Azul.
// Recebe os IDs já resolvidos (categoria, centro de custo, conta de recebimento são OBRIGATÓRIOS).
function buildSalePayload(params: {
  customerId: string;
  serviceId: string;
  productName: string;
  totalCents: number;
  numero: number;
  plan: string;
  categoriaId: string;
  centroCustoId: string;
  contaRecebimentoId: string;
  installments?: number;
}): Record<string, unknown> {
  const {
    customerId, serviceId, productName, totalCents, numero, plan,
    categoriaId, centroCustoId, contaRecebimentoId,
  } = params;
  const installments = Math.max(1, Number(params.installments || 1));
  const totalReais = totalCents / 100;
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const installmentsCents = splitInstallments(totalCents, installments);
  const parcelas = installmentsCents.map((cents, i) => ({
    data_vencimento: installmentDueDate(today, i),
    valor: Number((cents / 100).toFixed(2)),
    descricao: `Parcela ${i + 1}/${installments}`,
  }));

  // Conta Azul: "A_VISTA" para 1 parcela, "Nx" para parcelado.
  const opcaoCondicaoPagamento = installments === 1 ? "A_VISTA" : `${installments}x`;

  const condicaoPagamento: Record<string, unknown> = {
    tipo_pagamento: "OUTRO",
    opcao_condicao_pagamento: opcaoCondicaoPagamento,
    id_conta_financeira: contaRecebimentoId,
    parcelas,
  };

  return {
    id_cliente: customerId,
    numero,
    situacao: "APROVADO",
    data_venda: todayStr,
    observacoes: `Venda via Asaas - Plano ${plan}`,
    id_categoria: categoriaId,
    id_centro_custo: centroCustoId,
    itens: [
      {
        id: serviceId,
        descricao: productName,
        quantidade: 1,
        valor: Number(totalReais.toFixed(2)),
      },
    ],
    condicao_pagamento: condicaoPagamento,
  };
}


// Erro customizado para metadata Conta Azul ausente — handler trata como 422.
class ContaAzulMetadataError extends Error {
  missing: string[];
  meta: Awaited<ReturnType<typeof resolveContaAzulMetadata>>;
  constructor(missing: string[], meta: Awaited<ReturnType<typeof resolveContaAzulMetadata>>) {
    super(`Metadata Conta Azul não encontrada (match exato): ${missing.join(", ")}`);
    this.name = "ContaAzulMetadataError";
    this.missing = missing;
    this.meta = meta;
  }
}

// Create sale in Conta Azul
async function createSale(accessToken: string, saleData: SaleData): Promise<{ id: string; numero: number }> {
  console.log("Creating sale for customer:", saleData.customer_id);

  // Prefer the hard-mapped UUID; only fall back to lookup/create when unknown
  const knownUuid = SERVICE_UUIDS[saleData.product_name];
  const serviceId = knownUuid ?? await getOrCreateService(accessToken, saleData.product_name, saleData.amount);
  if (knownUuid) console.log("Using mapped Conta Azul service UUID:", knownUuid);

  // 1) Resolve metadata ANTES de consumir a sequence — falha cedo se faltar.
  const meta = await resolveContaAzulMetadata(accessToken);
  const missing = missingMetadataFields(meta);
  if (missing.length > 0) {
    console.error("[createSale] abortando — metadata ausente:", missing);
    throw new ContaAzulMetadataError(missing, meta);
  }

  // 2) Regra de valor: por padrão `amount` é o TOTAL da venda (em centavos).
  // Se a env CONTAAZUL_AMOUNT_IS_INSTALLMENT=true, o `amount` é o valor MENSAL → multiplica por 12.
  const amountIsInstallment = (Deno.env.get("CONTAAZUL_AMOUNT_IS_INSTALLMENT") || "").toLowerCase() === "true";
  const totalCents = amountIsInstallment ? saleData.amount * 12 : saleData.amount;

  // 3) Só agora consome a sequence (não desperdiçar números em caso de falha de metadata).
  const numero = await getNextSaleNumber();

  const salePayload = buildSalePayload({
    customerId: saleData.customer_id,
    serviceId,
    productName: saleData.product_name,
    totalCents,
    numero,
    plan: saleData.plan,
    categoriaId: meta.categoria.id!,
    centroCustoId: meta.centroCusto.id!,
    contaRecebimentoId: meta.contaRecebimento.id!,
    installments: saleData.installments,
  });

  console.log("Conta Azul createSale payload:", JSON.stringify(salePayload));


  const MAX_ATTEMPTS = 3; // 1 inicial + 2 retries
  let lastErrorText = "";
  let lastStatus = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(`${CONTAAZUL_API_URL}/v1/venda`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(salePayload),
    });

    if (response.ok) {
      const sale = await response.json();
      console.log("Created sale:", sale.id, "numero:", numero, "(attempt", attempt, ")");
      return { id: sale.id, numero };
    }

    lastStatus = response.status;
    lastErrorText = await response.text();
    console.error(
      `Failed to create sale (status ${lastStatus}, attempt ${attempt}). Payload enviado:`,
      JSON.stringify(salePayload),
      "Resposta:",
      lastErrorText,
    );

    // Retry apenas no erro específico de "Cliente da venda não encontrado" (latência de indexação)
    const isClienteNaoEncontrado = lastStatus === 400 && lastErrorText.includes("Cliente da venda não encontrado");
    if (!isClienteNaoEncontrado || attempt === MAX_ATTEMPTS) {
      break;
    }
    console.log(`[createSale] retry em 1500ms (latência provável na indexação do cliente)`);
    await new Promise((r) => setTimeout(r, 1500));
  }

  throw new Error(`Failed to create sale: ${lastStatus} - ${lastErrorText}`);
}


// Get or create service in Conta Azul
async function getOrCreateService(accessToken: string, serviceName: string, value: number): Promise<string> {
  // Search for existing service
  const searchResponse = await fetch(
    `${CONTAAZUL_API_URL}/v1/servicos?search=${encodeURIComponent(serviceName)}`,
    {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    const services = Array.isArray(searchData) ? searchData : (searchData?.data ?? searchData?.itens ?? []);
    const existingService = Array.isArray(services)
      ? services.find((s: any) => (s.nome || s.name) === serviceName)
      : null;
    if (existingService) {
      console.log("Found existing service:", existingService.id);
      return existingService.id;
    }
  } else {
    console.warn("Service search failed:", searchResponse.status, await searchResponse.text());
  }

  // Create new service
  const createResponse = await fetch(`${CONTAAZUL_API_URL}/v1/servicos`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nome: serviceName,
      codigo: `MAP${serviceName.replace(/[^A-Z0-9]/gi, "").slice(0, 17).toUpperCase()}`,
      valor: value / 100,
      valor_venda: value / 100,
      situacao: "Ativo",
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error("Failed to create service:", createResponse.status, errorText);
    throw new Error(`Failed to create service: ${createResponse.status} - ${errorText}`);
  }

  const service = await createResponse.json();
  console.log("Created service:", service.id);
  return service.id;
}

// Identify plan by amount or product name
function identifyPlan(amount: number, productName?: string): { name: string; plan: string } | null {
  // Try to match by amount (in cents)
  const amountInReais = Math.round(amount / 100);
  if (PRODUCT_MAPPING[amountInReais]) {
    return PRODUCT_MAPPING[amountInReais];
  }

  // Try to match by product name
  if (productName) {
    const nameLower = productName.toLowerCase();
    if (nameLower.includes("business") || nameLower.includes("enterprise") || nameLower.includes("mapa da map") || nameLower.includes("mapa_da_map")) {
      return PRODUCT_MAPPING[11964];
    }
    if (nameLower.includes("recorrente")) {
      return PRODUCT_MAPPING[7164];
    }
    if (nameLower.includes("pro anual") || nameLower.includes("pro_anual") || nameLower.includes("pro")) {
      return PRODUCT_MAPPING[5964];
    }
    if (nameLower.includes("starter") || nameLower.includes("basic")) {
      return PRODUCT_MAPPING[2364];
    }
  }

  return null;
}

// Log integration activity
async function logIntegration(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  payload: unknown,
  status: "success" | "error",
  errorMessage?: string,
  contaazulSaleId?: string
) {
  try {
    await supabaseAdmin
      .from("webhook_logs")
      .insert({
        provider: "contaazul",
        event_type: "sale_creation",
        payload: payload,
        status: status,
        error_message: errorMessage || null,
        processed_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error("Error logging integration:", err);
  }
}

Deno.serve(async (req) => {
  console.log("Conta Azul integration received:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Authenticate: allow only (a) calls using the service-role key OR
  // (b) authenticated admins (admin / admin_geral / admin_financeiro).
  // dry_run and debug=list_metadata require the SAME auth — no bypass.
  const authHeader = req.headers.get("Authorization");
  const expectedKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const isServiceRole = !!authHeader && authHeader === `Bearer ${expectedKey}`;

  let isAdmin = false;
  if (!isServiceRole && authHeader?.startsWith("Bearer ")) {
    try {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsRes } = await userClient.auth.getClaims(token);
      const uid = claimsRes?.claims?.sub;
      if (uid) {
        const admin = getSupabaseAdmin();
        const { data: roles } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        const allowed = new Set(["admin", "admin_geral", "admin_financeiro"]);
        isAdmin = !!roles?.some((r: any) => allowed.has(r.role));
      }
    } catch (e) {
      console.error("[auth-check] failed to validate JWT:", e);
    }
  }

  console.log("[auth-check] isServiceRole:", isServiceRole, "isAdmin:", isAdmin);

  if (!isServiceRole && !isAdmin) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }



  const supabaseAdmin = getSupabaseAdmin();
  const ctx: Record<string, unknown> = { stage: "init" };

  try {
    const payload = await req.json();

    // ── DEBUG: lista categorias e centros de custo crus da Conta Azul, sem criar nada ──
    if (payload?.debug === "list_metadata") {
      console.log("[DEBUG list_metadata] start");
      let tokenOk = false;
      let tokenError: string | null = null;
      let accessTokenDbg: string | null = null;
      try {
        accessTokenDbg = await getAccessToken();
        tokenOk = true;
      } catch (e) {
        tokenError = String(e);
      }
      if (!tokenOk || !accessTokenDbg) {
        return new Response(JSON.stringify({
          debug: "list_metadata",
          oauth_token_ok: false,
          oauth_token_error: tokenError,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const catPaths = [
        "/v1/categoria?tipo=RECEITA",
        "/v1/categoria",
        "/v1/categorias?tipo=RECEITA",
        "/v1/categorias",
        "/v1/categoria-financeira",
        "/v1/categoria-financeira?tipo=RECEITA",
        "/v1/plano-de-contas",
        "/v1/categoria-dre",
      ];
      const ccPath = "/v1/centro-de-custo";
      const cfPaths = ["/v1/conta-financeira", "/v1/contas-financeiras"];

      const summarize = (it: any) => ({
        id: it?.id ?? it?.uuid ?? null,
        nome: it?.nome ?? it?.descricao ?? it?.name ?? null,
        codigo: it?.codigo ?? it?.codigo_dre ?? it?.code ?? null,
        tipo: it?.tipo ?? it?.tipo_categoria ?? null,
        ativo: it?.ativo ?? it?.status ?? null,
        keys: Object.keys(it || {}),
      });

      const filterBy = (items: any[], terms: string[]) => {
        const norms = terms.map(normalizeName);
        return items.filter((it) => {
          const nm = normalizeName(it?.nome ?? it?.descricao ?? it?.name ?? "");
          return norms.some((t) => nm.includes(t));
        });
      };

      // Categoria: tenta vários endpoints, registra qual respondeu
      const catProbes: Array<{ endpoint: string; status: "ok" | "empty" | "error"; total: number; error?: string }> = [];
      let catsAll: any[] = [];
      let catPathUsed: string | null = null;
      for (const p of catPaths) {
        try {
          const url = `${CONTAAZUL_API_URL}${p}${p.includes("?") ? "&" : "?"}pagina=1&tamanho_pagina=100`;
          const res = await fetch(url, { headers: { "Authorization": `Bearer ${accessTokenDbg}`, "Content-Type": "application/json" } });
          if (!res.ok) {
            catProbes.push({ endpoint: p, status: "error", total: 0, error: `${res.status} ${(await res.text()).slice(0, 200)}` });
            continue;
          }
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.itens ?? data?.items ?? data?.data ?? []);
          if (Array.isArray(items) && items.length > 0) {
            catProbes.push({ endpoint: p, status: "ok", total: items.length });
            if (catsAll.length === 0) {
              catsAll = await fetchAllPaged(accessTokenDbg, p);
              catPathUsed = p;
            }
          } else {
            catProbes.push({ endpoint: p, status: "empty", total: 0 });
          }
        } catch (e) {
          catProbes.push({ endpoint: p, status: "error", total: 0, error: String(e).slice(0, 200) });
        }
      }

      const ccsAll = await fetchAllPaged(accessTokenDbg, ccPath);

      // Conta financeira: tenta os dois endpoints
      let cfAll: any[] = [];
      let cfPathUsed: string | null = null;
      for (const p of cfPaths) {
        const r = await fetchAllPaged(accessTokenDbg, p);
        if (r.length > 0) { cfAll = r; cfPathUsed = p; break; }
      }

      const cats = filterBy(catsAll, ["map", "acelera", "receita", "plano"]).slice(0, 200);
      const ccs = filterBy(ccsAll, ["map", "educa"]).slice(0, 200);
      const cfs = filterBy(cfAll, ["asaas", "map"]).slice(0, 200);

      return new Response(JSON.stringify({
        debug: "list_metadata",
        oauth_token_ok: true,
        searched_targets: {
          categoria_financeira: CONTAAZUL_FINANCIAL_CATEGORY_NAME,
          centro_de_custo: CONTAAZUL_COST_CENTER_NAME,
          conta_recebimento: CONTAAZUL_RECEIPT_ACCOUNT_NAME,
        },
        categoria_financeira: {
          endpoint: catPathUsed ? `${CONTAAZUL_API_URL}${catPathUsed}` : null,
          endpoints_tentados: catProbes.map((p) => ({ ...p, endpoint: `${CONTAAZUL_API_URL}${p.endpoint}` })),
          total_retornado: catsAll.length,
          total_filtrado: cats.length,
          filtros: ["map", "acelera", "receita", "plano"],
          items: cats.map(summarize),
        },
        centro_de_custo: {
          endpoint: `${CONTAAZUL_API_URL}${ccPath}`,
          total_retornado: ccsAll.length,
          total_filtrado: ccs.length,
          filtros: ["map", "educa"],
          items: ccs.map(summarize),
        },
        conta_recebimento: {
          endpoint: cfPathUsed ? `${CONTAAZUL_API_URL}${cfPathUsed}` : null,
          endpoints_tentados: cfPaths.map((p) => `${CONTAAZUL_API_URL}${p}`),
          total_retornado: cfAll.length,
          total_filtrado: cfs.length,
          filtros: ["asaas", "map"],
          items: cfs.map(summarize),
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { customer, amount, product_name, user_id, dry_run, installments } = payload;
    const installmentsCount = Math.max(1, Number(installments || 1));

    if (!customer?.email || !amount) {
      await logIntegration(supabaseAdmin, payload, "error", "Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields: customer.email and amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Identify the plan
    const planInfo = identifyPlan(amount, product_name);
    if (!planInfo) {
      console.warn("Could not identify plan for amount:", amount, "product:", product_name);
    }

    const resolvedProductName = planInfo?.name || `MAP Acelera - Plano Personalizado`;
    const mappedServiceUuid = SERVICE_UUIDS[resolvedProductName] || null;

    // ── DRY RUN: valida tudo SEM criar venda e SEM consumir a sequence ─────────
    if (dry_run === true) {
      console.log("[DRY RUN] simulation requested for", resolvedProductName);
      let tokenOk = false;
      let tokenError: string | null = null;
      let accessTokenDry: string | null = null;
      try {
        accessTokenDry = await getAccessToken();
        tokenOk = true;
      } catch (e) {
        tokenError = String(e);
      }

      const amountIsInstallment = (Deno.env.get("CONTAAZUL_AMOUNT_IS_INSTALLMENT") || "").toLowerCase() === "true";
      const totalCents = amountIsInstallment ? amount * 12 : amount;

      // numero_preview = próximo valor da sequence SEM CONSUMIR.
      // Usa RPC peek_conta_azul_sale_number() que respeita is_called da sequence.
      let numeroPreview: number | null = null;
      try {
        const { data: peek, error: peekErr } = await supabaseAdmin
          .rpc("peek_conta_azul_sale_number" as any);
        if (peekErr) {
          console.error("[DRY RUN] peek RPC error:", peekErr);
          numeroPreview = null;
        } else {
          const n = Number(peek);
          numeroPreview = Number.isFinite(n) ? n : null;
        }
      } catch (e) {
        console.error("[DRY RUN] peek exception:", e);
        numeroPreview = null;
      }

      const installmentsCents = splitInstallments(totalCents, installmentsCount);
      const today = new Date();
      const parcelasPreview = installmentsCents.map((cents, i) => ({
        numero: i + 1,
        valor: Number((cents / 100).toFixed(2)),
        data_vencimento: installmentDueDate(today, i),
      }));

      // Lookup real (sem consumir nada). Best-effort: se token falhou, pula.
      let lookups: LookupResult[] = [];
      let missing: string[] = [];
      if (accessTokenDry) {
        const meta = await resolveContaAzulMetadata(accessTokenDry);
        lookups = [meta.categoria, meta.centroCusto, meta.contaRecebimento];
        missing = missingMetadataFields(meta);
      }

      // Customer resolution preview (sem criar nada na Conta Azul)
      const asaasCustomerIdInDry: string | null = customer.asaas_customer_id || null;
      let dryCustomerId: string | null = null;
      let dryCustomerSource: "mapping" | "document" | "email" | "created" = "created";
      let dryMappingMatchedBy: string | null = null;

      const mappingHitDry = await lookupCustomerMapping({
        email: customer.email,
        document: customer.document,
        asaasCustomerId: asaasCustomerIdInDry,
      });
      if (mappingHitDry) {
        dryMappingMatchedBy = mappingHitDry.matched_by;
        if (accessTokenDry && await verifyCustomerCanBeUsedInSale(accessTokenDry, mappingHitDry.conta_azul_customer_id)) {
          dryCustomerId = mappingHitDry.conta_azul_customer_id;
          dryCustomerSource = "mapping";
        }
      }
      if (!dryCustomerId && accessTokenDry && customer.document) {
        const byDoc = await findCustomerByDocument(accessTokenDry, customer.document);
        if (byDoc && await verifyCustomerCanBeUsedInSale(accessTokenDry, byDoc)) {
          dryCustomerId = byDoc;
          dryCustomerSource = "document";
        }
      }
      if (!dryCustomerId && accessTokenDry) {
        const byEmail = await findCustomerByEmail(accessTokenDry, customer.email);
        if (byEmail && await verifyCustomerCanBeUsedInSale(accessTokenDry, byEmail)) {
          dryCustomerId = byEmail;
          dryCustomerSource = "email";
        }
      }
      if (!dryCustomerId) dryCustomerSource = "created";

      const lookupMap = Object.fromEntries(lookups.map((l) => [l.field, l]));
      const previewPayload = buildSalePayload({
        customerId: dryCustomerId || "<id_cliente_a_criar>",
        serviceId: mappedServiceUuid || "<service_uuid_a_resolver>",
        productName: resolvedProductName,
        totalCents,
        numero: numeroPreview ?? 0,
        plan: planInfo?.plan || "custom",
        categoriaId: lookupMap["categoria_financeira"]?.id || "<id_categoria_nao_encontrado>",
        centroCustoId: lookupMap["centro_de_custo"]?.id || "<id_centro_custo_nao_encontrado>",
        contaRecebimentoId: lookupMap["conta_recebimento"]?.id || "<id_conta_recebimento_nao_encontrado>",
        installments: installmentsCount,
      });

      const success = tokenOk && !!mappedServiceUuid && missing.length === 0;

      return new Response(JSON.stringify({
        dry_run: true,
        success,
        plan_identified: !!planInfo,
        plan: planInfo?.plan || "custom",
        product_name: resolvedProductName,
        amount_cents_received: amount,
        amount_is_installment: amountIsInstallment,
        total_cents: totalCents,
        total_brl: totalCents / 100,
        numero_preview: numeroPreview,
        service_uuid: mappedServiceUuid,
        would_create_new_service: !mappedServiceUuid,
        oauth_token_ok: tokenOk,
        oauth_token_error: tokenError,
        contaazul_lookups: lookups.map((l) => ({
          field: l.field,
          searched_name: l.searched_name,
          found: l.found,
          id: l.id,
          source: l.source,
        })),
        metadata_missing: missing,
        customer_preview: {
          email: customer.email,
          name: customer.name,
          document: customer.document,
          person_type: customer.person_type,
          asaas_customer_id: asaasCustomerIdInDry,
        },
        customer_resolution: {
          customer_source: dryCustomerSource,
          conta_azul_customer_id: dryCustomerId,
          reused_existing_customer: dryCustomerSource !== "created",
          mapping_matched_by: dryMappingMatchedBy,
          would_create_new_customer: dryCustomerSource === "created",
        },
        parcelas_preview: parcelasPreview,
        sale_payload_preview: previewPayload,
        warnings: [
          ...(!planInfo ? ["Plano não identificado pelo valor — usaria fallback genérico"] : []),
          ...(!mappedServiceUuid ? ["Sem UUID mapeado: tentaria criar serviço novo (risco de erro 400)"] : []),
          ...(!tokenOk ? [`Token OAuth indisponível: ${tokenError}`] : []),
          ...(missing.length > 0 ? [`Metadata não encontrada (match exato): ${missing.join(", ")}`] : []),
        ],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },

      });
    }


    // Contexto acumulado para logging detalhado (sucesso ou erro)
    ctx.customer_email = customer.email;
    ctx.customer_name = customer.name;
    ctx.amount_cents = amount;
    ctx.product_name = resolvedProductName;
    ctx.plan = planInfo?.plan || "custom";
    ctx.service_uuid = mappedServiceUuid;
    ctx.customer_id_used = null;
    ctx.customer_source = null;
    ctx.customer_verified = null;

    // Get Conta Azul access token
    let accessToken: string;
    try {
      ctx.stage = "token";
      accessToken = await getAccessToken();
    } catch (tokenError) {
      console.error("Token error:", tokenError);
      await logIntegration(supabaseAdmin, { ...ctx, original_payload: payload }, "error", String(tokenError));
      return new Response(
        JSON.stringify({ 
          error: "Conta Azul authentication failed",
          details: "Please configure CONTAAZUL_REFRESH_TOKEN" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve customer using mapping → document → email → create
    ctx.stage = "find_customer";
    const asaasCustomerIdIn: string | null = customer.asaas_customer_id || null;
    let customerId: string | null = null;
    let customerSource: "mapping" | "document" | "email" | "created" = "created";

    // 1) Mapping lookup (asaas_customer_id → document → email)
    const mappingHit = await lookupCustomerMapping({
      email: customer.email,
      document: customer.document,
      asaasCustomerId: asaasCustomerIdIn,
    });
    if (mappingHit) {
      const usable = await verifyCustomerCanBeUsedInSale(accessToken, mappingHit.conta_azul_customer_id);
      ctx.customer_verified = usable;
      ctx.mapping_matched_by = mappingHit.matched_by;
      if (usable) {
        customerId = mappingHit.conta_azul_customer_id;
        customerSource = "mapping";
        console.log(`[handler] mapping hit (${mappingHit.matched_by}) → ${customerId}`);
      } else {
        console.warn(`[handler] mapping ${mappingHit.conta_azul_customer_id} not usable; falling back to API search`);
      }
    }

    // 2) Search by document
    if (!customerId && customer.document) {
      const byDoc = await findCustomerByDocument(accessToken, customer.document);
      if (byDoc) {
        const usable = await verifyCustomerCanBeUsedInSale(accessToken, byDoc);
        ctx.customer_verified = usable;
        if (usable) {
          customerId = byDoc;
          customerSource = "document";
        } else {
          console.warn(`[handler] customer ${byDoc} from document search not usable`);
        }
      }
    }

    // 3) Search by email
    if (!customerId) {
      const byEmail = await findCustomerByEmail(accessToken, customer.email);
      if (byEmail) {
        const usable = await verifyCustomerCanBeUsedInSale(accessToken, byEmail);
        ctx.customer_verified = usable;
        if (usable) {
          customerId = byEmail;
          customerSource = "email";
        } else {
          console.warn(`[handler] customer ${byEmail} from email search not usable`);
        }
      }
    }

    // 4) Create new
    if (!customerId) {
      ctx.stage = "create_customer";
      customerId = await createCustomer(accessToken, {
        email: customer.email,
        name: customer.name || customer.email.split("@")[0],
        phone: customer.phone,
        document: customer.document,
        person_type: customer.person_type,
      });
      customerSource = "created";
      const usableAfterCreate = await verifyCustomerCanBeUsedInSale(accessToken, customerId);
      ctx.customer_verified = usableAfterCreate;
      if (!usableAfterCreate) {
        console.warn(`[handler] customer ${customerId} just created not yet usable — retry no createSale deve cobrir`);
      }
    }

    ctx.customer_id_used = customerId;
    ctx.customer_source = customerSource;
    ctx.conta_azul_customer_id = customerId;
    ctx.reused_existing_customer = customerSource !== "created";

    // Persist/refresh the mapping for future payments (best-effort)
    await saveCustomerMapping({
      email: customer.email,
      document: customer.document,
      asaasCustomerId: asaasCustomerIdIn,
      contaAzulCustomerId: customerId!,
    });

    // Create sale (com retry interno para "Cliente não encontrado")
    ctx.stage = "create_sale";
    const sale = await createSale(accessToken, {
      customer_id: customerId,
      product_name: resolvedProductName,
      amount: amount,
      plan: planInfo?.plan || "custom",
      installments: installmentsCount,
    });

    // NOTE: Subscription updates are handled by the calling webhook (asaas-webhook/stripe-webhook),
    // NOT here. This function only registers the sale in Conta Azul.

    console.log("Conta Azul integration successful");
    await logIntegration(supabaseAdmin, { ...ctx, sale_id: sale.id, sale_numero: sale.numero }, "success");
    return new Response(
      JSON.stringify({
        success: true,
        message: "Sale created successfully in Conta Azul",
        data: {
          customer_id: customerId,
          sale_id: sale.id,
          sale_numero: sale.numero,
          plan: planInfo?.plan || "custom",
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Integration error:", error);

    if (error instanceof ContaAzulMetadataError) {
      await logIntegration(
        supabaseAdmin,
        {
          ...ctx,
          metadata_missing: error.missing,
          lookups: [error.meta.categoria, error.meta.centroCusto, error.meta.contaRecebimento],
          error_thrown_at: new Date().toISOString(),
        },
        "error",
        error.message,
      );
      return new Response(
        JSON.stringify({
          error: "Conta Azul metadata not found",
          message: error.message,
          missing: error.missing,
          lookups: [error.meta.categoria, error.meta.centroCusto, error.meta.contaRecebimento],
          hint: "Verifique se os nomes cadastrados na Conta Azul batem EXATAMENTE com os esperados pela integração.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await logIntegration(supabaseAdmin, { ...ctx, error_thrown_at: new Date().toISOString() }, "error", String(error));
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
