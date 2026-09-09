// ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY é usada nesta função. Nunca expor no frontend. Uso exclusivo server-side.
// API centralizada de LEITURA (read-only) para o Centralizador de Dados.
// Autenticação: header x-api-key (CENTRAL_READ_API_KEY). Sem JWT de sessão.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  applySharedPhones,
  corsHeaders,
  ELEMENT_TYPE_LABELS,
  errorResponse,
  INTERNAL_USER_IDS,
  jsonResponse,
  matchesPhoneFilter,
  normalizePhone,
  PAGE_NAME_MAP,
  paginated,
  parseIntParam,
  parseIsoDate,
  parsePagination,
  parsePhoneFilter,
  pickHighestRole,
  PLACEHOLDER_PHONE,
  TEAM_ROLES,
  type PhoneInfo,
} from "./lib.ts";
import {
  conflictResponse,
  EDITABLE_SCHEMA,
  forbiddenWrite,
  invalidFieldsResponse,
  isStale,
  parseActor,
  preconditionFailed,
  resolveKeyScope,
  validateMemberPatch,
  validateSubscriptionPatch,
} from "./write.ts";


type Attribution = {
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
  first_touch_at: string | null;
  last_touch_at: string | null;
};

const EMPTY_ATTRIBUTION: Attribution = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  gclid: null,
  fbclid: null,
  referrer: null,
  landing_page: null,
  source_type: null,
  origin: null,
  first_touch_at: null,
  last_touch_at: null,
};

type Member = {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: PhoneInfo;
  /** Chave de cruzamento com o CRM (DDD + últimos 8 dígitos). Espelha phone.phone_key. */
  phone_key: string | null;
  plan: string | null;
  role: string | null;
  subscription_status: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  cancel_reason: string | null;
  cancel_reason_detail: string | null;
  cancel_source: string | null;
  created_at: string | null;
  updated_at: string | null;
  updated_by: string | null;
  onboarding_completed: boolean;
  is_internal: boolean;
  attribution: Attribution;
};


function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

type Client = ReturnType<typeof supabaseAdmin>;

async function loadEmails(supabase: Client, ids?: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  // Recorte pequeno (ex.: sync incremental): resolve só os usuários necessários.
  if (ids && ids.length > 0 && ids.length <= 300) {
    const batchSize = 20;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((id) => supabase.auth.admin.getUserById(id).catch(() => null)),
      );
      results.forEach((res, idx) => {
        const email = res?.data?.user?.email;
        if (email) map.set(batch[idx], email.toLowerCase());
      });
    }
    return map;
  }

  const wanted = ids ? new Set(ids) : null;
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.id && u.email && (!wanted || wanted.has(u.id))) {
        map.set(u.id, u.email.toLowerCase());
      }
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return map;
}

type AttributionRow = { attribution: Attribution; updated_at: string | null };

/** Carrega a atribuição de origem. Chave: user_id. */
async function loadAttribution(
  supabase: Client,
  userIds?: string[],
): Promise<Map<string, AttributionRow>> {
  const map = new Map<string, AttributionRow>();
  let query = supabase
    .from("member_attribution")
    .select(
      "user_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid, referrer, landing_page, source_type, origin, first_touch_at, last_touch_at, updated_at",
    );
  if (userIds && userIds.length > 0) query = query.in("user_id", userIds);
  const { data, error } = await query;
  if (error) throw error;
  for (const row of data ?? []) {
    const uid = row.user_id as string | null;
    if (!uid) continue;
    map.set(uid, {
      updated_at: (row.updated_at as string | null) ?? null,
      attribution: {
        utm_source: (row.utm_source as string | null) ?? null,
        utm_medium: (row.utm_medium as string | null) ?? null,
        utm_campaign: (row.utm_campaign as string | null) ?? null,
        utm_content: (row.utm_content as string | null) ?? null,
        utm_term: (row.utm_term as string | null) ?? null,
        gclid: (row.gclid as string | null) ?? null,
        fbclid: (row.fbclid as string | null) ?? null,
        referrer: (row.referrer as string | null) ?? null,
        landing_page: (row.landing_page as string | null) ?? null,
        source_type: (row.source_type as string | null) ?? null,
        origin: (row.origin as string | null) ?? null,
        first_touch_at: (row.first_touch_at as string | null) ?? null,
        last_touch_at: (row.last_touch_at as string | null) ?? null,
      },
    });
  }
  return map;
}

async function loadMembers(
  supabase: Client,
  updatedSince?: string | null,
): Promise<Member[]> {
  const profileColumns =
    "user_id, name, subscription_plan, subscription_status, subscription_start_date, subscription_end_date, cancel_reason, cancel_reason_detail, cancel_source, created_at, updated_at, updated_by";

  let profilesQuery = supabase.from("profiles").select(profileColumns);
  // Filtro incremental empurrado para o banco (evita carregar a base inteira).
  if (updatedSince) profilesQuery = profilesQuery.gte("updated_at", updatedSince);

  const { data: profilesData, error: profilesError } = await profilesQuery;
  if (profilesError) throw profilesError;

  let profiles = profilesData ?? [];

  // Item 4: correções retroativas de atribuição também entram no sync incremental.
  if (updatedSince) {
    const { data: touched, error: touchedError } = await supabase
      .from("member_attribution")
      .select("user_id")
      .gte("updated_at", updatedSince);
    if (touchedError) throw touchedError;
    const known = new Set(profiles.map((p) => p.user_id as string));
    const missing = (touched ?? [])
      .map((r) => r.user_id as string)
      .filter((id) => id && !known.has(id));
    if (missing.length > 0) {
      const { data: extra, error: extraError } = await supabase
        .from("profiles")
        .select(profileColumns)
        .in("user_id", missing);
      if (extraError) throw extraError;
      profiles = [...profiles, ...(extra ?? [])];
    }
  }

  const userIds = profiles.map((p) => p.user_id as string).filter(Boolean);
  if (userIds.length === 0) return [];

  const onboardingQ = supabase.from("user_onboarding").select("user_id, whatsapp, completed_at");
  const privateQ = supabase.from("profiles_private").select("user_id, phone");
  const rolesQ = supabase.from("user_roles").select("user_id, role");

  const [onboardingRes, privateRes, rolesRes, secondaryRes, emails, attribution] = await Promise.all([
    updatedSince ? onboardingQ.in("user_id", userIds) : onboardingQ,
    updatedSince ? privateQ.in("user_id", userIds) : privateQ,
    updatedSince ? rolesQ.in("user_id", userIds) : rolesQ,
    supabase.from("secondary_logins").select("secondary_user_id").eq("is_active", true),
    loadEmails(supabase, updatedSince ? userIds : undefined),
    loadAttribution(supabase, updatedSince ? userIds : undefined),
  ]);


  const phonePrivate = new Map<string, string>();
  for (const row of privateRes.data ?? []) {
    if (row.user_id && row.phone) phonePrivate.set(row.user_id as string, row.phone as string);
  }

  const phoneOnboarding = new Map<string, string>();
  const onboardingCompleted = new Map<string, boolean>();
  for (const row of onboardingRes.data ?? []) {
    const uid = row.user_id as string | null;
    if (!uid) continue;
    if (row.whatsapp) phoneOnboarding.set(uid, row.whatsapp as string);
    onboardingCompleted.set(uid, Boolean(row.completed_at));
  }

  const rolesByUser = new Map<string, string[]>();
  const teamUsers = new Set<string>();
  for (const row of rolesRes.data ?? []) {
    const uid = row.user_id as string | null;
    const role = row.role as string | null;
    if (!uid || !role) continue;
    const list = rolesByUser.get(uid) ?? [];
    list.push(role);
    rolesByUser.set(uid, list);
    if (TEAM_ROLES.includes(role)) teamUsers.add(uid);
  }

  const secondaryUsers = new Set<string>();
  for (const row of secondaryRes.data ?? []) {
    if (row.secondary_user_id) secondaryUsers.add(row.secondary_user_id as string);
  }

  const members: Member[] = profiles.map((p) => {
    const uid = p.user_id as string;
    const raw = phonePrivate.get(uid) ?? phoneOnboarding.get(uid) ?? null;
    const phoneInfo = normalizePhone(raw);
    const attr = attribution.get(uid);
    const profileUpdated = (p.updated_at as string | null) ?? null;
    // updated_at reflete também mudanças de atribuição, para o cursor incremental.
    const updatedAt = attr?.updated_at && (!profileUpdated || attr.updated_at > profileUpdated)
      ? attr.updated_at
      : profileUpdated;
    return {
      user_id: uid,
      name: (p.name as string | null) ?? null,
      email: emails.get(uid) ?? null,
      phone: phoneInfo,
      phone_key: phoneInfo.phone_key,
      plan: (p.subscription_plan as string | null) ?? null,
      role: pickHighestRole(rolesByUser.get(uid) ?? []),
      subscription_status: (p.subscription_status as string | null) ?? null,
      subscription_start_date: (p.subscription_start_date as string | null) ?? null,
      subscription_end_date: (p.subscription_end_date as string | null) ?? null,
      cancel_reason: (p.cancel_reason as string | null) ?? null,
      cancel_reason_detail: (p.cancel_reason_detail as string | null) ?? null,
      cancel_source: (p.cancel_source as string | null) ?? null,
      created_at: (p.created_at as string | null) ?? null,
      updated_at: updatedAt,
      updated_by: (p.updated_by as string | null) ?? null,
      onboarding_completed: onboardingCompleted.get(uid) ?? false,
      is_internal:
        INTERNAL_USER_IDS.has(uid) || teamUsers.has(uid) || secondaryUsers.has(uid),
      attribution: attr?.attribution ?? { ...EMPTY_ATTRIBUTION },
    };
  });

  applySharedPhones(members.map((m) => ({ user_id: m.user_id, phone: m.phone })));
  return members;

}

