create extension if not exists pgcrypto;

create type public.plan_code as enum ('free', 'cycle');
create type public.publication_state as enum ('draft', 'review', 'published', 'withdrawn');
create type public.opportunity_state as enum ('open', 'closed', 'unknown');
create type public.application_stage as enum (
  'planned', 'preparing', 'submitted', 'online-assessment', 'interview',
  'assessment-centre', 'decision', 'offer', 'declined', 'withdrawn'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  current_stage text check (current_stage in ('Year 12', 'Year 13')),
  application_cycle integer,
  home_region text,
  max_travel_minutes integer check (max_travel_minutes between 0 and 360),
  relocation_preference text check (relocation_preference in ('stay-local', 'could-relocate', 'unsure')),
  route_intent text check (route_intent in ('university', 'apprenticeship', 'combined')),
  sectors text[] not null default '{}',
  work_styles text[] not null default '{}',
  financial_preference text,
  constraints text[] not null default '{}',
  experience_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  qualification_type text not null,
  subject text not null,
  grade text,
  status text not null check (status in ('predicted', 'achieved', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  policy_kind text not null,
  policy_version text not null,
  granted boolean not null,
  recorded_at timestamptz not null default now(),
  unique (user_id, policy_kind, policy_version)
);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('university-provider', 'employer', 'training-provider')),
  name text not null,
  website_url text,
  source_authority text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, name)
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id),
  source_id text,
  kind text not null check (kind in ('university-course', 'apprenticeship-vacancy', 'external')),
  sector text not null check (sector in ('technology', 'engineering', 'business', 'finance')),
  title text not null,
  provider_name text not null,
  location text not null,
  summary text not null,
  deadline timestamptz,
  application_url text not null,
  source_url text not null,
  source_authority text not null,
  retrieved_at timestamptz not null,
  verified_at timestamptz,
  freshness text not null check (freshness in ('high', 'medium', 'low', 'needs-checking')),
  state public.opportunity_state not null default 'unknown',
  publication_state public.publication_state not null default 'draft',
  raw_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_authority, source_id)
);

create table public.source_runs (
  id uuid primary key default gen_random_uuid(),
  source_authority text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('running', 'completed', 'failed')),
  retrieved_count integer not null default 0,
  published_count integer not null default 0,
  source_url text not null,
  snapshot_hash text,
  error_code text,
  metadata jsonb not null default '{}'
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  kind text not null,
  label text not null,
  structured_value jsonb,
  supporting_text text not null,
  source_url text not null,
  retrieved_at timestamptz not null,
  verified_at timestamptz,
  freshness text not null check (freshness in ('high', 'medium', 'low', 'needs-checking')),
  conflict boolean not null default false,
  hard_requirement boolean not null default false,
  publication_state public.publication_state not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publication_reviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision public.publication_state not null,
  note text,
  reviewed_at timestamptz not null default now(),
  check ((opportunity_id is not null) <> (requirement_id is not null))
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id),
  external_title text,
  external_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opportunity_id is not null or (external_title is not null and external_url is not null))
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null,
  happened text not null,
  contribution text not null,
  outcome text not null,
  learned text not null,
  supporting_detail text,
  evidence_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence_requirement_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_id uuid not null references public.evidence_items(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  relevance text not null,
  coverage text not null check (coverage in ('supported', 'weak', 'missing', 'apparently-unmet', 'needs-confirmation')),
  missing_specificity text,
  confirmed_by_student boolean not null default false,
  assessment_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evidence_id, requirement_id)
);

create table public.assessment_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  input_hash text not null,
  summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_item_id uuid references public.portfolio_items(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete set null,
  title text not null,
  why_it_matters text not null,
  effort_minutes integer not null check (effort_minutes between 5 and 1440),
  due_date date,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'deferred')),
  reflection text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_refreshes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  refreshed_at timestamptz not null default now(),
  input_hash text not null,
  selected_task_ids uuid[] not null default '{}'
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  portfolio_item_id uuid not null references public.portfolio_items(id) on delete cascade,
  stage public.application_stage not null default 'planned',
  deadline timestamptz,
  official_url text not null,
  next_action text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_item_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan public.plan_code not null default 'free',
  status text not null default 'active' check (status in ('active', 'refunded', 'disputed', 'expired')),
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  last_payment_event_created_at bigint not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.stripe_events (
  id text primary key,
  event_type text not null,
  event_created_at bigint not null,
  processing_status text not null default 'processing' check (processing_status in ('processing', 'processed', 'failed')),
  error_code text,
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_checkout_session_id text not null unique,
  amount_pence integer not null check (amount_pence > 0),
  currency text not null default 'gbp',
  offer text not null check (offer in ('founding-launch', 'standard')),
  status text not null check (status in ('paid', 'refunded', 'disputed')),
  purchased_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (event_name in (
    'readiness_started', 'readiness_completed', 'opportunity_saved', 'evidence_added',
    'action_scheduled', 'action_completed', 'paywall_viewed', 'checkout_started',
    'checkout_completed', 'application_stage_updated', 'source_issue_reported',
    'export_requested', 'deletion_requested'
  )),
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.source_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  issue_kind text not null,
  detail text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

create table public.prototype_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  source_hash text not null,
  imported_at timestamptz not null default now(),
  unique (user_id, source_key, source_hash)
);

