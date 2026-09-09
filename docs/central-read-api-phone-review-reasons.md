# central-read-api — `review_reasons` do telefone

Cada membro retornado pela API traz um objeto `phone`:

```json
{
  "raw": "(22) 99225-1123",
  "e164": "+5522992251123",
  "valid": true,
  "needs_review": false,
  "review_reasons": [],
  "shared_with_user_ids": []
}
```

Quando `needs_review = true`, `review_reasons` explica o motivo. Valores possíveis:

| Reason | Quando ocorre | `e164` |
| --- | --- | --- |
| `missing` | Nenhum telefone cadastrado (nem em `profiles_private.phone`, nem em `user_onboarding.whatsapp`), ou o valor não contém nenhum dígito. **Adicionado durante a implementação**, fora do plano original, para diferenciar "sem telefone" de "telefone inválido". | `null` |
| `placeholder` | O número é exatamente `99999999999`, valor usado historicamente em cadastros manuais. Nunca é promovido a E.164. | `null` |
| `unexpected_length` | Tem dígitos, mas não é 11 dígitos (DDD + 9 dígitos) nem 13 dígitos começando com `55`. Inclui números de 10 dígitos (sem o 9º dígito), que **não** são normalizados de propósito, para não criar dois E.164 diferentes para o mesmo número físico. | `null` |
| `shared_phone` | O mesmo E.164 válido aparece em mais de um `user_id`. A API não escolhe um "dono": todos os IDs do grupo vêm em `shared_with_user_ids`, e todos os membros do grupo são marcados para revisão. | preenchido |

Notas:

- `missing`, `placeholder` e `unexpected_length` são mutuamente exclusivos (avaliados em ordem).
- `shared_phone` só aparece em números já válidos, portanto pode coexistir com `valid: true`.
- Filtro `?phone=valid|needs_review|all` (default `valid`) usa exatamente `needs_review`.
- O endpoint `/phones` agrupa por E.164 e agrega os `review_reasons` de todos os membros do grupo.

## Escopo

A API cobre apenas usuários vivos (linhas de `profiles` com conta existente). Linhas órfãs de `user_onboarding`, de contas já excluídas, não são retornadas — limpeza/auditoria de dado órfão é tarefa separada, fora desta fase.

## `phone_key` (adicionado em 11/08/2026)

Cada objeto `phone` também traz `phone_key: string | null`, mesma régua da função
`public.phone_key()` do CRM MAP Educação:

1. só dígitos;
2. 12+ dígitos começando com `55` → remove o prefixo;
3. 10+ dígitos restantes → 2 primeiros (DDD) + últimos 8;
4. caso contrário → `null`.

Exemplo: `+55 (22) 99862-3552` → `2298623552`.

Exceção: quando o número é o placeholder `99999999999`, `phone_key` vem `null`
de propósito, para não gerar casamento falso com o CRM.

## Ordenação de `/members`

`?sort=updated_at|created_at|name` e `?order=asc|desc`. Valores inválidos caem no
padrão (`created_at desc`). O desempate é sempre `user_id` ascendente, então
paginar com `sort=updated_at&order=asc` não pula nem repete registros.

## GET /deletions (sinal de remoção de membro)

- Fonte: tabela `public.member_deletions`, gravada pela edge function `delete-account` no momento da exclusão da conta (hard delete no `auth.users`).
- Campos: `user_id`, `email` (minúsculo), `name`, `reason` (`self_service` para exclusão feita pelo próprio membro), `deleted_at` (ISO 8601).
- Filtro incremental: `?since=<iso8601>` (também aceita `updated_since`), aplicado no banco sobre `deleted_at`.
- Ordenação: `deleted_at desc`, desempate por `user_id asc`. Paginação igual aos outros endpoints.
- Histórico: só contempla exclusões ocorridas a partir da criação da tabela — remoções anteriores não existem no log.

## Atribuição de origem (`attribution`)

`/members` e `/subscriptions` sempre trazem um objeto `attribution` (campos `null`
quando não há dado):

`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`,
`fbclid`, `referrer`, `landing_page`, `source_type`, `origin`, `first_touch_at`,
`last_touch_at`.

Origem dos dados: tabela `public.member_attribution` (1 linha por `user_id`).
A captura é feita no frontend em qualquer acesso público (`captureAttribution()`
em `src/main.tsx`): grava first-touch e last-touch em `localStorage` a partir da
query string (`utm_*`, `gclid`, `fbclid`) + `document.referrer` + URL de entrada.
No primeiro acesso autenticado (`useAttributionSync`) a linha é criada; o
`first_touch_at` nunca é sobrescrito e o `last_touch_at` é atualizado.

Classificação (`source_type` / `origin`):

| Sinal | source_type | origin |
| --- | --- | --- |
| `fbclid` ou utm_source facebook/instagram/meta | `ad` (ou `social` sem sinal pago) | `Meta ADS` |
| `gclid` ou google + mídia paga | `ad` | `Google ADS` |
| utm_source tiktok | `ad`/`social` | `TikTok` |
| utm_source + mídia paga | `ad` | valor do utm_source |
| só referrer externo | `referral` | domínio do referrer |
| nada | `direct` | `Direto` |

Limitações conhecidas: o cadastro nasce fora da plataforma (link de pagamento
Asaas/Stripe), então a atribuição só existe para quem passou por uma página
pública da Acelera no mesmo navegador antes do primeiro login. Membros anteriores
ao deploy vêm com `attribution` toda `null`. A origem da assinatura em
`/subscriptions` é a mesma do cadastro (não há UTM próprio de checkout hoje).

`member_attribution.updated_at` participa do `updated_since` de `/members`:
correções retroativas de atribuição reaparecem no sync incremental, e o
`updated_at` do membro é o máximo entre perfil e atribuição.
