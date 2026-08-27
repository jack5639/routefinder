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
  check (
    (opportunity_id is not null and external_title is null and external_url is null)
    or
    (opportunity_id is null and external_title is not null and external_url is not null)
  ),
  unique (user_id, id)
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
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.evidence_requirement_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_id uuid not null,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  relevance text not null,
  coverage text not null check (coverage in ('supported', 'weak', 'missing', 'apparently-unmet', 'needs-confirmation')),
  missing_specificity text,
  confirmed_by_student boolean not null default false,
  assessment_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evidence_id, requirement_id),
  foreign key (user_id, evidence_id)
    references public.evidence_items(user_id, id)
    on delete cascade
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
  portfolio_item_id uuid,
  requirement_id uuid references public.requirements(id) on delete set null,
  title text not null,
  why_it_matters text not null,
  effort_minutes integer not null check (effort_minutes between 5 and 1440),
  due_date date,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'deferred')),
  reflection text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, portfolio_item_id)
    references public.portfolio_items(user_id, id)
    on delete cascade
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
  portfolio_item_id uuid not null,
  stage public.application_stage not null default 'planned',
  deadline timestamptz,
  official_url text not null,
  next_action text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_item_id),
  foreign key (user_id, portfolio_item_id)
    references public.portfolio_items(user_id, id)
    on delete cascade
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

create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "users read own qualifications" on public.qualifications
  for select using (auth.uid() = user_id);
create policy "users read own consents" on public.consent_records
  for select using (auth.uid() = user_id);
create policy "published opportunities are public" on public.opportunities
  for select using (publication_state = 'published');
create policy "published organisations are public" on public.organisations
  for select using (
    exists (
      select 1
      from public.opportunities
      where opportunities.organisation_id = organisations.id
        and opportunities.publication_state = 'published'
    )
  );
create policy "published requirements of published opportunities are public" on public.requirements
  for select using (
    publication_state = 'published'
    and exists (
      select 1
      from public.opportunities
      where opportunities.id = requirements.opportunity_id
        and opportunities.publication_state = 'published'
    )
  );
create policy "users read own portfolio" on public.portfolio_items
  for select using (auth.uid() = user_id);
create policy "users read own evidence" on public.evidence_items
  for select using (auth.uid() = user_id);
create policy "users read own evidence links" on public.evidence_requirement_links
  for select using (auth.uid() = user_id);
create policy "users read own assessment versions" on public.assessment_versions
  for select using (auth.uid() = user_id);
create policy "users read own tasks" on public.tasks
  for select using (auth.uid() = user_id);
create policy "users read own plan refreshes" on public.plan_refreshes
  for select using (auth.uid() = user_id);
create policy "users read own applications" on public.applications
  for select using (auth.uid() = user_id);
create policy "users read own entitlements" on public.entitlements
  for select using (auth.uid() = user_id);
create policy "users read own orders" on public.orders
  for select using (auth.uid() = user_id);
create policy "users read own audit" on public.audit_events
  for select using (auth.uid() = user_id);
create policy "users read own source issues" on public.source_issues
  for select using (auth.uid() = user_id);
create policy "users read own prototype imports" on public.prototype_imports
  for select using (auth.uid() = user_id);

revoke all privileges on table
  public.profiles,
  public.qualifications,
  public.consent_records,
  public.organisations,
  public.opportunities,
  public.source_runs,
  public.requirements,
  public.publication_reviews,
  public.portfolio_items,
  public.evidence_items,
  public.evidence_requirement_links,
  public.assessment_versions,
  public.tasks,
  public.plan_refreshes,
  public.applications,
  public.entitlements,
  public.stripe_events,
  public.orders,
  public.audit_events,
  public.analytics_events,
  public.source_issues,
  public.prototype_imports,
  public.rate_limit_buckets
from anon, authenticated;

grant select on table
  public.profiles,
  public.qualifications,
  public.consent_records,
  public.portfolio_items,
  public.evidence_items,
  public.evidence_requirement_links,
  public.assessment_versions,
  public.tasks,
  public.plan_refreshes,
  public.applications,
  public.entitlements,
  public.orders,
  public.audit_events,
  public.source_issues,
  public.prototype_imports
to authenticated;

grant select (
  id,
  kind,
  name,
  website_url
) on public.organisations to anon, authenticated;

grant select (
  id,
  organisation_id,
  kind,
  sector,
  title,
  provider_name,
  location,
  summary,
  deadline,
  application_url,
  source_url,
  source_authority,
  retrieved_at,
  verified_at,
  freshness,
  state,
  publication_state
) on public.opportunities to anon, authenticated;

grant select (
  id,
  opportunity_id,
  kind,
  label,
  structured_value,
  supporting_text,
  source_url,
  retrieved_at,
  verified_at,
  freshness,
  conflict,
  hard_requirement,
  publication_state
) on public.requirements to anon, authenticated;

