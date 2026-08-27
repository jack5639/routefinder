-- Forward repair for already-created projects. The original function used
-- pg_catalog.least(...), but LEAST is not resolved as a schema-qualified
-- function in every Supabase Postgres environment.

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

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
