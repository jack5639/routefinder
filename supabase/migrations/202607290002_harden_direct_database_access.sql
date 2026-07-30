-- Reassert the commercial database boundary for projects that applied the
-- customer-ready MVP migration before its security controls were verified.
-- Browser roles can read only the RLS-protected rows and public catalogue
-- columns explicitly granted below. All commercial writes use the server-only
-- service role after Next.js has authenticated and authorised the request.

revoke all privileges on all tables in schema public from anon, authenticated;

grant select on table
  public.profiles,
  public.qualifications,
  public.consent_records,
  public.portfolio_items,
  public.evidence_items,
  public.evidence_requirement_links,
  public.assessment_versions,
  public.tasks,
  public.plan_refreshes,
  public.applications,
  public.entitlements,
  public.orders,
  public.audit_events,
  public.source_issues,
  public.prototype_imports
to authenticated;

grant select (
  id,
  kind,
  name,
  website_url
) on public.organisations to anon, authenticated;

grant select (
  id,
  organisation_id,
  kind,
  sector,
  title,
  provider_name,
  location,
  summary,
  deadline,
  application_url,
  source_url,
  source_authority,
  retrieved_at,
  verified_at,
  freshness,
  state,
  publication_state
) on public.opportunities to anon, authenticated;

grant select (
  id,
  opportunity_id,
  kind,
  label,
  structured_value,
  supporting_text,
  source_url,
  retrieved_at,
  verified_at,
  freshness,
  conflict,
  hard_requirement,
  publication_state
) on public.requirements to anon, authenticated;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Keep the
-- default closed, then make an explicit grant whenever a future server RPC is
-- intentionally introduced.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

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

grant execute on function public.replace_weekly_plan(uuid, text, jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Pin the search path again in case a project was created from an earlier
-- function definition. These functions query across user-owned rows while
-- enforcing limits and relationships, so search-path hijacking is unsafe.
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
