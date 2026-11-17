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
