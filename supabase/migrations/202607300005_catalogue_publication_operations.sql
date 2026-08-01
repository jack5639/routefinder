-- Forward-only commercial catalogue operations. Source automation may observe
-- and draft; only service-owned, human-attributed review RPCs may publish.

alter table public.opportunities add column if not exists attribution jsonb;
alter table public.opportunities add column if not exists latest_source_change_at timestamptz;
alter table public.opportunities add column if not exists closure_source_run_id uuid references public.source_runs(id) on delete set null;
alter table public.requirements add column if not exists freshness_expires_at timestamptz;
alter table public.source_issues add column if not exists fingerprint text;
alter table public.source_issues add column if not exists resolved_at timestamptz;
alter table public.catalogue_fact_revisions add column if not exists source_version_hash text;

create unique index if not exists catalogue_one_pending_revision
  on public.catalogue_fact_revisions(opportunity_id) where status = 'pending';
create unique index if not exists catalogue_one_active_issue_fingerprint
  on public.source_issues(opportunity_id, fingerprint) where status in ('open', 'reviewing') and fingerprint is not null;
create index if not exists catalogue_review_queue_idx
  on public.opportunities(publication_state, freshness, state, sector, updated_at desc);
create index if not exists source_runs_latest_complete_idx
  on public.source_runs(source_authority, complete_snapshot, completed_at desc);

create table if not exists public.catalogue_manual_revisions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  requirement_id uuid references public.requirements(id) on delete set null,
  action text not null,
  previous_fact jsonb,
  reviewed_fact jsonb,
  reviewer_id uuid not null references auth.users(id),
  reviewer_note text not null,
  reviewed_at timestamptz not null default now(),
  check (opportunity_id is not null)
);
alter table public.catalogue_manual_revisions enable row level security;
revoke all privileges on table public.catalogue_manual_revisions from public, anon, authenticated;

