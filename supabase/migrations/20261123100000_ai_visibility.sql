-- Phase 8: AI visibility (D-040). Informational module: where AI answers (Google AI Overview and ChatGPT) already mention
-- the client's domain, from DataForSEO's LLM Mentions database. It is NOT part of the citation SLA: it is a snapshot of a
-- database, not a measurement in the frozen conditions, so every row carries the date it was captured and the dates the
-- answer was recorded.

-- One row per client, platform and capture day. total_count is how many AI answers mention the domain in the whole
-- database; the rows in ai_mentions are only the top ones by search volume.
create table public.ai_mention_runs (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null check (platform in ('google', 'chat_gpt')),
  captured_on date not null,
  total_count integer not null check (total_count >= 0),
  rows_stored integer not null check (rows_stored >= 0),
  snapshot_path text not null,               -- raw JSON in the private bucket 'snapshots'
  cost_usd numeric(8,4) not null default 0,  -- staff only (column grant below)
  created_at timestamptz not null default now(),
  unique (client_id, platform, captured_on)
);

create table public.ai_mentions (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null check (platform in ('google', 'chat_gpt')),
  captured_on date not null,
  question text not null,
  ai_search_volume integer,                  -- monthly searches of this question in AI products, as reported by DataForSEO
  first_response_at timestamptz,             -- when DataForSEO first / last recorded an answer to it
  last_response_at timestamptz,
  -- 'cited': the client is among the sources of the answer. 'consulted': the AI read a page of the client while answering
  -- (ChatGPT reports the pages it searched) but did not cite it. They are different things and are always shown apart.
  relation text not null check (relation in ('cited', 'consulted')),
  source_count integer not null default 0,   -- sources in the recorded answer
  client_source_rank integer,                -- position of the client's source in that list (1 = first); null when only consulted
  client_url text,
  other_domains text[] not null default '{}', -- domains cited next to the client, in order
  created_at timestamptz not null default now(),
  unique (client_id, platform, captured_on, question)
);
create index ai_mentions_client_idx on public.ai_mentions (client_id, captured_on desc, ai_search_volume desc);

alter table public.ai_mention_runs enable row level security;
alter table public.ai_mentions enable row level security;

create policy "read own ai mention runs" on public.ai_mention_runs
  for select to authenticated using (public.can_read_client(client_id));
create policy "read own ai mentions" on public.ai_mentions
  for select to authenticated using (public.can_read_client(client_id));

-- Users read, never write. cost_usd is withheld from signed-in users (same rule as aio_checks).
grant select on public.ai_mentions to authenticated;
grant select (id, client_id, platform, captured_on, total_count, rows_stored, snapshot_path, created_at)
  on public.ai_mention_runs to authenticated;
grant all on public.ai_mention_runs, public.ai_mentions to service_role;
grant all on sequence public.ai_mention_runs_id_seq, public.ai_mentions_id_seq to service_role;
