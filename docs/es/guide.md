# Guía: qué es Robot Fan Club y cómo se usa

Esta guía explica el producto en lenguaje simple. Para el detalle técnico están [`how-it-works.md`](how-it-works.md) y [`../spec.md`](../spec.md).

## 1. El problema
Cuando alguien busca algo en Google, arriba de los resultados de siempre aparece cada vez más una **respuesta escrita por IA** (AI Overview, o AI Mode si la persona sigue conversando). Esa respuesta **cita fuentes**: enlaces a las páginas de donde sacó la información.

Si tu página es una de esas fuentes, la persona te ve antes que a nadie. Si no, ve a la competencia. Los informes de posiciones de siempre no dicen nada de esto.

Robot Fan Club responde dos preguntas, todos los días, con evidencia que se puede abrir:
1. **¿Las respuestas de IA de Google citan las páginas del cliente?** (servicio **AIO Pro**)
2. **¿El sitio responde rápido cuando alguien lo toca?** (servicio **INP Sprint**)

## 2. Quién hace qué
| | Qué hace |
|---|---|
| **La plataforma** | Mide, guarda la evidencia y lo muestra en un portal por cliente. |
| **El equipo (staff)** | Elige qué medir, interpreta los resultados y mejora el contenido y el sitio. |
| **El cliente** | Mira su portal (solo lectura) y aprueba los cambios. |

La plataforma **mide; no mejora nada por sí sola**. Mejorar es trabajo del equipo. Hoy, además, **elegir qué medir lo hace una persona**: ver la sección 5.

## 3. AIO Pro: medir citas

### Cómo funciona
1. El staff elige una lista de hasta **60 queries** (búsquedas con intención de compra o de consulta) y la **congela** por **60 días**. Una lista congelada no se puede editar: así la medición es justa y comparable. Para cambiarla se congela otra, que empieza cuando termina la anterior.
2. **Todos los días, a la misma hora**, el sistema consulta Google para cada query, siempre en las mismas condiciones: **EE. UU., inglés, celular**. Cambiar esas condiciones rompería la comparación.
3. De cada consulta guarda el **resultado crudo** (el JSON completo). Es la **evidencia**: si el portal dice "citado", se puede abrir el archivo y verlo.

### Qué cuenta como cita
Una **cita** es una query congelada en la que **una página del dominio del cliente aparece entre las fuentes de la respuesta de IA** al menos una vez dentro de los 60 días. Verla de nuevo no suma: cada query cuenta una sola vez.

### Metas
- **Piso: 12 citas.** **Objetivo: 18.** **Bonus: 25.**
- Si al día 60 hay **menos de 12**, el cliente recibe un **crédito del 20% del fee** (como crédito, no como reembolso).

### La regla del 30% fuera del top 10
Para cada query, Google muestra también los 10 resultados orgánicos de siempre. Una cita es **"off-top10"** cuando la página citada por la IA **no estaba en esos 10 resultados ese mismo día** (se compara por dirección exacta de la página, no por sitio).

**Al menos el 30% de las citas deben ser off-top10.** Sirve para probar que la IA eligió al cliente por su contenido y no solo porque ya estaba primero en Google.

### La tasa de cita
Además de las citas, el portal siempre muestra la **tasa de cita**: de todos los chequeos en que Google respondió con IA, **en qué porcentaje el cliente fue citado**. Responde "¿qué tan seguido me eligen cuando la IA contesta?".

### Un ejemplo completo
Query congelada: *"mejor plomero de emergencia en Miami"*.
- Día 12: Google responde con IA y cita a `tusitio.com/emergencias`. Ese día esa query pasa a ser **una cita**.
- Esa página estaba en el puesto 34 del orgánico ese día: la cita es **off-top10**.
- Los días siguientes sigue citándote: **no suma otra cita**, pero sube la tasa de cita.
- Si al día 60 tienes 14 citas y 5 son off-top10 (36%), cumples el piso y la regla del 30%.

