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
- **Actualización 2026-11-19 (D-044):** una forma más rápida y barata de tener el asesor es exponer los datos por un MCP y que Claude asesore a pedido, sin integrar un modelo dentro del producto. La demostración manual con Bauman está en [`advisor-demo-bauman.md`](advisor-demo-bauman.md).

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

## D-021 — Tailwind CSS ✅ (2026-11-17)
- **Decisión:** el portal usa Tailwind CSS 4. Reemplaza el "sin Tailwind" de D-012. Los colores del prototipo son variables CSS (claro y oscuro según el sistema) mapeadas a utilidades de Tailwind (`bg-surface`, `text-muted`, `border-line`, `text-cite`…).
- **Alcance:** la fidelidad visual al prototipo es secundaria (el diseño se rehará después); la lógica, los cálculos y el copy sí se mantienen.

## D-022 — Decisiones de la Fase 2 (portal) ✅ (2026-11-17)
1. **Tag Bouncer:** la acción guardada la fija el staff (en base de datos; se edita en la Fase 7). El cliente ve un simulador "¿y si…?" que recalcula la estimación pero no guarda nada.
2. **INP de cabecera:** p75 móvil de todos los eventos reales de los últimos 28 días. Las ventanas de CrUX son un panel aparte (es lo que juzga el SLA) y se cuentan desde el día siguiente al deploy.
3. **Datos nuevos (migración `20261118100000_portal_speed.sql`):** `clients.inp_sprint_deployed_on` e `inp_baseline_ms`; `tag_bouncer_scripts.label` e `is_required`; vistas `inp_p75_overall`, `inp_p75_daily`, `citation_first_checks` y `latest_checks`. Las dos últimas evitan el tope de 1000 filas por consulta de PostgREST.
4. **Fuera de la Fase 2:** la vista Mini-Scan del prototipo (Fase 7) y las secciones "Database tables" y "Not built yet" de Setup. Setup solo muestra el snippet (con `web-vitals` 6.2.3 fijado).
5. **Rutas:** `/portal` (lista o redirige), `/portal/[clientId]` (Overview), `/citations`, `/speed`, `/setup`, y `/snapshot` (enlace firmado a la evidencia).
6. **Rank orgánico:** solo se guarda para queries citadas; en las no citadas la tabla muestra "—". Los textos dicen "top 10", no "top 50", porque medimos con profundidad 10.
7. **Demo:** el seed ahora reconstruye los chequeos del cliente demo (incluye AI Mode, snapshots de ejemplo, ~2.600 eventos de INP calibrados a ≈214 ms y 6 scripts). Es append-only para el resto de clientes; solo el demo se reinicia.

## D-023 — Tipos de cliente: real, demo y sandbox ✅ (2026-11-17)
- **Problema:** los fixtures son una sola respuesta sintética; aplicarla a clientes reales escribiría evidencia falsa del SLA (que es append-only y bloquea el chequeo real de ese día), y a Northwind le cambiaría las 13 citas.
- **Decisión:** `clients.kind`: `real` (solo el modo live), `demo` (Northwind; ningún job lo toca) y `sandbox` ("Fixture Sandbox", el único cliente donde escribe el dry-run). El live se niega a procesar `demo` y `sandbox`; el dry-run, `real`.

## D-024 — Diseño del watcher ✅ (2026-11-17)
- Hora fija **14:00 UTC** (9:00 de Nueva York en invierno) y día UTC; no se cambia sin avisar (D-006).
- **Idempotente:** un chequeo por query, superficie y día. Una segunda corrida el mismo día no vuelve a llamar a la API (ahorra plata) ni sobrescribe nada: `insert … do nothing` y snapshots sin `upsert`. Si falta una sola superficie, se completa solo esa.
- Un reintento por llamada, con espera. Las fallas parciales se registran y se sigue: si falla AI Mode pero el SERP salió bien, se guarda el AI Overview; si falla el SERP, se guarda AI Mode con `organic_checked = false` (no se adivina el rank orgánico). La corrida solo "falla" (exit 1) si no funcionó nada.
- Se guarda `cost_usd` por chequeo y una fila por corrida en `watcher_runs` (modo, chequeos escritos, errores, costo). El JSON crudo se guarda siempre, también cuando no hay respuesta de IA (es evidencia de la ausencia).

## D-025 — El modo live está bloqueado por defecto ✅ (2026-11-17)
- Para llamar a DataForSEO hacen falta tres cosas a la vez: `--mode live`, `WATCHER_ALLOW_LIVE=yes` (en GitHub, la variable de repositorio `WATCHER_LIVE_ENABLED`) y `DFS_LOGIN`/`DFS_PASSWORD`. Sin la variable, ni con credenciales se ejecuta. Los tests usan solo fixtures y un `fetch` simulado.
- Las corridas programadas son dry-run hasta que el dueño habilite el live (D-011 sigue pendiente: cuenta y presupuesto).

## D-026 — TypeScript nativo en los jobs ✅ (2026-11-17)
- Node 24 (Actions) y 25 (local) ejecutan `.ts` sin dependencias: los jobs importan con extensión `.ts` y solo usan sintaxis borrable (`erasableSyntaxOnly`). No se instala `tsx`. `package.json` declara `"type": "module"`.

## D-027 — Endurecimiento del watcher tras la auditoría de la Fase 3 ✅ (2026-11-17)
Código más la migración `20261119120000_watcher_hardening.sql`:
1. **Rutas de snapshot únicas:** `{cliente}/{día}/{superficie}/{slug}-{hash de la query}-{hora}.json`. Antes, dos queries con el mismo slug (mayúsculas, signos, no-ASCII, truncado a 80) compartían archivo y la evidencia quedaba equivocada sin error. Un snapshot que ya existe ahora es un error, no se ignora.
2. **Un top 10 vacío es "desconocido":** un SERP sin resultados orgánicos pone `organic_checked = false`; no convierte toda cita en off-top10. Una respuesta 20000 sin `result` es una **falla**, no "sin respuesta de IA".
3. **D-019 refinado:** `first_off_top10` se juzga con la primera cita cuyo top 10 orgánico era conocido (`organic_checked`). Un chequeo sin top 10 no decide.
4. **Reintentos solo para errores transitorios** (red, timeout, 429, 5xx). Un error de autenticación o fondos (HTTP 401/402/403 o código 40100–40299) **detiene toda la corrida**. Hay timeout de 120 s por llamada y un **tope de costo por corrida** (`WATCHER_MAX_COST_USD`, por defecto USD 5).
5. **`clients.kind` sin valor por defecto:** hay que elegirlo al crear el cliente (antes, olvidarlo equivalía a `real` y se cobraba en live).
6. **Hora fija reforzada:** el live se niega fuera de 14:00–16:59 UTC salvo `WATCHER_ALLOW_OFF_HOUR=yes`. Las credenciales de DataForSEO solo llegan al paso live del workflow. Un live con fallas termina en rojo (GitHub avisa por email).
7. Una falla en un cliente no corta a los demás, y la corrida siempre queda cerrada en `watcher_runs`. `existing()` pagina (tope de 1000 filas de PostgREST).
8. El parser reconoce al cliente por el dominio **o** por el host de la URL.
- **Verificado en la documentación pública de DataForSEO (sin llamar a la API):** AI Mode devuelve el mismo `ai_overview` / `ai_overview_reference` que el SERP, anidado en elementos, tablas y componentes expandidos.
- **Reglas de negocio documentadas:** si se citan varias páginas del cliente, define la cita la primera por posición de fuente; la URL se normaliza sin query (`?utm=…` no cambia la página).
- **Riesgos aceptados:** (a) con la secret key todavía se puede borrar evidencia (el trigger solo bloquea `UPDATE`); mitigación: backups, y a evaluar en la Fase 7; (b) las acciones de GitHub se fijan por tag, no por SHA; (c) GitHub desactiva los cron tras 60 días sin actividad en el repo: hace falta un latido o revisar; (d) el costo de una llamada fallida pero cobrada no se conoce y no entra en `cost_usd`.

