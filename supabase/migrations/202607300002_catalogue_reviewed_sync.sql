-- Commercial catalogue observations and revisions. Existing published facts remain
-- authoritative until a reviewer explicitly accepts a pending revision.
alter table public.opportunities drop constraint if exists opportunities_sector_check;
alter table public.opportunities add constraint opportunities_sector_check
  check (sector in ('technology', 'engineering', 'business', 'finance', 'unclassified'));
alter table public.opportunities add column if not exists last_seen_at timestamptz;
alter table public.opportunities add column if not exists freshness_expires_at timestamptz;
alter table public.opportunities add column if not exists source_approval_reference text;
alter table public.source_runs add column if not exists complete_snapshot boolean not null default false;
alter table public.source_runs add column if not exists records_changed integer not null default 0;
create unique index if not exists source_runs_one_active_per_source
  on public.source_runs(source_authority) where status = 'running';

create table if not exists public.catalogue_observations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  source_run_id uuid not null references public.source_runs(id) on delete cascade,
  source_authority text not null,
  source_id text not null,
  source_url text not null,
  retrieved_at timestamptz not null,
  snapshot_hash text not null,
  normalized_fact jsonb not null,
  raw_fact jsonb,
  classification_reason text,
  classification_version text,
  created_at timestamptz not null default now(),
  unique (source_run_id, source_authority, source_id)
);

create table if not exists public.catalogue_fact_revisions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  observation_id uuid references public.catalogue_observations(id) on delete set null,
  field_changes jsonb not null,
  proposed_fact jsonb not null,
  status text not null check (status in ('pending', 'accepted', 'rejected', 'superseded', 'withdrawn')) default 'pending',
  reviewer_id uuid references auth.users(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists catalogue_observations_opportunity_idx on public.catalogue_observations(opportunity_id, retrieved_at desc);
create index if not exists catalogue_revisions_opportunity_idx on public.catalogue_fact_revisions(opportunity_id, status);
alter table public.catalogue_observations enable row level security;
alter table public.catalogue_fact_revisions enable row level security;
revoke all privileges on table public.catalogue_observations, public.catalogue_fact_revisions from anon, authenticated;