## 4. INP Sprint: medir velocidad
**INP** (Interaction to Next Paint) mide cuánto tarda el sitio en reaccionar cuando alguien toca, hace clic o escribe. Google lo usa como señal de experiencia.
- Se mide **en celular**, con visitantes reales (un pequeño script en el sitio) y con los datos públicos de Google (CrUX).
- **Objetivo:** INP p75 ≤ **200 ms**, sostenido en **dos ventanas completas de 28 días** después de que se publica el trabajo.
- Los scripts de terceros que el cliente decide mantener (por ejemplo, un banner de consentimiento) **quedan fuera de la garantía**. El **Tag Bouncer** permite al cliente decidir cuáles scripts entran.

## 5. Cómo se eligen las queries (hoy)
Es la decisión más importante: el resultado depende de qué queries se miden. **Hoy la elige una persona del equipo y la carga a mano** en el Admin (`/admin`, página del cliente, "Frozen query list").

Criterios para una buena lista:
- **Búsquedas que traen clientes**, no solo las más populares: intención de compra o de consulta real.
- **Preguntas y long tail** ("cómo elegir…", "mejor X para Y"), que son las que más disparan respuestas de IA.
- **Queries donde el cliente tiene posibilidades reales**: un sitio nuevo que compite contra gigantes difícilmente sume las 12 citas.
- Que todas se puedan **mejorar con una página concreta**.

Fuentes de ideas:
- **Search Console del cliente** (queries con impresiones y posición 4 a 20; preguntas y long tail). Hoy se exporta y se pega a mano: **no hay conexión automática**.
- El panel **"Query ideas from AI visibility"** del Admin: preguntas que Google ya cita para ese dominio, sin las ya congeladas. Es de solo lectura.
- Lo que el propio cliente dice que quiere ganar.

## 6. Qué hay que hacer para que la IA te cite
La plataforma no lo hace; lo hace el equipo. Según Google, **no existe un marcado especial para la IA**: valen las bases del SEO.
1. **La página tiene que estar indexada y poder mostrarse con snippet.** Si no está indexada, no se puede citar.
2. **Una página por query, que responda la pregunta directo**: respuesta clara al principio, encabezados limpios, datos concretos.
3. **Señales de autoridad y confianza** (datos estructurados donde corresponda, menciones, reseñas).
4. **Un sitio rápido.**

El portal ayuda a decidir dónde trabajar: la vista de **brecha** muestra las queries donde la IA responde pero **cita a otros**, y a quiénes. Si tras mejorar una página esa query pasa a citarte, se ve en el portal.

## 7. Qué no es (límites honestos)
- **No promete posiciones ni citas concretas.** Mide y da una garantía definida (piso 12 o crédito).
- **No cubre ChatGPT ni otras IA.** Lo de ChatGPT es un módulo **informativo** ("AI visibility"): datos de una base, con su fecha, que no entran en el SLA.
- **No indexa páginas ni arregla el sitio.** Mide; el trabajo es del equipo.

## 8. Lo que viene: asesor de IA (no construido todavía)
Hoy elegir las queries y decidir qué mejorar depende de la experiencia del equipo. La idea registrada (D-014) es sumar una **capa de IA que asesore**, siempre con revisión humana:
1. **Proponer qué medir:** una lista de queries basada en datos reales (Search Console, las preguntas ya asociadas al dominio, lo que la IA cita en el tema), con el motivo de cada una.
2. **Explicar por qué no te citan:** comparar la respuesta de IA, las páginas citadas y la del cliente.
3. **Recomendar mejoras de contenido** por página.
4. **Cerrar el ciclo:** ver si la query pasó a citarte tras el cambio.

Falta definir proveedor, qué datos ve, tope de costo y en qué fase entra. Hasta que se decida, esta sección es una intención, no una función.

## 9. Glosario
- **AI Overview / AI Mode:** respuestas de IA de Google, con fuentes citadas.
- **Query:** una búsqueda concreta que se mide.
- **Lista congelada / ventana:** las queries fijas durante 60 días.
- **Cita:** una query donde una página del cliente aparece entre las fuentes, al menos una vez en la ventana.
- **Off-top10:** cita desde una página que ese día no estaba en el top 10 orgánico de esa query.
- **Tasa de cita:** % de respuestas de IA en las que el cliente fue citado.
- **Snapshot:** el resultado crudo de un chequeo, guardado como evidencia.
- **INP / CrUX:** velocidad de interacción / los datos reales públicos de Google.
- **Crédito (clawback):** 20% del fee si al día 60 hay menos de 12 citas.
