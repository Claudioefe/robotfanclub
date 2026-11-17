-- Robot Fan Club — initial schema (Phase 1).
-- Based on supabase/schema.sql plus the fixes logged in docs/en/DECISIONS.md (D-009, D-010, D-015).
--
-- Access model:
--   * Reads: staff, or members of the client, through RLS (authenticated role only).
--   * Writes: only jobs and server endpoints using the secret key (service_role). No write policies exist.
--   * The Supabase project has "automatically expose new tables" turned OFF, so every privilege
--     is granted explicitly below. anon gets nothing.

create extension if not exists pgcrypto;

-- Clients and access ----------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null check (domain = lower(domain) and domain !~ '^www\.'),  -- no www, e.g. northwindsec.com
  service_fee_usd numeric(10,2),              -- base of the 20% clawback credit
  slack_webhook_url text,                     -- optional (Phase 6). Never readable by client users.
  created_at timestamptz not null default now()
);

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.client_members (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (client_id, user_id)
);
create index on public.client_members (user_id);

-- true if the current user is staff or a member of the client
create or replace function public.can_read_client(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid())
      or exists (select 1 from public.client_members where client_id = cid and user_id = auth.uid());
$$;

-- Frozen query lists (one row per query and window) ---------------------------

create table public.query_sets (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  query text not null,
  frozen_from date not null,
  frozen_until date not null,
  unique (client_id, query, frozen_from),
  check (frozen_until = frozen_from + 59)     -- 60-day window, inclusive
);

-- A frozen list is never edited: to change it, create a new window.
create function public.block_query_set_update()
returns trigger language plpgsql as $$
begin
  raise exception 'query_sets rows are frozen; create a new window instead';
end $$;
create trigger query_sets_frozen before update on public.query_sets
  for each row execute function public.block_query_set_update();

-- Daily checks of AI answers ---------------------------------------------------

create table public.aio_checks (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  query text not null,
  checked_at timestamptz not null default now(),
  checked_on date not null default ((now() at time zone 'utc')::date),  -- UTC day, makes checks idempotent
  surface text not null check (surface in ('ai_overview', 'ai_mode')),
  aio_present boolean not null,
  cited boolean not null default false,
  cited_url text,
  source_position int,
  source_count int,
  organic_rank int,                           -- rank of the cited URL; null = not in the organic top 10
  other_domains text[],
  snapshot_path text,                         -- Storage: snapshots/{client_id}/{date}/{surface}/{slug}.json
  cost_usd numeric(10,5),
  off_top10 boolean generated always as (cited and (organic_rank is null or organic_rank > 10)) stored,
  unique (client_id, query, surface, checked_on)
);
create index on public.aio_checks (client_id, query, checked_at);

-- Real-user speed events -----------------------------------------------------

create table public.vitals (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  metric text not null check (metric in ('INP', 'LCP', 'CLS')),
  value integer not null,                     -- ms; CLS x1000
  rating text,
  device text check (device in ('mobile', 'desktop')),
  url_template text not null,
  nav_type text,
  attribution jsonb,
  created_at timestamptz not null default now()
);
create index on public.vitals (client_id, metric, created_at);

-- CrUX history (Phase 5): one row per target and collection period ------------

create table public.crux_history (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  scope text not null check (scope in ('origin', 'url')),
  target text not null,                       -- origin or URL queried
  form_factor text not null default 'PHONE',
  period_start date not null,                 -- CrUX 28-day collection period
  period_end date not null,
  inp_p75_ms integer,
  inp_good_share numeric(5,4),
  fetched_at timestamptz not null default now(),
  unique (client_id, scope, target, form_factor, period_end)
);
create index on public.crux_history (client_id, period_end);

-- Tag Bouncer (Phase 4): third-party scripts and the action chosen -------------

create table public.tag_bouncer_scripts (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  script_url text not null,
  script_host text not null,
  blocking_ms integer,                        -- estimate only; the UI must say so
  action text not null default 'keep'
    check (action in ('keep', 'load_on_first_interaction', 'move_server_side', 'remove')),
  excluded_from_sla boolean not null default false,  -- scripts the client decides to keep are outside the INP SLA
  updated_at timestamptz not null default now(),
  unique (client_id, script_url)
);

-- Citation Cards (Phase 6): first citation of a query in a window --------------

create table public.citation_cards (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  query text not null,
  frozen_from date not null,
  surface text not null check (surface in ('ai_overview', 'ai_mode')),
  cited_url text not null,
  source_position int,
  organic_rank int,
  off_top10 boolean not null,
  first_seen_at timestamptz not null,
  slack_posted_at timestamptz,
  slack_error text,
  unique (client_id, query, frozen_from)
);

-- Mini-Scan (Phase 7): public lead-gen scans. No client_id, so no user policies;
-- only the server (secret key) reads and writes. The weekly cap is counted from created_at.

