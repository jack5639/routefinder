-- Review queues and audit history join these foreign keys repeatedly. Cover
-- them explicitly before the launch catalogue grows beyond its initial set.
create index if not exists opportunities_organisation_idx
  on public.opportunities(organisation_id);
create index if not exists opportunities_closure_source_run_idx
  on public.opportunities(closure_source_run_id);
create index if not exists catalogue_fact_revisions_observation_idx
  on public.catalogue_fact_revisions(observation_id);
create index if not exists catalogue_fact_revisions_reviewer_idx
  on public.catalogue_fact_revisions(reviewer_id);
create index if not exists catalogue_manual_revisions_opportunity_idx
  on public.catalogue_manual_revisions(opportunity_id);
create index if not exists catalogue_manual_revisions_requirement_idx
  on public.catalogue_manual_revisions(requirement_id);
create index if not exists catalogue_manual_revisions_reviewer_idx
  on public.catalogue_manual_revisions(reviewer_id);
create index if not exists publication_reviews_opportunity_idx
  on public.publication_reviews(opportunity_id);
create index if not exists publication_reviews_requirement_idx
  on public.publication_reviews(requirement_id);
create index if not exists publication_reviews_reviewer_idx
  on public.publication_reviews(reviewer_id);
create index if not exists source_issues_user_idx
  on public.source_issues(user_id);
