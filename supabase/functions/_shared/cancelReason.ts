// Registro do MOTIVO de cancelamento — enriquecimento, nunca caminho crítico.
//
// Regra de ouro: esta função NUNCA lança. A escrita de status/cancelled_at da
// assinatura acontece antes e de forma independente; se o motivo falhar, só
// aparece um console.error e o webhook segue seu curso normal (200).

export type CancelReason =
  | "payment_deleted"
  | "payment_overdue"
  | "refund_requested"
  | "refund_after_window"
  | "chargeback"
  | "plan_downgrade"
  | "customer_request"
  | "duplicate_account"
  | "account_deleted"
  | "other";

export type CancelSource =
  | "asaas_webhook"
  | "stripe_webhook"
  | "admin"
  | "member"
  | "system";

const REFUND_WINDOW_DAYS = 7;

/**
 * Decide entre reembolso dentro ou fora da janela de 7 dias.
 * Sem data de início confiável, cai em `refund_after_window` só se a data for
 * antiga; na dúvida (sem data) devolve null para não inventar motivo.
 */
export function classifyRefund(
  subscriptionStartDate: string | null | undefined,
  refundedAt: Date = new Date(),
): CancelReason | null {
  if (!subscriptionStartDate) return null;
  const start = new Date(subscriptionStartDate).getTime();
  if (Number.isNaN(start)) return null;
  const diffDays = (refundedAt.getTime() - start) / 86_400_000;
  return diffDays <= REFUND_WINDOW_DAYS ? "refund_requested" : "refund_after_window";
}

/**
 * Grava o motivo do cancelamento no perfil (fonte real do status) e, quando
 * existir linha correspondente, também na tabela `subscriptions`.
 * Toda a execução é isolada: erros são apenas logados.
 */
export async function recordCancelReason(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  params: {
    userId: string | null | undefined;
    reason: CancelReason | null;
    source: CancelSource;
    detail?: string | null;
  },
): Promise<void> {
  try {
    const { userId, reason, source } = params;
    if (!userId || !reason) return;
    const detail = params.detail ?? null;
    const patch = {
      cancel_reason: reason,
      cancel_reason_detail: reason === "other" ? (detail ?? "não informado") : detail,
      cancel_source: source,
    };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(patch)
      .eq("user_id", userId);
    if (profileError) {
      console.error("[CANCEL_REASON] falha ao gravar no profile:", profileError.message);
    }

    const { error: subError } = await supabaseAdmin
      .from("subscriptions")
      .update(patch)
      .eq("user_id", userId)
      .neq("status", "active");
    if (subError) {
      console.error("[CANCEL_REASON] falha ao gravar em subscriptions:", subError.message);
    }
  } catch (error) {
    console.error("[CANCEL_REASON] erro ignorado (enriquecimento):", String(error));
  }
}
