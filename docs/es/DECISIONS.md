# Registro de decisiones — Robot Fan Club

Cada decisión lleva número, fecha, contexto, decisión y consecuencias. No se borran: si una cambia, se agrega una nueva que la reemplaza. Versión en inglés: [`../en/DECISIONS.md`](../en/DECISIONS.md) (mantener ambas sincronizadas).

Estado: ✅ tomada · ⏳ pendiente

---

## D-001 — Nombre y marca ✅ (2026-11-17)
- **Contexto:** el repo usaba "Citable" como nombre provisorio (spec, decisión abierta 5).
- **Decisión:** el producto se llama **Robot Fan Club**. Tagline: **"Make the robots your biggest fans."** Reemplaza a "Citable".
- **Consecuencias:** actualizar CLAUDE.md, spec y schema. Carpeta del repo: `rfc`.

## D-002 — Idioma de documentación y código ✅ (2026-11-17)
- **Decisión:** documentación bilingüe (`docs/es/` y `docs/en/`, siempre sincronizadas). Todo el código (identificadores, comentarios, mensajes de commit) en inglés. Todo el texto visible del producto en inglés. Conversación con Claude en español.
- **Consecuencias:** cada documento nuevo se escribe en ambos idiomas. Es más trabajo: se usan agentes de modelo económico para la traducción.

## D-003 — Repo local primero ✅ (2026-11-17)
- **Decisión:** `git init` local. El remoto de GitHub y el deploy en Netlify se hacen más adelante.
- **Consecuencias:** la Fase 0 ya no exige deploy de preview para darse por cerrada; ese criterio pasa a una fase posterior, cuando exista el remoto.

## D-004 — Posicionamiento: cualquier agencia o negocio ✅ (2026-11-17)
- **Contexto:** CLAUDE.md y spec hablaban de B2B SaaS y grupos dentales.
- **Decisión:** el producto no se enfoca en un nicho: sirve a cualquier agencia o negocio que quiera ser citado por la IA y medir su velocidad.
- **Consecuencias:** el copy no debe mencionar verticales. Sigue vigente que los clientes son de EE. UU. por las condiciones de medición (D-006). Medición por ciudad/sede queda fuera del MVP (decisión abierta 3 de la spec, asumida por el usuario: "supongo que sí").

## D-005 — Qué cuenta como cita en el SLA ✅ (2026-11-17)
- **Decisión:** una query cuenta como cita si fue citada en **AI Overview o AI Mode** (cualquiera de las dos). El portal muestra ambas superficies por separado.
- **Consecuencias:** la vista `sla_citations` agrupa por query y ventana, sin distinguir superficie. El conteo no cambia.

## D-006 — Condiciones de medición fijas ✅ (heredada de la spec)
- **Decisión:** EE. UU. (`location_code` 2840), inglés, `device: mobile`, misma hora cada día. Cambiarlas requiere aviso previo: rompe la comparabilidad de la serie.

## D-007 — Autenticación ✅ (2026-11-17)
- **Decisión:** Supabase Auth con magic link, sin registro público (el staff invita). Clerk queda descartado por ahora.

## D-008 — Estrategia de agentes ✅ (2026-11-17)
- **Contexto:** se quiere control y menor consumo de cuota.
- **Decisión:** la sesión principal decide y construye lo delicado y secuencial (Fases 0–1, esquema, RLS, cálculo del SLA). Subagentes solo para trabajo independiente en paralelo (portal y watcher tras la Fase 1), revisiones de solo lectura al cerrar cada fase (RLS, fidelidad a la spec) y traducción/borradores de docs con un modelo más económico. No se usan workflows masivos.
- **Consecuencias:** los subagentes no reducen el total de tokens, solo aíslan contexto. Los documentos son la memoria persistente entre sesiones.

## D-009 — Reglas de negocio del SLA que se documentan explícitamente ✅ (propuestas, a validar)
- Off-top10 se mide **por URL normalizada**, no por dominio, contra el orgánico de esa misma query ese mismo día.
- Una query cuenta como off-top10 si **alguno** de sus chequeos citados lo fue (`bool_or`).
- `citation_rate` debe calcularse sobre la ventana activa de 60 días (corrección al schema inicial).

## D-010 — Correcciones al diseño inicial a incorporar en la migración ✅ (2026-11-17)
Hallazgos del análisis, a resolver en la primera migración (aún no hay nada migrado):
1. Chequeos idempotentes: restricción única por cliente, query, superficie y día.
2. Tablas faltantes: historial de CrUX, Tag Bouncer, Citation Cards enviadas, Mini-Scan y su tope semanal, límites de ingest.
3. Políticas del bucket privado `snapshots` por `client_id` (primer segmento de la ruta).
4. Rate limit del ingest persistido en Postgres (la memoria no sirve en serverless).
5. Endpoint de ingest con CORS y OPTIONS (el snippet corre en dominios de terceros).
6. Watcher: agregar dry-run, guardar `cost_usd` y un reintento por query.

## D-011 — DataForSEO: cuenta propia o de la agencia ⏳
- Pendiente. No bloquea hasta la Fase 3. Hasta entonces, solo fixtures y dry-run.

