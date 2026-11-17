# Cómo funciona

## Citas en IA (AIO Pro)
1. El staff carga una lista de hasta 60 queries y la **congela**: ventana de 60 días (`frozen_until = frozen_from + 59`). Una lista congelada no se edita.
2. Cada día, a la misma hora, el watcher consulta Google (EE. UU., inglés, mobile) para cada query: AI Overview y AI Mode. Guarda una fila por query, superficie y día, y el JSON crudo como evidencia.
3. **Una cita** = una query congelada en la que una URL del dominio del cliente aparece entre las fuentes de la respuesta de IA al menos una vez en la ventana. Verla de nuevo no suma. Cuenta si fue en AI Overview **o** AI Mode (D-005).
4. **Metas:** piso 12, objetivo 18, bonus 25. **Off-top10:** al menos 30% de las citas deben venir de URLs que no están en el top 10 orgánico de esa query ese día (por URL normalizada). Una query cuenta como off-top10 si alguno de sus chequeos citados lo fue (D-009).
5. Si al día 60 hay menos de 12 citas: crédito del 20% del fee.
6. **Tasa de cita:** % de chequeos con respuesta de IA en los que el cliente fue citado, dentro de la ventana.

## Velocidad (INP Sprint)
- Un snippet con `web-vitals` envía INP, LCP y CLS de visitantes reales; un job nocturno suma CrUX.
- Objetivo: INP p75 mobile ≤ 200 ms en dos ventanas completas de CrUX de 28 días desde el deploy. Los scripts de terceros que el cliente decide mantener quedan fuera del SLA.

## Acceso
Sin registro público. El staff da acceso (`npm run grant-access`); la persona entra con un link por email. Un usuario cliente ve solo su cliente, en lectura; el staff ve todos.

Versión en inglés: [`../en/how-it-works.md`](../en/how-it-works.md).
