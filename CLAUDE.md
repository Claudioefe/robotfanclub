# Robot Fan Club: portal de citas en IA + velocidad (INP)

Tagline: "Make the robots your biggest fans." (antes "Citable", ver `docs/es/DECISIONS.md` D-001). Producto para cualquier agencia o negocio, sin foco en un nicho (D-004); mediciones en EE. UU. Mide dos cosas y las muestra en un portal por cliente:
1. Si Google AI Overviews y AI Mode citan páginas del cliente, contra una lista de queries congelada por 60 días.
2. La velocidad real de interacción del sitio (INP p75 mobile), con datos de visitantes reales y de CrUX.

La especificación completa y las fases están en `docs/spec.md`. Leela antes de proponer cualquier plan.

## Cómo trabajamos
- Hablame en español. Todo el código y el texto visible del producto van en inglés.
- Documentación bilingüe: cada doc en `docs/es/` y `docs/en/`, siempre sincronizados. Las decisiones tomadas se registran en `docs/es/DECISIONS.md` y `docs/en/DECISIONS.md`; actualizalas al decidir algo nuevo.
- Agentes: la sesión principal hace lo delicado y secuencial; subagentes solo para trabajo independiente, revisiones de solo lectura y traducciones (ver D-008).
- Repo local por ahora; sin remoto de GitHub ni deploy hasta que lo indique (D-003).
- Trabajamos por fases (ver `docs/spec.md`). Al empezar cada fase: plan corto, archivos que vas a crear o tocar, comandos, y qué tengo que hacer yo (cuentas, keys, configuraciones). Esperá mi OK antes de ejecutar.
- Al terminar una fase: qué quedó hecho, cómo lo pruebo, qué quedó pendiente. Hacé commit al cerrar cada fase.
- Preguntá antes de: instalar dependencias grandes, crear recursos en la nube, cambiar el esquema de datos ya migrado, o correr algo que cueste plata.
- Si una decisión de `docs/spec.md` > "Decisiones abiertas" bloquea el trabajo, preguntame; no la asumas.

## Reglas duras
- No llamar a la API de DataForSEO con credenciales reales hasta que lo autorice explícitamente. Usar `tests/fixtures/` y un modo dry-run.
- Secretos solo en `.env.local` (nunca en el repo ni en el código). La secret key de Supabase solo en servidor y jobs, nunca en el navegador.
- RLS activado en toda tabla con datos de clientes. Toda vista con `security_invoker = true` para que respete RLS.
- No scrapear Google directamente (ni Playwright, ni proxies, ni headless). Los datos de SERP vienen de DataForSEO.
- Condiciones de medición fijas: EE. UU. (`location_code` 2840), inglés, `device: mobile`, misma hora cada día. Cambiarlas rompe la comparabilidad de la serie: avisame antes.
- Guardar el JSON crudo de cada chequeo en Storage (bucket `snapshots`): es la evidencia del SLA.

## Stack
- Next.js (App Router, TypeScript), deploy en Netlify (adaptador oficial de Next.js, sin configuración extra). No activar features experimentales de Next.js.
- Supabase: Postgres, Auth (magic link), Storage. Migraciones con Supabase CLI en `supabase/migrations/`.
- Watcher diario: GitHub Actions con cron (el job puede tardar varios minutos por cliente).
- Estilos: tokens de color y tipografía del prototipo (`prototype/portal-mvp.html`), con modo claro y oscuro. Sin librerías de UI pesadas.
- Tests: Vitest para parsers, cálculo del SLA y endpoints.

## Material de referencia en el repo
- `prototype/portal-mvp.html`: prototipo navegable con datos demo. Es la referencia visual, de copy y de cálculos (proyección, estados del SLA, Tag Bouncer).
- `scripts/aio-watcher.mjs`: watcher de referencia en JS con el parser ya probado. Portarlo a TypeScript dentro de la app o de `jobs/`.
- `supabase/schema.sql`: esquema inicial con RLS. Convertirlo en la primera migración.
- `tests/fixtures/`: respuestas sintéticas con la forma de la API de DataForSEO (orgánica con AI Overview y AI Mode).
- `.env.example`: variables necesarias.

## Reglas del producto (no cambiar sin preguntar)
SLA de citas (oferta AIO Pro):
- Ventana de 60 días con lista de queries congelada.
- Una cita = una query congelada en la que una URL del dominio del cliente aparece entre las referencias de la respuesta de IA al menos una vez dentro de la ventana. Verla de nuevo no suma.
- Piso 12, objetivo 18, bonus 25.
- Off-top10: al menos 30% de las citas deben venir de URLs que no están en el top 10 orgánico de esa misma query ese mismo día (comparación por URL normalizada, no por dominio).
- Si al día 60 hay menos de 12 citas: crédito del 20% del fee (clawback como crédito, no reembolso).
- Mostrar siempre también la tasa de cita: % de chequeos con respuesta de IA en los que el cliente fue citado.

SLA de INP (oferta INP Sprint):
- INP p75 en mobile ≤ 200 ms en dos ventanas completas de CrUX de 28 días, contadas desde el deploy del sprint.
- Scripts de terceros que el cliente decide mantener (por ejemplo, el banner de consentimiento) quedan fuera del SLA.
