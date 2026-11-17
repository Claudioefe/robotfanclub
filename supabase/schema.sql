-- Esquema inicial de Citable. Punto de partida: convertirlo en la primera migración.

create extension if not exists pgcrypto;

-- Clientes y accesos ---------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,                       -- sin www, ej: northwindsec.com
  service_fee_usd numeric(10,2),              -- base del clawback (20%)
  slack_webhook_url text,                     -- opcional (Fase 6)
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

-- true si el usuario actual es staff o miembro del cliente
create or replace function public.can_read_client(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid())
      or exists (select 1 from public.client_members where client_id = cid and user_id = auth.uid());
$$;

-- Listas de queries congeladas (una fila por query y ventana) ----------------

create table public.query_sets (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  query text not null,
  frozen_from date not null,
  frozen_until date not null,
  unique (client_id, query, frozen_from),
  check (frozen_until >= frozen_from)
);

-- Chequeos diarios de respuestas de IA ---------------------------------------

create table public.aio_checks (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  query text not null,
  checked_at timestamptz not null default now(),
  surface text not null check (surface in ('ai_overview', 'ai_mode')),
  aio_present boolean not null,
  cited boolean not null default false,
  cited_url text,
  source_position int,
  source_count int,
  organic_rank int,                           -- rank de la URL citada; null = no está en el top 10
  other_domains text[],
  snapshot_path text,                         -- Storage: snapshots/...
  cost_usd numeric(10,5),
  off_top10 boolean generated always as (cited and organic_rank is null) stored
);
create index on public.aio_checks (client_id, query, checked_at);

-- Velocidad: eventos de visitantes reales ------------------------------------

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

-- Vistas (security_invoker para que apliquen las políticas RLS) ---------------

-- Conteo del SLA: una cita por query y ventana, primera aparición
create view public.sla_citations with (security_invoker = true) as
select c.client_id,
       q.frozen_from,
       c.query,
       min(c.checked_at) as first_seen,
       bool_or(c.off_top10) as any_off_top10,
       array_agg(distinct c.surface) as surfaces
from public.aio_checks c
join public.query_sets q
  on q.client_id = c.client_id and q.query = c.query
where c.cited
  and c.checked_at::date between q.frozen_from and q.frozen_until
group by c.client_id, q.frozen_from, c.query;

-- Tasa de cita: % de chequeos con respuesta de IA en los que el cliente fue citado
create view public.citation_rate with (security_invoker = true) as
select client_id, query, surface,
       count(*) filter (where aio_present) as checks_with_ai,
       count(*) filter (where cited) as checks_cited,
       count(*) filter (where cited)::numeric
         / nullif(count(*) filter (where aio_present), 0) as rate
from public.aio_checks
group by client_id, query, surface;

-- INP p75 mobile por template, últimos 28 días
create view public.inp_p75 with (security_invoker = true) as
select client_id, url_template,
       percentile_cont(0.75) within group (order by value) as p75,
       count(*) as interactions
from public.vitals
where metric = 'INP' and device = 'mobile'
  and created_at > now() - interval '28 days'
group by client_id, url_template;

-- RLS -------------------------------------------------------------------------
-- Lectura: staff o miembros del cliente. Escritura: solo jobs y endpoints con la secret key
-- (que no pasa por RLS), así que no hay políticas de insert/update para usuarios.

alter table public.clients enable row level security;
alter table public.staff enable row level security;
alter table public.client_members enable row level security;
alter table public.query_sets enable row level security;
alter table public.aio_checks enable row level security;
alter table public.vitals enable row level security;

create policy "read own clients" on public.clients
  for select using (public.can_read_client(id));

create policy "staff reads staff" on public.staff
  for select using (user_id = auth.uid());

create policy "read own memberships" on public.client_members
  for select using (user_id = auth.uid() or public.can_read_client(client_id));

create policy "read own query sets" on public.query_sets
  for select using (public.can_read_client(client_id));

create policy "read own checks" on public.aio_checks
  for select using (public.can_read_client(client_id));

create policy "read own vitals" on public.vitals
  for select using (public.can_read_client(client_id));

-- Storage: crear el bucket privado "snapshots" y una política de lectura por client_id
-- (primer segmento de la ruta). Lo hace Claude Code en la Fase 1.
