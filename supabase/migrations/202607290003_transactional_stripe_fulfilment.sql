-- Stripe payment projection is deliberately one RPC: every entitlement, order,
-- audit, analytics, and processed-event change shares one transaction.

create table public.payment_offers (
  code text primary key check (code in ('founding-launch', 'standard')),
  amount_pence integer not null check (amount_pence > 0),
  currency text not null check (currency = 'gbp'),
  allocation_limit integer check (allocation_limit is null or allocation_limit > 0),
  allocated_count integer not null default 0 check (allocated_count >= 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.payment_offers(code, amount_pence, currency, allocation_limit)
values ('founding-launch', 2900, 'gbp', 50), ('standard', 5900, 'gbp', null);

create table public.checkout_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_cycle integer not null,
  offer text not null references public.payment_offers(code),
  amount_pence integer not null check (amount_pence > 0),
  currency text not null check (currency = 'gbp'),
  expires_at timestamptz not null,
  stripe_checkout_session_id text unique,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.checkout_reservations enable row level security;
revoke all privileges on public.payment_offers, public.checkout_reservations from anon, authenticated;

alter table public.orders add column stripe_payment_intent_id text unique;
alter table public.orders add column stripe_charge_id text unique;
alter table public.orders add column refunded_amount_pence integer not null default 0 check (refunded_amount_pence >= 0);
alter table public.orders drop constraint orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('paid', 'partially_refunded', 'refunded', 'disputed'));
alter table public.entitlements add column last_payment_event_id text;
alter table public.stripe_events drop constraint stripe_events_processing_status_check;
alter table public.stripe_events add constraint stripe_events_processing_status_check
  check (processing_status in ('processing', 'processed', 'failed', 'rejected'));

create or replace function public.reserve_cycle_checkout(p_user_id uuid, p_application_cycle integer)
returns table(reservation_id uuid, offer text, amount_pence integer, currency text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  selected_offer public.payment_offers;
  existing public.checkout_reservations;
  expired_reservation public.checkout_reservations;
  allowed boolean;
begin
  if not exists (select 1 from auth.users where id = p_user_id)
    or not exists (select 1 from public.profiles where id = p_user_id and application_cycle = p_application_cycle)
    or p_application_cycle < extract(year from pg_catalog.now())::integer
    or p_application_cycle > extract(year from pg_catalog.now())::integer + 4 then
    raise exception using errcode = '22023', message = 'invalid_checkout_account_or_cycle';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('checkout:' || p_user_id::text, 0));
  -- Serialise expiry reclaim with the founding allocation row. Otherwise old
  -- abandoned sessions could permanently consume one of the fifty places.
  perform 1 from public.payment_offers where code = 'founding-launch' for update;
  for expired_reservation in select * from public.checkout_reservations where consumed_at is null and expires_at <= pg_catalog.now() for update loop
    if expired_reservation.offer = 'founding-launch' then
      update public.payment_offers set allocated_count = greatest(allocated_count - 1, 0), updated_at = pg_catalog.now()
        where code = expired_reservation.offer;
    end if;
    delete from public.checkout_reservations where id = expired_reservation.id;
  end loop;
  select * into existing from public.checkout_reservations
    where user_id = p_user_id and consumed_at is null and expires_at > pg_catalog.now() limit 1;
  if found then
    return query select existing.id, existing.offer, existing.amount_pence, existing.currency, existing.expires_at;
    return;
  end if;
  allowed := public.consume_rate_limit('checkout:' || p_user_id::text, 5, 3600);
  if not allowed then raise exception using errcode = 'P0001', message = 'checkout_rate_limited'; end if;

  -- Row locking makes allocation of the 50 founding purchases atomic.
  select * into selected_offer from public.payment_offers
    where code = 'founding-launch' and active and allocated_count < allocation_limit for update;
  if not found then
    select * into selected_offer from public.payment_offers where code = 'standard' and active for update;
  end if;
  if not found then raise exception using errcode = 'P0001', message = 'checkout_offer_unavailable'; end if;

  if selected_offer.allocation_limit is not null then
    update public.payment_offers set allocated_count = allocated_count + 1, updated_at = pg_catalog.now()
      where code = selected_offer.code;
  end if;
  insert into public.checkout_reservations(user_id, application_cycle, offer, amount_pence, currency, expires_at)
  values (p_user_id, p_application_cycle, selected_offer.code, selected_offer.amount_pence, selected_offer.currency, pg_catalog.now() + interval '30 minutes')
  returning id, offer, amount_pence, currency, expires_at into reservation_id, offer, amount_pence, currency, expires_at;
  return next;
end;
$$;

create or replace function public.apply_stripe_payment_event(
  p_event_id text, p_event_type text, p_event_created_at bigint, p_live_mode boolean,
  p_reservation_id uuid default null, p_user_id uuid default null, p_application_cycle integer default null,
  p_offer text default null, p_amount_pence integer default null, p_currency text default null,
  p_checkout_session_id text default null, p_payment_intent_id text default null, p_charge_id text default null,
  p_refunded_amount_pence integer default null, p_dispute_status text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  reservation public.checkout_reservations;
  current_entitlement public.entitlements;
  matched_order public.orders;
  incoming_is_newer boolean;
  next_order_status text;
  next_entitlement_status text;
begin
  if p_event_id is null or length(p_event_id) < 4 or p_event_created_at < 1 then
    raise exception using errcode = '22023', message = 'invalid_stripe_event';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-event:' || p_event_id, 0));
  if exists (select 1 from public.stripe_events where id = p_event_id and processing_status = 'processed') then return 'duplicate'; end if;
  if p_event_type not in ('checkout.session.completed', 'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed') then
    insert into public.stripe_events(id, event_type, event_created_at, processing_status, error_code, updated_at)
    values (p_event_id, p_event_type, p_event_created_at, 'rejected', 'unsupported_event', pg_catalog.now())
    on conflict (id) do update set processing_status = 'rejected', error_code = 'unsupported_event', updated_at = pg_catalog.now();
    return 'rejected';
  end if;

  if p_event_type = 'checkout.session.completed' then
    if not p_live_mode or p_reservation_id is null or p_user_id is null or p_application_cycle is null
      or p_offer is null or p_amount_pence is null or p_currency <> 'gbp' or p_checkout_session_id is null then
      raise exception using errcode = '22023', message = 'invalid_paid_checkout';
    end if;
    select * into reservation from public.checkout_reservations where id = p_reservation_id for update;
    if not found or reservation.user_id <> p_user_id or reservation.application_cycle <> p_application_cycle
      or reservation.offer <> p_offer or reservation.amount_pence <> p_amount_pence or reservation.currency <> p_currency
      or reservation.consumed_at is not null then
      raise exception using errcode = '22023', message = 'checkout_reservation_mismatch';
    end if;
    if not exists (select 1 from auth.users where id = p_user_id) then
      raise exception using errcode = '22023', message = 'checkout_account_missing';
    end if;
    select * into current_entitlement from public.entitlements where user_id = p_user_id for update;
    incoming_is_newer := not found or p_event_created_at > current_entitlement.last_payment_event_created_at
      or (p_event_created_at = current_entitlement.last_payment_event_created_at and p_event_id > coalesce(current_entitlement.last_payment_event_id, ''));
    if incoming_is_newer then
      insert into public.entitlements(user_id, plan, status, stripe_checkout_session_id, starts_at, ends_at, last_payment_event_created_at, last_payment_event_id, updated_at)
      values (p_user_id, 'cycle', 'active', p_checkout_session_id, to_timestamp(p_event_created_at), make_timestamptz(p_application_cycle, 9, 30, 23, 59, 59, 'UTC'), p_event_created_at, p_event_id, pg_catalog.now())
      on conflict (user_id) do update set plan = 'cycle', status = 'active', stripe_checkout_session_id = excluded.stripe_checkout_session_id,
        starts_at = excluded.starts_at, ends_at = excluded.ends_at, last_payment_event_created_at = excluded.last_payment_event_created_at,
        last_payment_event_id = excluded.last_payment_event_id, updated_at = excluded.updated_at;
    end if;
    insert into public.orders(user_id, stripe_checkout_session_id, stripe_payment_intent_id, amount_pence, currency, offer, status, purchased_at, updated_at)
    values (p_user_id, p_checkout_session_id, p_payment_intent_id, p_amount_pence, p_currency, p_offer, 'paid', to_timestamp(p_event_created_at), pg_catalog.now())
    on conflict (stripe_checkout_session_id) do update set stripe_payment_intent_id = coalesce(excluded.stripe_payment_intent_id, orders.stripe_payment_intent_id), updated_at = excluded.updated_at;
    update public.checkout_reservations set consumed_at = pg_catalog.now(), stripe_checkout_session_id = p_checkout_session_id where id = p_reservation_id;
    insert into public.audit_events(user_id, action, entity_type, entity_id, metadata) values
      (p_user_id, 'payment_fulfilled', 'stripe_event', p_event_id, jsonb_build_object('checkout_session_id', p_checkout_session_id, 'offer', p_offer));
    insert into public.analytics_events(user_id, event_name, properties) values (p_user_id, 'checkout_completed', jsonb_build_object('offer', p_offer));
  else
    select * into matched_order from public.orders where stripe_charge_id = p_charge_id or stripe_payment_intent_id = p_payment_intent_id for update;
    if not found then raise exception using errcode = '22023', message = 'payment_order_missing'; end if;
    select * into current_entitlement from public.entitlements where user_id = matched_order.user_id for update;
    incoming_is_newer := not found or p_event_created_at > current_entitlement.last_payment_event_created_at
      or (p_event_created_at = current_entitlement.last_payment_event_created_at and p_event_id > coalesce(current_entitlement.last_payment_event_id, ''));
    if p_event_type = 'charge.refunded' then
      if p_refunded_amount_pence is null or p_refunded_amount_pence < 0 or p_refunded_amount_pence > matched_order.amount_pence then
        raise exception using errcode = '22023', message = 'invalid_refund_amount';
      end if;
      next_order_status := case when p_refunded_amount_pence = matched_order.amount_pence then 'refunded' else 'partially_refunded' end;
      next_entitlement_status := case when next_order_status = 'refunded' then 'refunded' else current_entitlement.status end;
    elsif p_event_type = 'charge.dispute.created' then next_order_status := 'disputed'; next_entitlement_status := 'disputed';
    elsif p_dispute_status = 'won' then next_order_status := 'paid'; next_entitlement_status := 'active';
    else next_order_status := 'disputed'; next_entitlement_status := 'disputed'; end if;
    update public.orders set stripe_charge_id = coalesce(p_charge_id, stripe_charge_id), refunded_amount_pence = coalesce(p_refunded_amount_pence, refunded_amount_pence), status = next_order_status, updated_at = pg_catalog.now() where id = matched_order.id;
    if incoming_is_newer then update public.entitlements set status = next_entitlement_status, last_payment_event_created_at = p_event_created_at, last_payment_event_id = p_event_id, updated_at = pg_catalog.now() where user_id = matched_order.user_id; end if;
    insert into public.audit_events(user_id, action, entity_type, entity_id, metadata) values
      (matched_order.user_id, 'payment_' || replace(p_event_type, '.', '_'), 'stripe_event', p_event_id, jsonb_build_object('order_id', matched_order.id));
  end if;
  insert into public.stripe_events(id, event_type, event_created_at, processing_status, processed_at, updated_at)
  values (p_event_id, p_event_type, p_event_created_at, 'processed', pg_catalog.now(), pg_catalog.now())
  on conflict (id) do update set event_type = excluded.event_type, event_created_at = excluded.event_created_at, processing_status = 'processed', processed_at = excluded.processed_at, error_code = null, updated_at = excluded.updated_at;
  return 'processed';
exception when others then
  -- Rethrow rolls back every partial write, including stripe_events. Stripe retries.
  raise;
end;
$$;

create or replace function public.reject_stripe_payment_event(p_event_id text, p_event_type text, p_event_created_at bigint, p_error_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('stripe-event:' || p_event_id, 0));
  insert into public.stripe_events(id, event_type, event_created_at, processing_status, error_code, updated_at)
  values (p_event_id, p_event_type, p_event_created_at, 'rejected', left(coalesce(p_error_code, 'invalid_event'), 80), pg_catalog.now())
  on conflict (id) do update set processing_status = case when public.stripe_events.processing_status = 'processed' then 'processed' else 'rejected' end,
    error_code = case when public.stripe_events.processing_status = 'processed' then public.stripe_events.error_code else excluded.error_code end,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.reserve_cycle_checkout(uuid, integer) from public, anon, authenticated;
revoke all on function public.apply_stripe_payment_event(text, text, bigint, boolean, uuid, uuid, integer, text, integer, text, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.reject_stripe_payment_event(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.reserve_cycle_checkout(uuid, integer) to service_role;
grant execute on function public.apply_stripe_payment_event(text, text, bigint, boolean, uuid, uuid, integer, text, integer, text, text, text, text, integer, text) to service_role;
grant execute on function public.reject_stripe_payment_event(text, text, bigint, text) to service_role;
