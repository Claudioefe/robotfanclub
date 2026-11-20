# Plan: de SLA congelado a herramienta de medición flexible (D-049)

Estado: **propuesto, sin ejecutar**. Nada de esto se construye hasta el OK del dueño. Hasta entonces el código sigue con las reglas actuales.

## Qué cambia (decidido en D-049)
- Se retira el contrato: sin crédito del 20%, sin lista congelada obligatoria, sin ventana fija de 60 días.
- Las queries se agregan y se quitan cuando quiera el usuario. Lo que se quita conserva su historia.
- Los objetivos se quedan como motivación, en **porcentaje** de las queries seguidas (por defecto 30 / 45 / 60%, editables por cliente), mostrando también el número equivalente.
- El producto muestra **de dónde partió el cliente y dónde está pasados X días**.
- Sin cambios: JSON crudo de cada chequeo en Storage, condiciones fijas (EE. UU., inglés, mobile, misma hora), RLS, vistas con `security_invoker`.

## Fases (cada una termina con tests, docs es/en, commit y tu OK para pasar a la siguiente)

### Fase 1 — Modelo de datos (migración; la aplicas tú con `supabase db push --remote`)
- Tabla nueva `tracked_queries` (`client_id`, `query`, `started_on`, `ended_on` nulo = activa). Una query puede tener varios períodos (quitar y volver a agregar abre uno nuevo). Sin guarda de ventanas superpuestas; sí una restricción: un solo período activo por query y cliente.
- Copia de lo existente: cada fila de `query_sets` pasa a `tracked_queries` con `started_on = frozen_from` y `ended_on` nulo. `query_sets` **no se borra** en esta fase (se retira después, cuando nada la lea).
- Objetivos por cliente: columnas `goal_floor_pct`, `goal_target_pct`, `goal_bonus_pct` (30 / 45 / 60 por defecto).
- Vistas de resumen (`citations_by_query` y las que usan `frozen_from`) reescritas sobre `tracked_queries`; cada una con `security_invoker = true`. La clave de `citation_cards` deja de depender de `frozen_from`.
- RLS en `tracked_queries`: lectura por `can_read_client`; escritura solo servidor (por ahora; roles en Fase 7).
- Tests RLS nuevos y el test del demo adaptado.

### Fase 2 — Núcleo de datos y cálculos (sin UI)
- `history.ts`: el eje de días pasa a ser el período elegido (no una ventana fija) y aparece el estado **"no seguida"** (la query no estaba en seguimiento ese día), distinto de "sin chequeo".
- `goals.ts` (reemplaza a `sla.ts` en lo de citas): objetivos en %, número equivalente, estado "hacia el objetivo". Sin proyección contractual ni estado de crédito.
- Métricas de cohorte: proporción ("9 de 15 seguidas, 60%"), **línea base** (primer chequeo de cada query), comparación **"mismas queries"** inicio contra hoy (ganadas, perdidas, estables) para las queries con al menos X días, y marcas de **cuándo cambió la lista**.
- La regla del 30% fuera del top 10 pasa a métrica informativa.
- Tests unitarios con las fixtures reales del piloto.

### Fase 3 — Watcher y jobs
- El watcher lee las queries activas de `tracked_queries` en vez de la ventana vigente; días sin ninguna query activa no gastan nada.
- Tope mensual de gasto por cliente (se aborta con aviso al llegar) y costo estimado diario visible. Se mantienen `WATCHER_ALLOW_LIVE` y `WATCHER_MAX_COST_USD`.
- Job periódico de ChatGPT (una corrida por query y día, ≈ USD 0,004 por query), detrás de las mismas guardas. Hasta aquí, sin llamadas reales sin tu autorización explícita.
- Admin > Costs suma también AI visibility.

### Fase 4 — Portal: Resumen y AI citations
- Resumen: "al empezar → hoy" con los objetivos en %, sin estado de SLA, sin proyección lineal, sin crédito.
- AI citations: gráfico y tira con las marcas de cambio de lista; selector de período ("últimos 30 / 60 / 90 días / desde el inicio").
- Página ChatGPT al día con el modelo nuevo.

### Fase 5 — Agregar y quitar queries
- Página **Queries** en el portal y en Admin: agregar (con el costo diario estimado), quitar (con confirmación; la historia se queda), ver las quitadas. Validación: límite de cantidad y de duplicados.
- Admin: reemplaza "congelar lista" por esta gestión.

### Fase 6 — Retirar el SLA de citas en textos y docs
- Landing, `/guide`, `docs/es` y `docs/en`, `docs/spec.md`, `prototype` (solo como referencia) y `CLAUDE.md`: se quita el 20% y la devolución, y se reescribe "Reglas del producto" con el modelo flexible. Se borra la nota "en proceso de cambio".
- Herramientas MCP al día (`get_history`, `get_llm_runs` y los textos de las existentes).
- Se elimina `query_sets` y el código de ventana fija cuando nada lo use.

### Fase 7 — Roles (después, junto con la capa de agencias D-045)
- Dentro de cada agencia: **admin** (agrega y quita queries, edita objetivos, invita) y **viewer** (solo lee).

## Qué tienes que hacer tú
- Aplicar cada migración (Fase 1; y una más en la Fase 6 para retirar `query_sets`).
- Dar OK al pasar de fase y a cualquier llamada real a DataForSEO.

## Decisiones que necesito de ti (con mi propuesta)
1. **¿El INP Sprint conserva su SLA?** (INP p75 ≤ 200 ms en dos ventanas de CrUX). Solo hablamos de citas; propongo no tocarlo hasta que lo decidas.
2. **"X días" para comparar inicio contra hoy:** propongo 14 por defecto (editable).
3. **Las listas ya cargadas** (piloto y demo): propongo que sigan activas desde su `frozen_from`, sin cortar nada.
4. **Límite de queries por cliente:** hoy 60; propongo mantenerlo y que sea configurable.
5. **Tope mensual por defecto:** propongo USD 10 por cliente, editable.
