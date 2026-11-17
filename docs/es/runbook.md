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