## D-028 — Endpoint de ingest de velocidad (Fase 4) ✅ (2026-11-18)
- `POST /api/ingest/vitals`: público a propósito (el snippet corre en el sitio del cliente). Acepta `text/plain` (sendBeacon) y JSON, que son el mismo JSON. Responde `204` (guardado, o descartado en silencio si el cliente no existe), `400` (payload inválido), `403` (origen ajeno), `413` (cuerpo grande), `429` (rate limit) y `503` (base no disponible, sin detalles).
- **Validación acotada:** métrica INP/LCP/CLS, valor con tope por métrica, URL como plantilla de ruta (sin query ni hash, para no guardar datos personales), atribución reducida a una lista de claves escalares con textos de hasta 200 caracteres.
- **Origen:** si el navegador envía `Origin`, debe ser el dominio del cliente o un subdominio (www incluido). Sin `Origin` (curl, servidores) se acepta y lo cubre el rate limit. Para desarrollo, `INGEST_EXTRA_ORIGINS`.
- **Rate limit persistido en Postgres:** 120 eventos por minuto por visitante y 6000 por cliente. La IP se guarda solo como HMAC con la secret key, nunca en claro.
- **Snippet:** muestreo por sesión (`SAMPLE_RATE`, `NEXT_PUBLIC_SNIPPET_SAMPLE_RATE`) para acotar volumen y costo. Un test ejecuta el código real del snippet contra el parser del endpoint, para que no se desincronicen.
- Los clientes se registran con `npm run create-client` (`--kind` obligatorio) hasta que exista el admin (Fase 7).

## D-029 — Prueba con un sitio real vía ngrok ✅ (2026-11-18)
- **Sitio de prueba:** `efedigital.com.ar` (Astro en Netlify, sitio personal, fuera de la agencia), registrado como cliente "EFE Digital" con `kind = demo` (ningún job lo toca). No tiene CSP, no hay que tocar encabezados.
- **Cómo:** la app corre en local en modo producción y ngrok (plan gratuito) la expone con su dominio fijo; el snippet apunta a ese dominio. Evita crear un proyecto en la cuenta de Netlify del sitio, cuyos créditos son del equipo (un exceso pausa todos los proyectos).
- **Más adelante:** el deploy real del portal irá en una cuenta de Netlify aparte.
- **Límites del plan gratuito de ngrok** (según su documentación): ≈20.000 requests y 1 GB por mes. Se acota con el muestreo.

## D-030 — Dirección del snippet separada de la del portal ✅ (2026-11-18)
- **Problema:** usar `NEXT_PUBLIC_SITE_URL` para apuntar el snippet al túnel de ngrok cambió también la redirección del enlace mágico del login, que no está en las URLs permitidas de Supabase, y el login dejó de funcionar.
- **Decisión:** `NEXT_PUBLIC_INGEST_URL` define a dónde envía eventos el snippet (túnel o portal desplegado; si falta, usa `NEXT_PUBLIC_SITE_URL`). `NEXT_PUBLIC_SITE_URL` queda solo para el login.
- **Primera prueba real (2026-11-18):** llegaron un LCP de 884 ms y un CLS ≈ 0 desde un móvil, con atribución, a través del túnel y desde el dominio real. Sin INP hasta que hay una interacción.

## D-031 — Job de CrUX (Fase 5) ✅ (2026-11-18)
- **Fuente:** Chrome UX Report API de Google (`queryRecord` para la ventana vigente de 28 días y `queryHistoryRecord` para el historial semanal de hasta 40 períodos). Solo `PHONE` y solo INP. Gratuita (150 consultas por minuto por proyecto, según la documentación oficial); requiere una API key restringida a esa API.
- **Qué se consulta:** la tabla `crux_targets` lista explícitamente origen y URLs clave por cliente. CrUX distingue `https://www.x.com` de `https://x.com`, así que no se deduce del dominio.
- **Idempotente:** una fila por objetivo y período (`period_end`); un período ya guardado no se toca. Un 404 de Google es **"sin datos"** (poco tráfico), no un error. Un error de clave o API deshabilitada (400/401/403) detiene la corrida; 429, 5xx y también 403 se reintentan una vez (tras cambiar las restricciones de una key, Google puede responder 403 unos minutos: se vio en la práctica). La key va en la URL (formato de Google) y nunca se escribe en mensajes ni logs.
- **Modos:** dry-run usa fixtures y solo clientes `sandbox`; live usa la API y clientes `real` y `demo` (los datos son públicos y gratuitos), nunca `sandbox`. Un live con fallas termina en rojo.
- **Cadencia:** 06:00 UTC; Google actualiza ~04:00 UTC y publica con ~2 días de atraso. El historial es **semanal** y cada punto es una ventana de 28 días que se solapa con las vecinas: sirve para la tendencia y la línea base (`--backfill` una vez al dar de alta un cliente), no para alinear las ventanas del SLA.
- **Ventanas del SLA:** el valor de una ventana (que arranca el día siguiente al deploy) es la lectura diaria cuyo `period_end` coincide con el fin de la ventana. Esa lectura existe si el job corrió ese día (dos días después del cierre): por eso el workflow debe correr todos los días y falla en rojo. Si faltara, la vista dice que Google publica el valor unos dos días después del cierre.
- **Alcance geográfico:** la API de CrUX **no filtra por país**: son datos globales. "EE. UU." de las reglas aplica solo a las búsquedas en Google; la vista lo aclara.
- **Vista Speed:** gráfico del historial, lectura por URL, valor de cada ventana del SLA cuando existe y, para clientes sin snippet (como Bauman), el INP de CrUX como cifra principal, indicando que es de Google.
- **Cliente de prueba:** Bauman Rare Books (cliente de la agencia, sin snippet; solo dominio público, `kind = demo`).

## D-032 — Fase 6 (Slack) diferida; snippet temporal en el sitio de prueba ✅ (2026-11-18)
- **Slack:** las Citation Cards automáticas quedan **desactivadas por ahora**. No se construye el envío al webhook (`clients.slack_webhook_url` sigue existiendo, vacío, y no es legible por usuarios; `citation_cards` ya tiene sus columnas). El botón "Copy for Slack" del portal sigue funcionando: copia el texto para pegarlo a mano. Se retoma cuando se decida (hace falta un webhook de Slack del cliente).
- **Sitio de prueba:** `efedigital.com.ar` conserva temporalmente el snippet de velocidad apuntando al túnel de ngrok (`SAMPLE_RATE = 1`). El dueño lo quitará más adelante. Mientras tanto: sin la compu y ngrok prendidos los eventos se pierden, y cada visitante descarga `web-vitals` desde `unpkg.com`. Para quitarlo: borrar el bloque `<script is:inline type="module">` de `BaseLayout.astro`, hacer push y cerrar ngrok.

