---
name: Sensitive Column Hiding via Definer Views
description: 3 *_public views are SECURITY DEFINER on purpose to hide sensitive cols
type: constraint
---
Views `mentoring_sessions_public`, `mentors_public`, `vendedores_public` são intencionalmente SECURITY DEFINER (security_invoker=off). Elas omitem colunas sensíveis (`mentor_email`, `cohost_email`, `email`, `pix_chave`) das tabelas-base, que NÃO têm policy SELECT para `authenticated`. Membros leem só via view; admins leem direto via policy "Admins can manage". Não converter para security_invoker sem antes implementar RPCs admin-scoped — quebra o frontend de membros. Linter "Security Definer View" para essas 3 views é falso-positivo aceito.
