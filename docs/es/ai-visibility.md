# AI visibility (Fase 8)

Módulo **informativo** del portal: dónde las respuestas de IA (Google AI Overview y ChatGPT) ya mencionan el dominio del cliente. **No es el SLA de citas** y no cuenta para el crédito (D-039, D-040).

## De dónde salen los datos
DataForSEO **LLM Mentions**: una base de respuestas de IA registradas a lo largo del tiempo. No es una medición en vivo ni en las condiciones fijas del SLA. Por eso cada dato lleva la fecha de captura y las fechas en que se registró la respuesta (algunas tienen casi un año).

- Dos llamadas por cliente y corrida: `google` y `chat_gpt` (EE. UU., inglés), las 40 preguntas de mayor volumen de búsqueda en IA.
- Costo: USD 0,10 por llamada + 0,001 por fila = **≈ USD 0,14 por llamada, USD 0,28 por cliente y corrida**. Semanal: ≈ USD 1,2 por cliente al mes.

## Qué muestra el portal (`/portal/<cliente>/ai-visibility`)
- Cuántas respuestas de cada plataforma mencionan el dominio (total de la base) y cuántas de las 40 principales lo **citan**.
- **Citado** (el dominio está entre las fuentes de la respuesta) vs **Leído, no citado** (ChatGPT abrió una página del dominio al responder pero no la listó). Son cosas distintas y se muestran separadas.
- Tabla de preguntas por volumen, qué hizo cada plataforma y cuándo se registró la respuesta.
- Otros sitios citados junto al cliente.
- Un aviso fijo: es una instantánea y la garantía de citas se mide aparte, a diario, solo en Google.

## Admin
En `/admin/clients/<id>`, "Query ideas from AI visibility": preguntas que Google ya cita para el cliente, por volumen, sin las ya congeladas, con "Copy all". **No congela nada**: se pega en el formulario de arriba (una lista congelada no se edita). Las preguntas que solo aparecen en ChatGPT **no** se sugieren: no prueban que Google dispare una respuesta de IA.

## El job
`node jobs/ai-visibility/cli.ts --mode dry-run|live` (GitHub Actions, lunes 07:00 UTC).
- **dry-run** (por defecto): usa las respuestas reales guardadas en `tests/fixtures/real/` y solo clientes `sandbox`. Sin llamadas.
- **live**: solo clientes `real`. Exige `AI_VISIBILITY_ALLOW_LIVE=yes`, `DFS_LOGIN`, `DFS_PASSWORD`; tope de gasto `AI_VISIBILITY_MAX_COST_USD` (2 por defecto: corta antes de pasarse). En Actions, las corridas programadas son dry-run hasta que la variable del repo `AI_VISIBILITY_LIVE_ENABLED` valga `yes`.
- Idempotente por cliente, plataforma y día. Guarda el JSON crudo en `snapshots/{cliente}/ai-visibility/...` antes de las filas. Un error 401/402/403 corta la corrida; un error transitorio se reintenta una vez.

## Tablas (migración `20261123100000_ai_visibility.sql`)
`ai_mention_runs` (una fila por cliente, plataforma y día: total de la base, filas guardadas, ruta del JSON, costo oculto a los usuarios) y `ai_mentions` (una fila por pregunta, con `relation` = `cited`/`consulted`). RLS: lectura para staff y miembros del cliente; escritura solo con la secret key.

## Ver datos reales en el portal
`npm run load-real-mentions` carga bajo Bauman las dos respuestas reales guardadas (por el mismo job, sin llamar a DataForSEO).
