import { parseEligibilityRule } from "@/lib/scoring/eligibility-rules";

export const launchCatalogueSectors = ["technology", "engineering", "business", "finance"] as const;
export const launchCatalogueKinds = ["university-course", "apprenticeship-vacancy"] as const;

export type LaunchCatalogueSector = (typeof launchCatalogueSectors)[number];
export type LaunchCatalogueKind = (typeof launchCatalogueKinds)[number];

export interface ReadinessRequirement {
  id: string;
  publication_state: string;
  supporting_text?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
  freshness?: string | null;
  freshness_expires_at?: string | null;
  conflict?: boolean | null;
  hard_requirement?: boolean | null;
  structured_value?: unknown;
}

export interface ReadinessOpportunity {
  id: string;
  kind: string;
  sector: string;
  title?: string | null;
  provider_name?: string | null;
  location?: string | null;
  application_url?: string | null;
  source_url?: string | null;
  source_authority?: string | null;
  source_id?: string | null;
  source_approval_reference?: string | null;
  attribution?: unknown;
  deadline?: string | null;
  verified_at?: string | null;
  freshness?: string | null;
  freshness_expires_at?: string | null;
  state?: string | null;
  publication_state: string;
  latest_source_change_at?: string | null;
  requirements?: ReadinessRequirement[] | null;
  catalogue_fact_revisions?: Array<{ id: string; status: string; created_at?: string | null }> | null;
  source_issues?: Array<{ id: string; status: string; issue_kind?: string | null }> | null;
}

export interface ReadinessSourceRun {
  id: string;
  source_authority: string;
  status: string;
  started_at: string;
  completed_at?: string | null;
  complete_snapshot?: boolean | null;
  retrieved_count?: number | null;
  records_changed?: number | null;
}

export interface CatalogueReadinessReport {
  ready: boolean;
  minimum: number;
  published: number;
  routeTotals: Record<LaunchCatalogueKind, number>;
  distribution: Array<{ sector: LaunchCatalogueSector; kind: LaunchCatalogueKind; count: number; shortfall: number }>;
  diversity: Record<LaunchCatalogueKind, { distinctProviders: number; largestProviderShare: number; passes: boolean }>;
  counts: {
    openCurrent: number;
    unclassified: number;
    missingOrExpiredVerification: number;
    missingOrInvalidSourceApproval: number;
    missingAttribution: number;
    missingUnsupportedOrConflictingRequirements: number;
    pendingRevisions: number;
    unresolvedSourceIssues: number;
    closedStillPublished: number;
    duplicateOfficialDestinations: number;
    duplicateSourceIds: number;
    passedDeadlines: number;
  };
  blockingRecords: Array<{ id: string; title: string; reasons: string[] }>;
  nextReviewQueue: Array<{ id: string; title: string; reasons: string[]; urgency: number }>;
  sourceRuns: Array<{
    sourceAuthority: string;
    latestStatus?: string;
    latestStartedAt?: string;
    lastCompleteSnapshotAt?: string;
    stale: boolean;
  }>;
  globalReasons: string[];
}

const HESA_LICENCE = "https://creativecommons.org/licenses/by/4.0/";
const nonEmpty = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const isPast = (value: string | null | undefined, now: Date) => Boolean(value && new Date(value).getTime() < now.getTime());
const isExpired = (value: string | null | undefined, now: Date) => !value || new Date(value).getTime() <= now.getTime();
const sourceNeedsApproval = (authority: string | null | undefined) =>
  authority === "find-an-apprenticeship-api-v2" || authority === "discover-uni-hesa";

function hasDiscoverUniAttribution(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const attribution = value as Record<string, unknown>;
  return attribution.credit === "HESA, www.hesa.ac.uk"
    && attribution.licence === HESA_LICENCE
    && nonEmpty(attribution.changes);
}

