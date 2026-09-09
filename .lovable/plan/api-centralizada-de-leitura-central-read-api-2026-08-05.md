# API centralizada de leitura (`central-read-api`)

Edge function read-only, server-to-server, autenticada por API key, paginação e envelope `data` + `meta` — mesmo formato do `crm-api`.

## Resposta à pergunta 3 (API key)

- **`CENTRAL_MEMBERS_TOKEN` é de saída, não de entrada.** Ele é o Bearer que *este* projeto envia para o `CENTRAL_MEMBERS_ENDPOINT` do Centralizador (usado em `asaas-webhook` no push de novo membro e em `backfill-central-members`). Reaproveitar como chave de entrada misturaria credencial de cliente com credencial de servidor.
- **`CENTRAL_BACKFILL_TOKEN` é de escopo admin/disparo**: libera a execução do backfill em massa, que faz escrita externa. Não deve virar chave de leitura.
- **Conclusão: chave nova dedicada**, `CENTRAL_READ_API_KEY`, gerada aleatoriamente e válida só para esta API de leitura. Header: `x-api-key` (mesmo padrão de `sync-partner-clicks`).

## Normalização de telefone

Helper único na função (sem função no banco, sem `phone_key`). Nada de "adivinhar" 9º dígito: só o formato uniforme que os dados realmente têm hoje é aceito como confiável.

```text
digits = só dígitos
digits == "99999999999"                  -> placeholder      (needs_review)
length == 11                             -> "+55" + digits   (válido)
length == 13 e começa com "55"           -> "+" + digits     (válido)
qualquer outro caso (10, 12, 14+, vazio) -> needs_review, e164 = null
```

Um telefone de 10 dígitos **não** é promovido a E.164 — sem o 9º dígito não há como saber qual número físico é, e inventar um `+55` de 12 caracteres criaria justamente o duplicado 10/11 que você descreveu. Ele sai marcado, não normalizado.

Cada registro de contato retorna:

```json
"phone": {
  "raw": "(11) 91234-5678",
  "e164": "+5511912345678",
  "valid": true,
  "needs_review": false,
  "review_reasons": [],
  "shared_with_user_ids": []
}
```

- `review_reasons` possíveis: `"placeholder"`, `"unexpected_length"`, `"shared_phone"`. Todos recebem o mesmo tratamento: `needs_review: true`, e `e164: null` nos dois primeiros casos.
- Query param `?phone=valid` (default) retorna só telefones confiáveis e não compartilhados; `?phone=all` inclui tudo com as flags; `?phone=needs_review` devolve só os que precisam de revisão manual.
- Telefone com mais de um usuário: `shared_with_user_ids` lista **todos** os `user_id` daquele E.164 (inclusive o próprio) e entra em `needs_review` com `"shared_phone"`. Nenhum "dono" é escolhido. O endpoint `/phones` devolve o agrupamento completo.


## Endpoints (GET, todos read-only)

Base: `/functions/v1/central-read-api/<recurso>`

| Endpoint | Retorna | Filtros |
|---|---|---|
| `/members` | membro consolidado: `user_id`, `name`, `email`, `phone{}`, `plan`, `role`, `subscription_status`, datas de início/fim, `created_at`, `onboarding_completed` | `updated_since`, `status`, `plan`, `include_internal` (default false), `phone` |
| `/members/:user_id` | um membro, mesmo shape | — |
| `/onboarding` | respostas de negócio não sensíveis: `user_id`, `company`, `cnpj`, `job_title`, `industry`/`niche`, faixa de faturamento, nº de funcionários, `location_state`/`city`, `completed_at` | `updated_since`, `has_cnpj` |
| `/subscriptions` | `user_id`, `plan`, `status`, `start_date`, `end_date`, `provider`, `updated_at` | `status`, `updated_since` |
| `/engagement` | agregado por membro: sessões, tempo total, último acesso, aulas concluídas, check-ins de mentoria/webinar | `since`, `updated_since` |
| `/phones` | agrupamento por E.164: `e164`, `user_ids[]`, `count`, `placeholder` — para a revisão manual de duplicados | `only_duplicates=true`, `phone` |

Não expostos: URLs de vídeo, IDs de pagamento (Stripe/Asaas), respostas sensíveis do onboarding, senha/tokens.

## Contrato comum

Auth: `x-api-key: <CENTRAL_READ_API_KEY>` — sem ela, 401. `403` nunca é usado.

Paginação por página (igual crm-api):

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "per_page": 100,
    "total": 348,
    "total_pages": 4,
    "has_more": true,
    "generated_at": "2026-08-05T15:10:00Z"
  }
}
```

- `?page=` (1-based), `?per_page=` (default 100, máx 500).
- `?updated_since=<ISO>` em todos os recursos de lista, para sync incremental.
- Erros: `{ "error": { "code": "...", "message": "..." } }` com 400 (parâmetro inválido), 401 (key), 404 (recurso), 405 (método ≠ GET), 500.
- Timestamps sempre UTC ISO-8601.
- Equipe interna (`src/lib/internalMembers.ts` + roles de staff) excluída por default, reaproveitando a lista já existente em `backfill-central-members`.
- Match de email sempre `LOWER()`.

## Detalhes técnicos

- Nova função `supabase/functions/central-read-api/index.ts`, roteamento por path.
- **JWT desabilitado**, igual ao `crm-api`/`deals-api`: `verify_jwt = false` explícito em `supabase/config.toml` para esta função. A única autenticação é o header `x-api-key` validado no código — nenhuma chamada precisa de JWT de sessão nem de `Authorization`. (Nesse projeto o default de deploy já é `false`, mas vou deixar o bloco explícito para não depender do default.)
- Service role apenas server-side; telefone lido de `profiles_private.phone` com fallback `user_onboarding.whatsapp`.
- Helpers em `supabase/functions/central-read-api/lib.ts`: `normalizePhone`, `paginate`, `requireApiKey`, `internalFilter`.
- Sem migração de banco: nada de coluna nova nem função `phone_key`. A normalização vive na API.
- `CENTRAL_READ_API_KEY` criada como secret gerado (valor aleatório); eu te passo como configurá-la no Centralizador depois de implementada.
