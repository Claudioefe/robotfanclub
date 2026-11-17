-- Hardening after the Phase 1 audit (see docs/en/DECISIONS.md, D-018).
-- Adds fixes on top of 20261117120000_initial_schema.sql without editing it.

-- 1. A missing organic result must not count as "off the top 10" -----------------
-- organic_checked = false means the organic top 10 was unavailable that day, so
-- off_top10 must not be inferred from a null organic_rank.
drop view public.sla_citations;   -- depends on off_top10; recreated below
alter table public.aio_checks drop column off_top10;
alter table public.aio_checks add column organic_checked boolean not null default true;
alter table public.aio_checks add column off_top10 boolean generated always as
  (cited and organic_checked and (organic_rank is null or organic_rank > 10)) stored;
alter table public.aio_checks add constraint aio_checks_cited_needs_ai check (not cited or aio_present);

create view public.sla_citations with (security_invoker = true) as
select c.client_id,
       q.frozen_from,
       c.query,
       min(c.checked_at) as first_seen,
       bool_or(c.off_top10) as any_off_top10,   -- D-009 (still to be validated)
       array_agg(distinct c.surface) as surfaces
from public.aio_checks c
join public.query_sets q
  on q.client_id = c.client_id and q.query = c.query
where c.cited
  and c.checked_on between q.frozen_from and q.frozen_until
group by c.client_id, q.frozen_from, c.query;

-- 2. Checks are evidence: append-only ---------------------------------------------
-- A same-day rerun can never overwrite an earlier citation. The watcher must use
-- insert ... on conflict do nothing.
create function public.block_aio_check_update()
returns trigger language plpgsql as $$
begin
  raise exception 'aio_checks is append-only evidence; insert a new check instead';
end $$;
create trigger aio_checks_append_only before update on public.aio_checks
  for each row execute function public.block_aio_check_update();

-- 3. Windows of the same client and query must not overlap (counts would double) ---
create function public.block_overlapping_window()
returns trigger language plpgsql as $$
begin
  if exists (
    select 1 from public.query_sets q
    where q.client_id = new.client_id and q.query = new.query
      and daterange(q.frozen_from, q.frozen_until, '[]') && daterange(new.frozen_from, new.frozen_until, '[]')
  ) then
    raise exception 'overlapping window for this client and query';
  end if;
  return new;
end $$;
create trigger query_sets_no_overlap before insert on public.query_sets
  for each row execute function public.block_overlapping_window();

-- 4. Staff-only columns are not readable by signed-in users ------------------------
-- cost_usd (API spend) and slack_error (may echo webhook details). Staff read them
-- through server code with the secret key. The portal must list explicit columns.
revoke select on public.aio_checks from authenticated;
grant select (id, client_id, query, checked_at, checked_on, surface, aio_present, cited, cited_url,
              source_position, source_count, organic_rank, organic_checked, other_domains,
              snapshot_path, off_top10)
  on public.aio_checks to authenticated;

revoke select on public.citation_cards from authenticated;
grant select (id, client_id, query, frozen_from, surface, cited_url, source_position, organic_rank,
              off_top10, first_seen_at, slack_posted_at)
  on public.citation_cards to authenticated;

grant select on public.sla_citations to authenticated;

-- 5. Future tables and functions stay usable by the server -------------------------
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- 6. Storage: bucket stays private, and the path check cannot raise on bad input -----
update storage.buckets set public = false where id = 'snapshots';

drop policy "read own snapshots" on storage.objects;
create policy "read own snapshots" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'snapshots'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.can_read_client(((storage.foldername(name))[1])::uuid)
  );

-- 7. Rate limiter cleanup uses an index ----------------------------------------------
create index on public.ingest_rate_limits (bucket);