export function opportunityPublicationFailures(opportunity: ReadinessOpportunity, now = new Date()) {
  const failures: string[] = [];
  const requirements = opportunity.requirements ?? [];
  const publishedRequirements = requirements.filter((item) => item.publication_state === "published");
  if (!launchCatalogueSectors.includes(opportunity.sector as LaunchCatalogueSector)) failures.push("Sector is not a reviewed launch sector.");
  if (opportunity.state !== "open") failures.push("Opportunity is not confirmed open.");
  if (!nonEmpty(opportunity.provider_name)) failures.push("Provider or employer is missing.");
  if (!nonEmpty(opportunity.location)) failures.push("Location is missing.");
  if (!nonEmpty(opportunity.application_url)) failures.push("Official application destination is missing.");
  if (!nonEmpty(opportunity.source_url)) failures.push("Opportunity source URL is missing.");
  if (!opportunity.verified_at || isPast(opportunity.verified_at, new Date(now.getTime() - 30 * 86_400_000))) failures.push("Opportunity verification is missing or older than 30 days.");
  if (!["high", "medium"].includes(opportunity.freshness ?? "") || isExpired(opportunity.freshness_expires_at, now)) failures.push("Opportunity freshness is expired or needs checking.");
  if (sourceNeedsApproval(opportunity.source_authority) && !nonEmpty(opportunity.source_approval_reference)) failures.push("Source approval reference is missing.");
  if (opportunity.source_authority === "discover-uni-hesa" && !hasDiscoverUniAttribution(opportunity.attribution)) failures.push("Required Discover Uni/HESA attribution is missing.");
  if ((opportunity.catalogue_fact_revisions ?? []).some((item) => item.status === "pending")) failures.push("A material source revision is awaiting review.");
  if ((opportunity.source_issues ?? []).some((item) => item.status !== "resolved")) failures.push("A source issue is unresolved.");
  if (!publishedRequirements.length) failures.push("No reviewed published requirement is present.");
  if (isPast(opportunity.deadline, now)) failures.push("The application deadline has passed.");
  for (const requirement of publishedRequirements) {
    if (!nonEmpty(requirement.supporting_text) || !nonEmpty(requirement.source_url) || !requirement.verified_at) failures.push(`Requirement ${requirement.id} is missing source evidence or verification.`);
    if (requirement.conflict) failures.push(`Requirement ${requirement.id} is conflicting.`);
    if (!["high", "medium"].includes(requirement.freshness ?? "") || isExpired(requirement.freshness_expires_at, now)) failures.push(`Requirement ${requirement.id} freshness is expired or needs checking.`);
    if (requirement.hard_requirement && !parseEligibilityRule(requirement.structured_value)) failures.push(`Requirement ${requirement.id} has an unsupported deterministic rule.`);
  }
  return [...new Set(failures)];
}

function duplicateKeys(rows: ReadinessOpportunity[], key: (row: ReadinessOpportunity) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = key(row)?.trim().toLowerCase();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([value]) => value));
}

