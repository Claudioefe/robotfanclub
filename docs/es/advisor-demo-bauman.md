# Demostración del asesor de IA: Bauman, 4 queries sin cita (2026-11-19)

Hecha **a mano** sobre las respuestas reales guardadas del piloto (`tests/fixtures/real/watcher-bauman-pilot-2026-11-19/`) y el sitio público de Bauman. Sirve para ver qué aportaría un asesor antes de construirlo (D-014, D-044). **Es de un solo día y son hipótesis**: las respuestas de IA cambian.

## "how to sell rare books" y "where to sell first edition books" (una sola oportunidad)
- **Qué dijo la IA:** identificar la edición, evaluar la condición, mirar ventas cerradas (no precios pedidos) y elegir canal: dealer (rápido) o marketplace/subasta (más caro, más lento). En AI Mode: las librerías anticuarias compran al 25–30% del valor de reventa o toman consignación.
- **A quién citó:** foros y YouTube (reddit, youtube, justanswer, un sitio de ecwid y uno de 50webs); en AI Mode, abebooks y nembol. Fuentes débiles: el nivel a superar es bajo.
- **Qué tiene Bauman:** solo `selling-something.aspx`, un formulario para ofrecer libros (564 palabras). No hay una guía de "cómo vender".
- **Recomendación:** una guía "How to sell rare books" que siga el orden de la IA (edición, condición, precios vendidos, canal) y explique cómo compra y consigna Bauman, desde la mirada de un dealer. Preguntas "People also ask" como FAQ y enlace al formulario. Una página ataca las dos queries.

## "most valuable stephen king books"
- **Qué dijo la IA:** cifras concretas (por ejemplo la colección de los primeros 5 libros firmados ≈ USD 59.757; la edición lettered de Firestarter ≈ USD 23.867).
- **A quién citó:** litreactor, reddit, facebook.
- **Qué tiene Bauman:** el post "Collecting Stephen King: Six Early Books" (1.535 palabras) con **un solo precio**.
- **Recomendación:** convertirlo en "Most valuable Stephen King books" con tabla (título, edición, año, rango de precio) usando **solo valores reales** del stock o de las ventas de Bauman (evidencia propia que litreactor no tiene); enlazar a las fichas de King del catálogo y sumar cómo reconocer una primera edición.

## "gifts for a book lover"
- **Qué dijo la IA:** una respuesta tipo compra con productos y precios (LEGO, tazas, lámparas de lectura).
- **Lectura:** la intención es regalo barato y masivo; Bauman vende libros raros. **No es la batalla correcta.** Conviene reemplazar la query por otras cercanas ("rare book gift ideas", regalos por presupuesto). Además, la base de LLM Mentions la daba como citada y hoy no lo está (es una foto).

## Prioridad
1. Guía de venta (cubre 2 queries y además trae libros para comprar). 2. Mejorar el post de Stephen King. 3. Cambiar la query de regalos.

## Límites
No se abrieron las páginas de la competencia (solo lo que la IA dijo de ellas); `bauman-gifts` está bloqueada por un control anti-bots; la lista de queries está congelada hasta 2027-01-17, así que el efecto de los cambios se ve cuando una de estas queries pase a citarte.
