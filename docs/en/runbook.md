# Runbook — run the project locally

## Requirements
Node 20+ (tested with 25.6) and npm.

## Commands
```bash
npm install          # install dependencies
npm run dev          # app at http://localhost:3000
npm test             # Vitest
npm run lint         # ESLint
npm run typecheck    # TypeScript (generates route types first)
npm run build        # production build
```

## Environment variables
Copy `.env.example` to `.env.local` (never commit it). Nothing needs filling in until Phase 1. Empty `DFS_LOGIN` and `DFS_PASSWORD` mean dry-run with fixtures: DataForSEO is not called without explicit authorization.

## Notes
- `npm audit` reports vulnerabilities only in dev dependencies (the ESLint chain); `npm audit --omit=dev` shows 0. `audit fix --force` was not run to avoid breaking versions.
- Remote: `origin` = https://github.com/Claudioefe/robotfanclub.git (D-013). Netlify deploy pending.

## Database and access (Phase 1)
```bash
supabase db push --remote --dry-run   # see which migrations are missing
supabase db push --remote             # apply them (you run this in your terminal, D-017)
npm run seed:demo                     # demo client Northwind Security (40 queries, 13 citations); safe to repeat
npm run grant-access -- --email you@example.com --role staff
npm run grant-access -- --email client@example.com --role client --client <client uuid>
```
In Supabase, *Authentication > URL Configuration*: Site URL `http://localhost:3000` and Redirect URL `http://localhost:3000/auth/callback`.

`npm test` includes the RLS tests: they create temporary clients and users (prefix `rls-test`) in the development project and delete them at the end. Without keys in `.env.local` they skip themselves.
