-- Replay cleanup for a deletion entry that survived outside the restored
-- database. The ledger itself is deliberately not stored in Postgres.
create or replace function public.replay_deleted_subject(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Lawfully retained records are detached from the deleted account.
  update public.orders set user_id = null where user_id = p_user_id;
  update public.audit_events set user_id = null where user_id = p_user_id;
  update public.analytics_events set user_id = null where user_id = p_user_id;
  update public.source_issues set user_id = null where user_id = p_user_id;

  -- These are student-owned records. Delete explicitly so replay also repairs
  -- an orphaned public schema if Auth was already removed before restoration.
  delete from public.prototype_imports where user_id = p_user_id;
  delete from public.plan_refreshes where user_id = p_user_id;
  delete from public.assessment_versions where user_id = p_user_id;
  delete from public.applications where user_id = p_user_id;
  delete from public.tasks where user_id = p_user_id;
  delete from public.evidence_requirement_links where user_id = p_user_id;
  delete from public.evidence_items where user_id = p_user_id;
  delete from public.portfolio_items where user_id = p_user_id;
  delete from public.qualifications where user_id = p_user_id;
  delete from public.consent_records where user_id = p_user_id;
  delete from public.entitlements where user_id = p_user_id;
  delete from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.replay_deleted_subject(uuid) from public, anon, authenticated;
grant execute on function public.replay_deleted_subject(uuid) to service_role;
