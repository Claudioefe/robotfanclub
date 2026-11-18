-- Phase 7C: Mini-Scan (public lead-gen scan, off until the owner enables it). D-038.
-- The table already exists (initial schema): server only, no user policies. A scan is queued by the public form and
-- processed by a separate job, because a real SERP call takes ~80 seconds.
alter table public.mini_scans
  add column status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
  -- Simulated and real scans never mix: each job mode processes only its own (like clients.kind, D-023)
  add column simulated boolean not null default false,
  -- Unguessable link to the result page: the only "credential" the visitor needs to see their own scan
  add column public_token uuid not null default gen_random_uuid(),
  add column error text,
  add column completed_at timestamptz;

create unique index mini_scans_public_token_key on public.mini_scans (public_token);
create index mini_scans_status_idx on public.mini_scans (status, created_at);
create index mini_scans_ip_idx on public.mini_scans (ip_hash, created_at);
