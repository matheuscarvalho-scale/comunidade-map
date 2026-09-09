# Comunidade MAP Acelera

Plataforma de membros da Comunidade MAP Acelera — ecossistema de empreendedores de e-commerce, com formações, mentorias, comunidade e networking.

- **App em produção**: https://acelera.mapeducacao.com
- **Frontend**: React + Vite + TypeScript + shadcn/ui, hospedado na Vercel.
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions).

## Desenvolvimento local

Requer Node.js.

```sh
npm i
npm run dev
```

Copie `.env` com as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do projeto Supabase (Project Settings → API).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (saída em `dist/`)
- `npm run lint` — lint
- `npm run test` — testes (Vitest)

## Backend Supabase

Migrations e Edge Functions ficam em `supabase/`. Com a [Supabase CLI](https://supabase.com/docs/guides/cli) instalada e o projeto linkado (`supabase link --project-ref <ref>`):

```sh
supabase db push          # aplica migrations pendentes
supabase functions deploy # publica as edge functions
```
