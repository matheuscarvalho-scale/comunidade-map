// Camada de ESCRITA da central-read-api (PATCH parcial + descoberta de schema).
// Autenticação: x-api-key com permissão de escrita (CENTRAL_WRITE_API_KEY).
import { errorResponse, jsonResponse, normalizePhone } from "./lib.ts";

export type ApiKeyScope = "read" | "write";

/** Retorna o escopo da chave enviada, ou null quando inválida. */
export function resolveKeyScope(providedKey: string | null): ApiKeyScope | null {
  const readKey = Deno.env.get("CENTRAL_READ_API_KEY");
  const writeKey = Deno.env.get("CENTRAL_WRITE_API_KEY");
  if (!providedKey) return null;
  if (writeKey && providedKey === writeKey) return "write";
  if (readKey && providedKey === readKey) return "read";
  return null;
}

export type FieldSpec = {
  field: string;
  type: "string" | "email" | "phone" | "enum" | "uuid" | "boolean";
  required?: boolean;
  max_length?: number;
  format?: string;
  values?: string[];
  ref?: string;
  note?: string;
};

/**
 * Recursos editáveis desta API. Este projeto (Comunidade) só expõe `members`;
 * `leads` e `contacts` vivem no CRM e são publicados pela API do CRM.
 */
export const EDITABLE_SCHEMA: Record<string, FieldSpec[]> = {
  members: [
    { field: "name", type: "string", required: false, max_length: 200 },
    { field: "email", type: "email", required: false },
    { field: "phone", type: "phone", required: false, format: "E.164" },
    {
      field: "subscription_status",
      type: "enum",
      required: false,
      values: ["active", "pending", "expired", "refunded", "canceled"],
    },
  ],
  subscriptions: [
    {
      field: "cancel_reason",
      type: "enum",
      required: false,
      values: [
        "payment_deleted",
        "payment_overdue",
        "refund_requested",
        "refund_after_window",
        "chargeback",
        "plan_downgrade",
        "customer_request",
        "duplicate_account",
        "account_deleted",
        "other",
      ],
      note: "PATCH /subscriptions/{id}; 'other' exige cancel_reason_detail",
    },
    {
      field: "cancel_reason_detail",
      type: "string",
      required: false,
      max_length: 500,
    },
  ],
};

export const CANCEL_REASONS = EDITABLE_SCHEMA.subscriptions.find(
  (f) => f.field === "cancel_reason",
)!.values!;

export type SubscriptionPatchResult =
  | { ok: true; values: Record<string, string | null> }
  | { ok: false; fields: Record<string, string> };

export function validateSubscriptionPatch(
  body: Record<string, unknown>,
): SubscriptionPatchResult {
  const fields: Record<string, string> = {};
  const values: Record<string, string | null> = {};
  const allowed = new Set(EDITABLE_SCHEMA.subscriptions.map((f) => f.field));

  for (const [key, rawValue] of Object.entries(body)) {
    if (!allowed.has(key)) {
      fields[key] = "campo desconhecido ou não editável";
      continue;
    }
    if (rawValue === null) {
      values[key] = null;
      continue;
    }
    if (typeof rawValue !== "string") {
      fields[key] = "deve ser string";
      continue;
    }
    const value = rawValue.trim();
    if (key === "cancel_reason") {
      if (!CANCEL_REASONS.includes(value)) {
        fields[key] = `deve ser um de: ${CANCEL_REASONS.join(", ")}`;
      } else {
        values[key] = value;
      }
      continue;
    }
    if (key === "cancel_reason_detail") {
      if (value.length > 500) fields[key] = "máximo de 500 caracteres";
      else values[key] = value.length === 0 ? null : value;
      continue;
    }
  }

  if (
    values.cancel_reason === "other" &&
    (values.cancel_reason_detail === null || values.cancel_reason_detail === undefined)
  ) {
    fields.cancel_reason_detail = "obrigatório quando cancel_reason = other";
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, values };
}

const MEMBER_STATUS = EDITABLE_SCHEMA.members.find((f) => f.field === "subscription_status")!
  .values!;

export type ValidationResult =
  | { ok: true; values: Record<string, string | null> }
  | { ok: false; fields: Record<string, string> };

export function validateMemberPatch(body: Record<string, unknown>): ValidationResult {
  const fields: Record<string, string> = {};
  const values: Record<string, string | null> = {};
  const allowed = new Set(EDITABLE_SCHEMA.members.map((f) => f.field));

  for (const [key, rawValue] of Object.entries(body)) {
    if (!allowed.has(key)) {
      fields[key] = "campo desconhecido ou não editável";
      continue;
    }
    if (rawValue === null) {
      if (key === "email") {
        fields[key] = "email não pode ser nulo";
        continue;
      }
      values[key] = null;
      continue;
    }
    if (typeof rawValue !== "string") {
      fields[key] = "deve ser string";
      continue;
    }
    const value = rawValue.trim();

    if (key === "name") {
      if (value.length === 0) fields[key] = "não pode ser vazio";
      else if (value.length > 200) fields[key] = "máximo de 200 caracteres";
      else values[key] = value;
      continue;
    }
    if (key === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) fields[key] = "email inválido";
      else values[key] = value.toLowerCase();
      continue;
    }
    if (key === "phone") {
      const info = normalizePhone(value);
      if (!info.valid || !info.e164) {
        fields[key] = "telefone inválido: use E.164 (+55DDNNNNNNNNN)";
      } else {
        values[key] = info.e164;
      }
      continue;
    }
    if (key === "subscription_status") {
      if (!MEMBER_STATUS.includes(value)) {
        fields[key] = `deve ser um de: ${MEMBER_STATUS.join(", ")}`;
      } else {
        values[key] = value;
      }
      continue;
    }
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, values };
}

export function invalidFieldsResponse(fields: Record<string, string>): Response {
  return jsonResponse(
    { error: "Campos inválidos no corpo da requisição", fields },
    400,
  );
}

export function conflictResponse(field: string, conflictId: string): Response {
  return jsonResponse(
    {
      error: `${field} já pertence a outro registro`,
      fields: { [field]: "duplicado" },
      conflict: { resource: "members", id: conflictId },
    },
    409,
  );
}

/** Ator externo: header `x-actor: centralizador:<email>`. */
export function parseActor(req: Request): string {
  const raw = (req.headers.get("x-actor") ?? "").trim();
  if (!raw) return "centralizador:unknown";
  return raw.slice(0, 200);
}

/** Compara o updated_at atual com o If-Unmodified-Since (tolerância de 1s). */
export function isStale(currentUpdatedAt: string | null, header: string | null): boolean {
  if (!header) return false;
  const since = new Date(header).getTime();
  if (Number.isNaN(since)) return false;
  if (!currentUpdatedAt) return false;
  return new Date(currentUpdatedAt).getTime() - since > 1000;
}

export function preconditionFailed(currentUpdatedAt: string | null): Response {
  return jsonResponse(
    {
      error: {
        code: "precondition_failed",
        message: "Registro alterado após o If-Unmodified-Since informado",
      },
      current_updated_at: currentUpdatedAt,
    },
    412,
  );
}

export function forbiddenWrite(): Response {
  return errorResponse(
    "forbidden",
    "Esta x-api-key é somente leitura; use a chave com permissão de escrita",
    403,
  );
}