create table public.rate_limit_buckets (
  key text primary key,
  count integer not null default 1,
  window_started_at timestamptz not null default now()
);

create index qualifications_user_idx on public.qualifications(user_id);
create index opportunities_public_idx on public.opportunities(publication_state, state, sector);
create index requirements_opportunity_idx on public.requirements(opportunity_id);
create index portfolio_user_idx on public.portfolio_items(user_id, active);
create index evidence_user_idx on public.evidence_items(user_id, archived);
create index tasks_user_idx on public.tasks(user_id, status, due_date);
create index applications_user_idx on public.applications(user_id, stage);

alter table public.profiles enable row level security;
alter table public.qualifications enable row level security;
alter table public.consent_records enable row level security;
alter table public.opportunities enable row level security;
alter table public.organisations enable row level security;
alter table public.source_runs enable row level security;
alter table public.requirements enable row level security;
alter table public.publication_reviews enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.evidence_items enable row level security;
alter table public.evidence_requirement_links enable row level security;
alter table public.assessment_versions enable row level security;
alter table public.tasks enable row level security;
alter table public.plan_refreshes enable row level security;
alter table public.applications enable row level security;
alter table public.entitlements enable row level security;
alter table public.stripe_events enable row level security;
alter table public.orders enable row level security;
alter table public.audit_events enable row level security;
alter table public.analytics_events enable row level security;
alter table public.source_issues enable row level security;
alter table public.prototype_imports enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy "users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users manage own qualifications" on public.qualifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own consents" on public.consent_records for select using (auth.uid() = user_id);
create policy "users add own consents" on public.consent_records for insert with check (auth.uid() = user_id);
create policy "users update own consents" on public.consent_records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "published opportunities are public" on public.opportunities for select using (publication_state = 'published');
create policy "organisations are public" on public.organisations for select using (true);
create policy "published requirements are public" on public.requirements for select using (publication_state = 'published');
create policy "users manage own portfolio" on public.portfolio_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own evidence" on public.evidence_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own evidence links" on public.evidence_requirement_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own assessment versions" on public.assessment_versions for select using (auth.uid() = user_id);
create policy "users add own assessment versions" on public.assessment_versions for insert with check (auth.uid() = user_id);
create policy "users manage own tasks" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own plan refreshes" on public.plan_refreshes for select using (auth.uid() = user_id);
create policy "users add own plan refreshes" on public.plan_refreshes for insert with check (auth.uid() = user_id);
create policy "users manage own applications" on public.applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own entitlements" on public.entitlements for select using (auth.uid() = user_id);
create policy "users read own orders" on public.orders for select using (auth.uid() = user_id);
create policy "users read own audit" on public.audit_events for select using (auth.uid() = user_id);
create policy "users add own audit" on public.audit_events for insert with check (auth.uid() = user_id);
create policy "users add own analytics" on public.analytics_events for insert with check (auth.uid() = user_id);
create policy "users read own analytics" on public.analytics_events for select using (auth.uid() = user_id);
create policy "users add source issues" on public.source_issues for insert with check (auth.uid() = user_id);
create policy "users read own source issues" on public.source_issues for select using (auth.uid() = user_id);
create policy "users manage own prototype imports" on public.prototype_imports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.consume_rate_limit(bucket_key text, maximum integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bucket public.rate_limit_buckets;
begin
  insert into public.rate_limit_buckets(key, count, window_started_at)
  values (bucket_key, 1, now())
  on conflict (key) do update
  set count = case
      when public.rate_limit_buckets.window_started_at < now() - make_interval(secs => window_seconds) then 1
      else public.rate_limit_buckets.count + 1
    end,
    window_started_at = case
      when public.rate_limit_buckets.window_started_at < now() - make_interval(secs => window_seconds) then now()
      else public.rate_limit_buckets.window_started_at
    end
  returning * into current_bucket;

  return current_bucket.count <= maximum;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated, service_role;
