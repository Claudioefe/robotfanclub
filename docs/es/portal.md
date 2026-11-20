# El portal (Fase 2)

Rutas bajo `/portal`. Lo que ve cada usuario lo decide RLS: un cliente ve solo su workspace; el staff ve todos y entra por la lista de clientes.

| Ruta | Qué muestra |
|---|---|
| `/portal/[clientId]` | **Overview:** citas acumuladas, proyección lineal al día 60, regla (piso 12, objetivo 18, bonus 25), estado del SLA con riesgo de clawback, % off-top10 contra 30%, **tasa de cita**, resumen de INP y las 3 últimas Citation Cards |
| `/citations` | **Gráfico** de citas acumuladas y de citas por día contra piso/objetivo/bonus; tabla de las queries congeladas con una **tira de días** por superficie, "días citados N de M", tasa de cita, rank orgánico y enlaces a la evidencia; filtros (todas, citadas, off-top10, respuesta de IA sin el cliente) y superficie; botón de card para Slack. Usa todo el ancho de la pantalla (D-047) |
| `/citations/query?q=…` | **Una query día por día** (D-047): qué mostró cada superficie, quién más fue citado, enlace al JSON crudo de cada chequeo |
| `/speed` | INP p75 móvil de cabecera, por plantilla, tendencia de 28 días, ventanas de CrUX y Tag Bouncer (simulador) |
| `/setup` | Snippet de medición con el `client_id` ya completo |

## De dónde salen los números
- **Citas, off-top10, tasa de cita:** vistas `sla_citations`, `citation_rate`, `citation_first_checks`, `latest_checks`. Los cálculos de proyección y estado están en `src/lib/sla.ts` (con tests contra el prototipo).
- **INP:** vistas `inp_p75_overall`, `inp_p75`, `inp_p75_daily` sobre `vitals`. El deploy del sprint y la línea base están en `clients`.
- **Tag Bouncer:** `tag_bouncer_scripts`. La estimación es orientativa y la UI lo dice.

## Reglas de la capa de datos
Se listan columnas explícitas (nunca `select *` en `clients`, `aio_checks` ni `citation_cards`: hay columnas solo para staff). Todas las lecturas van con el usuario, no con la secret key.

Versión en inglés: [`../en/portal.md`](../en/portal.md).

## Citas día por día (D-047)
Una ventana de 60 días guarda miles de chequeos; la tabla no crece con los días porque la historia se comprime en cada fila.
- **Tira de días:** una celda por día y por superficie (AI Overview arriba, AI Mode abajo, lo más reciente a la derecha). **Verde lima** = citado; **rosa** = hubo respuesta de IA sin el cliente; **gris** = Google no mostró respuesta de IA ese día (no es una cita perdida); **punteado** = sin chequeo guardado. En el celular solo se ven los últimos 14 días.
- **"Días citados: N de M":** M cuenta solo los días con respuesta de IA (en cualquiera de las dos superficies).
- **Gráfico:** la línea son las queries citadas al menos una vez hasta ese día (**es el número del SLA y nunca baja**); las barras son las queries citadas ese día (**sube y baja**: es normal, ver D-046). Un día sin ningún chequeo no se dibuja y la línea termina en el último día con datos.
- **Código:** `src/lib/data/history.ts` (funciones puras: estados, métricas, línea acumulada), `getHistory` y `getQueryHistory` en el núcleo de datos `src/lib/data/read.ts` (lectura por tramos de 1000 filas), componentes `Strip` y `CitationsChart` (SVG propio, sin librería).
- **Demo:** `npm run seed:demo` genera historial diario con alternancia parecida a la real; el acumulado termina en las mismas 13 citas.