create or replace function public.effective_plan(p_user_id uuid)
returns public.plan_code
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select entitlements.plan
      from public.entitlements
      where entitlements.user_id = p_user_id
        and entitlements.plan = 'cycle'
        and entitlements.status = 'active'
        and entitlements.starts_at <= pg_catalog.now()
        and (entitlements.ends_at is null or entitlements.ends_at > pg_catalog.now())
      limit 1
    ),
    'free'::public.plan_code
  );
$$;

create or replace function public.enforce_portfolio_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  validate_opportunity boolean := true;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using errcode = '23514', message = 'relationship_invalid:portfolio_owner_immutable';
  end if;

  if tg_op = 'UPDATE' then
    validate_opportunity := new.opportunity_id is distinct from old.opportunity_id;
  end if;

  if new.opportunity_id is not null
    and validate_opportunity
    and not exists (
      select 1
      from public.opportunities
      where opportunities.id = new.opportunity_id
        and opportunities.publication_state = 'published'
    )
  then
    raise exception using errcode = '23514', message = 'relationship_invalid:published_opportunity_required';
  end if;

  if tg_op = 'INSERT' and new.active and public.effective_plan(new.user_id) = 'free' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('portfolio:' || new.user_id::text, 0)
    );

    select count(*)
    into active_count
    from public.portfolio_items
    where portfolio_items.user_id = new.user_id
      and portfolio_items.active
      and portfolio_items.id <> new.id;

    if active_count >= 5 then
      raise exception using errcode = 'P0001', message = 'entitlement_limit:active_opportunities';
    end if;
  elsif tg_op = 'UPDATE'
    and new.active
    and not old.active
    and public.effective_plan(new.user_id) = 'free'
  then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('portfolio:' || new.user_id::text, 0)
    );

    select count(*)
    into active_count
    from public.portfolio_items
    where portfolio_items.user_id = new.user_id
      and portfolio_items.active
      and portfolio_items.id <> new.id;

    if active_count >= 5 then
      raise exception using errcode = 'P0001', message = 'entitlement_limit:active_opportunities';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_evidence_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_count integer;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using errcode = '23514', message = 'relationship_invalid:evidence_owner_immutable';
  end if;

  if tg_op = 'INSERT'
    and not new.archived
    and public.effective_plan(new.user_id) = 'free'
  then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('evidence:' || new.user_id::text, 0)
    );

    select count(*)
    into evidence_count
    from public.evidence_items
    where evidence_items.user_id = new.user_id
      and not evidence_items.archived
      and evidence_items.id <> new.id;

    if evidence_count >= 10 then
      raise exception using errcode = 'P0001', message = 'entitlement_limit:evidence_items';
    end if;
  elsif tg_op = 'UPDATE'
    and not new.archived
    and old.archived
    and public.effective_plan(new.user_id) = 'free'
  then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('evidence:' || new.user_id::text, 0)
    );

    select count(*)
    into evidence_count
    from public.evidence_items
    where evidence_items.user_id = new.user_id
      and not evidence_items.archived
      and evidence_items.id <> new.id;

    if evidence_count >= 10 then
      raise exception using errcode = 'P0001', message = 'entitlement_limit:evidence_items';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_evidence_requirement_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  validate_relationship boolean := true;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using errcode = '23514', message = 'relationship_invalid:evidence_link_owner_immutable';
  end if;

  if tg_op = 'UPDATE' then
    validate_relationship :=
      new.evidence_id is distinct from old.evidence_id
      or new.requirement_id is distinct from old.requirement_id;
  end if;

  if validate_relationship then
    if not exists (
      select 1
      from public.requirements
      join public.opportunities
        on opportunities.id = requirements.opportunity_id
      join public.portfolio_items
        on portfolio_items.opportunity_id = opportunities.id
      where requirements.id = new.requirement_id
        and requirements.publication_state = 'published'
        and opportunities.publication_state = 'published'
        and portfolio_items.user_id = new.user_id
        and portfolio_items.active
    )
    then
      raise exception using errcode = '23514', message = 'relationship_invalid:saved_published_requirement_required';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  validate_relationship boolean := true;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using errcode = '23514', message = 'relationship_invalid:task_owner_immutable';
  end if;

  if tg_op = 'UPDATE' then
    validate_relationship :=
      new.portfolio_item_id is distinct from old.portfolio_item_id
      or new.requirement_id is distinct from old.requirement_id;
  end if;

  if new.requirement_id is not null
    and validate_relationship
    and not exists (
      select 1
      from public.portfolio_items
      join public.requirements
        on requirements.opportunity_id = portfolio_items.opportunity_id
      join public.opportunities
        on opportunities.id = requirements.opportunity_id
      where portfolio_items.id = new.portfolio_item_id
        and portfolio_items.user_id = new.user_id
        and requirements.id = new.requirement_id
        and requirements.publication_state = 'published'
        and opportunities.publication_state = 'published'
    )
  then
    raise exception using errcode = '23514', message = 'relationship_invalid:task_requirement_mismatch';
  end if;

  if tg_op = 'INSERT' and new.status in ('scheduled', 'deferred') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('tasks:' || new.user_id::text, 0)
    );

    select count(*)
    into active_count
    from public.tasks
    where tasks.user_id = new.user_id
      and tasks.status in ('scheduled', 'deferred')
      and tasks.id <> new.id;

    if active_count >= 3 then
      raise exception using errcode = 'P0001', message = 'workflow_limit:this_week_tasks';
    end if;
  elsif tg_op = 'UPDATE'
    and new.status in ('scheduled', 'deferred')
    and old.status not in ('scheduled', 'deferred')
  then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('tasks:' || new.user_id::text, 0)
    );

    select count(*)
    into active_count
    from public.tasks
    where tasks.user_id = new.user_id
      and tasks.status in ('scheduled', 'deferred')
      and tasks.id <> new.id;

    if active_count >= 3 then
      raise exception using errcode = 'P0001', message = 'workflow_limit:this_week_tasks';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_plan_refresh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  refresh_count integer;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using errcode = '23514', message = 'relationship_invalid:plan_refresh_owner_immutable';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(new.selected_task_ids) as selected(task_id)
    left join public.tasks
      on tasks.id = selected.task_id
      and tasks.user_id = new.user_id
    where tasks.id is null
  )
  then
    raise exception using errcode = '23514', message = 'relationship_invalid:plan_refresh_tasks';
  end if;

  if pg_catalog.cardinality(new.selected_task_ids) > 3
    or (
      select count(*)
      from pg_catalog.unnest(new.selected_task_ids) as selected(task_id)
    ) <> (
      select count(distinct selected.task_id)
      from pg_catalog.unnest(new.selected_task_ids) as selected(task_id)
    )
  then
    raise exception using errcode = '23514', message = 'relationship_invalid:plan_refresh_tasks';
  end if;

  if tg_op = 'INSERT' and public.effective_plan(new.user_id) = 'free' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('plan-refresh:' || new.user_id::text, 0)
    );

    new.refreshed_at := pg_catalog.now();

    select count(*)
    into refresh_count
    from public.plan_refreshes
    where plan_refreshes.user_id = new.user_id
      and pg_catalog.date_trunc('month', plan_refreshes.refreshed_at at time zone 'UTC')
        = pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'UTC');

    if refresh_count >= 1 then
      raise exception using errcode = 'P0001', message = 'entitlement_limit:weekly_refreshes';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_count integer;
  application_limit integer;
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using errcode = '23514', message = 'relationship_invalid:application_owner_immutable';
  end if;

  if tg_op = 'INSERT' and new.stage not in ('declined', 'withdrawn') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('applications:' || new.user_id::text, 0)
    );

    application_limit := case
      when public.effective_plan(new.user_id) = 'cycle' then 15
      else 5
    end;

    select count(*)
    into application_count
    from public.applications
    where applications.user_id = new.user_id
      and applications.stage not in ('declined', 'withdrawn')
      and applications.id <> new.id;

    if application_count >= application_limit then
      raise exception using errcode = 'P0001', message = 'entitlement_limit:active_applications';
    end if;
  elsif tg_op = 'UPDATE'
    and new.stage not in ('declined', 'withdrawn')
    and old.stage in ('declined', 'withdrawn')
  then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('applications:' || new.user_id::text, 0)
    );

    application_limit := case
      when public.effective_plan(new.user_id) = 'cycle' then 15
      else 5
    end;

    select count(*)
    into application_count
    from public.applications
    where applications.user_id = new.user_id
      and applications.stage not in ('declined', 'withdrawn')
      and applications.id <> new.id;

    if application_count >= application_limit then
      raise exception using errcode = 'P0001', message = 'entitlement_limit:active_applications';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_source_issue()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  validate_opportunity boolean := true;