function afterUpdatedSince<T extends { updated_at: string | null; created_at?: string | null }>(
  items: T[],
  since: string | null,
): T[] {
  if (!since) return items;
  const cutoff = new Date(since).getTime();
  return items.filter((item) => {
    const stamp = item.updated_at ?? item.created_at ?? null;
    return stamp ? new Date(stamp).getTime() >= cutoff : false;
  });
}

type MemberSort = "updated_at" | "created_at" | "name";

/** Valores inválidos caem no padrão (created_at desc), sem erro. */
function parseMemberSort(url: URL): { sort: MemberSort; asc: boolean } {
  const rawSort = url.searchParams.get("sort");
  const rawOrder = url.searchParams.get("order");
  const sort: MemberSort =
    rawSort === "updated_at" || rawSort === "created_at" || rawSort === "name"
      ? rawSort
      : "created_at";
  const asc = rawOrder === "asc" ? true : rawOrder === "desc" ? false : sort !== "created_at";
  return { sort, asc };
}

function sortMembers(members: Member[], { sort, asc }: { sort: MemberSort; asc: boolean }) {
  const dir = asc ? 1 : -1;
  members.sort((a, b) => {
    const av = (a[sort] as string | null) ?? "";
    const bv = (b[sort] as string | null) ?? "";
    const cmp = sort === "name"
      ? av.localeCompare(bv, "pt-BR")
      : av.localeCompare(bv);
    if (cmp !== 0) return cmp * dir;
    // Desempate estável para paginação por cursor.
    return a.user_id.localeCompare(b.user_id);
  });
}

/** PATCH parcial de um membro. Só campos presentes no corpo são tocados. */
async function patchMember(
  req: Request,
  supabase: Client,
  userId: string,
): Promise<Response> {
  let body: unknown;
  const rawBody = await req.text();
  if (!rawBody.trim()) {
    body = {};
  } else {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Corpo inválido: JSON esperado", fields: {} }, 400);
    }
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonResponse({ error: "Corpo deve ser um objeto JSON", fields: {} }, 400);
  }

  const validation = validateMemberPatch(body as Record<string, unknown>);
  if (!validation.ok) return invalidFieldsResponse(validation.fields);

  const members = await loadMembers(supabase);
  const current = members.find((m) => m.user_id === userId);
  if (!current) return errorResponse("not_found", "Member not found", 404);

  if (isStale(current.updated_at, req.headers.get("if-unmodified-since"))) {
    return preconditionFailed(current.updated_at);
  }

  const actor = parseActor(req);
  const values = validation.values;

  // Corpo vazio (ou sem campos) => no-op 200 com o registro atual.
  if (Object.keys(values).length === 0) {
    return jsonResponse({ data: current, meta: { generated_at: new Date().toISOString(), changed: [] } });
  }

  // Colisões de email/telefone com outro membro.
  if (values.email) {
    const clash = members.find(
      (m) => m.user_id !== userId && (m.email ?? "").toLowerCase() === values.email,
    );
    if (clash) return conflictResponse("email", clash.user_id);
  }
  if (values.phone) {
    const clash = members.find((m) => m.user_id !== userId && m.phone.e164 === values.phone);
    if (clash) return conflictResponse("phone", clash.user_id);
  }

  // Idempotência: descarta campos cujo valor já é o atual.
  const changed: string[] = [];
  const profileUpdate: Record<string, unknown> = {};
  if ("name" in values && values.name !== current.name) {
    profileUpdate.name = values.name;
    changed.push("name");
  }
  if (
    "subscription_status" in values &&
    values.subscription_status !== current.subscription_status
  ) {
    profileUpdate.subscription_status = values.subscription_status;
    changed.push("subscription_status");
  }
  const phoneChanged = "phone" in values && values.phone !== current.phone.e164;
  const emailChanged = "email" in values &&
    values.email !== (current.email ?? "").toLowerCase();

  if (changed.length === 0 && !phoneChanged && !emailChanged) {
    return jsonResponse({ data: current, meta: { generated_at: new Date().toISOString(), changed: [] } });
  }

  const nowIso = new Date().toISOString();

  if (emailChanged) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      email: values.email as string,
      email_confirm: true,
    });
    if (error) {
      const message = error.message ?? "";
      if (/already|registered|exists/i.test(message)) {
        return conflictResponse("email", "unknown");
      }
      throw error;
    }
    changed.push("email");
  }

  if (phoneChanged) {
    const { error } = await supabase
      .from("profiles_private")
      .upsert(
        { user_id: userId, phone: values.phone, updated_at: nowIso },
        { onConflict: "user_id" },
      );
    if (error) throw error;
    changed.push("phone");
  }

  // Sempre registra o ator quando houve alteração efetiva.
  profileUpdate.updated_by = actor;
  profileUpdate.updated_at = nowIso;
  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("user_id", userId);
  if (profileError) throw profileError;

  await supabase.from("audit_logs").insert({
    user_id: userId,
    action: "central_api_member_patch",
    resource_type: "members",
    resource_id: userId,
    details: { actor, changed, values },
  });

  // Alterações de nome/telefone/status já são avisadas ao Centralizador por trigger.
  // E-mail vive em auth.users, então dispara aqui.
  if (emailChanged) {
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-centralizer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          record_id: userId,
          updated_by: actor,
          occurred_at: nowIso,
          changes: {
            email: { antes: current.email ?? null, depois: values.email ?? null },
          },
        }),
      });
    } catch (error) {
      console.error("central-read-api: falha ao notificar Centralizador", error);
    }
  }



  const refreshed = (await loadMembers(supabase)).find((m) => m.user_id === userId) ?? current;
  return jsonResponse({
    data: refreshed,
    meta: { generated_at: new Date().toISOString(), changed },
  });
}

