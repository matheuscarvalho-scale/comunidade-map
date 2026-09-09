---
name: Conta Azul Customer Mapping
description: Customer reuse across recurring monthly Asaas payments via conta_azul_customer_mapping table
type: feature
---
Para evitar duplicar clientes na Conta Azul em assinaturas mensais recorrentes:

- Tabela `public.conta_azul_customer_mapping` guarda o vínculo `email/document/asaas_customer_id → conta_azul_customer_id`.
- Edge function `conta-azul-integration` resolve cliente nessa ordem:
  1. `mapping` (lookup por asaas_customer_id → document → email)
  2. `document` (Conta Azul `/v1/pessoas?cpf=` ou `?cnpj=`)
  3. `email` (Conta Azul `/v1/pessoas?emails=`)
  4. `created` (cria pessoa nova)
- Após resolver, sempre `upsert` no mapping (on conflict email).
- `verifyCustomerCanBeUsedInSale` valida `ativo=true` e perfil `Cliente` antes de usar id.
- `asaas-webhook` passa `customer.asaas_customer_id` no payload para a integração.
- `webhook_logs` e `dry_run` expõem `customer_source` (`mapping|document|email|created`), `conta_azul_customer_id`, `reused_existing_customer` e `mapping_matched_by`.
- Número da venda continua sequencial (`next_conta_azul_sale_number` RPC) — não tem relação com cliente.