begin
  if tg_op = 'UPDATE' then
    validate_opportunity :=
      new.opportunity_id is distinct from old.opportunity_id
      or new.user_id is distinct from old.user_id;
  end if;

  if new.user_id is not null
    and validate_opportunity
    and not exists (
      select 1
      from public.opportunities
      where opportunities.id = new.opportunity_id
        and opportunities.publication_state = 'published'
    )
  then
    raise exception using errcode = '23514', message = 'relationship_invalid:published_source_issue_required';
  end if;

  return new;
end;
$$;

create trigger portfolio_item_security
before insert or update on public.portfolio_items
for each row execute function public.enforce_portfolio_item();

create trigger evidence_item_security
before insert or update on public.evidence_items
for each row execute function public.enforce_evidence_item();

create trigger evidence_requirement_link_security
before insert or update on public.evidence_requirement_links
for each row execute function public.enforce_evidence_requirement_link();

create trigger task_security
before insert or update on public.tasks
for each row execute function public.enforce_task();

create trigger plan_refresh_security
before insert or update on public.plan_refreshes
for each row execute function public.enforce_plan_refresh();

create trigger application_security
before insert or update on public.applications
for each row execute function public.enforce_application();

create trigger source_issue_security
before insert or update on public.source_issues
for each row execute function public.enforce_source_issue();