export function evaluateCatalogueReadiness(
  opportunities: ReadinessOpportunity[],
  runs: ReadinessSourceRun[] = [],
  now = new Date(),
): CatalogueReadinessReport {
  const published = opportunities.filter((row) => row.publication_state === "published");
  const duplicateDestinations = duplicateKeys(published, (row) => row.application_url);
  const duplicateSourceIds = duplicateKeys(published, (row) => row.source_authority && row.source_id ? `${row.source_authority}:${row.source_id}` : null);
  const blockingRecords = published.flatMap((row) => {
    const reasons = opportunityPublicationFailures(row, now);
    const destination = row.application_url?.trim().toLowerCase();
    const sourceKey = row.source_authority && row.source_id ? `${row.source_authority}:${row.source_id}`.toLowerCase() : undefined;
    if (destination && duplicateDestinations.has(destination)) reasons.push("Official application destination is duplicated.");
    if (sourceKey && duplicateSourceIds.has(sourceKey)) reasons.push("Source identifier is duplicated.");
    return reasons.length ? [{ id: row.id, title: row.title ?? "Untitled opportunity", reasons: [...new Set(reasons)] }] : [];
  });
  const routeTotals = Object.fromEntries(launchCatalogueKinds.map((kind) => [kind, published.filter((row) => row.kind === kind).length])) as Record<LaunchCatalogueKind, number>;
  const distribution = launchCatalogueSectors.flatMap((sector) => launchCatalogueKinds.map((kind) => {
    const count = published.filter((row) => row.sector === sector && row.kind === kind).length;
    return { sector, kind, count, shortfall: Math.max(0, 10 - count) };
  }));
  const diversity = Object.fromEntries(launchCatalogueKinds.map((kind) => {
    const rows = published.filter((row) => row.kind === kind);
    const providerCounts = new Map<string, number>();
    for (const row of rows) if (nonEmpty(row.provider_name)) providerCounts.set(row.provider_name!.trim().toLowerCase(), (providerCounts.get(row.provider_name!.trim().toLowerCase()) ?? 0) + 1);
    const largest = Math.max(0, ...providerCounts.values());
    const largestProviderShare = rows.length ? largest / rows.length : 1;
    return [kind, { distinctProviders: providerCounts.size, largestProviderShare, passes: providerCounts.size >= 10 && largestProviderShare <= 0.25 }];
  })) as CatalogueReadinessReport["diversity"];
  const latestBySource = new Map<string, ReadinessSourceRun[]>();
  latestBySource.set("find-an-apprenticeship-api-v2", []);
  latestBySource.set("discover-uni-hesa", []);
  for (const run of runs) latestBySource.set(run.source_authority, [...(latestBySource.get(run.source_authority) ?? []), run]);
  const sourceRuns = [...latestBySource].map(([sourceAuthority, sourceRows]) => {
    const ordered = sourceRows.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    const complete = ordered.find((run) => run.status === "completed" && run.complete_snapshot);
    const staleAfterDays = sourceAuthority === "discover-uni-hesa" ? 8 : 1;
    return {
      sourceAuthority,
      latestStatus: ordered[0]?.status,
      latestStartedAt: ordered[0]?.started_at,
      lastCompleteSnapshotAt: complete?.completed_at ?? undefined,
      stale: !complete?.completed_at || isPast(complete.completed_at, new Date(now.getTime() - staleAfterDays * 86_400_000)),
    };
  });
  const globalReasons: string[] = [];
  if (published.length < 80) globalReasons.push(`Published catalogue is ${80 - published.length} records below the launch minimum.`);
  for (const item of distribution) if (item.shortfall) globalReasons.push(`${item.sector} ${item.kind} is ${item.shortfall} below its minimum.`);
  for (const kind of launchCatalogueKinds) if (routeTotals[kind] < 40) globalReasons.push(`${kind} is ${40 - routeTotals[kind]} below its route-type minimum.`);
  for (const kind of launchCatalogueKinds) if (!diversity[kind].passes) globalReasons.push(`${kind} provider or employer diversity is below the launch rule.`);
  if (blockingRecords.length) globalReasons.push(`${blockingRecords.length} published records fail publication readiness.`);
  if (sourceRuns.some((run) => run.stale || run.latestStatus !== "completed")) globalReasons.push("A required source has no recent complete successful snapshot.");
  const queue = opportunities
    .map((row) => {
      const reasons = opportunityPublicationFailures(row, now);
      const urgency = reasons.length * 10
        + ((row.catalogue_fact_revisions ?? []).some((item) => item.status === "pending") ? 30 : 0)
        + ((row.source_issues ?? []).some((item) => item.status !== "resolved") ? 25 : 0)
        + (row.sector === "unclassified" ? 20 : 0)
        + (row.publication_state === "published" ? 40 : 0);
      return { id: row.id, title: row.title ?? "Untitled opportunity", reasons, urgency };
    })
    .filter((item) => item.reasons.length)
    .sort((a, b) => b.urgency - a.urgency || a.title.localeCompare(b.title))
    .slice(0, 25);
  const reasonText = blockingRecords.flatMap((row) => row.reasons);
  return {
    ready: globalReasons.length === 0,
    minimum: 80,
    published: published.length,
    routeTotals,
    distribution,
    diversity,
    counts: {
      openCurrent: published.filter((row) => row.state === "open" && !opportunityPublicationFailures(row, now).length).length,
      unclassified: opportunities.filter((row) => row.sector === "unclassified").length,
      missingOrExpiredVerification: reasonText.filter((reason) => reason.includes("verification") || reason.includes("freshness")).length,
      missingOrInvalidSourceApproval: reasonText.filter((reason) => reason.includes("approval")).length,
      missingAttribution: reasonText.filter((reason) => reason.includes("attribution")).length,
      missingUnsupportedOrConflictingRequirements: reasonText.filter((reason) => reason.startsWith("No reviewed") || reason.startsWith("Requirement")).length,
      pendingRevisions: opportunities.reduce((sum, row) => sum + (row.catalogue_fact_revisions ?? []).filter((item) => item.status === "pending").length, 0),
      unresolvedSourceIssues: opportunities.reduce((sum, row) => sum + (row.source_issues ?? []).filter((item) => item.status !== "resolved").length, 0),
      closedStillPublished: published.filter((row) => row.state === "closed").length,
      duplicateOfficialDestinations: duplicateDestinations.size,
      duplicateSourceIds: duplicateSourceIds.size,
      passedDeadlines: published.filter((row) => isPast(row.deadline, now)).length,
    },
    blockingRecords,
    nextReviewQueue: queue,
    sourceRuns,
    globalReasons,
  };
}
