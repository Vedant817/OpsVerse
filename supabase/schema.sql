create extension if not exists pgcrypto;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  module text,
  status text not null default 'created',
  severity text,
  created_at timestamptz not null default now()
);

create table if not exists public.incident_evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  type text not null,
  content text,
  file_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  agent_name text not null,
  status text not null,
  latency_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  tokens_per_second numeric,
  time_info jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  event_type text not null,
  agent_name text,
  run_status text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.speed_benchmarks (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade,
  provider text not null,
  model text not null,
  total_latency_ms integer not null,
  total_tokens integer,
  average_tokens_per_second numeric,
  agent_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete set null,
  label text not null,
  notes text,
  final_package jsonb,
  created_at timestamptz not null default now()
);

create index if not exists incidents_created_at_idx
  on public.incidents (created_at desc);

create index if not exists incidents_status_created_at_idx
  on public.incidents (status, created_at desc);

create index if not exists incident_evidence_incident_id_idx
  on public.incident_evidence (incident_id, created_at);

create index if not exists incident_evidence_type_idx
  on public.incident_evidence (type);

create index if not exists agent_runs_incident_id_created_at_idx
  on public.agent_runs (incident_id, created_at);

create index if not exists agent_runs_agent_name_idx
  on public.agent_runs (agent_name);

create index if not exists agent_events_incident_id_created_at_idx
  on public.agent_events (incident_id, created_at);

create index if not exists agent_events_event_type_idx
  on public.agent_events (event_type);

create index if not exists speed_benchmarks_incident_id_idx
  on public.speed_benchmarks (incident_id, created_at desc);
