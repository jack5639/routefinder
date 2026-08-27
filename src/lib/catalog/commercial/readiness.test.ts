import { describe, expect, it } from "vitest";
import { evaluateCatalogueReadiness, opportunityPublicationFailures, type ReadinessOpportunity } from "./readiness";

const now = new Date("2026-07-30T12:00:00.000Z");
const base = (overrides: Partial<ReadinessOpportunity> = {}): ReadinessOpportunity => ({
  id: "opportunity",
  kind: "university-course",
  sector: "technology",
  title: "Computer Science",
  provider_name: "Provider",
  location: "London",
  application_url: "https://provider.example/apply",
  source_url: "https://provider.example/course",
  source_authority: "provider-manual-review",
  source_id: "course-1",
  application_cycle: 2027,
  deadline: "2027-01-01T00:00:00.000Z",
  verified_at: "2026-07-29T00:00:00.000Z",
  freshness: "high",
  freshness_expires_at: "2026-08-29T00:00:00.000Z",
  state: "open",
  publication_state: "published",
  requirements: [{
    id: "requirement",
    publication_state: "published",
    supporting_text: "A published requirement.",
    source_url: "https://provider.example/course",
    verified_at: "2026-07-29T00:00:00.000Z",
    freshness: "high",
    freshness_expires_at: "2026-08-29T00:00:00.000Z",
    conflict: false,
    hard_requirement: false,
  }],
  catalogue_fact_revisions: [],
  source_issues: [],
  ...overrides,
});

describe("commercial catalogue readiness", () => {
  it("fails closed for a missing source attestation, attribution, expired verification and unresolved review work", () => {
    const failures = opportunityPublicationFailures(base({
      source_authority: "discover-uni-hesa",
      attribution: null,
      verified_at: "2026-06-01T00:00:00.000Z",
      freshness_expires_at: "2026-07-01T00:00:00.000Z",
      catalogue_fact_revisions: [{ id: "revision", status: "pending" }],
      source_issues: [{ id: "issue", status: "open" }],
    }), now);
    expect(failures).toEqual(expect.arrayContaining([
      expect.stringContaining("older than 30 days"),
      expect.stringContaining("attested"),
      expect.stringContaining("attribution"),
      expect.stringContaining("revision"),
      expect.stringContaining("source issue"),
    ]));
  });

  it("allows an official source after an active admin attestation without a written reference", () => {
    const failures = opportunityPublicationFailures(base({ source_authority: "discover-uni-hesa", attribution: {
      credit: "HESA, www.hesa.ac.uk", licence: "https://creativecommons.org/licenses/by/4.0/", changes: "Selected launch-scope fields.",
    } }), now, [{ source_authority: "discover-uni-hesa", attested_at: "2026-07-30T10:00:00.000Z" }]);
    expect(failures).not.toContain("Source permission has not been attested by an administrator.");
  });

  it("rejects closed, past-deadline, conflicting and unsupported hard-requirement records", () => {
    const failures = opportunityPublicationFailures(base({
      state: "closed",
      deadline: "2026-07-01T00:00:00.000Z",
      requirements: [{ ...base().requirements![0], conflict: true, hard_requirement: true, structured_value: { type: "unsupported" } }],
    }), now);
    expect(failures).toEqual(expect.arrayContaining([
      "Opportunity is not confirmed open.",
      "The application deadline has passed.",
      expect.stringContaining("conflicting"),
      expect.stringContaining("unsupported deterministic rule"),
    ]));
  });

  it("requires university records to be explicitly verified for the launch application cycle", () => {
    expect(opportunityPublicationFailures(base({ application_cycle: 2026 }), now)).toContain(
      "University course is not verified for the 2027 application cycle.",
    );
  });

  it("requires all eight cells, both route totals and provider diversity", () => {
    const sectors = ["technology", "engineering", "business", "finance"] as const;
    const kinds = ["university-course", "apprenticeship-vacancy"] as const;
    const opportunities = sectors.flatMap((sector) => kinds.flatMap((kind) =>
      Array.from({ length: 10 }, (_, index) => base({
        id: `${sector}-${kind}-${index}`,
        sector,
        kind,
        title: `${sector} ${kind} ${index}`,
        provider_name: `${kind} provider ${index}`,
        application_url: `https://example.test/${sector}/${kind}/${index}`,
        source_id: `${sector}-${kind}-${index}`,
      })),
    ));
    const report = evaluateCatalogueReadiness(opportunities, [
      { id: "apprenticeships", source_authority: "find-an-apprenticeship-api-v2", status: "completed", started_at: "2026-07-30T10:00:00.000Z", completed_at: "2026-07-30T11:00:00.000Z", complete_snapshot: true },
      { id: "discover-uni", source_authority: "discover-uni-hesa", status: "completed", started_at: "2026-07-29T10:00:00.000Z", completed_at: "2026-07-29T11:00:00.000Z", complete_snapshot: true },
    ], now);
    expect(report.published).toBe(80);
    expect(report.distribution.every((cell) => cell.count === 10)).toBe(true);
    expect(report.routeTotals).toEqual({ "university-course": 40, "apprenticeship-vacancy": 40 });
    expect(report.promotedPersonaCoverage.every((persona) => persona.passes)).toBe(true);
    expect(report.ready).toBe(true);
  });

  it("detects duplicate destinations and source identifiers", () => {
    const report = evaluateCatalogueReadiness([
      base({ id: "a" }),
      base({ id: "b" }),
    ], [], now);
    expect(report.counts.duplicateOfficialDestinations).toBe(1);
    expect(report.counts.duplicateSourceIds).toBe(1);
  });

  it("reports unpublished candidate supply for each launch cell", () => {
    const report = evaluateCatalogueReadiness([
      base({ id: "draft-a", publication_state: "draft", provider_name: "Provider A" }),
      base({ id: "draft-b", publication_state: "review", provider_name: "Provider B" }),
      base({ id: "withdrawn", publication_state: "withdrawn", provider_name: "Provider C" }),
    ], [], now);
    expect(report.distribution.find((cell) => cell.sector === "technology" && cell.kind === "university-course")).toMatchObject({
      count: 0,
      shortfall: 10,
      candidates: 2,
      distinctCandidateProviders: 2,
    });
  });
});
