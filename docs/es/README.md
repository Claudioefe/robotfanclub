# Robot Fan Club

**"Make the robots your biggest fans."**

## Para qué sirve
Robot Fan Club es un portal por cliente que prueba el trabajo de una agencia con dos servicios medibles:

1. **AIO Pro:** mide si Google AI Overviews y AI Mode citan páginas del cliente, sobre una lista de queries congelada por 60 días (piso 12, objetivo 18, bonus 25 citas).
2. **INP Sprint:** mide la velocidad real de interacción (INP p75 mobile) con datos de visitantes reales y de CrUX.

El cliente ve sus citas, la evidencia (JSON crudo de cada chequeo) y su velocidad sin pedir reportes. Sirve a cualquier agencia o negocio (D-004). Las mediciones son en EE. UU., inglés y mobile (D-006).

**Empieza por la guía:** [`guide.md`](guide.md) — Guía: qué es y cómo se usa.

## Cómo funciona (resumen)
- Un job diario consulta DataForSEO por cada query congelada y guarda el resultado en Supabase y el JSON crudo en Storage.
- Un snippet en el sitio del cliente envía INP, LCP y CLS al endpoint de ingest; un job nocturno suma datos de CrUX.
- El portal (Next.js) muestra todo con RLS: el cliente solo ve su workspace, el staff ve todos.

Detalle completo: [`../spec.md`](../spec.md). Decisiones: [`DECISIONS.md`](DECISIONS.md). Cómo levantarlo: [`runbook.md`](runbook.md). Versión en inglés: [`../en/README.md`](../en/README.md).

## Estado
Fase 0 (base) completa. Ver [`CHANGELOG.md`](CHANGELOG.md).
