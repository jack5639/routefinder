-- A source permission confirmation is an accountable administrative decision,
-- not a document-upload requirement.  Keep the decision history so an active
-- confirmation can be replaced or withdrawn without losing its audit trail.
create table public.catalogue_source_attestations (
  id uuid primary key default gen_random_uuid(),
  source_authority text not null check (source_authority in ('find-an-apprenticeship-api-v2', 'discover-uni-hesa')),
  attested_by uuid not null references auth.users(id) on delete restrict,
  permission_basis text not null check (permission_basis in ('api-terms-confirmed', 'open-licence-confirmed', 'direct-permission-confirmed')),
  note text not null check (char_length(btrim(note)) between 10 and 1000),
  attested_at timestamptz not null default pg_catalog.now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete restrict,
  revocation_note text check (revocation_note is null or char_length(btrim(revocation_note)) between 3 and 1000),
  check (
    (source_authority = 'find-an-apprenticeship-api-v2' and permission_basis in ('api-terms-confirmed', 'direct-permission-confirmed'))
    or (source_authority = 'discover-uni-hesa' and permission_basis in ('open-licence-confirmed', 'direct-permission-confirmed'))
  ),
  check ((revoked_at is null) = (revoked_by is null)),
  check (revoked_at is not null or revocation_note is null)
);

create unique index catalogue_one_active_source_attestation
  on public.catalogue_source_attestations(source_authority)
  where revoked_at is null;
create index catalogue_source_attestations_active_idx
  on public.catalogue_source_attestations(source_authority, attested_at desc)
  where revoked_at is null;

alter table public.catalogue_source_attestations enable row level security;
revoke all on table public.catalogue_source_attestations from anon, authenticated;

