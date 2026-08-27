-- Public catalogue reads are a separate safety boundary from publication state.
-- A reviewed row must also be open, current, cycle-appropriate, source-backed,
-- and free of unresolved catalogue work before it can be read by a browser.

alter table public.opportunities
  add column if not exists application_cycle integer;

alter table public.opportunities
  drop constraint if exists opportunities_application_cycle_check;
alter table public.opportunities
  add constraint opportunities_application_cycle_check
  check (application_cycle is null or application_cycle between 2026 and 2032);

create index if not exists opportunities_public_current_idx
  on public.opportunities(publication_state, state, kind, application_cycle, deadline, freshness, freshness_expires_at);

-- The deployed observation function can hit PostgreSQL 42702 when a changed
-- published source row reaches its pending-revision lookup: the local
-- `opportunity_id` variable and revision column have the same name. Re-pin
-- the function with the affected columns qualified before the next complete
-- import is attempted.
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
    select o.* into existing from public.opportunities o
      where o.source_authority = p_source_authority and o.source_id = item->>'sourceId' for update;
    if existing.id is not null and p_source_authority = 'discover-uni-hesa' then
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
          select r.* into pending from public.catalogue_fact_revisions r
            where r.opportunity_id = existing.id and r.status = 'pending' for update;
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

create or replace function public.catalogue_public_opportunity_current(p_opportunity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.opportunities o
    where o.id = p_opportunity_id
      and o.publication_state = 'published'
      and o.kind in ('university-course', 'apprenticeship-vacancy')
      and o.state = 'open'
      and (o.kind = 'apprenticeship-vacancy' or o.application_cycle = 2027)
      and (o.deadline is null or o.deadline > pg_catalog.now())
      and o.verified_at is not null
      and o.verified_at >= pg_catalog.now() - interval '30 days'
      and o.freshness in ('high', 'medium')
      and o.freshness_expires_at is not null
      and o.freshness_expires_at > pg_catalog.now()
      and not exists (
        select 1
        from public.catalogue_fact_revisions r
        where r.opportunity_id = o.id and r.status = 'pending'
      )
      and not exists (
        select 1
        from public.source_issues i
        where i.opportunity_id = o.id and i.status in ('open', 'reviewing')
      )
      and exists (
        select 1
        from public.requirements q
        where q.opportunity_id = o.id and q.publication_state = 'published'
      )
      and not exists (
        select 1
        from public.requirements q
        where q.opportunity_id = o.id
          and q.publication_state = 'published'
          and (
            coalesce(pg_catalog.btrim(q.supporting_text), '') = ''
            or coalesce(pg_catalog.btrim(q.source_url), '') = ''
            or q.verified_at is null
            or q.freshness not in ('high', 'medium')
            or q.freshness_expires_at is null
            or q.freshness_expires_at <= pg_catalog.now()
            or q.conflict
            or (q.hard_requirement and not public.catalogue_rule_supported(q.structured_value))
          )
      )
      and (
        o.source_authority not in ('find-an-apprenticeship-api-v2', 'discover-uni-hesa')
        or exists (
          select 1
          from public.catalogue_source_attestations a
          where a.source_authority = o.source_authority and a.revoked_at is null
        )
      )
      and (
        o.source_authority <> 'discover-uni-hesa'
        or (
          o.attribution->>'credit' = 'HESA, www.hesa.ac.uk'
          and o.attribution->>'licence' = 'https://creativecommons.org/licenses/by/4.0/'
          and coalesce(pg_catalog.btrim(o.attribution->>'changes'), '') <> ''
        )
      )
      and (
        o.source_authority not in ('find-an-apprenticeship-api-v2', 'discover-uni-hesa')
        or exists (
          select 1
          from public.source_runs s
          where s.source_authority = o.source_authority
            and s.status = 'completed'
            and s.complete_snapshot
            and s.completed_at > pg_catalog.now() - case
              when s.source_authority = 'discover-uni-hesa' then interval '8 days'
              else interval '1 day'
            end
        )
      )
  );
$$;

drop policy if exists "published opportunities are public" on public.opportunities;
create policy "current published opportunities are public" on public.opportunities
  for select using (public.catalogue_public_opportunity_current(id));

drop policy if exists "published organisations are public" on public.organisations;
create policy "organisations for current published opportunities are public" on public.organisations
  for select using (
    exists (
      select 1
      from public.opportunities
      where opportunities.organisation_id = organisations.id
        and public.catalogue_public_opportunity_current(opportunities.id)
    )
  );

