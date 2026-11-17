# El portal (Fase 2)

Rutas bajo `/portal`. Lo que ve cada usuario lo decide RLS: un cliente ve solo su workspace; el staff ve todos y entra por la lista de clientes.

| Ruta | Qué muestra |
|---|---|
| `/portal/[clientId]` | **Overview:** citas acumuladas, proyección lineal al día 60, regla (piso 12, objetivo 18, bonus 25), estado del SLA con riesgo de clawback, % off-top10 contra 30%, **tasa de cita**, resumen de INP y las 3 últimas Citation Cards |
| `/citations` | Tabla de las queries congeladas; filtros (todas, citadas, off-top10, respuesta de IA sin el cliente) y superficie (AI Overview / AI Mode); tasa de cita por query; enlace al snapshot (evidencia); botón de card para Slack |
| `/speed` | INP p75 móvil de cabecera, por plantilla, tendencia de 28 días, ventanas de CrUX y Tag Bouncer (simulador) |
| `/setup` | Snippet de medición con el `client_id` ya completo |

## De dónde salen los números
- **Citas, off-top10, tasa de cita:** vistas `sla_citations`, `citation_rate`, `citation_first_checks`, `latest_checks`. Los cálculos de proyección y estado están en `src/lib/sla.ts` (con tests contra el prototipo).
- **INP:** vistas `inp_p75_overall`, `inp_p75`, `inp_p75_daily` sobre `vitals`. El deploy del sprint y la línea base están en `clients`.
- **Tag Bouncer:** `tag_bouncer_scripts`. La estimación es orientativa y la UI lo dice.

## Reglas de la capa de datos
Se listan columnas explícitas (nunca `select *` en `clients`, `aio_checks` ni `citation_cards`: hay columnas solo para staff). Todas las lecturas van con el usuario, no con la secret key.

Versión en inglés: [`../en/portal.md`](../en/portal.md).
