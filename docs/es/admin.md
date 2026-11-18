# El Admin (Fase 7)

`/admin` es solo para staff. Si entrás con un usuario cliente, te manda a `/portal`.

## Pantallas
- **Clients** (`/admin`): lista de clientes con su `kind`, fee y ventana de queries vigente; alta de clientes. El `kind` es obligatorio: `real` (lo miden los jobs live), `demo` (ningún job lo toca) o `sandbox` (solo dry-run con fixtures).
- **Un cliente** (`/admin/clients/<id>`):
  - **Frozen query list:** pegar hasta 60 queries y congelar. Empieza una ventana de 60 días. Para cambiarla se congela otra lista: empieza el día siguiente al fin de la que corre.
  - **Speed: sprint details:** fecha de deploy y INP de línea base.
  - **Chrome UX Report targets:** el origen exacto (con o sin `www`, como lo visitan las personas) y URLs clave. Después hay que correr el job de CrUX (`npm run crux:backfill` una vez).
  - **Tag Bouncer scripts:** nombre, dirección, bloqueo en ms, acción y si es requerido (no se puede quitar y queda fuera del SLA).
  - **Access:** dar o quitar acceso a una persona. No se envía ningún email: la persona entra a `/login` con ese correo y pide su enlace.
- **Costs** (`/admin/costs`): gasto de DataForSEO de los últimos 30 días por cliente y por día, y las últimas corridas del watcher.

## Qué no hay, a propósito
Borrar clientes o chequeos (la evidencia es append-only), el webhook de Slack (diferido) y dar acceso de staff (se hace por terminal: `npm run grant-access -- --email ... --role staff`).

## Seguridad
Cada página y cada acción comprueban en la base que quien pide sea staff (D-037). Los scripts `create-client`, `add-crux-target` y `grant-access` siguen funcionando.

Versión en inglés: [`../en/admin.md`](../en/admin.md).
