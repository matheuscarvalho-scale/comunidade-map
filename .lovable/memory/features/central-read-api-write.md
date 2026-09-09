---
name: Central Read API Write
description: Escrita na central-read-api (PATCH /members), chave de escrita separada, schema/editable, updated_by e concorrência
type: feature
---

A `central-read-api` também escreve, mantendo o contrato de leitura intacto:

- Duas chaves: `CENTRAL_READ_API_KEY` (só GET) e `CENTRAL_WRITE_API_KEY` (GET + PATCH).
  PATCH com a chave de leitura → 403; chave inválida → 401; outros métodos → 405.
- `GET /schema/editable` publica os campos editáveis por recurso. Aqui só existe `members`
  (`name`, `email`, `phone` em E.164, `subscription_status`); `leads`/`contacts` são do CRM.
- `PATCH /members/{user_id}`: corpo parcial, corpo vazio = no-op 200, campo desconhecido/valor
  inválido = 400 com `fields`, colisão de email/telefone = 409 com o id conflitante,
  `If-Unmodified-Since` desatualizado = 412. Resposta = registro completo igual ao GET.
- Idempotente: valores iguais aos atuais são descartados e `updated_at` não se move.
- `profiles.updated_by` (texto) guarda o ator (`x-actor: centralizador:<email>`) e também é
  exposto no GET de `/members`. Cada PATCH efetivo gera `audit_logs` com
  `action = 'central_api_member_patch'`.
- Email é alterado via `auth.admin.updateUserById`; telefone via `profiles_private`.

Documentação: `docs/central-read-api-write.md`.