drop policy if exists "published requirements of published opportunities are public" on public.requirements;
create policy "requirements of current published opportunities are public" on public.requirements
  for select using (
    publication_state = 'published'
    and public.catalogue_public_opportunity_current(opportunity_id)
  );

grant execute on function public.catalogue_public_opportunity_current(uuid) to anon, authenticated;
grant select (application_cycle, freshness_expires_at) on public.opportunities to anon, authenticated;
grant select (freshness_expires_at) on public.requirements to anon, authenticated;

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
  if p_decision not in ('review','published','withdrawn') or length(pg_catalog.btrim(coalesce(p_note,''))) < 3 then raise exception 'review_note_required'; end if;
  select * into opportunity from public.opportunities where id = p_opportunity_id for update;
  if opportunity.id is null then raise exception 'opportunity_not_found'; end if;
  if p_decision = 'published' then
    if opportunity.kind not in ('university-course','apprenticeship-vacancy') then raise exception 'publication_kind_invalid'; end if;
    if opportunity.sector not in ('technology','engineering','business','finance') then raise exception 'publication_sector_invalid'; end if;
    if opportunity.state <> 'open' then raise exception 'publication_not_open'; end if;
    if opportunity.kind = 'university-course' and opportunity.application_cycle <> 2027 then raise exception 'publication_application_cycle_invalid'; end if;
    if pg_catalog.btrim(opportunity.provider_name) = '' or pg_catalog.btrim(opportunity.location) = ''
      or pg_catalog.btrim(opportunity.application_url) = '' or pg_catalog.btrim(opportunity.source_url) = '' then raise exception 'publication_fact_missing'; end if;
    if opportunity.verified_at is null or opportunity.verified_at < pg_catalog.now() - interval '30 days'
      or opportunity.freshness not in ('high','medium')
      or opportunity.freshness_expires_at is null or opportunity.freshness_expires_at <= pg_catalog.now() then raise exception 'publication_verification_expired'; end if;
    if opportunity.deadline is not null and opportunity.deadline <= pg_catalog.now() then raise exception 'publication_deadline_passed'; end if;
    if opportunity.source_authority in ('find-an-apprenticeship-api-v2','discover-uni-hesa') and not exists (
      select 1 from public.catalogue_source_attestations attestation
      where attestation.source_authority = opportunity.source_authority and attestation.revoked_at is null
    ) then raise exception 'publication_source_unattested'; end if;
    if opportunity.source_authority = 'discover-uni-hesa'
      and not (opportunity.attribution->>'credit' = 'HESA, www.hesa.ac.uk'
        and opportunity.attribution->>'licence' = 'https://creativecommons.org/licenses/by/4.0/'
        and coalesce(pg_catalog.btrim(opportunity.attribution->>'changes'),'') <> '') then raise exception 'publication_attribution_missing'; end if;
    if exists (select 1 from public.catalogue_fact_revisions where opportunity_id = opportunity.id and status = 'pending') then raise exception 'publication_revision_pending'; end if;
    if exists (select 1 from public.source_issues where opportunity_id = opportunity.id and status in ('open','reviewing')) then raise exception 'publication_source_issue_open'; end if;
    if not exists (select 1 from public.requirements where opportunity_id = opportunity.id and publication_state = 'published') then raise exception 'publication_requirement_missing'; end if;
    if exists (
      select 1 from public.requirements where opportunity_id = opportunity.id and publication_state = 'published'
        and (coalesce(pg_catalog.btrim(supporting_text),'') = '' or coalesce(pg_catalog.btrim(source_url),'') = ''
          or verified_at is null or freshness not in ('high','medium')
          or freshness_expires_at is null or freshness_expires_at <= pg_catalog.now() or conflict
          or (hard_requirement and not public.catalogue_rule_supported(structured_value)))
    ) then raise exception 'publication_requirement_invalid'; end if;
  end if;
  update public.opportunities set publication_state = p_decision, updated_at = pg_catalog.now() where id = opportunity.id;
  insert into public.publication_reviews(opportunity_id, reviewer_id, decision, note)
  values (opportunity.id, p_reviewer_id, p_decision, pg_catalog.btrim(p_note));
  insert into public.audit_events(user_id, action, entity_type, entity_id, metadata)
  values (p_reviewer_id, 'catalogue.publication_reviewed', 'opportunity', opportunity.id::text, jsonb_build_object('decision',p_decision));
end;
$$;

