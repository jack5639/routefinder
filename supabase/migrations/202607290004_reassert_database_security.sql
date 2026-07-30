-- Forward-only security repair. Do not edit migrations 001–003: projects may
-- already have recorded those versions with older function/privilege state.
-- This migration deliberately reasserts the complete browser-role boundary.

-- RLS must not depend on which revision of 001 a project first received.
alter table public.profiles enable row level security;
alter table public.qualifications enable row level security;
alter table public.consent_records enable row level security;
alter table public.organisations enable row level security;
alter table public.opportunities enable row level security;
alter table public.source_runs enable row level security;
alter table public.requirements enable row level security;
alter table public.publication_reviews enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.evidence_items enable row level security;
alter table public.evidence_requirement_links enable row level security;
alter table public.assessment_versions enable row level security;
alter table public.tasks enable row level security;
alter table public.plan_refreshes enable row level security;
alter table public.applications enable row level security;
alter table public.entitlements enable row level security;
alter table public.stripe_events enable row level security;
alter table public.orders enable row level security;
alter table public.audit_events enable row level security;
alter table public.analytics_events enable row level security;
alter table public.source_issues enable row level security;
alter table public.prototype_imports enable row level security;
alter table public.rate_limit_buckets enable row level security;
alter table public.payment_offers enable row level security;
alter table public.checkout_reservations enable row level security;

-- Reset browser roles before restoring the deliberately narrow read surface.
revoke all privileges on all tables in schema public from anon, authenticated;

grant select on table
  public.profiles, public.qualifications, public.consent_records,
  public.portfolio_items, public.evidence_items, public.evidence_requirement_links,
  public.assessment_versions, public.tasks, public.plan_refreshes,
  public.applications, public.entitlements, public.orders, public.audit_events,
  public.source_issues, public.prototype_imports
to authenticated;

grant select (id, kind, name, website_url)
on public.organisations to anon, authenticated;

grant select (
  id, organisation_id, kind, sector, title, provider_name, location, summary,
  deadline, application_url, source_url, source_authority, retrieved_at,
  verified_at, freshness, state, publication_state
) on public.opportunities to anon, authenticated;

grant select (
  id, opportunity_id, kind, label, structured_value, supporting_text, source_url,
  retrieved_at, verified_at, freshness, conflict, hard_requirement, publication_state
) on public.requirements to anon, authenticated;

-- New database objects are private until a future migration reviews them.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Re-pin every existing security-definer function in case an older 001 was
-- applied before its hardened definition. Function bodies remain authored in
-- their owning migrations; this forward migration repairs deployed attributes.
alter function public.effective_plan(uuid) set search_path = '';
alter function public.enforce_portfolio_item() set search_path = '';
alter function public.enforce_evidence_item() set search_path = '';
alter function public.enforce_evidence_requirement_link() set search_path = '';
alter function public.enforce_task() set search_path = '';
alter function public.enforce_plan_refresh() set search_path = '';
alter function public.enforce_application() set search_path = '';
alter function public.enforce_source_issue() set search_path = '';
alter function public.replace_weekly_plan(uuid, text, jsonb) set search_path = '';
alter function public.consume_rate_limit(text, integer, integer) set search_path = '';
alter function public.reserve_cycle_checkout(uuid, integer) set search_path = '';
alter function public.apply_stripe_payment_event(text, text, bigint, boolean, uuid, uuid, integer, text, integer, text, text, text, text, integer, text) set search_path = '';
alter function public.reject_stripe_payment_event(text, text, bigint, text) set search_path = '';

-- PostgreSQL grants EXECUTE to PUBLIC by default. Revoke each overload
-- explicitly, including trigger functions which must never be RPC endpoints.
revoke all on function public.effective_plan(uuid) from public, anon, authenticated;
revoke all on function public.enforce_portfolio_item() from public, anon, authenticated;
revoke all on function public.enforce_evidence_item() from public, anon, authenticated;
revoke all on function public.enforce_evidence_requirement_link() from public, anon, authenticated;
revoke all on function public.enforce_task() from public, anon, authenticated;
revoke all on function public.enforce_plan_refresh() from public, anon, authenticated;
revoke all on function public.enforce_application() from public, anon, authenticated;
revoke all on function public.enforce_source_issue() from public, anon, authenticated;
revoke all on function public.replace_weekly_plan(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.reserve_cycle_checkout(uuid, integer) from public, anon, authenticated;
revoke all on function public.apply_stripe_payment_event(text, text, bigint, boolean, uuid, uuid, integer, text, integer, text, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.reject_stripe_payment_event(text, text, bigint, text) from public, anon, authenticated;

grant execute on function public.replace_weekly_plan(uuid, text, jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.reserve_cycle_checkout(uuid, integer) to service_role;
grant execute on function public.apply_stripe_payment_event(text, text, bigint, boolean, uuid, uuid, integer, text, integer, text, text, text, text, integer, text) to service_role;
grant execute on function public.reject_stripe_payment_event(text, text, bigint, text) to service_role;

-- A trigger can be absent on a database where a previous 001 was edited after
-- application. Recreate the relationship/limit hooks without replacing history.
do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.portfolio_items'::regclass and tgname = 'portfolio_item_security' and not tgisinternal) then
    create trigger portfolio_item_security before insert or update on public.portfolio_items for each row execute function public.enforce_portfolio_item();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.evidence_items'::regclass and tgname = 'evidence_item_security' and not tgisinternal) then
    create trigger evidence_item_security before insert or update on public.evidence_items for each row execute function public.enforce_evidence_item();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.evidence_requirement_links'::regclass and tgname = 'evidence_requirement_link_security' and not tgisinternal) then
    create trigger evidence_requirement_link_security before insert or update on public.evidence_requirement_links for each row execute function public.enforce_evidence_requirement_link();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.tasks'::regclass and tgname = 'task_security' and not tgisinternal) then
    create trigger task_security before insert or update on public.tasks for each row execute function public.enforce_task();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.plan_refreshes'::regclass and tgname = 'plan_refresh_security' and not tgisinternal) then
    create trigger plan_refresh_security before insert or update on public.plan_refreshes for each row execute function public.enforce_plan_refresh();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.applications'::regclass and tgname = 'application_security' and not tgisinternal) then
    create trigger application_security before insert or update on public.applications for each row execute function public.enforce_application();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.source_issues'::regclass and tgname = 'source_issue_security' and not tgisinternal) then
    create trigger source_issue_security before insert or update on public.source_issues for each row execute function public.enforce_source_issue();
  end if;
end;
$$;
