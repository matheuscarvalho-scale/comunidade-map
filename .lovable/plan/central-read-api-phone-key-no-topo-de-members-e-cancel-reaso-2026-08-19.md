# central-read-api: phone_key no topo de /members e cancel_reason real

## 1. phone_key em /members (crítico)

Estado atual verificado no código: a régua do CRM (`public.phone_key()`) já está
implementada em `supabase/functions/central-read-api/lib.ts` (`phoneKey()`) e o valor já
sai no payload, mas **aninhado** dentro do objeto `phone` (`phone.phone_key`). O
Centralizador está lendo o membro no nível raiz, por isso o cruzamento continua caindo
em E.164.

Ajuste:

- Adicionar `phone_key` também no **nível raiz** de cada membro em `/members` e
  `/members/{user_id}` (mesmo valor de `phone.phone_key`, sem duplicar lógica).
- Manter `phone.phone_key` como está — nada do contrato atual muda.
- Aceitar `?phone_key=<valor>` como filtro em `/members`, para o Centralizador
  resolver um casamento pontual sem varrer páginas.
- Expor `phone_key` também no agrupamento de `/phones` (hoje agrupa por E.164),
  para números sem E.164 válido (10 dígitos, por exemplo) ainda terem chave de
  cruzamento.
- Atualizar `docs/central-read-api-phone-review-reasons.md` com o campo raiz e o filtro.

Regra inalterada: placeholder `99999999999` continua com `phone_key: null`.

## 2. cancel_reason real em /subscriptions (alto)

Hoje `cancel_reason` é literal `null` no código, porque a tabela `public.subscriptions`
não tem a coluna (colunas atuais confirmadas: `status`, `cancelled_at`, sem motivo).
Para virar dado real é preciso coletar na origem:

### Banco (migração)

Em `public.subscriptions`:
- `cancel_reason text` — código controlado.
- `cancel_reason_detail text` — texto livre opcional (observação do CX/membro).
- `cancel_source text` — quem gerou (`asaas_webhook`, `stripe_webhook`, `admin`, `member`, `system`).
- Trigger de validação (não CHECK) restringindo `cancel_reason` ao vocabulário.

Vocabulário proposto:

```text
payment_deleted        cobrança/assinatura removida no gateway
payment_overdue        inadimplência (expiração automática)
refund_requested       reembolso dentro dos 7 dias
refund_after_window    reembolso/estorno após a janela
chargeback             contestação no cartão
plan_downgrade         troca/upgrade que encerrou a assinatura anterior
customer_request       pedido explícito do membro (CX)
duplicate_account      conta duplicada
account_deleted        exclusão de conta pelo próprio membro
other                  outro (exige cancel_reason_detail)
```

### Origem dos cancelamentos

- `asaas-webhook`: gravar o motivo junto de cada transição que hoje só grava
  `cancelled_at`/status — `PAYMENT_DELETED` → `payment_deleted`, refund dentro de 7 dias →
  `refund_requested`, após 7 dias → `refund_after_window`, chargeback → `chargeback`,
  inadimplência/expiração → `payment_overdue`, encerramento por upgrade → `plan_downgrade`.
- `stripe-webhook`: `canceled` → `payment_deleted`, `unpaid` → `payment_overdue`.
- `delete-account`: `account_deleted`.
- Admin (`src/pages/AdminAssinaturas.tsx`): ao marcar uma assinatura como
  `expired`/`refunded`, abrir um select com o vocabulário + campo de observação, gravando
  com `cancel_source = 'admin'` e o e-mail do admin em `updated_by`.

### Fail-safe nos webhooks (condição obrigatória)

O motivo é enriquecimento, nunca caminho crítico:

- A escrita de status/`cancelled_at` continua exatamente como é hoje, na mesma
  posição e ordem do código, sem depender do cálculo do motivo.
- O motivo é gravado **depois**, em uma escrita separada, dentro de um
  `try/catch` que só faz `console.error` em caso de falha — sem `throw`, sem
  alterar o retorno do webhook (segue 200), sem bloquear os demais passos.
- O cálculo do motivo (mapeamento de evento, janela de 7 dias, lookups) também
  fica dentro do `try/catch`: valor indeterminado → `cancel_reason` fica `null`
  em vez de erro.
- Nenhum `await` novo entra antes da atualização de status, para não atrasar o
  caminho principal.

### Testes antes de produção

- `asaas-webhook`: eventos de sandbox `PAYMENT_DELETED`, `PAYMENT_REFUNDED`
  (dentro e fora dos 7 dias), `PAYMENT_OVERDUE` e `PAYMENT_CHARGEBACK`,
  verificando que status/`cancelled_at` continuam corretos e que o motivo casa.
- `stripe-webhook`: `customer.subscription.deleted`, `customer.subscription.updated`
  com `unpaid`, `charge.refunded` em modo teste.
- Um caso de falha forçada na gravação do motivo, para provar que o status ainda
  é escrito e o webhook responde 200.
- Só depois de os dois passarem eu subo o restante.

Sem backfill inventado: assinaturas já canceladas ficam com `cancel_reason = null`
(o Centralizador continua tratando null como "não informado"). Opcionalmente, um
backfill determinístico marca como `payment_overdue` só os casos que a própria
`payment_events` comprova — isso fica para uma segunda etapa, se você quiser.


### API

- `/subscriptions` passa a devolver `cancel_reason`, `cancel_reason_detail`,
  `cancel_source` (valores reais, não hardcoded).
- Filtro novo `?cancel_reason=<codigo>` para recortar churn por motivo.
- `GET /schema/editable` ganha `subscriptions.cancel_reason` e
  `subscriptions.cancel_reason_detail` como editáveis, e `PATCH /subscriptions/{id}`
  passa a aceitar esses dois campos (mesma chave de escrita, mesmo `x-actor`,
  mesma auditoria em `audit_logs`).
- Documentar em `docs/central-read-api-write.md` e num bloco novo em
  `docs/central-read-api-analytics.md` (churn qualificado).

## Ordem de execução

1. Migração (colunas + trigger de validação).
2. `central-read-api`: `phone_key` raiz, filtros, leitura real de `cancel_reason`, PATCH.
3. Webhooks e `delete-account` gravando motivo.
4. Select de motivo no admin de assinaturas.
5. Docs + memória do projeto.