create or replace function public.attest_catalogue_source(
  p_source_authority text,
  p_reviewer_id uuid,
  p_permission_basis text,
  p_note text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous public.catalogue_source_attestations%rowtype;
  attestation_id uuid;
begin
  if p_source_authority not in ('find-an-apprenticeship-api-v2', 'discover-uni-hesa') then raise exception 'invalid_source_authority'; end if;
  if length(btrim(coalesce(p_note, ''))) < 10 then raise exception 'source_attestation_note_required'; end if;
  if (p_source_authority = 'find-an-apprenticeship-api-v2' and p_permission_basis not in ('api-terms-confirmed', 'direct-permission-confirmed'))
    or (p_source_authority = 'discover-uni-hesa' and p_permission_basis not in ('open-licence-confirmed', 'direct-permission-confirmed')) then raise exception 'invalid_source_attestation_basis'; end if;

  perform 1 from auth.users where id = p_reviewer_id;
  if not found then raise exception 'source_attestation_reviewer_not_found'; end if;

  select * into previous from public.catalogue_source_attestations
  where source_authority = p_source_authority and revoked_at is null for update;
  if previous.id is not null then
    update public.catalogue_source_attestations
      set revoked_at = pg_catalog.now(), revoked_by = p_reviewer_id,
          revocation_note = 'Superseded by a newer administrator attestation.'
      where id = previous.id;
  end if;

  insert into public.catalogue_source_attestations(source_authority, attested_by, permission_basis, note)
  values (p_source_authority, p_reviewer_id, p_permission_basis, btrim(p_note))
  returning id into attestation_id;
  insert into public.audit_events(user_id, action, entity_type, entity_id, metadata)
  values (p_reviewer_id, 'catalogue.source_attested', 'catalogue_source_attestation', attestation_id::text,
    jsonb_build_object('sourceAuthority', p_source_authority, 'permissionBasis', p_permission_basis));
  return attestation_id;
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
    if opportunity.source_authority in ('find-an-apprenticeship-api-v2','discover-uni-hesa') and not exists (
      select 1 from public.catalogue_source_attestations attestation
      where attestation.source_authority = opportunity.source_authority and attestation.revoked_at is null
    ) then raise exception 'publication_source_unattested'; end if;
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

create or replace function public.catalogue_review_queue(
  p_page integer, p_page_size integer, p_source text, p_kind text, p_sector text,
  p_publication text, p_freshness text, p_state text, p_missing_requirements boolean,
  p_unclassified boolean, p_pending_revision boolean, p_source_issue boolean,
  p_missing_verification boolean, p_launch_failure boolean, p_sort text
) returns table(opportunity_id uuid, total_count bigint)
language sql stable security definer set search_path = ''
as $$
  with filtered as (
    select o.id, o.deadline, o.verified_at, o.latest_source_change_at, o.updated_at,
      (case when o.publication_state = 'published' then 40 else 0 end + case when o.sector = 'unclassified' then 20 else 0 end
        + case when exists (select 1 from public.catalogue_fact_revisions r where r.opportunity_id=o.id and r.status='pending') then 30 else 0 end
        + case when exists (select 1 from public.source_issues i where i.opportunity_id=o.id and i.status in ('open','reviewing')) then 25 else 0 end
        + case when o.verified_at is null or o.freshness in ('low','needs-checking') then 20 else 0 end
        + case when not exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published') then 20 else 0 end) as urgency,
      count(*) over (partition by o.sector,o.kind) as cell_count
    from public.opportunities o
    where (p_source is null or o.source_authority=p_source) and (p_kind is null or o.kind=p_kind)
      and (p_sector is null or o.sector=p_sector) and (p_publication is null or o.publication_state::text=p_publication)
      and (p_freshness is null or o.freshness=p_freshness) and (p_state is null or o.state::text=p_state)
      and (not p_missing_requirements or not exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published'))
      and (not p_unclassified or o.sector='unclassified')
      and (not p_pending_revision or exists (select 1 from public.catalogue_fact_revisions r where r.opportunity_id=o.id and r.status='pending'))
      and (not p_source_issue or exists (select 1 from public.source_issues i where i.opportunity_id=o.id and i.status in ('open','reviewing')) or exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published' and q.conflict))
      and (not p_missing_verification or o.verified_at is null)
      and (not p_launch_failure or o.sector not in ('technology','engineering','business','finance') or o.state <> 'open'
        or o.verified_at is null or o.verified_at < pg_catalog.now()-interval '30 days'
        or o.freshness not in ('high','medium') or o.freshness_expires_at is null or o.freshness_expires_at <= pg_catalog.now()
        or (o.deadline is not null and o.deadline <= pg_catalog.now())
        or (o.source_authority in ('find-an-apprenticeship-api-v2','discover-uni-hesa') and not exists (select 1 from public.catalogue_source_attestations a where a.source_authority=o.source_authority and a.revoked_at is null))
        or (o.source_authority='discover-uni-hesa' and not (o.attribution->>'credit'='HESA, www.hesa.ac.uk' and o.attribution->>'licence'='https://creativecommons.org/licenses/by/4.0/' and coalesce(btrim(o.attribution->>'changes'),'')<>''))
        or not exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published')
        or exists (select 1 from public.requirements q where q.opportunity_id=o.id and q.publication_state='published' and (q.conflict or q.verified_at is null or q.freshness not in ('high','medium') or q.freshness_expires_at is null or q.freshness_expires_at <= pg_catalog.now() or coalesce(btrim(q.supporting_text),'')='' or coalesce(btrim(q.source_url),'')='' or (q.hard_requirement and not public.catalogue_rule_supported(q.structured_value))))
        or exists (select 1 from public.catalogue_fact_revisions r where r.opportunity_id=o.id and r.status='pending')
        or exists (select 1 from public.source_issues i where i.opportunity_id=o.id and i.status in ('open','reviewing')))
  ) select id, count(*) over () from filtered
  order by case when p_sort='deadline' then deadline end asc nulls last,
    case when p_sort='oldest-verification' then verified_at end asc nulls first,
    case when p_sort='newest-source-change' then latest_source_change_at end desc nulls last,
    case when p_sort='coverage-shortfall' then cell_count end asc,
    case when p_sort not in ('deadline','oldest-verification','newest-source-change','coverage-shortfall') then urgency end desc,
    updated_at desc, id
  limit greatest(10,least(p_page_size,50)) offset (greatest(p_page,1)-1)*greatest(10,least(p_page_size,50));
$$;

revoke all on function public.attest_catalogue_source(text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.review_catalogue_publication(uuid,uuid,public.publication_state,text) from public, anon, authenticated;
revoke all on function public.catalogue_review_queue(integer,integer,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,text) from public, anon, authenticated;
grant execute on function public.attest_catalogue_source(text,uuid,text,text) to service_role;
grant execute on function public.review_catalogue_publication(uuid,uuid,public.publication_state,text) to service_role;
grant execute on function public.catalogue_review_queue(integer,integer,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,text) to service_role;