## D-033 — Primera consulta real a DataForSEO y un hallazgo sobre off-top10 ⏳ (2026-11-18)
- **Autorización puntual:** el dueño autorizó **una** consulta real (SERP orgánico con AI Overview + AI Mode) para obtener datos de ejemplo. Query: "how to tell if a book is a first edition", EE. UU., inglés, móvil, `depth` 10. La hizo Claude con la conexión de DataForSEO de la sesión, que apunta a una cuenta de prueba **propia** del dueño (crédito de USD 1). Costo real: SERP **USD 0,002** (el AI Overview asíncrono no sumó cargo aparte) + AI Mode **USD 0,004** = **USD 0,006** por query y día. Cualquier otra consulta real requiere autorización nueva. Las respuestas están en `tests/fixtures/real/` (la de AI Mode, recortada y marcada) con tests de canario.
- **Resultado:** el AI Overview citó 10 páginas únicas (26 menciones); AI Mode, solo AbeBooks. **Bauman no fue citado** (tampoco figura en el orgánico). El parser y la deduplicación por URL funcionan con datos reales, y AI Mode usa los mismos tipos que el SERP, como dice la documentación.
- **Hallazgo 1 (grave, sin resolver): en móvil los resultados orgánicos no traen la URL real.** Vienen como enlaces de redirección `google.com/goto?url=<token cifrado>` con `domain: "google.com"`. Solo `breadcrumb` da el sitio de origen (p. ej. `https://www.reddit.com`), no la página, y en algún caso ni eso. Con esto la regla **off-top10 por URL normalizada nunca encuentra coincidencia**: toda cita saldría "fuera del top 10" y el cumplimiento del 30% sería trivial y falso (favorece al proveedor). Hoy no hay daño porque el modo live nunca corrió.
- **Hallazgo 2: una referencia del AI Overview (1 de 10) también era una redirección** con `domain: "google.com"` y `source: "Quill & Brush"`. Si la página de un cliente viniera así, el parser no la vería y se **subcontarían citas**. El JSON crudo queda guardado como evidencia.
- **Actualización:** ver D-034 (existe `resolve_goto_urls`; regla de rank "desconocido" ya implementada).
- **Opciones para el hallazgo 1** (decisión del dueño; toca la regla "por URL, no por dominio" y la condición "móvil"):
  - **A.** Agregar una llamada orgánica en **escritorio** solo para obtener el top 10 con URLs reales; el AI Overview y AI Mode siguen en móvil. Costo +USD 0,002 por query y día (≈ +33%, USD 0,008 en total).
  - **B.** Seguir en móvil y comparar por **sitio** usando `breadcrumb`. Es más débil que "por URL" y falla cuando no hay breadcrumb.
  - **C.** Preguntar a DataForSEO si hay un parámetro que devuelva la URL real en móvil (gratis; no lo probé).
  - **Recomendación:** C primero; si no hay solución, A. Mientras tanto, el modo live del watcher sigue bloqueado.
- **Hallazgo 2, mitigación posible:** registrar cuántas referencias de cada chequeo son redirecciones sin atribuir, para mostrar incertidumbre en el portal. Pendiente de decidir.

