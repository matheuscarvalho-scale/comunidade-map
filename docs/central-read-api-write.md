# central-read-api — Escrita (PATCH parcial)

Base: `https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/central-read-api`

## 1. Chaves e permissões

| Chave | Header | Permissão |
|---|---|---|
| `CENTRAL_READ_API_KEY` (a atual, inalterada) | `x-api-key` | somente leitura (`GET`) |
| `CENTRAL_WRITE_API_KEY` (nova) | `x-api-key` | leitura **e** escrita (`GET` + `PATCH`) |

- Chave inválida/ausente → `401`.
- `PATCH` com a chave só-leitura → `403 { "error": { "code": "forbidden", ... } }`.
- Métodos além de `GET`/`PATCH`/`OPTIONS` → `405`.

## 2. Descoberta de campos editáveis

`GET /schema/editable`

```json
{
  "members": [
    { "field": "name", "type": "string", "required": false, "max_length": 200 },
    { "field": "email", "type": "email", "required": false },
    { "field": "phone", "type": "phone", "required": false, "format": "E.164" },
    { "field": "subscription_status", "type": "enum", "required": false,
      "values": ["active", "pending", "expired", "refunded", "canceled"] }
  ],
  "data": { "members": [ ... ] },
  "meta": { "generated_at": "...", "resources": ["members"] }
}
```

Os recursos `leads` e `contacts` **não** pertencem a esta API (Comunidade) — eles são
editados pela API do CRM. Aqui o único recurso escrevível é `members`.

## 3. `PATCH /members/{user_id}`

```http
PATCH /functions/v1/central-read-api/members/<user_id>
x-api-key: <CENTRAL_WRITE_API_KEY>
x-actor: centralizador:pietro@mapeducacao.com
If-Unmodified-Since: 2026-08-17T20:10:00.000Z
Content-Type: application/json

{ "name": "Nome Novo", "phone": "+5511987654321" }
```

Regras:

- Só os campos presentes no corpo são alterados; campo ausente não é tocado.
- Corpo vazio (`{}` ou sem corpo) → `200` no-op com o registro atual e `meta.changed: []`.
- Campo desconhecido/não editável ou valor inválido → `400`
  `{ "error": "...", "fields": { "campo": "motivo" } }`.
- Telefone: aceita E.164 (`+55DD9XXXXXXXX`); é devolvido no mesmo objeto `phone { raw, e164, ... }`
  que o `GET` já usa.
- Colisão de e-mail ou telefone com outro membro → `409`
  `{ "error": "...", "conflict": { "resource": "members", "id": "<user_id conflitante>" } }`.
- `If-Unmodified-Since` (opcional): se o `updated_at` atual for mais novo que o informado
  (tolerância de 1s) → `412` com `current_updated_at`, sem sobrescrever.
- Resposta `200` devolve o **registro completo**, idêntico ao `GET /members/{id}`
  (`{ data, meta }`), incluindo `updated_at` e `updated_by`.
- Idempotência: reenviar o mesmo `PATCH` não altera nada (valores iguais são descartados) e
  `updated_at` não se move.

## 4. Rastro de alteração

- Header `x-actor: centralizador:<email>` é gravado em `profiles.updated_by` e em
  `audit_logs` (`action = 'central_api_member_patch'`, com `changed` e `values`).
- `GET /members` e `GET /members/{id}` agora incluem **`updated_by`** (texto: ator da última
  alteração — ex. `centralizador:pietro@...`, `system`, ou `null` para registros antigos).
  Use-o para distinguir a própria escrita do Centralizador de uma alteração feita pela equipe MAP.

O contrato de leitura não mudou: nenhum campo existente foi renomeado ou removido.
