# Runbook — levantar el proyecto en local

## Requisitos
Node 20+ (probado con 25.6) y npm.

## Comandos
```bash
npm install          # instalar dependencias
npm run dev          # app en http://localhost:3000
npm test             # Vitest
npm run lint         # ESLint
npm run typecheck    # TypeScript (genera tipos de rutas primero)
npm run build        # build de producción
```

## Variables de entorno
Copiar `.env.example` a `.env.local` (nunca commitear). Hasta la Fase 1 no hace falta completar nada. `DFS_LOGIN` y `DFS_PASSWORD` vacíos significan dry-run con fixtures: no se llama a DataForSEO sin autorización explícita.

## Notas
- `npm audit` reporta vulnerabilidades solo en dependencias de desarrollo (cadena de ESLint); `npm audit --omit=dev` da 0. No se corrió `audit fix --force` para no romper versiones.
- Remoto: `origin` = https://github.com/Claudioefe/robotfanclub.git (D-013). Deploy en Netlify pendiente.

## Base de datos y acceso (Fase 1)
```bash
supabase db push --remote --dry-run   # ver qué migraciones faltan
supabase db push --remote             # aplicarlas (lo corrés vos en tu terminal, D-017)
npm run seed:demo                     # cliente demo Northwind Security (40 queries, 13 citas); se puede repetir
npm run grant-access -- --email vos@ejemplo.com --role staff
npm run grant-access -- --email cliente@ejemplo.com --role client --client <uuid del cliente>
```
En Supabase, *Authentication > URL Configuration*: Site URL `http://localhost:3000` y Redirect URL `http://localhost:3000/auth/callback`.

`npm test` incluye los tests de RLS: crean clientes y usuarios temporales (prefijo `rls-test`) en el proyecto de desarrollo y los borran al terminar. Sin keys en `.env.local` se omiten solos.

## Portal (Fase 2)
`npm run seed:demo` reconstruye el cliente demo (borra y vuelve a cargar solo sus datos). Luego `npm run dev`, entrar en `/login` y abrir `/portal`. `NEXT_PUBLIC_SITE_URL` define el redirect del magic link y el endpoint del snippet.

## Ver los datos reales de DataForSEO en el portal
Las respuestas reales capturadas el 2026-11-18 están en `tests/fixtures/real/` (SERP sin resolver, SERP con `resolve_goto_urls`, y AI Mode recortada). Para verlas en el portal bajo Bauman Rare Books: `npm run load-real-sample` (no llama a DataForSEO, es repetible), y en `/portal` entrar a Bauman > **AI citations**. La columna **Evidence** abre el JSON crudo de cada superficie (AI Overview y AI Mode), también cuando el cliente no fue citado.
