-- Keep the denormalised provider name and the organisation foreign key aligned
-- when an approved source corrects its publication provider or employer name.
create or replace function public.align_catalogue_opportunity_organisation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organisation_id uuid;
  target_kind text;
begin
  if new.source_authority not in ('discover-uni-hesa', 'find-an-apprenticeship-api-v2') then
    return new;
  end if;

  target_kind := case
    when new.kind = 'university-course' then 'university-provider'
    when new.kind = 'apprenticeship-vacancy' then 'employer'
    else null
  end;
  if target_kind is null then return new; end if;

  select organisation.id
  into target_organisation_id
  from public.organisations organisation
  where organisation.kind = target_kind
    and organisation.name = new.provider_name;

  if target_organisation_id is null then
    raise exception 'catalogue_organisation_missing';
  end if;
  new.organisation_id := target_organisation_id;
  return new;
end;
$$;

drop trigger if exists align_catalogue_opportunity_organisation on public.opportunities;
create trigger align_catalogue_opportunity_organisation
before insert or update of provider_name, kind, source_authority
on public.opportunities
for each row execute function public.align_catalogue_opportunity_organisation();

revoke all on function public.align_catalogue_opportunity_organisation() from public, anon, authenticated;