## D-034 — Redirecciones `goto`: parámetro de DataForSEO y rank orgánico "desconocido" ✅ (2026-11-18)
Resultado de la opción C de D-033 (consulta a la documentación de DataForSEO; sin gasto):
- **Existe `resolve_goto_urls`** (booleano, por defecto `false`) en el SERP orgánico: resuelve las redirecciones a su URL real. Agrega hasta 40 s de espera (máximo 260 s); la documentación no declara un cargo extra. El watcher lo envía siempre en la llamada orgánica y su timeout sube a 280 s. **Todavía no verificado con una llamada real.**
- **Límite de Google:** según el [aviso de DataForSEO del 2 de nov](https://dataforseo.com/update/new-goto-url-limits-and-how-this-affects-your-results), Google limita cuántas redirecciones se resuelven por página; en modo *Live* se resuelve cerca del 50% y la **cola estándar** (`task_post`/`task_get`, más lenta) las resuelve todas. Para AI Overview, DataForSEO reportó (27 ago) que el 52% de los SERP tenía al menos una redirección sin resolver, y declaró un arreglo el 28 ago; para AI Mode no dice nada.
- **Regla nueva (en el parser, sin gasto):** si el top 10 trae redirecciones sin resolver y la página citada no aparece entre los resultados resueltos, el rank orgánico es **desconocido** (`organic_checked = false`), nunca "fuera del top 10". Si la página sí aparece, el rank es conocido. Con D-027, un chequeo con rank desconocido no decide el off-top10 (`first_off_top10` es `false` si ninguno fue conocido): **ante la duda no se favorece al proveedor**.
- **Referencias sin resolver del AI Overview:** el parser las cuenta (`unresolved_refs`, hoy no persistido; está en el JSON crudo), no las usa para `other_domains`, y las mantiene separadas (no se fusionan por URL). Una cita escondida detrás de una redirección sigue siendo invisible: riesgo de subcontar citas, aceptado y a vigilar.
- **Pendiente:** una llamada real con `resolve_goto_urls: true` (requiere autorización nueva) para medir cuántas se resuelven en Live; si son pocas, evaluar la cola estándar (≈ USD 0,0024 por query y día según la spec, con polling) o la opción A de D-033 (orgánico en escritorio).

## D-034 (actualización) — Verificado con una llamada real ✅ (2026-11-18)
Segunda consulta autorizada (misma query, `resolve_goto_urls: true`): **todas** las URLs vinieron resueltas, tanto los 8 resultados orgánicos como las referencias del AI Overview (la que antes era una redirección resultó ser `qbbooks.com`). Costo **USD 0,002**, **sin cargo extra** por el parámetro. Pero **tardó 82 s** (en la primera consulta sin el parámetro, ~13 s). Con una sola muestra no se puede afirmar que Live resuelva siempre todo: DataForSEO avisó que en Live resuelve ~50% bajo el límite de Google; el watcher ya maneja lo no resuelto como rank "desconocido". Fixture recortado en `tests/fixtures/real/dfs-organic-mobile-resolved-real.json`.
- **Concurrencia:** 40 queries a 82 s en secuencia son ~55 min por cliente y día. El orquestador ahora corre varias queries a la vez (`concurrency`; el CLI usa 4 en live, 1 en dry-run, y `WATCHER_CONCURRENCY` lo cambia). Con concurrencia, el tope de costo y el corte por error fatal pueden pasarse por las queries que ya estaban en vuelo. Los SERP cambian entre llamadas (la primera consulta tuvo Reddit en el puesto 1 y la segunda, Pinterest): por eso el top 10 se compara siempre contra el de la misma llamada.
- **Costo por query y día en live: USD 0,006** (SERP 0,002 + AI Mode 0,004), igual que antes.

## D-035 — La URL normalizada conserva los parámetros que identifican la página ✅ (2026-11-18)
- **Problema (descubierto con datos reales):** la normalización descartaba todo el query string. En YouTube `?v=<id>` identifica el video: el video citado y un video distinto que rankeaba orgánicamente quedaban como "la misma página". Pasa con cualquier sitio que identifique páginas con parámetros (`?p=123`).
- **Decisión:** `normUrl` conserva los parámetros, ordenados, y quita solo los de rastreo (`utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `dclid`, `mc_cid`, `mc_eid`, `igshid`, `_ga`, `_gl`), el hash y la barra final. Corrige lo dicho en D-027 ("sin query"). Las referencias redirigidas sin resolver se distinguen por su URL completa.

## D-036 — Sin proyección en la primera semana ✅ (2026-11-18)
- **Problema (visto con un cliente real, día 1):** con 0 citas el portal decía "Clawback risk: projected below 12", una alarma sin base (una proyección lineal con 1 día de datos es ruido).
- **Decisión:** durante los primeros 6 días de la ventana el portal no proyecta ni advierte de clawback: dice "Day N of 60: too early to project" y la regla se aplica desde el día 7 (`MIN_PROJECTION_DAYS`). Si el piso de 12 ya se cumplió, se informa eso. Es una regla de la interfaz; **el SLA no cambia**: el crédito se decide el día 60.

## D-037 — Admin de staff (Fase 7, pieza A) ✅ (2026-11-18)
- **Qué es:** `/admin`, solo para staff. Reemplaza los scripts de terminal: alta de clientes (con `kind` obligatorio), lista de queries congelada, objetivos de CrUX, fecha de deploy y línea base del sprint, scripts de Tag Bouncer (la edición que D-022 dejó para esta fase), acceso de usuarios y costos de API.
- **Seguridad en capas (verificado por HTTP real):** (1) el proxy manda a `/login` a quien no inició sesión; (2) el layout y **cada página** comprueban en la base que el usuario sea staff y redirigen a `/portal` si no (layouts y páginas se renderizan en paralelo, así que la página no puede depender solo del layout); (3) **cada acción de servidor llama primero a `assertStaff()`**, porque una acción es un POST público: reproducir con un usuario cliente las acciones de dar acceso, congelar y crear cliente fue rechazado sin cambiar la base (Next responde 500 ante el `Forbidden`, sin datos). Las acciones usan la secret key solo en el servidor, después del chequeo.
- **Lógica fuera de Next.js:** `src/lib/admin/validate.ts` (puro) y `ops.ts` (recibe un cliente de Supabase), probadas contra la base real. Toda entrada de un formulario pasa por una validación antes de llegar a la base.
- **Reglas del producto aplicadas:** máximo 60 queries por ventana (se cuentan después de quitar duplicados sin distinguir mayúsculas); ventana de 60 días; una lista congelada no se edita: congelar otra crea una **ventana nueva que empieza el día siguiente al fin de la que corre**, así nunca se solapan. Un script requerido (p. ej. el banner de consentimiento) no se puede quitar y queda fuera del SLA.
- **Decisiones por defecto:** dar acceso **crea la cuenta y la membresía sin enviar ningún email** (la persona entra por `/login` y pide su enlace; el registro sigue cerrado, D-016); el campo del webhook de Slack **no aparece** (D-032); **no hay borrado** de clientes ni de chequeos (la evidencia es append-only); sí se pueden quitar objetivos de CrUX (se conserva su historial), scripts de Tag Bouncer y accesos (se conserva la cuenta).
- **Costos:** vista nueva `cost_by_client_day` (migración `20261121100000_admin_costs.sql`), legible solo con la secret key porque `cost_usd` es una columna solo para staff.

## D-038 — Mini-Scan público, construido y apagado (Fase 7, piezas B y C) ✅ (2026-11-18)
- **Estado: apagado por defecto.** `MINI_SCAN_MODE` = `off` (por defecto; `/mini-scan` dice "Coming soon" y rechaza todo), `simulated` (resultados inventados, marcados como tales, solo para pruebas) o `live` (gasto real en DataForSEO). Cualquier valor distinto de `simulated` o `live` cuenta como `off`. Se eligió esta opción para no mostrar resultados simulados a prospectos reales.
- **Asíncrono:** una consulta real tarda ~80 s, así que el formulario solo **encola** el pedido y un proceso aparte lo ejecuta (`jobs/miniscan/`, workflow cada 10 min). El visitante recibe un **enlace privado e inadivinable** (`/mini-scan/<token>`, fuera de buscadores) con una página que se actualiza sola. Nada en la petición web llama a DataForSEO, así que un visitante nunca puede disparar gasto directamente.
- **Qué revisa:** solo el AI Overview (llamada orgánica, `resolve_goto_urls`): ¿Google responde con IA y cita el dominio? ≈ **USD 0,002 por query, USD 0,05 por escaneo de 25**. Resultado y texto copiable para outreach con hechos del escaneo, sin promesas.
- **Protecciones, en este orden:** interruptor de modo → captcha (solo live; Cloudflare Turnstile, **falla cerrado**: sin clave o sin token no pasa) → límites de entrada (dominio válido, 1 a 25 queries, honeypot) → **tope de 30 escaneos por semana en total** y **3 por visitante por día** (por IP con hash HMAC, nunca en claro). Los topes cuentan solo escaneos del mismo tipo que el modo actual (los de prueba no gastan el cupo real). Dos pedidos simultáneos pueden pasarse del tope por uno o dos: aceptado.
- **Simulados y reales no se mezclan** (`mini_scans.simulated`, igual que `clients.kind` en D-023): el worker en dry-run solo procesa simulados y el live solo reales. El live requiere su **propio** interruptor `MINISCAN_ALLOW_LIVE=yes` (la autorización de gasto del dueño), las credenciales y se bloquea ante errores de autenticación o fondos.
- **Lectura del modo en cada petición:** `/mini-scan` es dinámica (`force-dynamic`). Una primera versión se prerenderizó en el build y quedaba fija en el modo de ese momento; la prueba por HTTP real lo detectó (en modo simulado no aparecía el formulario). Cambiar el modo no requiere recompilar.
- **Datos del visitante:** no se pide email. Se guarda el dominio, las queries y el hash de la IP. La página de resultado no muestra ni el costo ni el hash.
- **Landing (`/`):** nombre, tagline, qué mide, cómo funciona y accesos a Mini-Scan y login. Sin verticales (D-004) y sin promesas: describe lo que el producto hace. Todo el texto en inglés.
- **Para abrirlo al público** (decisión del dueño, D-011 pendiente): crear una cuenta de Cloudflare Turnstile (`TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`), fijar `MINI_SCAN_MODE=live` en el servidor y, en GitHub, la variable `MINI_SCAN_MODE=live` con `MINISCAN_ALLOW_LIVE=yes` y los secrets de DataForSEO.

## D-039 — Investigación: medir otras IA con DataForSEO ⏳ (2026-11-18)
Resultado de leer la documentación y los precios públicos de la **AI Optimization API** de DataForSEO (sin llamadas ni gasto). Hoy medimos solo Google (AI Overview y AI Mode, D-005). DataForSEO ofrece cuatro familias para otras IA:

| Producto | Qué entrega | Plataformas | Precio (según su web) |
|---|---|---|---|
| **LLM Scraper** | La respuesta de ChatGPT/Gemini ante una búsqueda, con `sources` (lo que citó), `search_results` (todo lo que consultó), `brand_entities` y `fan_out_queries`. Es el equivalente de lo que hacemos con Google | ChatGPT y Gemini | Live **USD 0,004** (hasta 120 s) · prioridad **0,0024** (hasta 5 min) · estándar **0,0012** (hasta 45 min), por resultado |
| **LLM Mentions** | Una base ya recolectada ("280 M de prompts y respuestas reales" según su página) para consultar menciones y fuentes de un dominio o keyword, volumen de búsqueda en IA, top de dominios/páginas/marcas, histórico mensual y nuevas/perdidas | ChatGPT (solo EE. UU. e inglés) y Google AI Overview | **USD 0,1** por consulta + **0,001** por fila devuelta (solo Live, ~2 s) |
| **LLM Responses** | Llamar a los modelos por su API con tu prompt | ChatGPT, Claude, Gemini, Perplexity | Tarifa de DataForSEO (USD 0,0006 Live / 0,0002 estándar + 0,01 de adelanto) **más** el cobro del propio modelo |
| **AI Keyword Data** | Volumen de búsqueda estimado en herramientas de IA | — | USD 0,01 por consulta + 0,0001 por fila |

- **Qué se puede medir como medimos Google:** ChatGPT y Gemini, con el LLM Scraper (mismo flujo: query → fuentes → ¿aparece el dominio?). Costo de referencia: 40 queries por día ≈ USD 0,048 en cola estándar o USD 0,16 en Live, por plataforma.
- **Claude y Perplexity: no hay scraper.** Solo LLM Responses, que consulta el modelo por API: **no es lo que ve una persona en la aplicación**. No verificamos si esa API permite búsqueda web y citas.
- **Riesgos para un SLA:** las respuestas de los modelos varían entre llamadas y con la conversación, así que una serie diaria "igual cada día" es más difícil de garantizar; en el scraper de ChatGPT, `force_web_search` viene apagado por defecto y aun encendido no garantiza fuentes (hay que medir cuánto varía); la cobertura geográfica es más limitada (LLM Mentions de ChatGPT: solo EE. UU. e inglés); y no leímos las listas de ubicaciones del scraper.
- **Usos que no requieren SLA y parecen valiosos:** (1) **descubrir qué queries congelar** con AI Keyword Data y LLM Mentions; (2) un **Mini-Scan instantáneo**: LLM Mentions responde en ~2 s con menciones, competidores y páginas más citadas de un dominio, sin las ~80 s por query de Google (≈ USD 0,10 por escaneo); (3) **inteligencia competitiva** (quién es citado en lugar del cliente).
- **Sin verificar:** si ChatGPT y Gemini cuestan lo mismo en el scraper (la página muestra una sola tarifa); la frescura real de LLM Mentions (cada fila trae `first_response_at` y `last_response_at`); y qué parte de esa base cubre los dominios de nuestros clientes.
- **Propuesta (pendiente de decisión y autorización de gasto):** no ampliar el SLA todavía. Un experimento barato (≈ USD 0,25 de los USD 0,98 restantes): 5 llamadas del scraper de ChatGPT a la misma query (variabilidad y uso de fuentes), 3 de Gemini, y una consulta de LLM Mentions sobre el dominio de Bauman (cobertura). Con eso se decide si "otras IA" entra como módulo **informativo** (sin SLA) en el portal.

## D-039 (actualización) — Resultado del experimento con otras IA ✅ (2026-11-18)
Autorizado por el dueño. 9 llamadas reales, **USD 0,123 en total** (quedan ≈ USD 0,86): ChatGPT ×3 (USD 0,012), Gemini ×2 (0,008) y LLM Mentions ×1 (0,103). Misma query que con Google: "how to tell if a book is a first edition". Respuestas en `tests/fixtures/real/` (las largas, recortadas y marcadas) con tests de canario (`tests/dfs-ai-platforms.test.ts`).
- **ChatGPT sin `force_web_search` (por defecto): nada que medir.** `sources`, `search_results`, `brand_entities` y `fan_out_queries` vienen en `null`. Respondió desde su conocimiento (17,7 s).
- **ChatGPT con `force_web_search: true`: sí hay fuentes, y varían.** Una corrida citó **4** (ABAA, IOBA, AbeBooks, ILAB) y consultó 16 páginas; otra citó **2** (ILAB, ABAA). Trae `fan_out_queries`. Bauman no apareció. Tarda ~40 s. No es lo que ve una persona que no activa la búsqueda: es una medición con la búsqueda forzada.
- **Gemini: sin fuentes en las dos corridas**, aunque el endpoint documenta el campo. No tiene parámetro para forzar la búsqueda web, y las dos respuestas fueron distintas. Con lo probado, **no sirve para medir citas**.
- **LLM Mentions para Bauman: 1.665 respuestas de IA mencionan su dominio** (0,4 s, USD 0,103 pidiendo 3 filas). Cada una trae la pregunta, el volumen de búsqueda en IA, las fuentes y cuándo se registró. Ejemplos reales: "gifts for a book lover" (volumen 27.100), "gifts for booklovers" (22.200) y "stephen king books for sale" (9.900), todas de Google AI Overview. **Es una base, no una medición en vivo:** la fecha de la última respuesta registrada de esas filas va de 2025-12 a 2026-11, es decir, algunas tienen casi un año.
- **Conclusión:** (1) **medir ChatGPT como SLA no es viable todavía** (varía entre corridas y exige forzar la búsqueda) y **Gemini hoy no es medible**; (2) **LLM Mentions es la pieza más útil**, como inteligencia y captación, no como prueba: descubrir qué queries congelar y con qué volumen ya cita al cliente, y un Mini-Scan instantáneo (≈ USD 0,10 y 0,4 s, frente a ~80 s por query en Google); (3) Claude y Perplexity siguen sin una vía equivalente.
- **Pendiente de decisión del dueño:** si se construye un módulo **informativo** "AI visibility" (LLM Mentions + descubrimiento de queries) y si el Mini-Scan pasa a usar LLM Mentions. No se construye nada hasta decidirlo.

## D-039 (segunda actualización) — ChatGPT: ¿aparece el cliente? ✅ (2026-11-18)
Autorizado por el dueño, con la instrucción permanente de **guardar siempre cada respuesta cruda** para analizar cómo mostrarla. 6 llamadas reales, **≈ USD 0,127** (quedan ≈ USD 0,73). Fixtures completos y sin recortar en `tests/fixtures/real/` (`dfs-chatgpt-scraper-gifts-run1…5-real.json`, `dfs-llm-mentions-bauman-chatgpt-real.json`); canarios en `tests/dfs-ai-platforms.test.ts`.
- **ChatGPT, 5 corridas seguidas de "gifts for a book lover" con búsqueda forzada** (la query donde Google AI Overview sí cita a Bauman): **Bauman no apareció en ninguna (0 de 5)**, ni como fuente ni entre las 12 páginas consultadas. Cada corrida tardó ~22 s y costó USD 0,004.
- **Las fuentes cambian casi por completo entre corridas:** solo `nbcnews.com` y `wired.com` se repiten en 4 de 5; el resto (tiendas, Etsy, MoMA, Walmart, Nordstrom…) rota. Cada corrida hizo su propia consulta de apoyo (`fan_out_queries`) con palabras distintas. Una sola corrida no sirve de evidencia; haría falta una **tasa de aparición en N corridas**.
- **LLM Mentions en `chat_gpt` para Bauman: 122 respuestas** (contra 1.665 en Google). Las filas con más volumen son preguntas sobre libros raros ("what's the rarest dr. seuss book?", 1.405; "which nancy drew book is considered the rarest?", 283), **no** las de regalos. Cada fila trae fechas de primera y última respuesta (junio a octubre de 2026). Costó USD 0,103.
- **Lectura:** en Google Bauman gana por regalos; en ChatGPT, por libros raros. Son audiencias y temas distintos, y esto confirma que ChatGPT no se puede prometer con el mismo SLA. Sí sirve como **dato informativo con etiqueta de frescura** ("registrado en la base de DataForSEO hasta tal fecha") y, si se mide en vivo, como "citado en X de N corridas".
- **Pendiente de decisión del dueño (sin cambios):** módulo informativo "AI visibility" y uso de LLM Mentions en el Mini-Scan.

## D-040 — Módulo informativo "AI visibility" (Fase 8) ✅ (2026-11-18)
Aprobado por el dueño tras D-039. Detalle en [`ai-visibility.md`](ai-visibility.md).
- **Qué es:** una página del portal y un job semanal que leen DataForSEO LLM Mentions (Google AI Overview y ChatGPT) y muestran dónde las respuestas de IA ya mencionan al cliente. **Es informativo: no es el SLA ni cuenta para el crédito.** El SLA sigue siendo solo Google, con lista congelada y condiciones fijas.
- **Por qué así:** D-039 mostró que ChatGPT no se puede garantizar (0 de 5 corridas con Bauman en "gifts for a book lover"; fuentes que rotan) pero que LLM Mentions da inteligencia útil. El dato es una base de respuestas registradas, así que **cada cifra lleva su fecha de captura y las fechas de registro**, y la página lo dice.
- **Citado vs leído:** en ChatGPT el cliente aparece muchas veces como página *consultada* sin ser *citada* (23 de 40 filas de Bauman). Se guardan y se muestran como dos relaciones distintas (`cited` / `consulted`). Una fila donde el dominio solo aparece en el texto de la respuesta no se afirma (se omite).
- **Datos guardados:** el JSON crudo completo en `snapshots/{cliente}/ai-visibility/...` (evidencia) y por pregunta una fila sin el texto de la respuesta. Tablas `ai_mention_runs` y `ai_mentions` con RLS de solo lectura; el costo no se ve desde el navegador.
- **Costo y control:** USD 0,10 por llamada + 0,001 por fila; 2 llamadas (Google y ChatGPT) × 40 filas = **≈ USD 0,28 por cliente y corrida**, semanal ≈ USD 1,2 por cliente al mes. Live solo para clientes `real`, con `AI_VISIBILITY_ALLOW_LIVE=yes`, credenciales y tope `AI_VISIBILITY_MAX_COST_USD` (por defecto 2). Dry-run con las respuestas reales guardadas, solo clientes `sandbox`.
- **Ideas de queries en Admin:** preguntas que **Google** ya cita para el cliente, sin las congeladas, para copiar. No congela nada solo. Las de ChatGPT no se sugieren para el SLA.
- **Llamada real autorizada:** una por plataforma para Bauman (≈ USD 0,28; quedan ≈ USD 0,45). Resultado: Google 1.543 respuestas, ChatGPT 122; en ChatGPT, 17 citan y 23 solo leyeron una página. Fixtures completos `dfs-llm-mentions-bauman-{google,chatgpt}-40-real.json`.
- **Fuera de alcance (a decidir):** corridas de ChatGPT en vivo ("citado en X de N") y Mini-Scan con LLM Mentions.
- **Pendiente del dueño:** aplicar la migración `20261123100000_ai_visibility.sql`, y luego `npm run load-real-mentions` para ver los datos reales bajo Bauman.

## D-041 — Landing integrada desde el diseño (2026-11-19) ✅
El dueño entregó el diseño de la landing (carpeta "Landing page-html", un export de herramienta de diseño) y pidió integrarlo.
- **Qué:** `/` ahora es ese diseño, portado a Next.js: `src/app/page.tsx` (servidor, con metadata) y `src/components/landing/` (`Landing.tsx` cliente, `landing.css`, `fonts.ts`). El JSX se generó con un script desde el diseño (no se usó su runtime `support.js`/`react.js`) y la lógica interactiva se reescribió con hooks: modo disco, robots colgados, medidores 19 citas / 184 ms, abanico del CTA y robots que empujan el botón.
- **Aislamiento:** todos los estilos van bajo `.landing`; el portal y el admin no cambian. La landing es siempre oscura (como el diseño); el portal sigue claro/oscuro. Fuentes (Space Grotesk, Inter, JetBrains Mono) con `next/font`, sin pedir a Google en ejecución. Respeta `prefers-reduced-motion`.
- **Cambios sobre el diseño:** se agregó "Sign in" al menú (los clientes lo necesitan). El Mini-Scan sigue apagado: solo queda el texto "Mini-scan coming soon".
- **Copy y reglas:** los textos del diseño ya coinciden con las reglas del producto (piso 12 / objetivo 18 / bonus 25, 30% fuera del top 10, crédito del 20%, INP ≤ 200 ms en dos ventanas de 28 días, EE. UU. · inglés · mobile). `tests/landing.test.tsx` los fija.
- **Pendiente del dueño:** email de contacto. `CONTACT_EMAIL` en `src/lib/brand.ts` está vacío; mientras tanto "Start a fan club" lleva a la sección `#join`. Al definirlo, el botón pasa solo a `mailto:`.

## D-042 — El portal y el Admin adoptan el estilo de la landing (2026-11-19) ✅
- **Decisión del dueño:** el portal, el Admin, el login y el Mini-Scan usan la paleta y la tipografía de la landing, más sutil (sin robots ni animaciones). **Solo oscuro**, como la landing: se quitó el modo claro (antes seguía al sistema).
- **Cómo:** los tokens de color de `globals.css` pasan a la paleta de la landing (fondo `#0E0F13`, tarjetas `#171922`, lima como acento y "bueno", periwinkle para datos secundarios y links, rosa para alertas) y se agregan `--accent` y las fuentes (Space Grotesk para títulos, Inter, JetBrains Mono para etiquetas y cifras). Como todo usaba tokens, el cambio llega a todas las pantallas. La lógica y los datos no cambian.
- **Orden:** barra lateral con logo, cliente destacado y ítem activo en lima; el Resumen muestra la cifra principal con la regla y tres cifras clave (fuera del top 10, tasa de cita, INP) con el componente `Stat`; encabezados con etiqueta (`PageHeader eyebrow`); tablas con encabezados en mono y hover; Admin con barra superior con logo.
- **Arreglos que salieron al revisar:** las reglas base (`a`, títulos) pasan a `@layer base` para que las clases de utilidad puedan cambiar el color de los links; la marca "bonus" de la regla dibujaba una línea de más; en mobile la navegación forzaba un desborde horizontal.

## D-043 — Primera corrida real: piloto con Bauman (2026-11-19) ✅
Autorizada por el dueño. Cliente piloto "Bauman Rare Books (pilot)" (`kind = real`, mismo dominio que el Bauman demo, creado por script porque el Admin rechaza un segundo cliente con el mismo dominio). 15 queries congeladas del 2026-11-19 al 2027-01-17, elegidas con Search Console (solo lectura) y el módulo AI visibility.
- **Corrida:** watcher live, EE. UU., inglés, mobile. 15 queries OK, 30 chequeos (AI Overview + AI Mode), **USD 0,094** (tope USD 0,30). El primer intento dio 401 (la contraseña cargada no era la de API) y no gastó nada.
- **Resultado del día 1:** 11 de 15 queries citadas (en AI Overview, AI Mode o ambos), **las 11 fuera del top 10**; tasa de cita 13 de 27 chequeos con respuesta de IA (48%). Sin cita: "most valuable stephen king books", "how to sell rare books", "where to sell first edition books", "gifts for a book lover". Las 15 tuvieron respuesta de IA en al menos una superficie; 3 no tuvieron AI Overview ("rare books for sale", "rare book dealers", "where to sell first edition books") pero sí AI Mode.
- **Verificado a mano:** en "books worth money" Search Console promedia posición 3,6 en el mundo, pero la SERP de EE. UU. en mobile no trae a Bauman entre los orgánicos: la cita fuera del top 10 es real, no un error del parser. En "rare books for sale" la home de Bauman es el orgánico nº 3 y AI Mode cita otra página: cuenta como fuera del top 10 por la regla de comparar por URL, no por dominio.
- **Lo que esto enseña:** (1) Bauman llegó a 11 de las 12 citas del piso en un día: para un sitio fuerte el piso de 12 es fácil, así que los umbrales del SLA conviene calibrarlos por cliente. (2) La base de LLM Mentions es una foto: "gifts for a book lover" figuraba como citada y hoy no lo está. (3) Search Console mide el mundo, no EE. UU./mobile: sirve para elegir queries, no para predecir resultados.
- **Evidencia:** los 30 JSON crudos están en Storage y copiados en `tests/fixtures/real/watcher-bauman-pilot-2026-11-19/`; `tests/watcher/pilot-data.test.ts` fija estos hechos.
- **Pendiente de decisión del dueño:** seguir o no con corridas diarias del piloto (≈ USD 0,094 por día; quedan ≈ USD 0,35), y si la regla de comparar por URL (no por dominio) para "fuera del top 10" es la que se quiere cuando el sitio ya rankea con otra página.

## D-044 — MCP para conectar los datos a Claude y a otras herramientas ⏳ (decidido 2026-11-19, sin construir)
- **Idea del dueño:** un servidor MCP para que otras plataformas (por ejemplo Opsie, la herramienta interna de Dinkum) y Claude puedan leer estos datos y analizarlos. **Lo usaría cualquiera que tenga acceso y quiera.** El producto también se quiere vender a otras agencias (D-004), así que no se diseña solo para Dinkum.
- **Qué se puede conectar:** cualquier herramienta que sea cliente MCP (Claude Desktop/Code/claude.ai, Cursor, VS Code, varios constructores de automatizaciones). La compatibilidad cambia y se prueba herramienta por herramienta. Opsie parece del ecosistema MCP (hay conectores `opsie-*` en las sesiones), pero **no está confirmado** que pueda consumir un MCP externo. Lo que no habla MCP (CRM, BI, hojas) necesita otra puerta: una API REST de solo lectura con clave y webhooks.
- **Arquitectura:** un solo núcleo de acceso a los datos con dos puertas, MCP primero y API después.
- **Fases:** (1) MCP **local** (stdio), solo lectura, para el dueño y el equipo desde Claude Code/Desktop; sin deploy ni cambios de datos. (2) MCP **remoto** con login, para todos con acceso; necesita el deploy y D-045. (3) API REST y webhooks si hace falta.
- **Herramientas de la fase 1:** `list_clients`, `get_citations`, `get_evidence` (JSON crudo de una query), `get_gaps`, `get_speed`, `get_ai_visibility`, `get_query_ideas`.
- **Reglas desde el día uno:** solo lectura; ninguna herramienta dispara llamadas pagas a DataForSEO; los costos no se exponen; ninguna clave viaja por el MCP; en la versión remota **cada persona entra con su propia sesión** y las reglas de acceso de la base (RLS) deciden qué ve, no una clave maestra.
- **Por qué importa:** con el MCP, Claude puede hacer de asesor (qué queries medir, por qué no te citan, qué mejorar) sobre datos reales **sin integrar un modelo dentro del producto** ni pagar su API; ver D-014. La demostración manual está en [`advisor-demo-bauman.md`](advisor-demo-bauman.md).
- **Dónde se consulta:** el MCP local sirve para Claude Desktop (la app de chat de escritorio) y Claude Code. **claude.ai en el navegador y en el celular necesitan la versión remota** (conector personalizado, con HTTPS y login); que se pueda añadir un conector propio depende del plan de la cuenta y hay que confirmarlo. El núcleo se construye una vez para servir a las dos formas; un túnel (ngrok) solo sirve para pruebas controladas, nunca con datos de otras agencias.
- **Estado (2026-11-19): la fase 1 está construida** (7 herramientas, solo lectura, probada por stdio): ver [`mcp.md`](mcp.md). Las consultas se movieron a un núcleo compartido (`src/lib/data/read.ts`) y el portal las llama igual que antes.
- **Pendiente:** el OK del dueño al plan de la fase 1; instalar el SDK oficial (`@modelcontextprotocol/sdk`) requiere su aprobación (regla de dependencias). Fase 2 depende de D-045.

## D-045 — Varias agencias: falta la capa de agencias ⏳ (hallazgo 2026-11-19, sin empezar)
- **Hallazgo:** hoy el rol `staff` **ve todos los clientes** de la base (D-016). Sirve para Dinkum, pero si se vende a una segunda agencia, sus usuarios verían los clientes de las demás. **Sin esto no se puede vender a otra agencia**, con o sin MCP.
- **Qué haría falta:** una capa de **agencias** por encima de los clientes (cada agencia tiene sus clientes y sus usuarios), reglas de acceso (RLS) por agencia, y que el MCP remoto y la API las respeten. Es un cambio de datos grande sobre un esquema ya migrado: **se planifica aparte y requiere autorización del dueño** antes de tocar nada.
- **Mientras tanto:** el producto sirve a Dinkum y a sus clientes; no se debe dar acceso `staff` a personas de otras agencias.

## D-046 — Pruebas de consistencia en Google y ChatGPT, y cómo mostrar 60 días de datos ⏳ (2026-11-20)
Pruebas autorizadas por el dueño, con script aparte y sin tocar la base ni el cliente del piloto (el watcher guarda una sola fila por cliente, query, superficie y día, así que no sirve para repetir una query el mismo día). Condiciones: EE. UU., inglés; Google en mobile, ChatGPT con búsqueda web forzada (escritorio). Respuestas crudas en `tests/fixtures/real/` (`google-oz-*`, `google-children-*`, `dfs-chatgpt-scraper-wizard-of-oz-*`, `dfs-chatgpt-scraper-children-*`).
- **"most valuable children's books"** (una de las 15 congeladas): Google AI Overview citó a Bauman **5 de 5** (siempre posición 10 de 11, idéntico en las 5; fuera del top 10); Google AI Mode **5 de 5** (posición 1 a 3, fuentes que cambian poco); ChatGPT **1 de 5** citado (posición 4 de 4) y **2 de 5 solo consultado** (leyó `/rare-books/children/` por un subdominio de pruebas, `brbweb2022.baumanrarebooks.com`, pero no lo citó). Coincide con la captura del piloto del día anterior.
- **"which wizard of oz books are considered the best?"** (no está en las 15): Google AI Mode **0 de 5**; Google AI Overview solo 1 corrida válida (no citó) y otra sin AI Overview; ChatGPT **1 de 5** (posición 3 de 5, un PDF de catálogo). Las fuentes que se repiten son nybooks.com (5 de 5 en ChatGPT) y reddit.com (5 de 5 en AI Mode).
- **Qué enseñan:** (1) Google no es siempre más constante que ChatGPT: cuando tiene una respuesta establecida se repite casi igual, y en preguntas abiertas cambia, e incluso puede no mostrar AI Overview. (2) Un buen resultado en Google no se traslada a ChatGPT. (3) En ChatGPT una sola corrida no es evidencia: hace falta una **tasa de aparición sobre N corridas**, que se muestra **aparte y nunca se mezcla con las citas del SLA**. (4) "Consultada" y "citada" son cosas distintas y se muestran separadas. (5) 5 corridas en 2 queries son prueba de concepto, no estadística.
- **Incidente:** la llamada orgánica de Google (la que trae el AI Overview) devolvió `40101 Internal SE Server Error` en **8 de 10 intentos** con la query de Wizard of Oz, mandadas en paralelo y de a una. No se repitió con "children's books" (10 de 10 bien, de a una). No sabemos si DataForSEO cobra los intentos fallidos. El watcher ya reintenta los fallos transitorios; **falta revisar** con datos de corridas reales cuántos 40101 aparecen y si afectan el SLA.
- **Costo registrado:** USD 0,096 (ChatGPT 0,020 + 0,020; Google AI Mode 0,020 + 0,030 con orgánica; orgánica de Wizard 0,006), más los intentos fallidos si se cobran. Antes se habló de ≈ USD 0,12: el cálculo correcto es el de esta línea.
- **Propuesta abierta, sin decidir: cómo mostrar 60 días de datos en "AI citations".** El problema: 15 a 60 queries × 2 superficies × 60 días son miles de chequeos, y la tabla no puede crecer con los días. Propuesta en tres niveles:
  1. **Resumen** (ya existe): citas contra piso/objetivo/bonus, % fuera del top 10, tasa de cita.
  2. **Tabla con una fila por query** (como hoy) y una **tira de 60 celdas** por superficie, una por día: citado / con respuesta de IA sin nosotros / sin respuesta de IA / aún sin chequear. Más "días citado: N de M". La historia se comprime en la fila; la tabla no crece.
  3. **Detalle por query** (clic en la fila): línea de tiempo día por día con quién más fue citado, el top 10 orgánico de ese día y el enlace al JSON crudo. La evidencia completa queda en Storage y en el MCP (`get_evidence`); el portal no la vuelca entera en pantalla.
  - Si se hace el módulo de ChatGPT: bloque aparte, con tasa de aparición ("1 de 5") y las corridas, nunca sumado al SLA.
- **Pendiente de decisión del dueño:** (a) aprobar esta forma de mostrar los 60 días (se planifica antes de construir); (b) si se arma el módulo informativo de ChatGPT con N corridas por query (≈ USD 0,004 por corrida; 15 queries × 5 corridas ≈ USD 0,30 por pasada); (c) completar las 5 corridas de AI Overview de Wizard of Oz (≈ USD 0,016); (d) revisar el 40101.

## D-046 (actualización) — Segunda corrida real del piloto: la variación entre días es grande ✅ (2026-11-20)
Autorizada por el dueño. Watcher live sobre las mismas 15 queries (EE. UU., inglés, mobile), **fuera de la hora habitual** (13:30 UTC; la serie tenía 14:33 UTC) con `WATCHER_ALLOW_OFF_HOUR=yes` solo esta vez, con tope USD 0,12. Resultado: 15 OK, 0 fallas, 30 chequeos, **USD 0,102**. Sin errores `40101` en esta corrida.
- **12 de 30 chequeos cambiaron de estado** de un día al siguiente (citado / con IA sin nosotros / sin respuesta de IA).
- **Queries citadas:** 11 el día 1, 9 el día 2, **13 acumuladas** (la regla cuenta una cita si apareció al menos una vez en la ventana). Perdidas el día 2: "100 most valuable books" (sin AI Overview ese día), "rare books for sale", "old bibles for sale", "antique bibles for sale". Ganadas: "most valuable stephen king books" y "where to sell first edition books". Tasa de cita: 13 de 27 chequeos con IA el día 1 y 11 de 28 el día 2.
- **Estables en los dos días:** "most valuable children's books", "first edition jane austen" y "books worth money" / "what books are worth money" (AI Overview).
- **Consecuencias para el diseño:** (1) la tira de días tiene que mostrar bien la alternancia; (2) "sin respuesta de IA" y "sin cita" son celdas distintas (perder el AI Overview no es perder una cita); (3) la cifra que importa para el SLA es la acumulada de la ventana, no la de un día, y el portal debe explicar esa diferencia; (4) con dos días el piloto ya supera el piso de 12 (13), lo que refuerza calibrar el piso por cliente (D-043).
- **Saldo de DataForSEO:** ≈ USD 0,17 según el dueño; alcanza para una corrida más. El piloto no llegará a 60 días sin más presupuesto (D-011).

## D-047 — Cómo se muestran los 60 días en "AI citations" ✅ (2026-11-20)
Aprobado por el dueño (propuesta de D-046), construido sobre el cliente demo. Sin cambios de esquema ni llamadas a DataForSEO.
- **Gráfico arriba:** línea = queries citadas al menos una vez hasta ese día (el número del SLA, nunca baja) con las marcas de piso 12, objetivo 18 y bonus 25; barras = queries citadas ese día (sube y baja). El eje cubre los 60 días; un día sin ningún chequeo no se dibuja.
- **Tabla, una fila por query** con una **tira de días** por superficie (citado / respuesta de IA sin nosotros / sin respuesta de IA / sin chequeo), "días citados N de M" (M = días con respuesta de IA, así perder el AI Overview un día no cuenta como cita perdida) y la tasa de cita en la misma celda. "First seen" pasó debajo del estado y "Surfaces" se quitó (la tira ya lo muestra).
- **Detalle por query** (`/citations/query?q=…`): día por día, qué mostró cada superficie, posición de la fuente, rank orgánico, quién más fue citado y enlace al JSON crudo.
- **Desvío respecto de la propuesta:** el detalle no muestra el top 10 orgánico de cada día en pantalla (no se guarda en las filas, solo en el JSON crudo); se enlaza la evidencia, que sí lo incluye.
- **Ancho:** la página de citas (y su detalle) usa todo el ancho de la pantalla; el resto del portal conserva su ancho máximo (marca `data-wide` en la página + regla en el layout).
- **Mobile:** la tira muestra los últimos 14 días y el gráfico se desplaza de costado en vez de achicar las letras.
- **Datos:** `getHistory` lee `aio_checks` por tramos de 1000 filas (límite de PostgREST) con columnas mínimas; `getQueryHistory` lee una sola query con sus fuentes y rutas de evidencia. Viven en el núcleo compartido, así que el MCP los puede ofrecer después (`get_history`, sin construir).
- **Demo:** el seed ahora genera 38 días de chequeos con alternancia (2.698 filas); sigue en 13 citas y 6 fuera del top 10. Como el "hoy" del demo está fijo en el día 38, los últimos días de una fecha real posterior se muestran como "sin chequeo".
- **Tests:** historial puro (`tests/history.test.ts`), componentes (`tests/citations-view.test.tsx`) y, contra la base, que la lectura pase el límite de 1000 filas y que la línea termine en las mismas citas que la vista del SLA. Los tests del MCP que fijaban el día 1 del piloto ahora comprueban coherencia entre herramientas (el piloto ya tiene 2 días).
- **Pendiente:** bloque de ChatGPT con N corridas (aparte del SLA); herramienta `get_history` del MCP; decidir si otras tablas del portal (AI visibility) también usan todo el ancho.
