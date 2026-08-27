-- Forward-only repair for checkout reservation creation.
-- Qualify returned columns because the table-returning function exposes an
-- output variable named expires_at as well.

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
  where reservation.user_id = p_user_id and reservation.consumed_at is null and reservation.expires_at > pg_catalog.now()
  limit 1;
  if found then
    return query select existing.id, existing.offer, existing.amount_pence, existing.currency, existing.expires_at;
    return;
  end if;

  allowed := public.consume_rate_limit('checkout:' || p_user_id::text, 5, 3600);
  if not allowed then raise exception using errcode = 'P0001', message = 'checkout_rate_limited'; end if;

  select * into selected_offer from public.payment_offers
  where code = 'founding-launch' and active and allocated_count < allocation_limit for update;
  if not found then
    select * into selected_offer from public.payment_offers where code = 'standard' and active for update;
  end if;
  if not found then raise exception using errcode = 'P0001', message = 'checkout_offer_unavailable'; end if;

  if selected_offer.allocation_limit is not null then
    update public.payment_offers
    set allocated_count = allocated_count + 1, updated_at = pg_catalog.now()
    where code = selected_offer.code;
  end if;

  insert into public.checkout_reservations(user_id, application_cycle, offer, amount_pence, currency, expires_at)
  values (p_user_id, p_application_cycle, selected_offer.code, selected_offer.amount_pence, selected_offer.currency, pg_catalog.now() + interval '30 minutes')
  returning checkout_reservations.id, checkout_reservations.offer, checkout_reservations.amount_pence,
    checkout_reservations.currency, checkout_reservations.expires_at
  into reservation_id, offer, amount_pence, currency, expires_at;
  return next;
end;
$$;

revoke all on function public.reserve_cycle_checkout(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_cycle_checkout(uuid, integer) to service_role;