/** PATCH parcial do motivo de cancelamento de uma assinatura. */
async function patchSubscription(
  req: Request,
  supabase: Client,
  subscriptionId: string,
): Promise<Response> {
  let body: unknown;
  const rawBody = await req.text();
  if (!rawBody.trim()) body = {};
  else {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "Corpo inválido: JSON esperado", fields: {} }, 400);
    }
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return jsonResponse({ error: "Corpo deve ser um objeto JSON", fields: {} }, 400);
  }

  const validation = validateSubscriptionPatch(body as Record<string, unknown>);
  if (!validation.ok) return invalidFieldsResponse(validation.fields);

  const { data: current, error: loadError } = await supabase
    .from("subscriptions")
    .select(
      "id, user_id, plan_name, status, payment_provider, amount, currency, started_at, expires_at, cancelled_at, cancel_reason, cancel_reason_detail, cancel_source, created_at, updated_at",
    )
    .eq("id", subscriptionId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!current) return errorResponse("not_found", "Subscription not found", 404);

  const currentUpdatedAt = (current.updated_at as string | null) ?? null;
  if (isStale(currentUpdatedAt, req.headers.get("if-unmodified-since"))) {
    return preconditionFailed(currentUpdatedAt);
  }

  const actor = parseActor(req);
  const values = validation.values;
  const changed: string[] = [];
  const update: Record<string, unknown> = {};

  for (const field of ["cancel_reason", "cancel_reason_detail"] as const) {
    if (field in values && values[field] !== ((current as Record<string, unknown>)[field] ?? null)) {
      update[field] = values[field];
      changed.push(field);
    }
  }

  const shape = (row: Record<string, unknown>) => ({
    id: row.id as string,
    user_id: (row.user_id as string | null) ?? null,
    plan: (row.plan_name as string | null) ?? null,
    status: (row.status as string | null) ?? null,
    provider: (row.payment_provider as string | null) ?? null,
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    currency: (row.currency as string | null) ?? null,
    start_date: (row.started_at as string | null) ?? null,
    end_date: (row.expires_at as string | null) ?? null,
    cancelled_at: (row.cancelled_at as string | null) ?? null,
    cancel_reason: (row.cancel_reason as string | null) ?? null,
    cancel_reason_detail: (row.cancel_reason_detail as string | null) ?? null,
    cancel_source: (row.cancel_source as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    updated_at: (row.updated_at as string | null) ?? null,
  });

  if (changed.length === 0) {
    return jsonResponse({
      data: shape(current as Record<string, unknown>),
      meta: { generated_at: new Date().toISOString(), changed: [] },
    });
  }

  const nowIso = new Date().toISOString();
  update.cancel_source = "admin";
  update.updated_at = nowIso;

  const { data: updated, error: updateError } = await supabase
    .from("subscriptions")
    .update(update)
    .eq("id", subscriptionId)
    .select(
      "id, user_id, plan_name, status, payment_provider, amount, currency, started_at, expires_at, cancelled_at, cancel_reason, cancel_reason_detail, cancel_source, created_at, updated_at",
    )
    .maybeSingle();
  if (updateError) throw updateError;

  await supabase.from("audit_logs").insert({
    user_id: (current.user_id as string | null) ?? null,
    action: "central_api_subscription_patch",
    resource_type: "subscriptions",
    resource_id: subscriptionId,
    details: { actor, changed, values },
  });

  return jsonResponse({
    data: shape((updated ?? current) as Record<string, unknown>),
    meta: { generated_at: new Date().toISOString(), changed },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "GET" && req.method !== "PATCH") {
    return errorResponse("method_not_allowed", "Only GET and PATCH are supported", 405);
  }

  const scope = resolveKeyScope(req.headers.get("x-api-key"));
  if (!scope) {
    return errorResponse("unauthorized", "Invalid or missing x-api-key", 401);
  }
  if (req.method === "PATCH" && scope !== "write") return forbiddenWrite();

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const fnIndex = segments.indexOf("central-read-api");
  const path = fnIndex >= 0 ? segments.slice(fnIndex + 1) : segments;
  const resource = path[0] ?? "";

  if (req.method === "PATCH") {
    if (!path[1] || (resource !== "members" && resource !== "subscriptions")) {
      return errorResponse(
        "not_found",
        "PATCH disponível apenas em /members/{user_id} e /subscriptions/{id} nesta API",
        404,
      );
    }
    try {
      return resource === "members"
        ? await patchMember(req, supabaseAdmin(), path[1])
        : await patchSubscription(req, supabaseAdmin(), path[1]);
    } catch (error) {
      console.error("central-read-api PATCH error", error);
      return errorResponse("internal_error", (error as Error).message ?? "Unexpected error", 500);
    }
  }

  if (resource === "schema" && path[1] === "editable") {
    return jsonResponse({
      data: EDITABLE_SCHEMA,
      ...EDITABLE_SCHEMA,
      meta: {
        generated_at: new Date().toISOString(),
        resources: Object.keys(EDITABLE_SCHEMA),
        note:
          "leads e contacts são editáveis pela API do CRM; esta API (Comunidade) expõe members e subscriptions",
      },
    });
  }

  const pagination = parsePagination(url);
  if ("error" in pagination) {
    return errorResponse("invalid_parameter", pagination.error, 400);
  }

  const phoneFilter = parsePhoneFilter(url.searchParams.get("phone"));
  if (!phoneFilter) {
    return errorResponse(
      "invalid_parameter",
      "phone must be one of: valid, all, needs_review",
      400,
    );
  }

  const updatedSince = parseIsoDate(url, "updated_since");
  if (updatedSince && typeof updatedSince === "object") {
    return errorResponse("invalid_parameter", updatedSince.error, 400);
  }

  const includeInternal = url.searchParams.get("include_internal") === "true";

  try {
    const supabase = supabaseAdmin();

    if (resource === "members") {
      const requestedId = path[1];

      if (requestedId) {
        const all = await loadMembers(supabase);
        const member = all.find((m) => m.user_id === requestedId);
        if (!member) return errorResponse("not_found", "Member not found", 404);
        return jsonResponse({ data: member, meta: { generated_at: new Date().toISOString() } });
      }

      let members = await loadMembers(supabase, updatedSince as string | null);

      if (!includeInternal) members = members.filter((m) => !m.is_internal);

      const status = url.searchParams.get("status");
      if (status) members = members.filter((m) => m.subscription_status === status);

      const plan = url.searchParams.get("plan");
      if (plan) members = members.filter((m) => (m.plan ?? "").toLowerCase() === plan.toLowerCase());

      const phoneKeyFilter = (url.searchParams.get("phone_key") ?? "").replace(/\D/g, "");
      if (phoneKeyFilter) members = members.filter((m) => m.phone_key === phoneKeyFilter);

      members = members.filter((m) => matchesPhoneFilter(m.phone, phoneFilter));
      sortMembers(members, parseMemberSort(url));

      return jsonResponse(paginated(members, pagination));
    }


    if (resource === "onboarding") {
      let query = supabase
        .from("user_onboarding")
        .select(
          "user_id, company, cnpj, job_title, business_niche, business_niche_other, employee_range, revenue_goal, average_ticket, city_state, experience_level, completed_at, created_at, updated_at",
        );
      if (updatedSince) query = query.gte("updated_at", updatedSince as string);
      const { data, error } = await query;
      if (error) throw error;

      let rows = (data ?? []).map((row) => ({
        user_id: row.user_id as string | null,
        company: row.company ?? null,
        cnpj: row.cnpj ?? null,
        job_title: row.job_title ?? null,
        niche: row.business_niche ?? row.business_niche_other ?? null,
        employee_range: row.employee_range ?? null,
        revenue_goal: row.revenue_goal ?? null,
        average_ticket: row.average_ticket ?? null,
        city_state: row.city_state ?? null,
        experience_level: row.experience_level ?? null,
        completed_at: row.completed_at ?? null,
        created_at: (row.created_at as string | null) ?? null,
        updated_at: (row.updated_at as string | null) ?? null,
      }));

      if (!includeInternal) {
        rows = rows.filter((r) => r.user_id && !INTERNAL_USER_IDS.has(r.user_id));
      }

      const hasCnpj = url.searchParams.get("has_cnpj");
      if (hasCnpj === "true") rows = rows.filter((r) => Boolean(r.cnpj));
      if (hasCnpj === "false") rows = rows.filter((r) => !r.cnpj);

      return jsonResponse(paginated(rows, pagination));
    }

    if (resource === "subscriptions") {
      let query = supabase
        .from("subscriptions")
        .select(
          "id, user_id, plan_name, status, payment_provider, amount, currency, started_at, expires_at, cancelled_at, cancel_reason, cancel_reason_detail, cancel_source, created_at, updated_at",
        );
      if (updatedSince) query = query.gte("updated_at", updatedSince as string);
      const { data, error } = await query;
      if (error) throw error;

      const subUserIds = (data ?? [])
        .map((r) => r.user_id as string | null)
        .filter((id): id is string => Boolean(id));
      // A compra acontece fora da plataforma (link de pagamento), então a origem
      // da assinatura é a mesma atribuição do cadastro do membro.
      const subAttribution = await loadAttribution(
        supabase,
        subUserIds.length > 0 && subUserIds.length <= 300 ? subUserIds : undefined,
      );

      // Fallback: o status real da assinatura vive em profiles; se a linha de
      // subscriptions não tiver motivo, usa o registrado no perfil do membro.
      const reasonByUser = new Map<
        string,
        { reason: string | null; detail: string | null; source: string | null }
      >();
      if (subUserIds.length > 0) {
        const { data: reasonRows } = await supabase
          .from("profiles")
          .select("user_id, cancel_reason, cancel_reason_detail, cancel_source")
          .in("user_id", subUserIds);
        for (const r of reasonRows ?? []) {
          reasonByUser.set(r.user_id as string, {
            reason: (r.cancel_reason as string | null) ?? null,
            detail: (r.cancel_reason_detail as string | null) ?? null,
            source: (r.cancel_source as string | null) ?? null,
          });
        }
      }

      let rows = (data ?? []).map((row) => ({
        id: row.id as string,
        user_id: row.user_id as string | null,
        plan: row.plan_name ?? null,
        status: row.status ?? null,
        provider: row.payment_provider ?? null,
        amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
        currency: (row.currency as string | null) ?? null,
        start_date: row.started_at ?? null,
        end_date: row.expires_at ?? null,
        cancelled_at: row.cancelled_at ?? null,
        cancel_reason: (row.cancel_reason as string | null) ??
          (row.user_id ? reasonByUser.get(row.user_id as string)?.reason ?? null : null),
        cancel_reason_detail: (row.cancel_reason_detail as string | null) ??
          (row.user_id ? reasonByUser.get(row.user_id as string)?.detail ?? null : null),
        cancel_source: (row.cancel_source as string | null) ??
          (row.user_id ? reasonByUser.get(row.user_id as string)?.source ?? null : null),
        created_at: (row.created_at as string | null) ?? null,
        updated_at: (row.updated_at as string | null) ?? null,
        attribution: (row.user_id
          ? subAttribution.get(row.user_id as string)?.attribution
          : null) ?? { ...EMPTY_ATTRIBUTION },
      }));


      if (!includeInternal) {
        rows = rows.filter((r) => r.user_id && !INTERNAL_USER_IDS.has(r.user_id));
      }

      const status = url.searchParams.get("status");
      if (status) rows = rows.filter((r) => r.status === status);

      const cancelReason = url.searchParams.get("cancel_reason");
      if (cancelReason) rows = rows.filter((r) => r.cancel_reason === cancelReason);

      return jsonResponse(paginated(rows, pagination));
    }


    if (resource === "engagement") {
      const since = parseIsoDate(url, "since");
      if (since && typeof since === "object") {
        return errorResponse("invalid_parameter", since.error, 400);
      }

      let analyticsQuery = supabase
        .from("member_analytics")
        .select("user_id, session_id, event_type, duration_seconds, created_at");

      if (since) analyticsQuery = analyticsQuery.gte("created_at", since as string);

      const [profilesRes, analyticsRes, lessonsRes, mentoringRes, webinarRes] = await Promise.all([
        supabase.from("profiles").select("user_id, created_at, updated_at"),
        analyticsQuery,
        supabase
          .from("formation_lesson_progress")
          .select("user_id, completed, completed_at")
          .eq("completed", true),
        supabase.from("mentoring_checkins").select("user_id, checked_in_at"),
        supabase.from("webinar_checkins").select("user_id, checked_in_at"),
      ]);
      if (analyticsRes.error) throw analyticsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const stats = new Map<string, {
        user_id: string;
        sessions: Set<string>;
        total_seconds: number;
        last_access: string | null;
        first_access: string | null;
        page_views: number;
        clicks: number;
        lessons_completed: number;
        mentoring_checkins: number;
        webinar_checkins: number;
        last_activity: string | null;
      }>();

      const ensure = (uid: string) => {
        let entry = stats.get(uid);
        if (!entry) {
          entry = {
            user_id: uid,
            sessions: new Set<string>(),
            total_seconds: 0,
            last_access: null,
            first_access: null,
            page_views: 0,
            clicks: 0,
            lessons_completed: 0,
            mentoring_checkins: 0,
            webinar_checkins: 0,
            last_activity: null,
          };
          stats.set(uid, entry);
        }
        return entry;
      };


      const touch = (uid: string, stamp: string | null) => {
        const entry = ensure(uid);
        if (stamp && (!entry.last_activity || stamp > entry.last_activity)) {
          entry.last_activity = stamp;
        }
        return entry;
      };

      // Toda linha de profiles gera uma linha de engajamento, mesmo zerada.
      for (const row of profilesRes.data ?? []) {
        const uid = row.user_id as string | null;
        if (!uid) continue;
        touch(uid, (row.updated_at as string | null) ?? (row.created_at as string | null) ?? null);
      }

      for (const row of analyticsRes.data ?? []) {
        const uid = row.user_id as string | null;
        if (!uid) continue;
        const stamp = row.created_at as string | null;
        const entry = touch(uid, stamp);
        if (row.session_id) entry.sessions.add(row.session_id as string);
        // Sessões são capadas em 30 min, mesmo critério do relatório semanal.
        entry.total_seconds += Math.min(Number(row.duration_seconds) || 0, 1800);
        if (stamp && (!entry.last_access || stamp > entry.last_access)) entry.last_access = stamp;
        if (stamp && (!entry.first_access || stamp < entry.first_access)) entry.first_access = stamp;
        const eventType = row.event_type as string | null;
        if (eventType === "page_view") entry.page_views += 1;
        if (eventType === "click") entry.clicks += 1;
      }
      for (const row of lessonsRes.data ?? []) {
        const uid = row.user_id as string | null;
        if (uid) touch(uid, (row.completed_at as string | null) ?? null).lessons_completed += 1;
      }
      for (const row of mentoringRes.data ?? []) {
        const uid = row.user_id as string | null;
        if (uid) touch(uid, (row.checked_in_at as string | null) ?? null).mentoring_checkins += 1;
      }
      for (const row of webinarRes.data ?? []) {
        const uid = row.user_id as string | null;
        if (uid) touch(uid, (row.checked_in_at as string | null) ?? null).webinar_checkins += 1;
      }

      let rows = Array.from(stats.values()).map((entry) => ({
        user_id: entry.user_id,
        sessions: entry.sessions.size,
        total_seconds: entry.total_seconds,
        total_minutes: Math.round(entry.total_seconds / 60),
        avg_session_seconds: entry.sessions.size
          ? Math.round(entry.total_seconds / entry.sessions.size)
          : 0,
        page_views: entry.page_views,
        clicks: entry.clicks,
        first_access_at: entry.first_access,
        last_access_at: entry.last_access,
        lessons_completed: entry.lessons_completed,
        mentoring_checkins: entry.mentoring_checkins,
        webinar_checkins: entry.webinar_checkins,
        // Última mudança em qualquer métrica (acesso, aula, check-in) ou no perfil.
        updated_at: entry.last_activity,
      }));


      if (!includeInternal) rows = rows.filter((r) => !INTERNAL_USER_IDS.has(r.user_id));
      rows = afterUpdatedSince(rows, updatedSince as string | null);
      rows.sort((a, b) => b.total_seconds - a.total_seconds || a.user_id.localeCompare(b.user_id));


      return jsonResponse(paginated(rows, pagination));
    }

    // ── Progresso individual por trilha/formação (CS 360) ──────────────────
    // Agrega formações (formations → modules → lessons) e trilhas de conteúdo
    // (content_tracks → content_items) por membro, sem recalcular nada no
    // consumidor. track_type deriva do slug da trilha.
    if (resource === "progress") {
      const sub = path[1] ?? "";
      const userFilter = url.searchParams.get("user_id");

      // As tabelas de progresso passam de 1000 linhas: pagina no servidor.
      const fetchAll = async (table: string, columns: string, filterUser = true) => {
        const rows: Record<string, unknown>[] = [];
        const size = 1000;
        for (let from = 0; ; from += size) {
          let q = supabase.from(table).select(columns).range(from, from + size - 1);
          if (filterUser && userFilter) q = q.eq("user_id", userFilter);
          const { data, error } = await q;
          if (error) throw error;
          const batch = (data ?? []) as Record<string, unknown>[];
          rows.push(...batch);
          if (batch.length < size) break;
        }
        return rows;
      };

      const [
        formations,
        modules,
        formationLessons,
        tracks,
        items,
        lessonProgress,
        itemProgress,
      ] = await Promise.all([
        fetchAll("formations", "id, title", false),
        fetchAll("formation_modules", "id, formation_id", false),
        fetchAll("formation_lessons", "id, module_id, title", false),
        fetchAll("content_tracks", "id, slug, title", false),
        fetchAll("content_items", "id, track_id, title", false),
        fetchAll("formation_lesson_progress", "user_id, lesson_id, completed, completed_at, created_at"),
        fetchAll("content_item_progress", "user_id, item_id, completed, completed_at, created_at"),
      ]);

      const trackTypeForSlug = (slug: string | null) => {
        if (slug === "mentorias") return "mentoria_gravada";
        if (slug === "webinars") return "webinar_gravado";
        return "trilha";
      };

      // lesson/item → { track_id, track_title, track_type, lesson_title }
      const formationByModule = new Map<string, string>();
      for (const m of modules) formationByModule.set(String(m.id), String(m.formation_id));
      const formationTitle = new Map<string, string>();
      for (const f of formations) formationTitle.set(String(f.id), String(f.title ?? ""));
      const trackInfo = new Map<string, { title: string; type: string }>();
      for (const t of tracks) {
        trackInfo.set(String(t.id), {
          title: String(t.title ?? ""),
          type: trackTypeForSlug((t.slug as string | null) ?? null),
        });
      }

      type Unit = { track_id: string; track_title: string; track_type: string; title: string };
      const unitByLesson = new Map<string, Unit>();
      for (const l of formationLessons) {
        const formationId = formationByModule.get(String(l.module_id));
        if (!formationId) continue;
        unitByLesson.set(String(l.id), {
          track_id: formationId,
          track_title: formationTitle.get(formationId) ?? "",
          track_type: "formacao",
          title: String(l.title ?? ""),
        });
      }
      const unitByItem = new Map<string, Unit>();
      for (const it of items) {
        const info = trackInfo.get(String(it.track_id));
        if (!info) continue;
        unitByItem.set(String(it.id), {
          track_id: String(it.track_id),
          track_title: info.title,
          track_type: info.type,
          title: String(it.title ?? ""),
        });
      }

      const totalsByTrack = new Map<string, number>();
      for (const unit of [...unitByLesson.values(), ...unitByItem.values()]) {
        totalsByTrack.set(unit.track_id, (totalsByTrack.get(unit.track_id) ?? 0) + 1);
      }

      // Detalhe aula a aula.
      if (sub === "lessons") {
        let rows = [
          ...lessonProgress.map((p) => ({ row: p, unit: unitByLesson.get(String(p.lesson_id)), id: String(p.lesson_id) })),
          ...itemProgress.map((p) => ({ row: p, unit: unitByItem.get(String(p.item_id)), id: String(p.item_id) })),
        ]
          .filter((e) => e.unit)
          .map(({ row, unit, id }) => {
            const completedAt = (row.completed_at as string | null) ?? null;
            const createdAt = (row.created_at as string | null) ?? null;
            return {
              user_id: String(row.user_id),
              lesson_id: id,
              lesson_title: unit!.title,
              track_id: unit!.track_id,
              track_title: unit!.track_title,
              track_type: unit!.track_type,
              completed: Boolean(row.completed),
              completed_at: completedAt,
              // A plataforma não rastreia tempo assistido por aula.
              watch_seconds: null as number | null,
              created_at: createdAt,
              updated_at: completedAt ?? createdAt,
            };
          });

        if (!includeInternal) rows = rows.filter((r) => !INTERNAL_USER_IDS.has(r.user_id));
        rows = afterUpdatedSince(rows, updatedSince as string | null);
        rows.sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));
        return jsonResponse(paginated(rows, pagination));
      }

      if (sub) {
        return errorResponse("not_found", "Unknown progress resource. Available: /progress, /progress/lessons", 404);
      }

      type Agg = {
        user_id: string;
        track_id: string;
        track_title: string;
        track_type: string;
        lessons_total: number;
        lessons_completed: number;
        started_at: string | null;
        last_activity_at: string | null;
        last_completed_at: string | null;
      };
      const agg = new Map<string, Agg>();

      const add = (
        userId: string,
        unit: Unit | undefined,
        completed: boolean,
        completedAt: string | null,
        createdAt: string | null,
      ) => {
        if (!unit) return;
        const key = `${userId}:${unit.track_id}`;
        let entry = agg.get(key);
        if (!entry) {
          entry = {
            user_id: userId,
            track_id: unit.track_id,
            track_title: unit.track_title,
            track_type: unit.track_type,
            lessons_total: totalsByTrack.get(unit.track_id) ?? 0,
            lessons_completed: 0,
            started_at: null,
            last_activity_at: null,
            last_completed_at: null,
          };
          agg.set(key, entry);
        }
        if (completed) {
          entry.lessons_completed += 1;
          if (completedAt && (!entry.last_completed_at || completedAt > entry.last_completed_at)) {
            entry.last_completed_at = completedAt;
          }
        }
        const stamps = [createdAt, completedAt].filter((s): s is string => Boolean(s));
        for (const stamp of stamps) {
          if (!entry.started_at || stamp < entry.started_at) entry.started_at = stamp;
          if (!entry.last_activity_at || stamp > entry.last_activity_at) entry.last_activity_at = stamp;
        }
      };

      for (const p of lessonProgress) {
        add(
          String(p.user_id),
          unitByLesson.get(String(p.lesson_id)),
          Boolean(p.completed),
          (p.completed_at as string | null) ?? null,
          (p.created_at as string | null) ?? null,
        );
      }
      for (const p of itemProgress) {
        add(
          String(p.user_id),
          unitByItem.get(String(p.item_id)),
          Boolean(p.completed),
          (p.completed_at as string | null) ?? null,
          (p.created_at as string | null) ?? null,
        );
      }

      let rows = Array.from(agg.values()).map((e) => ({
        user_id: e.user_id,
        track_id: e.track_id,
        track_title: e.track_title,
        track_type: e.track_type,
        lessons_total: e.lessons_total,
        lessons_completed: e.lessons_completed,
        progress_percent: e.lessons_total
          ? Math.round((e.lessons_completed / e.lessons_total) * 1000) / 10
          : 0,
        started_at: e.started_at,
        last_activity_at: e.last_activity_at,
        completed_at: e.lessons_total > 0 && e.lessons_completed >= e.lessons_total
          ? e.last_completed_at
          : null,
        updated_at: e.last_activity_at,
      }));

      if (!includeInternal) rows = rows.filter((r) => !INTERNAL_USER_IDS.has(r.user_id));
      rows = afterUpdatedSince(rows, updatedSince as string | null);
      rows.sort((a, b) =>
        (b.last_activity_at ?? "").localeCompare(a.last_activity_at ?? "") ||
        a.user_id.localeCompare(b.user_id)
      );

      return jsonResponse(paginated(rows, pagination));
    }


    if (resource === "phones") {
      const members = await loadMembers(supabase);
      const groups = new Map<string, {
        e164: string | null;
        phone_key: string | null;
        raw_samples: string[];
        user_ids: string[];
        count: number;
        placeholder: boolean;
        needs_review: boolean;
        review_reasons: string[];
      }>();

      for (const member of members) {
        if (!includeInternal && member.is_internal) continue;
        if (!member.phone.raw) continue;
        const key = member.phone.e164 ?? `raw:${member.phone.raw}`;
        let group = groups.get(key);
        if (!group) {
          group = {
            e164: member.phone.e164,
            phone_key: member.phone.phone_key,
            raw_samples: [],
            user_ids: [],
            count: 0,
            placeholder: member.phone.review_reasons.includes("placeholder"),
            needs_review: member.phone.needs_review,
            review_reasons: [...member.phone.review_reasons],
          };
          groups.set(key, group);
        }
        if (!group.phone_key && member.phone.phone_key) group.phone_key = member.phone.phone_key;
        if (member.phone.raw && !group.raw_samples.includes(member.phone.raw)) {
          group.raw_samples.push(member.phone.raw);
        }
        if (!group.user_ids.includes(member.user_id)) group.user_ids.push(member.user_id);
        group.count = group.user_ids.length;
        for (const reason of member.phone.review_reasons) {
          if (!group.review_reasons.includes(reason)) group.review_reasons.push(reason);
        }
        group.needs_review = group.needs_review || member.phone.needs_review;
      }

      let rows = Array.from(groups.values());
      if (url.searchParams.get("only_duplicates") === "true") {
        rows = rows.filter((g) => g.count > 1);
      }
      if (phoneFilter === "needs_review") rows = rows.filter((g) => g.needs_review);
      if (phoneFilter === "valid") rows = rows.filter((g) => !g.needs_review);
      rows.sort((a, b) => b.count - a.count);

      return jsonResponse(paginated(rows, pagination));
    }

    if (resource === "deletions") {
      const since = parseIsoDate(url, "since");
      if (since && typeof since === "object") {
        return errorResponse("invalid_parameter", since.error, 400);
      }

      let query = supabase
        .from("member_deletions")
        .select("user_id, email, name, reason, deleted_at")
        .order("deleted_at", { ascending: false })
        .order("user_id", { ascending: true });

      const sinceValue = (since as string | null) ?? (updatedSince as string | null);
      if (sinceValue) query = query.gte("deleted_at", sinceValue);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []).map((row) => ({
        user_id: row.user_id as string,
        email: (row.email as string | null) ?? null,
        name: (row.name as string | null) ?? null,
        reason: (row.reason as string | null) ?? null,
        deleted_at: row.deleted_at as string,
      }));

      return jsonResponse(paginated(rows, pagination));
    }

    // ── Métricas da aba "Analytics de Engajamento" ────────────────────────
    // Cada rota devolve os dados crus da mesma função do banco que o painel usa,
    // então os números do Centralizador batem exatamente com os daqui.
    if (resource === "analytics") {
      const sub = path[1] ?? "";

      const days = parseIntParam(url, "days", 30, 1, 3650);
      if (typeof days === "object") return errorResponse("invalid_parameter", days.error, 400);
      const limit = parseIntParam(url, "limit", 50, 1, 500);
      if (typeof limit === "object") return errorResponse("invalid_parameter", limit.error, 400);

      const rpc = async (name: string, args: Record<string, unknown> = {}) => {
        const { data, error } = await supabase.rpc(name, args);
        if (error) throw error;
        return data ?? [];
      };

      const single = (data: unknown) =>
        Array.isArray(data) ? (data[0] ?? null) : (data ?? null);

      const simple = (data: unknown) =>
        jsonResponse({ data, meta: { generated_at: new Date().toISOString() } });

      switch (sub) {
        case "kpis":
          return simple(single(await rpc("get_analytics_kpis", { _days_ago: days })));
        case "engagement-stats":
          return simple(single(await rpc("get_engagement_stats")));
        case "page-views-over-time":
          return simple(await rpc("get_page_views_over_time", { _days_ago: days }));
        case "weekday-access":
          return simple(await rpc("get_weekday_access_summary", { _days_ago: days }));
        case "access-heatmap":
          return simple(await rpc("get_access_heatmap", { _days_ago: days }));
        case "top-pages": {
          const rows = await rpc("get_top_pages_by_views", { _days_ago: days, _limit: limit });
          return simple(rows);
        }
        case "top-clicked-elements": {
          const rows = (await rpc("get_top_clicked_elements", {
            _days_ago: days,
            _limit: limit,
          })) as Record<string, unknown>[];
          const elementType = url.searchParams.get("element_type");
          const filtered = elementType && elementType !== "todos"
            ? rows.filter((r) => r.element_type === elementType)
            : rows;
          return simple(filtered);
        }
        case "page-click-details": {
          const raw = url.searchParams.get("page_paths");
          if (!raw) {
            return errorResponse("invalid_parameter", "page_paths is required (CSV)", 400);
          }
          const paths = raw.split(",").map((p) => p.trim()).filter(Boolean);
          if (!paths.length) {
            return errorResponse("invalid_parameter", "page_paths must contain at least one path", 400);
          }
          return simple(await rpc("get_page_click_details", {
            _page_paths: paths,
            _days_ago: days,
          }));
        }
        case "formation-completion":
          return simple(await rpc("get_formation_completion_rates"));
        case "track-completion":
          return simple(await rpc("get_content_track_completion_rates"));
        case "track-items": {
          const trackId = path[2] ?? url.searchParams.get("track_id");
          return simple(await rpc("get_content_item_completion_stats", {
            p_track_id: trackId ?? null,
          }));
        }
        case "inactive-members": {
          const inactiveDays = parseIntParam(url, "inactive_days", 0, 0, 3650);
          if (typeof inactiveDays === "object") {
            return errorResponse("invalid_parameter", inactiveDays.error, 400);
          }
          const rows = (await rpc("get_inactive_members", {
            inactive_days: inactiveDays,
            limit_count: 1000,
          })) as Record<string, unknown>[];
          const filtered = includeInternal
            ? rows
            : rows.filter((r) => !INTERNAL_USER_IDS.has(String(r.user_id)));
          return jsonResponse(paginated(filtered, pagination));
        }
        case "onboarding-responses": {
          const rows = (await rpc("get_onboarding_responses")) as Record<string, unknown>[];
          const filtered = includeInternal
            ? rows
            : rows.filter((r) => !r.user_id || !INTERNAL_USER_IDS.has(String(r.user_id)));
          return jsonResponse(paginated(filtered, pagination));
        }
        case "cashback": {
          const [stats, partners, saldo] = await Promise.all([
            rpc("get_cashback_dashboard_stats"),
            rpc("get_cashback_partner_performance"),
            rpc("get_cashback_saldo_planos"),
          ]);
          return simple({
            stats: single(stats),
            partner_performance: partners,
            saldo_por_plano: saldo,
          });
        }
        case "page-name-map": {
          const [formationsRes, tracksRes] = await Promise.all([
            supabase.from("formations").select("id, title"),
            supabase.from("content_tracks").select("id, title, slug"),
          ]);
          if (formationsRes.error) throw formationsRes.error;
          if (tracksRes.error) throw tracksRes.error;
          return simple({
            routes: PAGE_NAME_MAP,
            element_type_labels: ELEMENT_TYPE_LABELS,
            formations: (formationsRes.data ?? []).map((f) => ({
              id: f.id as string,
              title: f.title as string,
            })),
            content_tracks: (tracksRes.data ?? []).map((t) => ({
              id: t.id as string,
              slug: (t.slug as string | null) ?? null,
              title: t.title as string,
            })),
          });
        }
        case "events": {
          const since = parseIsoDate(url, "since");
          if (since && typeof since === "object") {
            return errorResponse("invalid_parameter", since.error, 400);
          }
          const from = (since as string | null) ?? (updatedSince as string | null);

          let query = supabase
            .from("member_analytics")
            .select("id, user_id, event_type, page_path, session_id, duration_seconds, event_data, created_at")
            .order("created_at", { ascending: false })
            .limit(5000);
          if (from) query = query.gte("created_at", from);
          const eventType = url.searchParams.get("event_type");
          if (eventType) query = query.eq("event_type", eventType);

          const { data, error } = await query;
          if (error) throw error;

          let rows = (data ?? []) as Record<string, unknown>[];
          if (!includeInternal) {
            rows = rows.filter((r) => !INTERNAL_USER_IDS.has(String(r.user_id)));
          }
          return jsonResponse(paginated(rows, pagination));
        }
      }

      return errorResponse(
        "not_found",
        "Unknown analytics resource. Available: kpis, engagement-stats, page-views-over-time, weekday-access, access-heatmap, top-pages, top-clicked-elements, page-click-details, formation-completion, track-completion, track-items/:track_id, inactive-members, onboarding-responses, cashback, page-name-map, events",
        404,
      );
    }

    // ── Métricas de Marketing (aquisição, funil, ICP, receita) ────────────
    // Cada rota chama a função agregadora do banco correspondente, que já exclui
    // a equipe interna e devolve os números prontos para a aba de Marketing.
    if (resource === "marketing") {
      const sub = path[1] ?? "";

      const days = parseIntParam(url, "days", 30, 0, 3650);
      if (typeof days === "object") return errorResponse("invalid_parameter", days.error, 400);

      const rpc = async (name: string, args: Record<string, unknown> = {}) => {
        const { data, error } = await supabase.rpc(name, args);
        if (error) throw error;
        return data ?? null;
      };

      const simple = (data: unknown) =>
        jsonResponse({ data, meta: { generated_at: new Date().toISOString() } });

      switch (sub) {
        case "overview":
          return simple(await rpc("get_marketing_overview", { _days: days }));
        case "acquisition":
          return simple(await rpc("get_marketing_acquisition", { _days: days }));
        case "funnel":
          return simple(await rpc("get_marketing_funnel", { _days: days }));
        case "cohorts":
          return simple(await rpc("get_marketing_cohorts"));
        case "revenue-timeseries": {
          const granularity = url.searchParams.get("granularity") === "month" ? "month" : "day";
          const windowDays = url.searchParams.get("days") ? days : 180;
          return simple(await rpc("get_marketing_revenue_timeseries", {
            _days: windowDays,
            _granularity: granularity,
          }));
        }
        case "icp":
          return simple(await rpc("get_onboarding_icp_distribution"));
        case "plans":
          return simple(await rpc("get_marketing_plans"));
        case "partners":
          return simple(await rpc("get_marketing_partners", { _days: days }));
        case "sellers":
          return simple(await rpc("get_marketing_sellers", { _days: days }));
        case "content-interest": {
          const windowDays = url.searchParams.get("days") ? days : 90;
          return simple(await rpc("get_marketing_content_interest", { _days: windowDays }));
        }
        case "events-conversion": {
          const windowDays = url.searchParams.get("days") ? days : 180;
          return simple(await rpc("get_marketing_events_conversion", { _days: windowDays }));
        }
        case "geo":
          return simple(await rpc("get_marketing_geo"));
      }

      return errorResponse(
        "not_found",
        "Unknown marketing resource. Available: overview, acquisition, funnel, cohorts, revenue-timeseries, icp, plans, partners, sellers, content-interest, events-conversion, geo",
        404,
      );
    }

    // ── Recursos complementares (gamificação, IA, certificados, catálogo…) ─
    // Todos read-only, sem telefone, sem URL de vídeo e sem ID de pagamento.
    let internalCache: Set<string> | null = null;
    const internalIds = async (): Promise<Set<string>> => {
      if (internalCache) return internalCache;
      const ids = new Set<string>(INTERNAL_USER_IDS);
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", TEAM_ROLES);
      if (error) throw error;
      for (const row of data ?? []) {
        if (row.user_id) ids.add(row.user_id as string);
      }
      internalCache = ids;
      return ids;
    };

    const listResource = async (
      table: string,
      columns: string,
      opts: {
        orderColumn?: string;
        ascending?: boolean;
        userColumn?: string | null;
        sinceColumn?: string | null;
        limit?: number;
      } = {},
    ) => {
      const {
        orderColumn = "created_at",
        ascending = false,
        userColumn = "user_id",
        sinceColumn = "created_at",
        limit = 5000,
      } = opts;

      let query = supabase.from(table).select(columns).order(orderColumn, { ascending }).limit(limit);
      const since = parseIsoDate(url, "since");
      if (since && typeof since === "object") return { error: since.error };
      const from = (since as string | null) ?? (updatedSince as string | null);
      if (from && sinceColumn) query = query.gte(sinceColumn, from);

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data ?? []) as Record<string, unknown>[];
      if (!includeInternal && userColumn) {
        const internal = await internalIds();
        rows = rows.filter((r) => !internal.has(String(r[userColumn])));
      }
      return { rows };
    };

    const listed = async (...args: Parameters<typeof listResource>) => {
      const result = await listResource(...args);
      if ("error" in result) return errorResponse("invalid_parameter", result.error!, 400);
      return jsonResponse(paginated(result.rows!, pagination));
    };

    const simpleData = (data: unknown) =>
      jsonResponse({ data, meta: { generated_at: new Date().toISOString() } });

    if (resource === "gamification") {
      const sub = path[1] ?? "";

      if (sub === "leaderboard") {
        const { data, error } = await supabase.rpc("get_leaderboard_with_achievements");
        if (error) throw error;
        return simpleData(data ?? []);
      }

      if (sub === "achievements") {
        const [catalog, unlocks] = await Promise.all([
          supabase
            .from("achievements")
            .select("id, name, description, category, points, max_progress, is_seasonal, season_name, expires_at, created_at")
            .order("category", { ascending: true }),
          supabase.from("user_achievements").select("achievement_id, user_id, unlocked_at"),
        ]);
        if (catalog.error) throw catalog.error;
        if (unlocks.error) throw unlocks.error;

        const internal = includeInternal ? new Set<string>() : await internalIds();
        const counts = new Map<string, number>();
        for (const row of unlocks.data ?? []) {
          if (!row.unlocked_at) continue;
          if (internal.has(String(row.user_id))) continue;
          const key = String(row.achievement_id);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }

        return simpleData(
          (catalog.data ?? []).map((a) => ({
            ...a,
            users_unlocked: counts.get(String(a.id)) ?? 0,
          })),
        );
      }

      if (sub === "user-achievements") {
        return await listed(
          "user_achievements",
          "id, user_id, achievement_id, progress, unlocked_at, created_at",
          { orderColumn: "unlocked_at", sinceColumn: "unlocked_at" },
        );
      }

      return errorResponse(
        "not_found",
        "Unknown gamification resource. Available: leaderboard, achievements, user-achievements",
        404,
      );
    }

    if (resource === "ai") {
      const sub = path[1] ?? "";
      const sub2 = path[2] ?? "";

      if (sub === "mapinha" && !sub2) {
        const days = parseIntParam(url, "days", 30, 1, 365);
        if (typeof days === "object") return errorResponse("invalid_parameter", days.error, 400);
        const { data, error } = await supabase.rpc("get_mapinha_analytics", { days_back: days });
        if (error) throw error;
        return simpleData(data ?? null);
      }

      if (sub === "mapinha" && sub2 === "interactions") {
        return await listed(
          "mapinha_interactions",
          "id, user_id, conversation_id, question, topic, status, latency_ms, web_search_count, rating, rated_at, created_at, answered_at",
        );
      }

      return errorResponse("not_found", "Unknown ai resource. Available: mapinha, mapinha/interactions", 404);
    }

    if (resource === "certificates") {
      return await listed(
        "certificates",
        "id, user_id, formation_id, formation_title, user_name, certificate_number, completed_at, created_at",
      );
    }

    if (resource === "events") {
      const sub = path[1] ?? "";

      if (sub === "checkins") {
        const kind = url.searchParams.get("kind");
        if (kind && kind !== "webinar" && kind !== "mentoring") {
          return errorResponse("invalid_parameter", "kind must be 'webinar' or 'mentoring'", 400);
        }

        const since = parseIsoDate(url, "since");
        if (since && typeof since === "object") {
          return errorResponse("invalid_parameter", since.error, 400);
        }
        const from = (since as string | null) ?? (updatedSince as string | null);

        const rows: Record<string, unknown>[] = [];
        const internal = includeInternal ? new Set<string>() : await internalIds();

        if (kind !== "mentoring") {
          let q = supabase
            .from("webinar_checkins")
            .select("id, user_id, webinar_id, checked_in_at, webinars!fk_webinar_checkins_webinar(title, scheduled_at, partner_name, max_attendees)")
            .order("checked_in_at", { ascending: false })
            .limit(5000);
          if (from) q = q.gte("checked_in_at", from);
          const { data, error } = await q;
          if (error) throw error;
          for (const row of (data ?? []) as Record<string, unknown>[]) {
            if (internal.has(String(row.user_id))) continue;
            const ev = (row.webinars ?? {}) as Record<string, unknown>;
            rows.push({
              id: row.id,
              kind: "webinar",
              user_id: row.user_id,
              event_id: row.webinar_id,
              event_title: ev.title ?? null,
              event_scheduled_at: ev.scheduled_at ?? null,
              event_host: ev.partner_name ?? null,
              max_attendees: ev.max_attendees ?? null,
              checked_in_at: row.checked_in_at,
            });
          }
        }

        if (kind !== "webinar") {
          let q = supabase
            .from("mentoring_checkins")
            .select("id, user_id, session_id, checked_in_at, mentoring_sessions(title, scheduled_at, mentor_name, max_attendees)")
            .order("checked_in_at", { ascending: false })
            .limit(5000);
          if (from) q = q.gte("checked_in_at", from);
          const { data, error } = await q;
          if (error) throw error;
          for (const row of (data ?? []) as Record<string, unknown>[]) {
            if (internal.has(String(row.user_id))) continue;
            const ev = (row.mentoring_sessions ?? {}) as Record<string, unknown>;
            rows.push({
              id: row.id,
              kind: "mentoring",
              user_id: row.user_id,
              event_id: row.session_id,
              event_title: ev.title ?? null,
              event_scheduled_at: ev.scheduled_at ?? null,
              event_host: ev.mentor_name ?? null,
              max_attendees: ev.max_attendees ?? null,
              checked_in_at: row.checked_in_at,
            });
          }
        }

        rows.sort((a, b) => String(b.checked_in_at).localeCompare(String(a.checked_in_at)));
        return jsonResponse(paginated(rows, pagination));
      }

      return errorResponse("not_found", "Unknown events resource. Available: checkins", 404);
    }

    if (resource === "catalog") {
      const [formations, tracks, items, resourcesRes] = await Promise.all([
        supabase
          .from("formations")
          .select("id, title, description, level, order_index, is_published, is_coming_soon, duration_hours, presenter_name, created_at")
          .order("order_index", { ascending: true }),
        supabase
          .from("content_tracks")
          .select("id, slug, title, description, category, event_name, event_date, order_index, is_active, is_coming_soon, presenter_name, created_at")
          .order("order_index", { ascending: true }),
        supabase
          .from("content_items")
          .select("id, track_id, title, category, duration_minutes, order_index, presenter_name, created_at")
          .order("order_index", { ascending: true }),
        supabase
          .from("resources")
          .select("id, title, description, category, type, is_premium, is_active, downloads_count, created_at")
          .order("created_at", { ascending: false }),
      ]);
      for (const res of [formations, tracks, items, resourcesRes]) {
        if (res.error) throw res.error;
      }

      return simpleData({
        formations: formations.data ?? [],
        content_tracks: tracks.data ?? [],
        content_items: items.data ?? [],
        resources: resourcesRes.data ?? [],
      });
    }

    if (resource === "benefits") {
      const sub = path[1] ?? "";

      if (sub === "" || sub === "extra") {
        return await listed(
          "extra_benefits",
          "id, member_id, benefit_type, title, description, quantity_granted, quantity_used, status, source, granted_at, expires_at, created_at, updated_at",
          { userColumn: "member_id" },
        );
      }

      if (sub === "cashback") {
        return await listed(
          "cashback_usage",
          "id, user_id, partner_id, partner_name, discount_percentage, purchase_amount, cashback_amount, estimated_value, status, usage_date, approved_at, created_at, updated_at",
        );
      }

      return errorResponse("not_found", "Unknown benefits resource. Available: extra, cashback", 404);
    }

    if (resource === "plan-upgrades") {
      return await listed(
        "plan_upgrades",
        "id, user_id, current_plan, new_plan, current_plan_value, new_plan_value, amount_already_paid, upgrade_amount, installments, status, created_at, updated_at, paid_at, cancelled_at, failed_at",
      );
    }

    if (resource === "compliance") {
      const sub = path[1] ?? "";

      if (sub === "" || sub === "terms") {
        return await listed("terms_acceptance", "id, user_id, terms_version, accepted_at", {
          orderColumn: "accepted_at",
          sinceColumn: "accepted_at",
        });
      }

      if (sub === "image-consent") {
        return await listed("image_consent", "id, user_id, session_id, consent_version, accepted_at", {
          orderColumn: "accepted_at",
          sinceColumn: "accepted_at",
        });
      }

      return errorResponse("not_found", "Unknown compliance resource. Available: terms, image-consent", 404);
    }

    if (resource === "secondary-logins") {
      return await listed(
        "secondary_logins",
        "id, primary_user_id, secondary_user_id, secondary_email, secondary_name, relationship, is_active, created_at, updated_at",
        { userColumn: null },
      );
    }

    if (resource === "networking") {
      const sub = path[1] ?? "";
      if (sub === "connections") {
        return await listed("member_connections", "id, follower_id, following_id, created_at", {
          userColumn: "follower_id",
        });
      }
      return errorResponse("not_found", "Unknown networking resource. Available: connections", 404);
    }

    if (resource === "ops") {
      const sub = path[1] ?? "";

      if (sub === "health") {
        const days = parseIntParam(url, "days", 30, 1, 365);
        if (typeof days === "object") return errorResponse("invalid_parameter", days.error, 400);
        const from = new Date(Date.now() - days * 86400000).toISOString();

        const [logs, churn] = await Promise.all([
          supabase
            .from("webhook_logs")
            .select("provider, event_type, status, error_message, created_at")
            .gte("created_at", from)
            .order("created_at", { ascending: false })
            .limit(5000),
          supabase
            .from("churn_alert_logs")
            .select("id, user_id, alert_type, sent_at")
            .gte("sent_at", from)
            .order("sent_at", { ascending: false }),
        ]);
        if (logs.error) throw logs.error;
        if (churn.error) throw churn.error;

        const byKey = new Map<string, { provider: string; event_type: string; status: string; count: number }>();
        const failures: Record<string, unknown>[] = [];
        for (const row of logs.data ?? []) {
          const key = `${row.provider}|${row.event_type}|${row.status}`;
          const entry = byKey.get(key) ??
            { provider: String(row.provider), event_type: String(row.event_type), status: String(row.status), count: 0 };
          entry.count += 1;
          byKey.set(key, entry);
          if (row.status === "error" && failures.length < 50) {
            failures.push({
              provider: row.provider,
              event_type: row.event_type,
              error_message: row.error_message,
              created_at: row.created_at,
            });
          }
        }

        return simpleData({
          period_days: days,
          webhooks: {
            total: (logs.data ?? []).length,
            by_event: Array.from(byKey.values()).sort((a, b) => b.count - a.count),
            recent_failures: failures,
          },
          churn_alerts: churn.data ?? [],
        });
      }

      return errorResponse("not_found", "Unknown ops resource. Available: health", 404);
    }

    return errorResponse(
      "not_found",
      "Unknown resource. Available: members, members/:user_id, onboarding, subscriptions, engagement, progress, progress/lessons, phones, deletions, analytics/*, marketing/*, gamification/*, ai/mapinha, certificates, events/checkins, catalog, benefits/*, plan-upgrades, compliance/*, secondary-logins, networking/connections, ops/health",
      404,
    );




  } catch (error) {
    console.error("central-read-api error:", error);
    return errorResponse("internal_error", "Internal server error", 500);
  }
});

// Referência não usada em runtime, mantida para documentar o placeholder tratado.
export const _placeholder = PLACEHOLDER_PHONE;
