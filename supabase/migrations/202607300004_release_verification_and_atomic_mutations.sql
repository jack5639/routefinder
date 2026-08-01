-- Forward-only release verification and correctness-critical mutation repair.
-- Environment sentinel rows are deliberately not seeded by migrations. An
-- operator must insert them only in disposable security/restore projects.

create table if not exists public.environment_sentinels (
  purpose text primary key check (purpose in ('security-test', 'restore-test')),
  project_ref text not null,
  marker text not null,
  created_at timestamptz not null default now()
);
alter table public.environment_sentinels enable row level security;
revoke all privileges on table public.environment_sentinels from public, anon, authenticated;

-- Saving the same active destination twice is never useful. Preserve the
-- oldest active row and its relationships, then enforce the rule under races.
with ranked as (
  select id, row_number() over (
    partition by user_id, opportunity_id order by created_at, id
  ) as position
  from public.portfolio_items
  where active and opportunity_id is not null
)
update public.portfolio_items
set active = false, updated_at = pg_catalog.now()
where id in (select id from ranked where position > 1);

create unique index if not exists portfolio_one_active_catalogue_item
  on public.portfolio_items(user_id, opportunity_id)
  where active and opportunity_id is not null;

with ranked as (
  select id, row_number() over (
    partition by user_id, external_url order by created_at, id
  ) as position
  from public.portfolio_items
  where active and opportunity_id is null
)
update public.portfolio_items
set active = false, updated_at = pg_catalog.now()
where id in (select id from ranked where position > 1);

create unique index if not exists portfolio_one_active_external_item
  on public.portfolio_items(user_id, external_url)
  where active and opportunity_id is null;

create or replace function public.save_readiness_profile(
  p_user_id uuid,
  p_profile jsonb,
  p_qualifications jsonb,
  p_policy_version text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_policy_version is null or length(trim(p_policy_version)) < 1 then
    raise exception using errcode = '22023', message = 'invalid_policy_version';
  end if;

  perform public.replace_readiness_profile(p_user_id, p_profile, p_qualifications);

  insert into public.consent_records(user_id, policy_kind, policy_version, granted)
  values (p_user_id, 'privacy-and-terms', p_policy_version, true)
  on conflict (user_id, policy_kind, policy_version) do update
    set granted = true, recorded_at = pg_catalog.now();

  insert into public.audit_events(user_id, action, entity_type, entity_id)
  values (p_user_id, 'readiness-profile-updated', 'profile', p_user_id::text);
end;
$$;

create or replace function public.save_evidence_requirement_link(
  p_user_id uuid,
  p_evidence_id uuid,
  p_requirement_id uuid,
  p_relevance text,
  p_coverage text,
  p_missing_specificity text,
  p_confirmed_by_student boolean,
  p_input_hash text
) returns public.evidence_requirement_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
  saved public.evidence_requirement_links;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'evidence-link:' || p_evidence_id::text || ':' || p_requirement_id::text,
      0
    )
  );

  select coalesce(max(assessment_version), 0) + 1 into next_version
  from public.evidence_requirement_links
  where evidence_id = p_evidence_id and requirement_id = p_requirement_id;

  insert into public.evidence_requirement_links(
    user_id, evidence_id, requirement_id, relevance, coverage,
    missing_specificity, confirmed_by_student, assessment_version, updated_at
  ) values (
    p_user_id, p_evidence_id, p_requirement_id, p_relevance, p_coverage,
    nullif(p_missing_specificity, ''), p_confirmed_by_student, next_version,
    pg_catalog.now()
  )
  on conflict (evidence_id, requirement_id) do update set
    user_id = excluded.user_id,
    relevance = excluded.relevance,
    coverage = excluded.coverage,
    missing_specificity = excluded.missing_specificity,
    confirmed_by_student = excluded.confirmed_by_student,
    assessment_version = excluded.assessment_version,
    updated_at = excluded.updated_at
  returning * into saved;

  insert into public.assessment_versions(user_id, reason, input_hash, summary)
  values (
    p_user_id,
    'evidence-link-updated',
    p_input_hash,
    pg_catalog.jsonb_build_object(
      'requirement_id', p_requirement_id,
      'coverage', p_coverage,
      'assessment_version', next_version
    )
  );

  return saved;
end;
$$;

revoke all on function public.save_readiness_profile(uuid, jsonb, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.save_evidence_requirement_link(uuid, uuid, uuid, text, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.save_readiness_profile(uuid, jsonb, jsonb, text)
  to service_role;
grant execute on function public.save_evidence_requirement_link(uuid, uuid, uuid, text, text, text, boolean, text)
  to service_role;