create table public.mini_scans (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  email text,
  queries text[] not null check (cardinality(queries) <= 25),
  result jsonb,
  cost_usd numeric(10,5),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index on public.mini_scans (created_at);

-- Ingest rate limit (Phase 4): persisted, because serverless memory is not shared -------

create table public.ingest_rate_limits (
  client_id uuid not null,
  ip_hash text not null,
  bucket timestamptz not null,                -- one-minute bucket
  hits int not null default 0,
  primary key (client_id, ip_hash, bucket)
);

create function public.ingest_rate_check(p_client uuid, p_ip_hash text, p_limit int)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  delete from public.ingest_rate_limits where bucket < now() - interval '1 hour';
  insert into public.ingest_rate_limits (client_id, ip_hash, bucket, hits)
  values (p_client, p_ip_hash, date_trunc('minute', now()), 1)
  on conflict (client_id, ip_hash, bucket)
  do update set hits = public.ingest_rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- Views (security_invoker so RLS applies) ---------------------------------------

-- SLA count: one citation per query and window, first appearance.
-- A query counts if cited on AI Overview OR AI Mode (D-005).
create view public.sla_citations with (security_invoker = true) as
select c.client_id,
       q.frozen_from,
       c.query,
       min(c.checked_at) as first_seen,
       bool_or(c.off_top10) as any_off_top10,   -- D-009: off-top10 if any cited check was
       array_agg(distinct c.surface) as surfaces
from public.aio_checks c
join public.query_sets q
  on q.client_id = c.client_id and q.query = c.query
where c.cited
  and c.checked_on between q.frozen_from and q.frozen_until
group by c.client_id, q.frozen_from, c.query;

-- Citation rate: % of checks with an AI answer where the client was cited, per window
create view public.citation_rate with (security_invoker = true) as
select c.client_id,
       q.frozen_from,
       c.query,
       c.surface,
       count(*) filter (where c.aio_present) as checks_with_ai,
       count(*) filter (where c.cited) as checks_cited,
       count(*) filter (where c.cited)::numeric
         / nullif(count(*) filter (where c.aio_present), 0) as rate
from public.aio_checks c
join public.query_sets q
  on q.client_id = c.client_id and q.query = c.query
where c.checked_on between q.frozen_from and q.frozen_until
group by c.client_id, q.frozen_from, c.query, c.surface;

-- INP p75 mobile by template, last 28 days
create view public.inp_p75 with (security_invoker = true) as
select client_id, url_template,
       percentile_cont(0.75) within group (order by value) as p75,
       count(*) as interactions
from public.vitals
where metric = 'INP' and device = 'mobile'
  and created_at > now() - interval '28 days'
group by client_id, url_template;

-- RLS ---------------------------------------------------------------------------

alter table public.clients enable row level security;
alter table public.staff enable row level security;
alter table public.client_members enable row level security;
alter table public.query_sets enable row level security;
alter table public.aio_checks enable row level security;
alter table public.vitals enable row level security;
alter table public.crux_history enable row level security;
alter table public.tag_bouncer_scripts enable row level security;
alter table public.citation_cards enable row level security;
alter table public.mini_scans enable row level security;            -- no policies: server only
alter table public.ingest_rate_limits enable row level security;    -- no policies: server only

create policy "read own clients" on public.clients
  for select to authenticated using (public.can_read_client(id));

create policy "staff reads staff" on public.staff
  for select to authenticated using (user_id = auth.uid());

create policy "read own memberships" on public.client_members
  for select to authenticated using (user_id = auth.uid() or public.can_read_client(client_id));

create policy "read own query sets" on public.query_sets
  for select to authenticated using (public.can_read_client(client_id));

create policy "read own checks" on public.aio_checks
  for select to authenticated using (public.can_read_client(client_id));

create policy "read own vitals" on public.vitals
  for select to authenticated using (public.can_read_client(client_id));

create policy "read own crux history" on public.crux_history
  for select to authenticated using (public.can_read_client(client_id));

create policy "read own tag bouncer" on public.tag_bouncer_scripts
  for select to authenticated using (public.can_read_client(client_id));

create policy "read own citation cards" on public.citation_cards
  for select to authenticated using (public.can_read_client(client_id));

-- Privileges (explicit, see header) ----------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

-- authenticated: read-only. On clients, the Slack webhook column is withheld.
grant select (id, name, domain, service_fee_usd, created_at) on public.clients to authenticated;
grant select on public.staff, public.client_members, public.query_sets, public.aio_checks,
                public.vitals, public.crux_history, public.tag_bouncer_scripts,
                public.citation_cards, public.sla_citations, public.citation_rate,
                public.inp_p75 to authenticated;

-- service_role: full access for jobs and server endpoints
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Functions: RLS needs can_read_client for signed-in users; the rate limiter is server only
revoke execute on function public.can_read_client(uuid) from public, anon;
grant execute on function public.can_read_client(uuid) to authenticated, service_role;
revoke execute on function public.ingest_rate_check(uuid, text, int) from public, anon, authenticated;
grant execute on function public.ingest_rate_check(uuid, text, int) to service_role;

-- Storage: private bucket for raw JSON snapshots (the SLA evidence) --------------
-- Path: {client_id}/{date}/{surface}/{query-slug}.json. Only the server writes.

insert into storage.buckets (id, name, public)
values ('snapshots', 'snapshots', false)
on conflict (id) do nothing;

create policy "read own snapshots" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'snapshots'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and public.can_read_client(((storage.foldername(name))[1])::uuid)
  );
