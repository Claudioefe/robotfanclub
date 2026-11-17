-- Hardening after the Phase 3 audit (D-027).

-- Fail closed: a client must be created with an explicit kind. Before, a forgotten kind meant 'real',
-- which would have been billed by live runs.
alter table public.clients alter column kind drop default;

-- off-top10 is judged by the first citation whose organic top 10 was KNOWN (D-019 refined).
-- A check made while the organic top 10 was unavailable says nothing about the organic rank, so it cannot decide.
drop view public.sla_citations;

create view public.sla_citations with (security_invoker = true) as
select c.client_id,
       q.frozen_from,
       c.query,
       min(c.checked_at) as first_seen,
       coalesce((array_agg(c.off_top10 order by c.checked_at, c.surface) filter (where c.organic_checked))[1], false) as first_off_top10,
       array_agg(distinct c.surface) as surfaces
from public.aio_checks c
join public.query_sets q
  on q.client_id = c.client_id and q.query = c.query
where c.cited
  and c.checked_on between q.frozen_from and q.frozen_until
group by c.client_id, q.frozen_from, c.query;

grant select on public.sla_citations to authenticated;
