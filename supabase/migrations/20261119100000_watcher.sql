-- Phase 3: watcher support (D-023).

-- Which watcher mode may touch a client:
--   real    -> only live runs (real DataForSEO data, real SLA evidence)
--   demo    -> never touched by a job (static demo data from seed:demo)
--   sandbox -> only dry-run (fixtures), so fake data never mixes with real evidence
alter table public.clients
  add column kind text not null default 'real' check (kind in ('real', 'demo', 'sandbox'));
update public.clients set kind = 'demo' where id = '00000000-0000-4000-8000-000000000001';

-- One row per watcher run: the audit trail for the SLA and the source for the admin cost view. Server only.
create table public.watcher_runs (
  id bigint generated always as identity primary key,
  mode text not null check (mode in ('dry_run', 'live')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  checks_written int not null default 0,
  queries_ok int not null default 0,
  queries_failed int not null default 0,
  cost_usd numeric(10,5) not null default 0,
  errors jsonb not null default '[]'
);
alter table public.watcher_runs enable row level security;   -- no policies: only the secret key reads or writes
grant all on public.watcher_runs to service_role;
grant all on sequence public.watcher_runs_id_seq to service_role;