create or replace function public.catalogue_rule_supported(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  rule jsonb := case when value ? 'eligibilityRule' then value->'eligibilityRule' else value end;
  child jsonb;
  qualification_type text;
  grade text;
begin
  if jsonb_typeof(rule) <> 'object' or rule->>'version' <> '1' then return false; end if;
  if rule->>'type' = 'qualification-minimum' then
    qualification_type := rule->>'qualificationType';
    grade := rule->>'minimumGrade';
    return qualification_type in ('a-level', 'A level', 'a level', 'gcse', 'GCSE')
      and ((lower(qualification_type) in ('a-level', 'a level') and grade in ('A*','A','B','C','D','E','U'))
        or (lower(qualification_type) = 'gcse' and grade in ('9','8','7','6','5','4','3','2','1','U')));
  elsif rule->>'type' = 'qualification-combination' then
    qualification_type := rule->>'qualificationType';
    if qualification_type not in ('a-level', 'A level', 'a level', 'gcse', 'GCSE')
      or jsonb_typeof(rule->'minimumGrades') <> 'array'
      or jsonb_array_length(rule->'minimumGrades') < 2 then return false; end if;
    for grade in select jsonb_array_elements_text(rule->'minimumGrades') loop
      if (lower(qualification_type) in ('a-level', 'a level') and grade not in ('A*','A','B','C','D','E','U'))
        or (lower(qualification_type) = 'gcse' and grade not in ('9','8','7','6','5','4','3','2','1','U')) then return false; end if;
    end loop;
    return true;
  elsif rule->>'type' in ('all-of', 'any-of') then
    if jsonb_typeof(rule->'rules') <> 'array' or jsonb_array_length(rule->'rules') < 1 then return false; end if;
    for child in select value from jsonb_array_elements(rule->'rules') loop
      if not public.catalogue_rule_supported(child) then return false; end if;
    end loop;
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.begin_catalogue_source_run(
  p_source_authority text,
  p_source_url text,
  p_stale_after_minutes integer default 90
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
begin
  if p_source_authority not in ('find-an-apprenticeship-api-v2', 'discover-uni-hesa')
    or p_source_url is null or btrim(p_source_url) = ''
    or p_stale_after_minutes < 15 then raise exception 'invalid_source_run'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('catalogue-source:' || p_source_authority, 0));
  update public.source_runs
  set status = 'failed', completed_at = pg_catalog.now(), error_code = 'stale-running-run'
  where source_authority = p_source_authority
    and status = 'running'
    and started_at < pg_catalog.now() - pg_catalog.make_interval(mins => p_stale_after_minutes);
  if exists (select 1 from public.source_runs where source_authority = p_source_authority and status = 'running') then
    raise exception 'catalogue_run_already_active';
  end if;
  insert into public.source_runs(source_authority, status, source_url)
  values (p_source_authority, 'running', p_source_url)
  returning id into run_id;
  return run_id;
end;
$$;

create or replace function public.ingest_catalogue_observation_batch(
  p_source_run_id uuid,
  p_source_authority text,
  p_source_url text,
  p_source_approval_reference text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  proposed jsonb;
  existing public.opportunities%rowtype;
  opportunity_id uuid;
  organisation_id uuid;
  observation_id uuid;
  pending public.catalogue_fact_revisions%rowtype;
  changed_count integer := 0;
  created_count integer := 0;
  item_hash text;
  retrieved timestamptz;
  organisation_kind text;
  attribution_value jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then raise exception 'invalid_catalogue_batch'; end if;
  if not exists (select 1 from public.source_runs where id = p_source_run_id and source_authority = p_source_authority and status = 'running') then
    raise exception 'source_run_not_active';
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    proposed := item->'normalizedFact';
    item_hash := item->>'snapshotHash';
    retrieved := (item->>'retrievedAt')::timestamptz;
    attribution_value := item->'attribution';
    if coalesce(item->>'sourceId','') = '' or coalesce(item->>'sourceUrl','') = ''
      or coalesce(item_hash,'') = '' or jsonb_typeof(proposed) <> 'object'
      or proposed->>'kind' not in ('university-course','apprenticeship-vacancy')
      or proposed->>'sector' not in ('technology','engineering','business','finance','unclassified')
      or coalesce(proposed->>'title','') = '' or coalesce(proposed->>'provider_name','') = ''
      or coalesce(proposed->>'location','') = '' or coalesce(proposed->>'application_url','') = '' then
      raise exception 'invalid_catalogue_observation';
    end if;
    organisation_kind := case when proposed->>'kind' = 'university-course' then 'university-provider' else 'employer' end;
    insert into public.organisations(kind, name, website_url, source_authority, updated_at)
    values (organisation_kind, proposed->>'provider_name', null, p_source_authority, retrieved)
    on conflict (kind, name) do update set updated_at = excluded.updated_at
    returning id into organisation_id;
    select * into existing from public.opportunities
      where source_authority = p_source_authority and source_id = item->>'sourceId' for update;
    if existing.id is not null and p_source_authority = 'discover-uni-hesa' then
      -- Discover Uni does not authoritatively assert provider course closure.
      proposed := jsonb_set(proposed, '{state}', to_jsonb(existing.state::text));
    end if;
    if not found then
      insert into public.opportunities(
        organisation_id, source_id, kind, sector, title, provider_name, location, summary,
        deadline, application_url, source_url, source_authority, retrieved_at, last_seen_at,
        freshness_expires_at, freshness, state, publication_state, raw_snapshot,
        source_approval_reference, attribution, updated_at
      ) values (
        organisation_id, item->>'sourceId', proposed->>'kind', proposed->>'sector', proposed->>'title',
        proposed->>'provider_name', proposed->>'location', proposed->>'summary',
        nullif(proposed->>'deadline','')::timestamptz, proposed->>'application_url',
        proposed->>'source_url', p_source_authority, retrieved, retrieved,
        (item->>'freshnessExpiresAt')::timestamptz, 'needs-checking', proposed->>'state',
        'draft', item->'rawFact', nullif(btrim(p_source_approval_reference),''),
        attribution_value, retrieved
      ) returning id into opportunity_id;
      created_count := created_count + 1;
    else
      opportunity_id := existing.id;
    end if;
    insert into public.catalogue_observations(
      opportunity_id, source_run_id, source_authority, source_id, source_url,
      retrieved_at, snapshot_hash, normalized_fact, raw_fact, classification_reason, classification_version
    ) values (
      opportunity_id, p_source_run_id, p_source_authority, item->>'sourceId', item->>'sourceUrl',
      retrieved, item_hash, proposed, item->'rawFact', item->>'classificationReason',
      coalesce(item->>'classificationVersion','v1')
    ) returning id into observation_id;
    if existing.id is not null then
      update public.opportunities set
        last_seen_at = retrieved, retrieved_at = retrieved,
        freshness_expires_at = (item->>'freshnessExpiresAt')::timestamptz,
        raw_snapshot = item->'rawFact',
        source_approval_reference = nullif(btrim(p_source_approval_reference),''),
        attribution = coalesce(attribution_value, attribution),
        updated_at = retrieved
      where id = opportunity_id;
      if jsonb_build_object(
        'kind', existing.kind, 'sector', existing.sector, 'title', existing.title,
        'provider_name', existing.provider_name, 'location', existing.location,
        'summary', existing.summary, 'deadline', existing.deadline,
        'application_url', existing.application_url, 'source_url', existing.source_url,
        'state', existing.state
      ) is distinct from proposed then
        if existing.publication_state = 'published' then
          select * into pending from public.catalogue_fact_revisions
            where opportunity_id = existing.id and status = 'pending' for update;
          if pending.id is null or pending.source_version_hash is distinct from item_hash then
            changed_count := changed_count + 1;
            if pending.id is not null then
              update public.catalogue_fact_revisions set status = 'superseded', reviewed_at = pg_catalog.now(),
                reviewer_note = 'Superseded by a newer source observation.'
              where id = pending.id;
            end if;
            insert into public.catalogue_fact_revisions(
              opportunity_id, observation_id, field_changes, proposed_fact, source_version_hash
            ) values (
              existing.id, observation_id,
              jsonb_strip_nulls(jsonb_build_object(
                'title', case when existing.title is distinct from proposed->>'title' then jsonb_build_object('from',existing.title,'to',proposed->>'title') end,
                'provider_name', case when existing.provider_name is distinct from proposed->>'provider_name' then jsonb_build_object('from',existing.provider_name,'to',proposed->>'provider_name') end,
                'location', case when existing.location is distinct from proposed->>'location' then jsonb_build_object('from',existing.location,'to',proposed->>'location') end,
                'summary', case when existing.summary is distinct from proposed->>'summary' then jsonb_build_object('from',existing.summary,'to',proposed->>'summary') end,
                'deadline', case when existing.deadline is distinct from nullif(proposed->>'deadline','')::timestamptz then jsonb_build_object('from',existing.deadline,'to',proposed->>'deadline') end,
                'application_url', case when existing.application_url is distinct from proposed->>'application_url' then jsonb_build_object('from',existing.application_url,'to',proposed->>'application_url') end,
                'source_url', case when existing.source_url is distinct from proposed->>'source_url' then jsonb_build_object('from',existing.source_url,'to',proposed->>'source_url') end,
                'state', case when existing.state::text is distinct from proposed->>'state' then jsonb_build_object('from',existing.state,'to',proposed->>'state') end,
                'sector', case when existing.sector is distinct from proposed->>'sector' then jsonb_build_object('from',existing.sector,'to',proposed->>'sector') end
              )),
              proposed, item_hash
            );
            update public.opportunities set latest_source_change_at = retrieved where id = existing.id;
          end if;
          insert into public.source_issues(opportunity_id, issue_kind, detail, fingerprint)
          values (existing.id, 'source-change', 'Imported source facts changed and await review.', 'source-change:' || item_hash)
          on conflict (opportunity_id, fingerprint) where status in ('open','reviewing') and fingerprint is not null do nothing;
        else
          changed_count := changed_count + 1;
          update public.opportunities set
            kind = proposed->>'kind', sector = proposed->>'sector', title = proposed->>'title',
            provider_name = proposed->>'provider_name', location = proposed->>'location',
            summary = proposed->>'summary', deadline = nullif(proposed->>'deadline','')::timestamptz,
            application_url = proposed->>'application_url', source_url = proposed->>'source_url',
            state = (proposed->>'state')::public.opportunity_state, freshness = 'needs-checking',
            closure_source_run_id = case when proposed->>'state' = 'open' then null else closure_source_run_id end,
            latest_source_change_at = retrieved, updated_at = retrieved
          where id = existing.id;
        end if;
      end if;
    end if;
  end loop;
  return jsonb_build_object('created', created_count, 'changed', changed_count);
end;
$$;

create or replace function public.finish_catalogue_source_run(
  p_source_run_id uuid,
  p_status text,
  p_complete_snapshot boolean,
  p_retrieved_count integer,
  p_records_changed integer,
  p_snapshot_hash text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_error_code text default null,
  p_close_missing boolean default false
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare source_name text;
begin
  if p_status not in ('completed','failed') or p_retrieved_count < 0 or p_records_changed < 0 then raise exception 'invalid_source_run_finish'; end if;
  select source_authority into source_name from public.source_runs where id = p_source_run_id and status = 'running' for update;
  if source_name is null then raise exception 'source_run_not_active'; end if;
  if p_status <> 'completed' or not p_complete_snapshot then p_close_missing := false; end if;
  update public.source_runs set status = p_status, completed_at = pg_catalog.now(),
    complete_snapshot = p_status = 'completed' and p_complete_snapshot,
    retrieved_count = p_retrieved_count, records_changed = p_records_changed,
    snapshot_hash = p_snapshot_hash, metadata = coalesce(p_metadata, '{}'::jsonb),
    error_code = case when p_status = 'failed' then left(coalesce(p_error_code,'source-failed'),80) else null end
  where id = p_source_run_id;
  if p_close_missing and source_name = 'find-an-apprenticeship-api-v2' then
    update public.opportunities o set state = 'closed', freshness = 'low', closure_source_run_id = p_source_run_id, updated_at = pg_catalog.now()
    where o.source_authority = source_name and o.state <> 'closed'
      and not exists (select 1 from public.catalogue_observations observation where observation.source_run_id = p_source_run_id and observation.opportunity_id = o.id);
    insert into public.source_issues(opportunity_id, issue_kind, detail, fingerprint)
    select o.id, 'closed', 'Not present in a complete official source snapshot.', 'closed:missing-from-complete-snapshot'
    from public.opportunities o
    where o.source_authority = source_name and o.state = 'closed'
      and not exists (select 1 from public.catalogue_observations observation where observation.source_run_id = p_source_run_id and observation.opportunity_id = o.id)
    on conflict (opportunity_id, fingerprint) where status in ('open','reviewing') and fingerprint is not null do nothing;
  end if;
end;
$$;

create or replace function public.review_catalogue_revision(
  p_revision_id uuid,
  p_reviewer_id uuid,
  p_action text,
  p_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare revision public.catalogue_fact_revisions%rowtype;
begin
  if p_action not in ('accept','reject','supersede','withdraw') or length(btrim(coalesce(p_note,''))) < 3 then raise exception 'invalid_revision_decision'; end if;
  select * into revision from public.catalogue_fact_revisions where id = p_revision_id and status = 'pending' for update;
  if revision.id is null then raise exception 'revision_not_pending'; end if;
  if p_action = 'accept' then
    update public.opportunities set
      kind = (revision.proposed_fact->>'kind'), sector = revision.proposed_fact->>'sector',
      title = revision.proposed_fact->>'title', provider_name = revision.proposed_fact->>'provider_name',
      location = revision.proposed_fact->>'location', summary = revision.proposed_fact->>'summary',
      deadline = nullif(revision.proposed_fact->>'deadline','')::timestamptz,
      application_url = revision.proposed_fact->>'application_url', source_url = revision.proposed_fact->>'source_url',
      state = (revision.proposed_fact->>'state')::public.opportunity_state,
      closure_source_run_id = case when revision.proposed_fact->>'state' = 'open' then null else closure_source_run_id end,
      freshness = 'high', verified_at = pg_catalog.now(), updated_at = pg_catalog.now()
    where id = revision.opportunity_id;
  elsif p_action = 'withdraw' then
    update public.opportunities set publication_state = 'withdrawn', updated_at = pg_catalog.now() where id = revision.opportunity_id;
  end if;
  update public.catalogue_fact_revisions set
    status = case p_action when 'accept' then 'accepted' when 'reject' then 'rejected' when 'supersede' then 'superseded' else 'withdrawn' end,
    reviewer_id = p_reviewer_id, reviewer_note = btrim(p_note), reviewed_at = pg_catalog.now()
  where id = revision.id;
  update public.source_issues set status = 'resolved', resolved_at = pg_catalog.now()
  where opportunity_id = revision.opportunity_id and fingerprint = 'source-change:' || revision.source_version_hash;
  insert into public.audit_events(user_id, action, entity_type, entity_id, metadata)
  values (p_reviewer_id, 'catalogue.revision_resolved', 'catalogue_fact_revision', revision.id::text, jsonb_build_object('action',p_action));
end;
$$;

create or replace function public.review_catalogue_publication(
  p_opportunity_id uuid,
  p_reviewer_id uuid,
  p_decision public.publication_state,
  p_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare opportunity public.opportunities%rowtype;
begin
  if p_decision not in ('review','published','withdrawn') or length(btrim(coalesce(p_note,''))) < 3 then raise exception 'review_note_required'; end if;
  select * into opportunity from public.opportunities where id = p_opportunity_id for update;
  if opportunity.id is null then raise exception 'opportunity_not_found'; end if;
  if p_decision = 'published' then
    if opportunity.sector not in ('technology','engineering','business','finance') then raise exception 'publication_sector_invalid'; end if;
    if opportunity.state <> 'open' then raise exception 'publication_not_open'; end if;
    if btrim(opportunity.provider_name) = '' or btrim(opportunity.location) = ''
      or btrim(opportunity.application_url) = '' or btrim(opportunity.source_url) = '' then raise exception 'publication_fact_missing'; end if;
    if opportunity.verified_at is null or opportunity.verified_at < pg_catalog.now() - interval '30 days'
      or opportunity.freshness not in ('high','medium')
      or opportunity.freshness_expires_at is null or opportunity.freshness_expires_at <= pg_catalog.now() then raise exception 'publication_verification_expired'; end if;
    if opportunity.deadline is not null and opportunity.deadline <= pg_catalog.now() then raise exception 'publication_deadline_passed'; end if;
    if opportunity.source_authority in ('find-an-apprenticeship-api-v2','discover-uni-hesa')
      and coalesce(btrim(opportunity.source_approval_reference),'') = '' then raise exception 'publication_source_unapproved'; end if;
    if opportunity.source_authority = 'discover-uni-hesa'
      and not (opportunity.attribution->>'credit' = 'HESA, www.hesa.ac.uk'
        and opportunity.attribution->>'licence' = 'https://creativecommons.org/licenses/by/4.0/'
        and coalesce(btrim(opportunity.attribution->>'changes'),'') <> '') then raise exception 'publication_attribution_missing'; end if;
    if exists (select 1 from public.catalogue_fact_revisions where opportunity_id = opportunity.id and status = 'pending') then raise exception 'publication_revision_pending'; end if;
    if exists (select 1 from public.source_issues where opportunity_id = opportunity.id and status in ('open','reviewing')) then raise exception 'publication_source_issue_open'; end if;
    if not exists (select 1 from public.requirements where opportunity_id = opportunity.id and publication_state = 'published') then raise exception 'publication_requirement_missing'; end if;
    if exists (
      select 1 from public.requirements where opportunity_id = opportunity.id and publication_state = 'published'
        and (coalesce(btrim(supporting_text),'') = '' or coalesce(btrim(source_url),'') = ''
          or verified_at is null or freshness not in ('high','medium')
          or freshness_expires_at is null or freshness_expires_at <= pg_catalog.now() or conflict
          or (hard_requirement and not public.catalogue_rule_supported(structured_value)))
    ) then raise exception 'publication_requirement_invalid'; end if;
  end if;
  update public.opportunities set publication_state = p_decision, updated_at = pg_catalog.now() where id = opportunity.id;
  insert into public.publication_reviews(opportunity_id, reviewer_id, decision, note)
  values (opportunity.id, p_reviewer_id, p_decision, btrim(p_note));
  insert into public.audit_events(user_id, action, entity_type, entity_id, metadata)
  values (p_reviewer_id, 'catalogue.publication_reviewed', 'opportunity', opportunity.id::text, jsonb_build_object('decision',p_decision));
end;
$$;

create or replace function public.review_catalogue_fact_mutation(
  p_opportunity_id uuid,
  p_requirement_id uuid,
  p_reviewer_id uuid,
  p_action text,
  p_fact jsonb,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  opportunity public.opportunities%rowtype;
  requirement public.requirements%rowtype;
  new_requirement_id uuid;
  hard boolean;
  requirement_kind text;
begin
  if length(btrim(coalesce(p_note,''))) < 3 or jsonb_typeof(coalesce(p_fact,'{}'::jsonb)) <> 'object' then raise exception 'review_note_required'; end if;
  select * into opportunity from public.opportunities where id = p_opportunity_id for update;
  if opportunity.id is null then raise exception 'opportunity_not_found'; end if;
  if p_action = 'edit-opportunity' then
    if coalesce(btrim(p_fact->>'title'),'') = '' or coalesce(btrim(p_fact->>'providerName'),'') = ''
      or coalesce(btrim(p_fact->>'location'),'') = '' or coalesce(btrim(p_fact->>'summary'),'') = ''
      or coalesce(btrim(p_fact->>'applicationUrl'),'') = '' or coalesce(btrim(p_fact->>'sourceUrl'),'') = ''
      or p_fact->>'sector' not in ('technology','engineering','business','finance','unclassified')
      or p_fact->>'state' not in ('open','closed','unknown')
      or p_fact->>'freshness' not in ('high','medium','low','needs-checking') then raise exception 'invalid_opportunity_fact'; end if;
    insert into public.catalogue_manual_revisions(opportunity_id, action, previous_fact, reviewed_fact, reviewer_id, reviewer_note)
    values (opportunity.id, p_action, to_jsonb(opportunity) - 'raw_snapshot', p_fact, p_reviewer_id, btrim(p_note));
    update public.opportunities set
      title = btrim(p_fact->>'title'), provider_name = btrim(p_fact->>'providerName'),
      sector = p_fact->>'sector', location = btrim(p_fact->>'location'), summary = btrim(p_fact->>'summary'),
      deadline = nullif(p_fact->>'deadline','')::timestamptz,
      application_url = p_fact->>'applicationUrl', source_url = p_fact->>'sourceUrl',
      state = (p_fact->>'state')::public.opportunity_state, freshness = p_fact->>'freshness',
      attribution = coalesce(p_fact->'attribution', attribution),
      retrieved_at = coalesce(nullif(p_fact->>'retrievedAt','')::timestamptz, pg_catalog.now()),
      verified_at = pg_catalog.now(),
      freshness_expires_at = pg_catalog.now() + interval '30 days',
      updated_at = pg_catalog.now()
    where id = opportunity.id;
    new_requirement_id := null;
  elsif p_action in ('create-requirement','edit-requirement','reverify-requirement','mark-conflicting','resolve-conflict','withdraw-requirement','supersede-requirement') then
    if p_action <> 'create-requirement' then
      select * into requirement from public.requirements where id = p_requirement_id and opportunity_id = opportunity.id for update;
      if requirement.id is null then raise exception 'requirement_not_found'; end if;
    end if;
    if p_action in ('create-requirement','edit-requirement','supersede-requirement') then
      requirement_kind := p_fact->>'kind';
      hard := coalesce((p_fact->>'hardRequirement')::boolean, false);
      if requirement_kind not in ('qualification','subject','grade','experience','skill','application-stage','other')
        or coalesce(btrim(p_fact->>'label'),'') = '' or coalesce(btrim(p_fact->>'supportingText'),'') = ''
        or coalesce(btrim(p_fact->>'sourceUrl'),'') = '' then raise exception 'invalid_requirement_fact'; end if;
      if hard and (requirement_kind <> 'grade' or not public.catalogue_rule_supported(p_fact->'structuredValue')) then raise exception 'unsupported_hard_requirement'; end if;
    end if;
    insert into public.catalogue_manual_revisions(opportunity_id, requirement_id, action, previous_fact, reviewed_fact, reviewer_id, reviewer_note)
    values (opportunity.id, requirement.id, p_action, case when requirement.id is null then null else to_jsonb(requirement) end, p_fact, p_reviewer_id, btrim(p_note));
    if p_action = 'create-requirement' then
      insert into public.requirements(opportunity_id, kind, label, structured_value, supporting_text, source_url, retrieved_at, verified_at, freshness_expires_at, freshness, conflict, hard_requirement, publication_state)
      values (opportunity.id, requirement_kind, btrim(p_fact->>'label'), p_fact->'structuredValue', btrim(p_fact->>'supportingText'), p_fact->>'sourceUrl',
        coalesce(nullif(p_fact->>'retrievedAt','')::timestamptz,pg_catalog.now()), pg_catalog.now(), pg_catalog.now() + interval '30 days',
        'high', false, hard, 'published') returning id into new_requirement_id;
    elsif p_action = 'edit-requirement' then
      update public.requirements set kind = requirement_kind, label = btrim(p_fact->>'label'), structured_value = p_fact->'structuredValue',
        supporting_text = btrim(p_fact->>'supportingText'), source_url = p_fact->>'sourceUrl',
        retrieved_at = coalesce(nullif(p_fact->>'retrievedAt','')::timestamptz,pg_catalog.now()), verified_at = pg_catalog.now(),
        freshness_expires_at = pg_catalog.now() + interval '30 days', freshness = 'high', hard_requirement = hard, updated_at = pg_catalog.now()
      where id = requirement.id;
      new_requirement_id := requirement.id;
    elsif p_action = 'reverify-requirement' then
      update public.requirements set verified_at = pg_catalog.now(), freshness_expires_at = pg_catalog.now() + interval '30 days', freshness = 'high', updated_at = pg_catalog.now() where id = requirement.id;
      new_requirement_id := requirement.id;
    elsif p_action = 'mark-conflicting' then
      update public.requirements set conflict = true, freshness = 'needs-checking', updated_at = pg_catalog.now() where id = requirement.id;
      new_requirement_id := requirement.id;
    elsif p_action = 'resolve-conflict' then
      update public.requirements set conflict = false, verified_at = pg_catalog.now(), freshness_expires_at = pg_catalog.now() + interval '30 days', freshness = 'high', updated_at = pg_catalog.now() where id = requirement.id;
      new_requirement_id := requirement.id;
    elsif p_action = 'withdraw-requirement' then
      update public.requirements set publication_state = 'withdrawn', updated_at = pg_catalog.now() where id = requirement.id;
      new_requirement_id := requirement.id;
    elsif p_action = 'supersede-requirement' then
      update public.requirements set publication_state = 'withdrawn', updated_at = pg_catalog.now() where id = requirement.id;
      insert into public.requirements(opportunity_id, kind, label, structured_value, supporting_text, source_url, retrieved_at, verified_at, freshness_expires_at, freshness, conflict, hard_requirement, publication_state)
      values (opportunity.id, requirement_kind, btrim(p_fact->>'label'), p_fact->'structuredValue', btrim(p_fact->>'supportingText'), p_fact->>'sourceUrl',
        coalesce(nullif(p_fact->>'retrievedAt','')::timestamptz,pg_catalog.now()), pg_catalog.now(), pg_catalog.now() + interval '30 days',
        'high', false, hard, 'published') returning id into new_requirement_id;
    end if;
  else
    raise exception 'invalid_catalogue_fact_action';
  end if;
  insert into public.audit_events(user_id, action, entity_type, entity_id, metadata)
  values (p_reviewer_id, 'catalogue.fact_reviewed', case when p_requirement_id is null then 'opportunity' else 'requirement' end,
    coalesce(new_requirement_id,p_opportunity_id)::text, jsonb_build_object('action',p_action));
  return new_requirement_id;
end;
$$;

create or replace function public.maintain_catalogue_operations()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_runs integer;
  expired_opportunities integer;
  expired_requirements integer;
  old_revisions integer;
  stale_sources jsonb;
begin
  update public.source_runs set status = 'failed', completed_at = pg_catalog.now(), error_code = 'stale-running-run'
  where status = 'running' and started_at < pg_catalog.now() - interval '90 minutes';
  get diagnostics stale_runs = row_count;
  update public.opportunities set freshness = 'needs-checking', updated_at = pg_catalog.now()
  where freshness_expires_at <= pg_catalog.now() and freshness <> 'needs-checking';
  get diagnostics expired_opportunities = row_count;
  update public.requirements set freshness = 'needs-checking', updated_at = pg_catalog.now()
  where freshness_expires_at <= pg_catalog.now() and freshness <> 'needs-checking';
  get diagnostics expired_requirements = row_count;
  select count(*) into old_revisions from public.catalogue_fact_revisions
  where status = 'pending' and created_at < pg_catalog.now() - interval '3 days';
  select coalesce(jsonb_agg(source_authority),'[]'::jsonb) into stale_sources
  from (values
    ('find-an-apprenticeship-api-v2', interval '24 hours'),
    ('discover-uni-hesa', interval '8 days')
  ) expected(source_authority, maximum_age)
  where not exists (
    select 1 from public.source_runs run
    where run.source_authority=expected.source_authority and run.status='completed'
      and run.complete_snapshot and run.completed_at > pg_catalog.now()-expected.maximum_age
  );
  return jsonb_build_object(
    'staleRunsRecovered',stale_runs,
    'expiredOpportunities',expired_opportunities,
    'expiredRequirements',expired_requirements,
    'oldPendingRevisions',old_revisions,
    'staleSources',stale_sources
  );
end;
$$;

create or replace function public.create_catalogue_manual_draft(
  p_reviewer_id uuid,
  p_fact jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  organisation_id uuid;
  opportunity_id uuid;
  authority text;
  organisation_kind text;
begin
  if p_fact->>'kind' not in ('university-course','apprenticeship-vacancy')
    or p_fact->>'sector' not in ('technology','engineering','business','finance')
    or coalesce(btrim(p_fact->>'title'),'') = '' or coalesce(btrim(p_fact->>'providerName'),'') = ''
    or coalesce(btrim(p_fact->>'location'),'') = '' or coalesce(btrim(p_fact->>'summary'),'') = ''
    or coalesce(btrim(p_fact->>'applicationUrl'),'') = '' or coalesce(btrim(p_fact->>'sourceUrl'),'') = '' then
    raise exception 'invalid_manual_draft';
  end if;
  organisation_kind := case when p_fact->>'kind' = 'university-course' then 'university-provider' else 'employer' end;
  authority := case when p_fact->>'kind' = 'university-course' then 'provider-manual-review' else 'employer-manual-review' end;
  insert into public.organisations(kind,name,website_url,source_authority,updated_at)
  values (organisation_kind,btrim(p_fact->>'providerName'),p_fact->>'sourceUrl',authority,pg_catalog.now())
  on conflict (kind,name) do update set website_url = excluded.website_url, updated_at = excluded.updated_at
  returning id into organisation_id;
  insert into public.opportunities(
    organisation_id,kind,sector,title,provider_name,location,summary,deadline,application_url,
    source_url,source_authority,retrieved_at,freshness,state,publication_state
  ) values (
    organisation_id,p_fact->>'kind',p_fact->>'sector',btrim(p_fact->>'title'),btrim(p_fact->>'providerName'),
    btrim(p_fact->>'location'),btrim(p_fact->>'summary'),nullif(p_fact->>'deadline','')::timestamptz,
    p_fact->>'applicationUrl',p_fact->>'sourceUrl',authority,pg_catalog.now(),'needs-checking','unknown','draft'
  ) returning id into opportunity_id;
  insert into public.audit_events(user_id,action,entity_type,entity_id,metadata)
  values (p_reviewer_id,'catalogue.draft_created','opportunity',opportunity_id::text,'{}'::jsonb);
  return opportunity_id;
end;
$$;

create or replace function public.catalogue_review_queue(
  p_page integer,
  p_page_size integer,
  p_source text,
  p_kind text,
  p_sector text,
  p_publication text,
  p_freshness text,
  p_state text,
  p_missing_requirements boolean,
  p_unclassified boolean,
  p_pending_revision boolean,
  p_source_issue boolean,
  p_missing_verification boolean,
  p_launch_failure boolean,
  p_sort text
) returns table(opportunity_id uuid, total_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with filtered as (
    select
      o.id,
      o.deadline,
      o.verified_at,
      o.latest_source_change_at,
      o.updated_at,
      (
        case when o.publication_state = 'published' then 40 else 0 end
        + case when o.sector = 'unclassified' then 20 else 0 end
        + case when exists (select 1 from public.catalogue_fact_revisions r where r.opportunity_id=o.id and r.status='pending') then 30 else 0 end
        + case when exists (select 1 from public.source_issues i where i.opportunity_id=o.id and i.status in ('open','reviewing')) then 25 else 0 end
        + case when o.verified_at is null or o.freshness in ('low','needs-checking') then 20 else 0 end
        + case when not exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published') then 20 else 0 end
      ) as urgency,
      count(*) over (partition by o.sector,o.kind) as cell_count
    from public.opportunities o
    where (p_source is null or o.source_authority=p_source)
      and (p_kind is null or o.kind=p_kind)
      and (p_sector is null or o.sector=p_sector)
      and (p_publication is null or o.publication_state::text=p_publication)
      and (p_freshness is null or o.freshness=p_freshness)
      and (p_state is null or o.state::text=p_state)
      and (not p_missing_requirements or not exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published'))
      and (not p_unclassified or o.sector='unclassified')
      and (not p_pending_revision or exists (select 1 from public.catalogue_fact_revisions r where r.opportunity_id=o.id and r.status='pending'))
      and (not p_source_issue
        or exists (select 1 from public.source_issues i where i.opportunity_id=o.id and i.status in ('open','reviewing'))
        or exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published' and q.conflict))
      and (not p_missing_verification or o.verified_at is null)
      and (not p_launch_failure or
        o.sector not in ('technology','engineering','business','finance') or o.state <> 'open'
        or o.verified_at is null or o.verified_at < pg_catalog.now()-interval '30 days'
        or o.freshness not in ('high','medium') or o.freshness_expires_at is null or o.freshness_expires_at <= pg_catalog.now()
        or (o.deadline is not null and o.deadline <= pg_catalog.now())
        or (o.source_authority in ('find-an-apprenticeship-api-v2','discover-uni-hesa') and coalesce(btrim(o.source_approval_reference),'')='')
        or (o.source_authority='discover-uni-hesa' and not (
          o.attribution->>'credit'='HESA, www.hesa.ac.uk'
          and o.attribution->>'licence'='https://creativecommons.org/licenses/by/4.0/'
          and coalesce(btrim(o.attribution->>'changes'),'')<>''
        ))
        or not exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published')
        or exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published'
          and (q.conflict or q.verified_at is null or q.freshness not in ('high','medium')
            or q.freshness_expires_at is null or q.freshness_expires_at <= pg_catalog.now()
            or coalesce(btrim(q.supporting_text),'')='' or coalesce(btrim(q.source_url),'')=''
            or (q.hard_requirement and not public.catalogue_rule_supported(q.structured_value))))
        or exists (select 1 from public.catalogue_fact_revisions r where r.opportunity_id=o.id and r.status='pending')
        or exists (select 1 from public.source_issues i where i.opportunity_id=o.id and i.status in ('open','reviewing'))
      )
  )
  select id, count(*) over ()
  from filtered
  order by
    case when p_sort='deadline' then deadline end asc nulls last,
    case when p_sort='oldest-verification' then verified_at end asc nulls first,
    case when p_sort='newest-source-change' then latest_source_change_at end desc nulls last,
    case when p_sort='coverage-shortfall' then cell_count end asc,
    case when p_sort not in ('deadline','oldest-verification','newest-source-change','coverage-shortfall') then urgency end desc,
    updated_at desc,
    id
  limit greatest(10,least(p_page_size,50))
  offset (greatest(p_page,1)-1)*greatest(10,least(p_page_size,50));
$$;

create or replace function public.resolve_catalogue_source_issue(
  p_issue_id uuid,
  p_reviewer_id uuid,
  p_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare issue public.source_issues%rowtype;
begin
  if length(btrim(coalesce(p_note,''))) < 3 then raise exception 'review_note_required'; end if;
  select * into issue from public.source_issues where id=p_issue_id and status in ('open','reviewing') for update;
  if issue.id is null then raise exception 'source_issue_not_open'; end if;
  update public.source_issues set status='resolved', resolved_at=pg_catalog.now(),
    detail=concat(coalesce(detail,''), case when detail is null or detail='' then '' else ' ' end, 'Resolution: ',btrim(p_note))
  where id=issue.id;
  insert into public.audit_events(user_id,action,entity_type,entity_id,metadata)
  values (p_reviewer_id,'catalogue.source_issue_resolved','source_issue',issue.id::text,jsonb_build_object('opportunityId',issue.opportunity_id));
end;
$$;

revoke all on function public.catalogue_rule_supported(jsonb) from public, anon, authenticated;
revoke all on function public.begin_catalogue_source_run(text,text,integer) from public, anon, authenticated;
revoke all on function public.ingest_catalogue_observation_batch(uuid,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.finish_catalogue_source_run(uuid,text,boolean,integer,integer,text,jsonb,text,boolean) from public, anon, authenticated;
revoke all on function public.review_catalogue_revision(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.review_catalogue_publication(uuid,uuid,public.publication_state,text) from public, anon, authenticated;
revoke all on function public.review_catalogue_fact_mutation(uuid,uuid,uuid,text,jsonb,text) from public, anon, authenticated;
revoke all on function public.maintain_catalogue_operations() from public, anon, authenticated;
revoke all on function public.create_catalogue_manual_draft(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.catalogue_review_queue(integer,integer,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,text) from public, anon, authenticated;
revoke all on function public.resolve_catalogue_source_issue(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.catalogue_rule_supported(jsonb) to service_role;
grant execute on function public.begin_catalogue_source_run(text,text,integer) to service_role;
grant execute on function public.ingest_catalogue_observation_batch(uuid,text,text,text,jsonb) to service_role;
grant execute on function public.finish_catalogue_source_run(uuid,text,boolean,integer,integer,text,jsonb,text,boolean) to service_role;
grant execute on function public.review_catalogue_revision(uuid,uuid,text,text) to service_role;
grant execute on function public.review_catalogue_publication(uuid,uuid,public.publication_state,text) to service_role;
grant execute on function public.review_catalogue_fact_mutation(uuid,uuid,uuid,text,jsonb,text) to service_role;
grant execute on function public.maintain_catalogue_operations() to service_role;
grant execute on function public.create_catalogue_manual_draft(uuid,jsonb) to service_role;
grant execute on function public.catalogue_review_queue(integer,integer,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,text) to service_role;
grant execute on function public.resolve_catalogue_source_issue(uuid,uuid,text) to service_role;
