// Códigos de motivo de cancelamento — mesmos valores aceitos pela API central.
export const CANCEL_REASON_OPTIONS = [
  { value: "customer_request", label: "Pedido do cliente" },
  { value: "payment_overdue", label: "Inadimplência" },
  { value: "payment_deleted", label: "Pagamento removido no gateway" },
  { value: "refund_requested", label: "Reembolso (dentro de 7 dias)" },
  { value: "refund_after_window", label: "Reembolso (fora da janela)" },
  { value: "chargeback", label: "Chargeback" },
  { value: "plan_downgrade", label: "Downgrade de plano" },
  { value: "duplicate_account", label: "Conta duplicada" },
  { value: "account_deleted", label: "Conta excluída" },
  { value: "other", label: "Outro" },
] as const;

export const CANCEL_REASON_LABELS: Record<string, string> = Object.fromEntries(
  CANCEL_REASON_OPTIONS.map((o) => [o.value, o.label]),
);
