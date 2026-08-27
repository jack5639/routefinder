-- Launch safety boundary for the September 2027 application cycle.
-- This is forward-only: existing unsupported prototype cycles are cleared so
-- users must reconfirm against the launch cycle rather than being silently
-- coerced into it.

update public.profiles
set application_cycle = null,
    updated_at = pg_catalog.now()
where application_cycle is not null
  and application_cycle <> 2027;

alter table public.profiles
  drop constraint if exists profiles_application_cycle_check;
alter table public.profiles
  add constraint profiles_application_cycle_check
  check (application_cycle is null or application_cycle = 2027);

create or replace function public.enforce_launch_profile_cycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.application_cycle is not null and new.application_cycle <> 2027 then
    raise exception using errcode = '22023', message = 'unsupported_application_cycle';
  end if;
  return new;
end;
$$;

drop trigger if exists launch_profile_cycle on public.profiles;
create trigger launch_profile_cycle
before insert or update of application_cycle on public.profiles
for each row execute function public.enforce_launch_profile_cycle();

revoke all on function public.enforce_launch_profile_cycle() from public, anon, authenticated;

-- Reserve only a checkout for a profile that has explicitly selected the one
-- supported launch cycle. Payment enablement remains an application-level
-- switch; this database function is the final cycle and entitlement boundary.
create or replace function public.reserve_cycle_checkout(p_user_id uuid, p_application_cycle integer)
returns table(reservation_id uuid, offer text, amount_pence integer, currency text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  selected_offer public.payment_offers;
  existing public.checkout_reservations;
  expired_reservation public.checkout_reservations;
  allowed boolean;
begin
  if p_application_cycle <> 2027
    or not exists (select 1 from auth.users where id = p_user_id)
    or not exists (
      select 1 from public.profiles
      where id = p_user_id and application_cycle = 2027
    ) then
    raise exception using errcode = '22023', message = 'invalid_checkout_account_or_cycle';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('checkout:' || p_user_id::text, 0));
  perform 1 from public.payment_offers where code = 'founding-launch' for update;
  for expired_reservation in
    select reservation.* from public.checkout_reservations as reservation
    where reservation.consumed_at is null and reservation.expires_at <= pg_catalog.now()
    for update
  loop
    if expired_reservation.offer = 'founding-launch' then
      update public.payment_offers
      set allocated_count = greatest(allocated_count - 1, 0), updated_at = pg_catalog.now()
      where code = expired_reservation.offer;
    end if;
    delete from public.checkout_reservations where id = expired_reservation.id;
  end loop;

  select reservation.* into existing from public.checkout_reservations as reservation
  where reservation.user_id = p_user_id
    and reservation.consumed_at is null
    and reservation.expires_at > pg_catalog.now()
  limit 1;
  if found then
    return query select existing.id, existing.offer, existing.amount_pence, existing.currency, existing.expires_at;
    return;
  end if;

  allowed := public.consume_rate_limit('checkout:' || p_user_id::text, 5, 3600);
  if not allowed then
    raise exception using errcode = 'P0001', message = 'checkout_rate_limited';
  end if;

  select * into selected_offer from public.payment_offers
  where code = 'founding-launch' and active and allocated_count < allocation_limit for update;
  if not found then
    select * into selected_offer from public.payment_offers where code = 'standard' and active for update;
  end if;
  if not found then
    raise exception using errcode = 'P0001', message = 'checkout_offer_unavailable';
  end if;

  if selected_offer.allocation_limit is not null then
    update public.payment_offers
    set allocated_count = allocated_count + 1, updated_at = pg_catalog.now()
    where code = selected_offer.code;
  end if;

  insert into public.checkout_reservations(user_id, application_cycle, offer, amount_pence, currency, expires_at)
  values (p_user_id, 2027, selected_offer.code, selected_offer.amount_pence, selected_offer.currency, pg_catalog.now() + interval '30 minutes')
  returning checkout_reservations.id, checkout_reservations.offer, checkout_reservations.amount_pence,
    checkout_reservations.currency, checkout_reservations.expires_at
  into reservation_id, offer, amount_pence, currency, expires_at;
  return next;
end;
$$;

