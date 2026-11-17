-- Phase 2: data the Speed view needs (D-022).

-- Sprint deploy date and pre-sprint INP baseline. The INP SLA counts its two CrUX windows from the deploy.
alter table public.clients
  add column inp_sprint_deployed_on date,
  add column inp_baseline_ms integer check (inp_baseline_ms > 0);
grant select (inp_sprint_deployed_on, inp_baseline_ms) on public.clients to authenticated;

-- Tag Bouncer: readable label, and whether the script is required (e.g. consent banner: cannot be removed).
alter table public.tag_bouncer_scripts
  add column label text,
  add column is_required boolean not null default false;

-- Overall INP p75 on mobile, last 28 days (headline number)
create view public.inp_p75_overall with (security_invoker = true) as
select client_id,
       percentile_cont(0.75) within group (order by value) as p75,
       count(*) as interactions
from public.vitals
where metric = 'INP' and device = 'mobile'
  and created_at > now() - interval '28 days'
group by client_id;

-- Daily INP p75 on mobile, last 28 days (trend chart). Day is the UTC date.
create view public.inp_p75_daily with (security_invoker = true) as
select client_id,
       (created_at at time zone 'utc')::date as day,
       percentile_cont(0.75) within group (order by value) as p75,
       count(*) as interactions
from public.vitals
where metric = 'INP' and device = 'mobile'
  and created_at > now() - interval '28 days'
group by client_id, (created_at at time zone 'utc')::date;

grant select on public.inp_p75_overall, public.inp_p75_daily to authenticated;

-- Portal views: keep result sets small (PostgREST returns at most 1000 rows per request).

-- The first check in which each query was cited in its window: the citation's evidence (D-019 uses its off-top10 flag)
create view public.citation_first_checks with (security_invoker = true) as
select distinct on (c.client_id, q.frozen_from, c.query)
       c.client_id, q.frozen_from, c.query, c.surface, c.checked_on, c.checked_at,
       c.cited_url, c.source_position, c.source_count, c.organic_rank, c.organic_checked,
       c.off_top10, c.other_domains, c.snapshot_path
from public.aio_checks c
join public.query_sets q
  on q.client_id = c.client_id and q.query = c.query
where c.cited
  and c.checked_on between q.frozen_from and q.frozen_until
order by c.client_id, q.frozen_from, c.query, c.checked_at, c.surface;

-- The most recent check per query and surface (what the AI citations table shows today)
create view public.latest_checks with (security_invoker = true) as
select distinct on (client_id, query, surface)
       client_id, query, surface, checked_on, checked_at, aio_present, cited, cited_url,
       source_position, source_count, organic_rank, other_domains, snapshot_path
from public.aio_checks
order by client_id, query, surface, checked_at desc;

grant select on public.citation_first_checks, public.latest_checks to authenticated;
