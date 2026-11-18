-- Phase 5: CrUX job (D-031).
-- What to query for each client. CrUX distinguishes exact origins (https://www.x.com and https://x.com are different),
-- so targets are listed explicitly instead of being derived from clients.domain. Server only: no user policies.
create table public.crux_targets (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  scope text not null check (scope in ('origin', 'url')),
  target text not null check (target ~ '^https?://'),
  created_at timestamptz not null default now(),
  unique (client_id, scope, target)
);
alter table public.crux_targets enable row level security;
grant all on public.crux_targets to service_role;
grant all on sequence public.crux_targets_id_seq to service_role;
-- crux_history already exists (initial schema) with one row per target and 28-day period, readable by the client's users.
