-- Test-only records. Never publish these as verified commercial opportunities.
insert into public.opportunities (
  source_id, kind, sector, title, provider_name, location, summary,
  application_url, source_url, source_authority, retrieved_at, freshness,
  state, publication_state
) values (
  'test-opportunity-technology-1',
  'university-course',
  'technology',
  'Test computing course',
  'Test provider',
  'England',
  'A non-production record used by automated tests.',
  'https://example.invalid/apply',
  'https://example.invalid/source',
  'test-seed',
  now(),
  'needs-checking',
  'unknown',
  'draft'
) on conflict do nothing;