## D-012 — Base técnica de la Fase 0 ✅ (2026-11-17)
- Next.js 16.4.6 + React 19.3 + Vitest 4, sin Tailwind (estilos con tokens del prototipo en Fase 2). `npm audit` solo marca dependencias de desarrollo; no se fuerza el fix.

## D-013 — Remoto de GitHub configurado ✅ (2026-11-17)
- **Decisión:** el repo se publica en https://github.com/Claudioefe/robotfanclub.git (rama `main`). Se integró el commit inicial del remoto (solo un README) con merge de historias no relacionadas. Reemplaza la parte "repo local" de D-003.
- **Consecuencias:** el deploy de preview en Netlify queda habilitado; se hace cuando se indique.

## D-014 — Capa de inteligencia (IA) ⏳ (idea registrada 2026-11-17)
- **Idea:** que el producto sea "inteligente": conectar un modelo (Claude o GPT) para ayudar a medir, trackear y mejorar (por ejemplo, explicar por qué se perdió una cita o sugerir mejoras de INP).
- **Pendiente de definir:** proveedor (Claude o GPT), qué datos puede ver el modelo (datos de clientes: privacidad), tope de costo, y fase en que entra. Se trata después del MVP; el esquema de datos debe dejar espacio para guardar los análisis.

## D-015 — Configuración de Supabase y permisos explícitos ✅ (2026-11-17)
- **Decisión:** el proyecto `robotfanclub-dev` (East US) tiene Data API activada, "automatically expose new tables" **desactivado** y "automatic RLS" **activado**. Por eso la migración escribe cada `grant` a mano: `authenticated` solo lee; `anon` no tiene nada; `service_role` tiene acceso completo.
- **Consecuencias:** la columna `clients.slack_webhook_url` no es legible para usuarios (el portal debe listar columnas explícitas, nunca `select *` sobre `clients`). Toda tabla o vista nueva necesita su `grant` en su migración.

## D-016 — Modelo de acceso ✅ (2026-11-17)
- **Decisión:** solo hay lectura por RLS (staff o miembro del cliente). Toda escritura la hacen jobs y endpoints con la secret key. Sin registro público: el magic link usa `shouldCreateUser: false` y la respuesta del formulario es idéntica para cualquier email (no revela quién tiene cuenta). El staff da acceso con `npm run grant-access`.
- **Consecuencias:** el ingest, el watcher y el Mini-Scan son rutas de servidor. `mini_scans` e `ingest_rate_limits` no tienen políticas: solo el servidor las toca.

## D-017 — Migraciones: las aplica el usuario ✅ (2026-11-17)
- **Decisión:** la Supabase CLI 3.x pide confirmación humana para aplicar migraciones al proyecto remoto (`supabase db push --remote`). Claude prepara y valida (`--dry-run`); el usuario ejecuta el push en su terminal.

## D-018 — Endurecimiento tras la auditoría de la Fase 1 ✅ (2026-11-17)
Segunda migración `20261117150000_hardening.sql` (la inicial no se edita):
1. `organic_checked`: si el top 10 orgánico no estuvo disponible, `off_top10` no se infiere de un `organic_rank` nulo.
2. `aio_checks` es evidencia **append-only**: no se actualiza. El watcher debe usar `insert ... on conflict do nothing` (un reintento el mismo día nunca borra una cita).
3. No se permiten ventanas solapadas para el mismo cliente y query (duplicarían el conteo).
4. Columnas solo para staff: `aio_checks.cost_usd` y `citation_cards.slack_error` no son legibles por usuarios; el portal lista columnas explícitas.
5. Permisos por defecto para `service_role` en tablas futuras; el bucket `snapshots` se fuerza privado y la política de rutas no puede fallar con entradas raras.
6. El link del magic link usa `NEXT_PUBLIC_SITE_URL`, no el header `Origin`.
- **Config obligatoria en Supabase:** Authentication > Sign In / Providers: apagar "Allow new users to sign up" (y los inicios de sesión anónimos). Un test lo verifica.
- **Riesgos aceptados:** (a) con registro cerrado, Supabase responde distinto a un email inexistente si alguien llama a la API directo (no se puede ocultar); (b) los JSON crudos en Storage pueden incluir el `cost` de DataForSEO y los clientes los leen; (c) las listas congeladas se protegen en la app (escrituras solo del servidor), no hay bloqueo de INSERT/DELETE en la base.
- **Pendientes de decisión:** fecha de deploy del sprint para el SLA de INP (Fase 5).

## D-019 — Off-top10 se juzga por la primera cita ✅ (2026-11-17)
- **Decisión:** una cita cuenta como off-top10 si su **primer** chequeo citado lo fue. Reemplaza el `bool_or` de D-009: una caída posterior fuera del top 10 ya no la convierte en off-top10. La vista `sla_citations` expone `first_off_top10` (antes `any_off_top10`). Migración `20261117170000_first_citation_off_top10.sql`.

## D-020 — Sin Cache Components ni Partial Prefetching ✅ (2026-11-17)
- **Contexto:** el esqueleto de `create-next-app` activó `cacheComponents` y `partialPrefetching`; `/portal` fallaba con "unstable value Date.now() while prerendering".
- **Decisión:** se quitan ambos (CLAUDE.md: sin features opcionales/experimentales). Las páginas que leen la sesión son dinámicas por defecto. Next.js indica que ambas pasarán a ser estándar en la próxima versión mayor; se reevalúa entonces.
