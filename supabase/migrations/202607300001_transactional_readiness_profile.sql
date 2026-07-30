-- Qualification records must retain their identity and result status. A profile
-- replacement is one transaction so a failed qualification write cannot leave a
-- changed profile behind.

alter table public.profiles
  add column if not exists qualifications_complete boolean not null default false;

create or replace function public.replace_readiness_profile(
  p_user_id uuid,
  p_profile jsonb,
  p_qualifications jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  qualification jsonb;
begin
  if p_user_id is null or jsonb_typeof(p_profile) <> 'object' or jsonb_typeof(p_qualifications) <> 'array' then
    raise exception 'invalid_readiness_replacement';
  end if;

  if jsonb_array_length(p_qualifications) > 20 then
    raise exception 'invalid_qualification_count';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_qualifications) as item(value)
    where jsonb_typeof(item.value) <> 'object'
      or not (item.value ? 'qualification_type')
      or not (item.value ? 'subject')
      or not (item.value ? 'status')
      or item.value ->> 'status' not in ('predicted', 'achieved', 'unknown')
      or (item.value ->> 'status' = 'unknown' and coalesce(item.value ->> 'grade', '') <> '')
      or (item.value ->> 'status' <> 'unknown' and coalesce(item.value ->> 'grade', '') = '')
  ) then
    raise exception 'invalid_qualification';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_qualifications) as item(value)
    where item.value ? 'id'
    group by item.value ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'duplicate_qualification_id';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_qualifications) as item(value)
    where item.value ? 'id'
      and not exists (
        select 1 from public.qualifications as qualification_row
        where qualification_row.id = (item.value ->> 'id')::uuid
          and qualification_row.user_id = p_user_id
      )
  ) then
    raise exception 'qualification_not_found';
  end if;

  insert into public.profiles (
    id, current_stage, application_cycle, home_region, max_travel_minutes,
    relocation_preference, route_intent, sectors, work_styles,
    financial_preference, constraints, qualifications_complete,
    experience_summary, updated_at
  ) values (
    p_user_id,
    p_profile ->> 'current_stage',
    (p_profile ->> 'application_cycle')::integer,
    p_profile ->> 'home_region',
    (p_profile ->> 'max_travel_minutes')::integer,
    p_profile ->> 'relocation_preference',
    p_profile ->> 'route_intent',
    array(select jsonb_array_elements_text(p_profile -> 'sectors')),
    array(select jsonb_array_elements_text(p_profile -> 'work_styles')),
    p_profile ->> 'financial_preference',
    array(select jsonb_array_elements_text(p_profile -> 'constraints')),
    (p_profile ->> 'qualifications_complete')::boolean,
    nullif(p_profile ->> 'experience_summary', ''),
    now()
  )
  on conflict (id) do update set
    current_stage = excluded.current_stage,
    application_cycle = excluded.application_cycle,
    home_region = excluded.home_region,
    max_travel_minutes = excluded.max_travel_minutes,
    relocation_preference = excluded.relocation_preference,
    route_intent = excluded.route_intent,
    sectors = excluded.sectors,
    work_styles = excluded.work_styles,
    financial_preference = excluded.financial_preference,
    constraints = excluded.constraints,
    qualifications_complete = excluded.qualifications_complete,
    experience_summary = excluded.experience_summary,
    updated_at = excluded.updated_at;

  delete from public.qualifications as qualification_row
  where qualification_row.user_id = p_user_id
    and not exists (
      select 1
      from jsonb_array_elements(p_qualifications) as item(value)
      where item.value ? 'id' and qualification_row.id = (item.value ->> 'id')::uuid
    );

  for qualification in select value from jsonb_array_elements(p_qualifications) as item(value) loop
    if qualification ? 'id' then
      update public.qualifications set
        qualification_type = qualification ->> 'qualification_type',
        subject = qualification ->> 'subject',
        grade = nullif(qualification ->> 'grade', ''),
        status = qualification ->> 'status',
        updated_at = now()
      where id = (qualification ->> 'id')::uuid and user_id = p_user_id;
    else
      insert into public.qualifications (user_id, qualification_type, subject, grade, status)
      values (
        p_user_id,
        qualification ->> 'qualification_type',
        qualification ->> 'subject',
        nullif(qualification ->> 'grade', ''),
        qualification ->> 'status'
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.replace_readiness_profile(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_readiness_profile(uuid, jsonb, jsonb) to service_role;
