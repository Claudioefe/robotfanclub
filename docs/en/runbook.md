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

## Portal (Phase 2)
`npm run seed:demo` rebuilds the demo client (deletes and reloads only its data). Then `npm run dev`, sign in at `/login` and open `/portal`. `NEXT_PUBLIC_SITE_URL` sets the magic-link redirect and the snippet endpoint.

## Seeing the real DataForSEO data in the portal
The real responses captured on 2026-11-18 are in `tests/fixtures/real/` (unresolved SERP, SERP with `resolve_goto_urls`, and a trimmed AI Mode). To see them in the portal under Bauman Rare Books: `npm run load-real-sample` (it makes no DataForSEO call and is repeatable), then in `/portal` open Bauman > **AI citations**. The **Evidence** column opens the raw JSON of each surface (AI Overview and AI Mode), also when the client was not cited.

- `npm run load-real-mentions`: loads the real LLM Mentions responses under Bauman (Phase 8, no DataForSEO call). `npm run ai-visibility:dry-run`: runs the job on the saved responses.
