import { describe, expect, it } from "vitest";
import { evaluateCatalogueReadiness } from "./readiness";
import {
  commercialLaunchCoverageAttestations,
  commercialLaunchCoverageOpportunities,
  commercialLaunchCoverageRuns,
  commercialLaunchPersonas,
  evaluateLaunchPersonaCoverage,
} from "./launch-personas";

const now = new Date("2026-08-12T12:00:00.000Z");

describe("commercial launch catalogue persona coverage", () => {
  it("proves all eight sector-by-route cells and three relevant records for every fixed persona", () => {
    const readiness = evaluateCatalogueReadiness(
      commercialLaunchCoverageOpportunities,
      commercialLaunchCoverageRuns,
      now,
      commercialLaunchCoverageAttestations,
    );
    const coverage = evaluateLaunchPersonaCoverage(
      commercialLaunchPersonas,
      commercialLaunchCoverageOpportunities,
      now,
      commercialLaunchCoverageAttestations,
    );

    expect(readiness.promotedPersonaCoverage).toHaveLength(8);
    expect(readiness.promotedPersonaCoverage.every((persona) => persona.passes)).toBe(true);
    expect(new Set(readiness.promotedPersonaCoverage.map((persona) => `${persona.sector}:${persona.kind}`))).toEqual(new Set([
      "technology:university-course",
      "technology:apprenticeship-vacancy",
      "engineering:university-course",
      "engineering:apprenticeship-vacancy",
      "business:university-course",
      "business:apprenticeship-vacancy",
      "finance:university-course",
      "finance:apprenticeship-vacancy",
    ]));

    expect(coverage).toHaveLength(commercialLaunchPersonas.length);
    for (const personaCoverage of coverage) {
      expect(personaCoverage.relevantOpenSourceBacked).toBeGreaterThanOrEqual(3);
      expect(personaCoverage.passes).toBe(true);
    }
  });

  it("keeps grade uncertainty and combined route intent visible while exercising location limits", () => {
    const coverage = evaluateLaunchPersonaCoverage(
      commercialLaunchPersonas,
      commercialLaunchCoverageOpportunities,
      now,
      commercialLaunchCoverageAttestations,
    );
    const coverageById = new Map(coverage.map((item) => [item.personaId, item]));

    expect(new Set(commercialLaunchPersonas.map((persona) => persona.qualificationCase))).toEqual(new Set([
      "achieved",
      "predicted",
      "lower",
      "unknown",
    ]));
    expect(new Set(commercialLaunchPersonas.map((persona) => persona.locationCase))).toEqual(new Set([
      "stay-local",
      "could-relocate",
      "uncertain",
    ]));
    expect(new Set(commercialLaunchPersonas.map((persona) => persona.profile.routeIntent))).toEqual(new Set([
      "university",
      "apprenticeship",
      "combined",
    ]));

    const unknownPersona = commercialLaunchPersonas.find((persona) => persona.id === "technology-combined-uncertain");
    expect(unknownPersona?.profile.qualificationsComplete).toBe(false);
    expect(unknownPersona?.qualifications[0].status).toBe("unknown");
    expect(coverageById.get("technology-combined-uncertain")?.relevantOpenSourceBacked).toBeGreaterThanOrEqual(3);
    expect(coverageById.get("engineering-combined-relocation")?.relevantOpenSourceBacked).toBeGreaterThan(3);

    const localPersona = commercialLaunchPersonas.find((persona) => persona.id === "technology-university-achieved-local");
    const localCoverage = coverageById.get("technology-university-achieved-local");
    const remoteTechnologyUniversity = commercialLaunchCoverageOpportunities.find((opportunity) =>
      opportunity.id === "technology-university-course-3",
    );
    expect(localPersona?.locationCase).toBe("stay-local");
    expect(localCoverage?.opportunityIds).not.toContain(remoteTechnologyUniversity?.id);
    expect(localCoverage?.opportunityIds.every((id) =>
      commercialLaunchCoverageOpportunities.find((opportunity) => opportunity.id === id)?.location === "London",
    )).toBe(true);
  });
});