revoke all on function public.reserve_cycle_checkout(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_cycle_checkout(uuid, integer) to service_role;

-- Preserve a deliberately small, non-sensitive snapshot when a reviewed item
-- is saved. If a catalogue record later becomes hidden by the public RLS
-- policy, the student's own saved item still has enough context to explain
-- what changed without implying that it is safe to apply.
alter table public.portfolio_items
  add column if not exists opportunity_snapshot jsonb;

alter table public.portfolio_items
  drop constraint if exists portfolio_items_opportunity_snapshot_check;
alter table public.portfolio_items
  add constraint portfolio_items_opportunity_snapshot_check
  check (opportunity_snapshot is null or jsonb_typeof(opportunity_snapshot) = 'object');

update public.portfolio_items as item
set opportunity_snapshot = jsonb_build_object(
  'id', opportunity.id,
  'title', opportunity.title,
  'providerName', opportunity.provider_name,
  'kind', opportunity.kind,
  'sector', opportunity.sector,
  'location', opportunity.location,
  'applicationUrl', opportunity.application_url,
  'sourceUrl', opportunity.source_url,
  'sourceAuthority', opportunity.source_authority,
  'deadline', opportunity.deadline,
  'state', opportunity.state,
  'freshness', opportunity.freshness,
  'publicationState', opportunity.publication_state,
  'verifiedAt', opportunity.verified_at,
  'savedAt', item.created_at
)
from public.opportunities as opportunity
where item.opportunity_id = opportunity.id
  and item.opportunity_snapshot is null;

create or replace function public.preserve_portfolio_opportunity_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.opportunity_id is null then
    new.opportunity_snapshot := null;
    return new;
  end if;

  if new.opportunity_snapshot is null
    or (tg_op = 'UPDATE' and new.opportunity_id is distinct from old.opportunity_id) then
    select jsonb_build_object(
      'id', opportunity.id,
      'title', opportunity.title,
      'providerName', opportunity.provider_name,
      'kind', opportunity.kind,
      'sector', opportunity.sector,
      'location', opportunity.location,
      'applicationUrl', opportunity.application_url,
      'sourceUrl', opportunity.source_url,
      'sourceAuthority', opportunity.source_authority,
      'deadline', opportunity.deadline,
      'state', opportunity.state,
      'freshness', opportunity.freshness,
      'publicationState', opportunity.publication_state,
      'verifiedAt', opportunity.verified_at,
      'savedAt', coalesce(new.created_at, pg_catalog.now())
    ) into new.opportunity_snapshot
    from public.opportunities as opportunity
    where opportunity.id = new.opportunity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_portfolio_opportunity_snapshot on public.portfolio_items;
create trigger preserve_portfolio_opportunity_snapshot
before insert or update of opportunity_id, opportunity_snapshot on public.portfolio_items
for each row execute function public.preserve_portfolio_opportunity_snapshot();

revoke all on function public.preserve_portfolio_opportunity_snapshot() from public, anon, authenticated;

-- Evidence can demonstrate preparation and experience, but it must never
-- satisfy a deterministic hard grade requirement. Qualifications own that
-- assessment at both the API and database boundaries.
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
    if exists (
      select 1 from public.requirements
      where requirements.id = new.requirement_id
        and requirements.hard_requirement
        and requirements.kind = 'grade'
    ) then
      raise exception using errcode = '23514', message = 'relationship_invalid:deterministic_grade_evidence_forbidden';
    end if;

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
    ) then
      raise exception using errcode = '23514', message = 'relationship_invalid:saved_published_requirement_required';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_evidence_requirement_link() from public, anon, authenticated;

-- Keep event names deliberately finite. Public funnel events carry only small
-- enums and an optional validated campaign code; payment lifecycle events are
-- produced from audited server-side state changes.
alter table public.analytics_events
  drop constraint if exists analytics_events_event_name_check;
alter table public.analytics_events
  add constraint analytics_events_event_name_check check (event_name in (
    'readiness_started', 'readiness_completed', 'opportunity_saved', 'evidence_added',
    'action_scheduled', 'action_completed', 'paywall_viewed', 'checkout_started',
    'checkout_completed', 'application_stage_updated', 'source_issue_reported',
    'export_requested', 'deletion_requested', 'starting_path_selected',
    'first_useful_result_viewed', 'campaign_attributed', 'payment_completed',
    'refund', 'dispute'
  ));

create or replace function public.project_payment_lifecycle_analytics()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.action = 'payment_fulfilled' then
    insert into public.analytics_events(user_id, event_name, properties)
    values (new.user_id, 'payment_completed', '{}'::jsonb);
  elsif new.action = 'payment_charge_refunded' then
    insert into public.analytics_events(user_id, event_name, properties)
    values (new.user_id, 'refund', '{}'::jsonb);
  elsif new.action in ('payment_charge_dispute_created', 'payment_charge_dispute_closed') then
    insert into public.analytics_events(user_id, event_name, properties)
    values (
      new.user_id,
      'dispute',
      jsonb_build_object(
        'state', case when new.action = 'payment_charge_dispute_created' then 'created' else 'closed' end
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists project_payment_lifecycle_analytics on public.audit_events;
create trigger project_payment_lifecycle_analytics
after insert on public.audit_events
for each row execute function public.project_payment_lifecycle_analytics();

revoke all on function public.project_payment_lifecycle_analytics() from public, anon, authenticated;

-- A service-role-only probe lets /api/readiness prove the exact migration is
-- present without exposing schema details through the public API.
create or replace function public.routefinder_release_probe()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select '20260827202316'::text;
$$;

revoke all on function public.routefinder_release_probe() from public, anon, authenticated;
grant execute on function public.routefinder_release_probe() to service_role;
