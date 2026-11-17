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
