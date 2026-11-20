-- ChatGPT runs (D-048). Informational module, NOT part of the citation SLA: ChatGPT changes its answer from one run to the
-- next, so one run is never evidence. Each row is ONE run of one query (several runs of the same query are the point: the
-- portal shows how many runs cited the client). The raw response of every run is kept in the private bucket 'snapshots'.

create table public.llm_runs (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null check (platform in ('chat_gpt')),
  query text not null,
  run_at timestamptz not null,                -- when the answer was produced (DataForSEO's datetime)
  run_on date not null,                       -- UTC day of run_at
  -- 'cited': the client is among the sources of the answer. 'consulted': the AI read a page of the client while searching but
  -- did not cite it. 'none': neither. Cited and consulted are different things and are always shown apart.
  relation text not null check (relation in ('cited', 'consulted', 'none')),
  source_count integer not null default 0 check (source_count >= 0),   -- sources cited in the answer
  client_source_rank integer,                 -- position of the client's source (1 = first); null unless cited
  client_url text,                            -- the client page cited, or consulted when not cited
  other_domains text[] not null default '{}', -- domains cited next to the client, in order, without "www."
  consulted_count integer not null default 0 check (consulted_count >= 0), -- pages the AI read (cited or not)
  snapshot_path text not null,                -- raw JSON in the private bucket 'snapshots'
  cost_usd numeric(8,4) not null default 0,   -- staff only (column grant below)
  created_at timestamptz not null default now(),
  unique (client_id, snapshot_path)           -- every run has its own file, so loading one twice is a no-op
);
create index llm_runs_client_idx on public.llm_runs (client_id, query, run_at desc);

alter table public.llm_runs enable row level security;

create policy "read own llm runs" on public.llm_runs
  for select to authenticated using (public.can_read_client(client_id));

-- Users read, never write. cost_usd is withheld from signed-in users (same rule as aio_checks and ai_mention_runs).
grant select (id, client_id, platform, query, run_at, run_on, relation, source_count, client_source_rank, client_url,
              other_domains, consulted_count, snapshot_path, created_at)
  on public.llm_runs to authenticated;
grant all on public.llm_runs to service_role;
grant all on sequence public.llm_runs_id_seq to service_role;

-- The Admin Costs screen reads this view: it now also counts the ChatGPT runs ("checks" = runs).
create or replace view public.cost_by_client_day with (security_invoker = true) as
select client_id,
       day,
       sum(checks)::bigint as checks,
       coalesce(sum(cost_usd), 0) as cost_usd
from (
  select client_id, checked_on as day, count(*) as checks, coalesce(sum(cost_usd), 0) as cost_usd
  from public.aio_checks
  group by client_id, checked_on
  union all
  select client_id, run_on as day, count(*) as checks, coalesce(sum(cost_usd), 0) as cost_usd
  from public.llm_runs
  group by client_id, run_on
) spend
group by client_id, day;

grant select on public.cost_by_client_day to service_role;
