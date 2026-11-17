-- D-019: a citation is off-top10 if its FIRST cited check was.
-- "One citation = the first time it is seen" (spec), so its off-top10 status is judged at that moment.
-- Replaces any_off_top10 (bool_or over every cited check), which let a later drop out of the top 10 flip it.

drop view public.sla_citations;

create view public.sla_citations with (security_invoker = true) as
select c.client_id,
       q.frozen_from,
       c.query,
       min(c.checked_at) as first_seen,
       (array_agg(c.off_top10 order by c.checked_at, c.surface))[1] as first_off_top10,
       array_agg(distinct c.surface) as surfaces
from public.aio_checks c
join public.query_sets q
  on q.client_id = c.client_id and q.query = c.query
where c.cited
  and c.checked_on between q.frozen_from and q.frozen_until
group by c.client_id, q.frozen_from, c.query;

grant select on public.sla_citations to authenticated;