create or replace function public.verify_catalogue_opportunity_cycle(
  p_opportunity_id uuid,
  p_reviewer_id uuid,
  p_application_cycle integer,
  p_note text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare opportunity public.opportunities%rowtype;
begin
  if p_application_cycle <> 2027 or length(pg_catalog.btrim(coalesce(p_note, ''))) < 3 then raise exception 'invalid_application_cycle_review'; end if;
  select * into opportunity from public.opportunities where id = p_opportunity_id for update;
  if opportunity.id is null then raise exception 'opportunity_not_found'; end if;
  if opportunity.kind <> 'university-course' then raise exception 'application_cycle_not_for_vacancy'; end if;
  insert into public.catalogue_manual_revisions(opportunity_id, action, previous_fact, reviewed_fact, reviewer_id, reviewer_note)
  values (
    opportunity.id,
    'verify-opportunity-cycle',
    jsonb_build_object('applicationCycle', opportunity.application_cycle),
    jsonb_build_object('applicationCycle', p_application_cycle),
    p_reviewer_id,
    pg_catalog.btrim(p_note)
  );
  update public.opportunities
  set application_cycle = p_application_cycle,
      verified_at = pg_catalog.now(),
      freshness = 'high',
      freshness_expires_at = pg_catalog.now() + interval '30 days',
      updated_at = pg_catalog.now()
  where id = opportunity.id;
  insert into public.audit_events(user_id, action, entity_type, entity_id, metadata)
  values (p_reviewer_id, 'catalogue.application_cycle_verified', 'opportunity', opportunity.id::text, jsonb_build_object('applicationCycle', p_application_cycle));
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
  expired_deadlines integer;
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
  update public.opportunities set state = 'closed', updated_at = pg_catalog.now()
  where state <> 'closed' and deadline is not null and deadline <= pg_catalog.now();
  get diagnostics expired_deadlines = row_count;
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
    'closedExpiredDeadlines',expired_deadlines,
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
    or coalesce(pg_catalog.btrim(p_fact->>'title'),'') = '' or coalesce(pg_catalog.btrim(p_fact->>'providerName'),'') = ''
    or coalesce(pg_catalog.btrim(p_fact->>'location'),'') = '' or coalesce(pg_catalog.btrim(p_fact->>'summary'),'') = ''
    or coalesce(pg_catalog.btrim(p_fact->>'applicationUrl'),'') = '' or coalesce(pg_catalog.btrim(p_fact->>'sourceUrl'),'') = '' then
    raise exception 'invalid_manual_draft';
  end if;
  organisation_kind := case when p_fact->>'kind' = 'university-course' then 'university-provider' else 'employer' end;
  authority := case when p_fact->>'kind' = 'university-course' then 'provider-manual-review' else 'employer-manual-review' end;
  insert into public.organisations(kind,name,website_url,source_authority,updated_at)
  values (organisation_kind,pg_catalog.btrim(p_fact->>'providerName'),p_fact->>'sourceUrl',authority,pg_catalog.now())
  on conflict (kind,name) do update set website_url = excluded.website_url, updated_at = excluded.updated_at
  returning id into organisation_id;
  insert into public.opportunities(
    organisation_id,kind,sector,title,provider_name,location,summary,deadline,application_cycle,application_url,
    source_url,source_authority,retrieved_at,freshness,state,publication_state
  ) values (
    organisation_id,p_fact->>'kind',p_fact->>'sector',pg_catalog.btrim(p_fact->>'title'),pg_catalog.btrim(p_fact->>'providerName'),
    pg_catalog.btrim(p_fact->>'location'),pg_catalog.btrim(p_fact->>'summary'),nullif(p_fact->>'deadline','')::timestamptz,
    nullif(p_fact->>'applicationCycle','')::integer,p_fact->>'applicationUrl',p_fact->>'sourceUrl',authority,pg_catalog.now(),'needs-checking','unknown','draft'
  ) returning id into opportunity_id;
  insert into public.audit_events(user_id,action,entity_type,entity_id,metadata)
  values (p_reviewer_id,'catalogue.draft_created','opportunity',opportunity_id::text,'{}'::jsonb);
  return opportunity_id;
end;
$$;

revoke all on function public.catalogue_public_opportunity_current(uuid) from public;
grant execute on function public.catalogue_public_opportunity_current(uuid) to anon, authenticated;
revoke all on function public.verify_catalogue_opportunity_cycle(uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.verify_catalogue_opportunity_cycle(uuid,uuid,integer,text) to service_role;
