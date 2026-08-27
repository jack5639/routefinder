create index catalogue_source_attestations_attested_by_idx
  on public.catalogue_source_attestations(attested_by);
create index catalogue_source_attestations_revoked_by_idx
  on public.catalogue_source_attestations(revoked_by)
  where revoked_by is not null;