create or replace function public.replace_weekly_plan(
  p_user_id uuid,
  p_input_hash text,
  p_tasks jsonb
)
returns setof public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  refresh_id uuid;
  selected_ids uuid[] := '{}';
  task_input record;
  inserted_task public.tasks;
begin
  if p_user_id is null
    or p_input_hash is null
    or p_tasks is null
    or pg_catalog.length(p_input_hash) < 1
    or pg_catalog.length(p_input_hash) > 256
    or pg_catalog.jsonb_typeof(p_tasks) <> 'array'
    or pg_catalog.jsonb_array_length(p_tasks) < 1
    or pg_catalog.jsonb_array_length(p_tasks) > 3
  then
    raise exception using errcode = '22023', message = 'invalid_weekly_plan';
  end if;

  insert into public.plan_refreshes(user_id, input_hash, selected_task_ids)
  values (p_user_id, p_input_hash, '{}')
  returning id into refresh_id;

  delete from public.tasks
  where tasks.user_id = p_user_id
    and tasks.status in ('scheduled', 'deferred');

  for task_input in
    select *
    from pg_catalog.jsonb_to_recordset(p_tasks) as task_rows(
      portfolio_item_id uuid,
      requirement_id uuid,
      title text,
      why_it_matters text,
      effort_minutes integer,
      due_date date
    )
  loop
    insert into public.tasks(
      user_id,
      portfolio_item_id,
      requirement_id,
      title,
      why_it_matters,
      effort_minutes,
      due_date
    )
    values (
      p_user_id,
      task_input.portfolio_item_id,
      task_input.requirement_id,
      task_input.title,
      task_input.why_it_matters,
      task_input.effort_minutes,
      task_input.due_date
    )
    returning * into inserted_task;

    selected_ids := pg_catalog.array_append(selected_ids, inserted_task.id);
  end loop;

  update public.plan_refreshes
  set selected_task_ids = selected_ids
  where plan_refreshes.id = refresh_id
    and plan_refreshes.user_id = p_user_id;

  return query
    select tasks.*
    from public.tasks
    where tasks.id = any(selected_ids)
    order by pg_catalog.array_position(selected_ids, tasks.id);
end;
$$;

create or replace function public.consume_rate_limit(bucket_key text, maximum integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_bucket public.rate_limit_buckets;
begin
  if bucket_key is null
    or maximum is null
    or window_seconds is null
    or pg_catalog.length(bucket_key) < 3
    or pg_catalog.length(bucket_key) > 160
    or maximum < 1
    or maximum > 1000
    or window_seconds < 1
    or window_seconds > 604800
  then
    raise exception using errcode = '22023', message = 'invalid_rate_limit_parameters';
  end if;

  insert into public.rate_limit_buckets(key, count, window_started_at)
  values (bucket_key, 1, pg_catalog.now())
  on conflict (key) do update
  set count = case
      when public.rate_limit_buckets.window_started_at
        < pg_catalog.now() - pg_catalog.make_interval(secs => window_seconds)
        then 1
      else case
        when public.rate_limit_buckets.count + 1 > maximum + 1 then maximum + 1
        else public.rate_limit_buckets.count + 1
      end
    end,
    window_started_at = case
      when public.rate_limit_buckets.window_started_at
        < pg_catalog.now() - pg_catalog.make_interval(secs => window_seconds)
        then pg_catalog.now()
      else public.rate_limit_buckets.window_started_at
    end
  returning * into current_bucket;

  return current_bucket.count <= maximum;
end;
$$;

revoke all on function public.effective_plan(uuid) from public, anon, authenticated;
revoke all on function public.enforce_portfolio_item() from public, anon, authenticated;
revoke all on function public.enforce_evidence_item() from public, anon, authenticated;
revoke all on function public.enforce_evidence_requirement_link() from public, anon, authenticated;
revoke all on function public.enforce_task() from public, anon, authenticated;
revoke all on function public.enforce_plan_refresh() from public, anon, authenticated;
revoke all on function public.enforce_application() from public, anon, authenticated;
revoke all on function public.enforce_source_issue() from public, anon, authenticated;
revoke all on function public.replace_weekly_plan(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;

grant execute on function public.replace_weekly_plan(uuid, text, jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
