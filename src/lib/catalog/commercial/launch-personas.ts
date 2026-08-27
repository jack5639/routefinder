import type { Qualification, StudentProfile } from "@/lib/mvp/types";
import {
  launchApplicationCycle,
  launchCatalogueKinds,
  launchCatalogueSectors,
  opportunityPublicationFailures,
  type CatalogueSourceAttestation,
  type ReadinessOpportunity,
  type ReadinessSourceRun,
} from "./readiness";

export type LaunchQualificationCase = "achieved" | "predicted" | "lower" | "unknown";
export type LaunchLocationCase = "stay-local" | "could-relocate" | "uncertain";

export interface CommercialLaunchPersona {
  id: string;
  label: string;
  scenario: string;
  qualificationCase: LaunchQualificationCase;
  locationCase: LaunchLocationCase;
  profile: StudentProfile;
  qualifications: Qualification[];
}

/**
 * Test-only coverage metadata. The commercial catalogue currently stores a
 * display location, not a student-specific travel calculation, so the fixture
 * keeps the narrow, source-backed travel evidence needed for this gate here.
 */
export interface LaunchCoverageOpportunity extends ReadinessOpportunity {
  coverageRegions: readonly string[];
  travelMinutesByRegion: Readonly<Record<string, number>>;
}

export interface LaunchPersonaCoverage {
  personaId: string;
  label: string;
  sector: CommercialLaunchPersona["profile"]["sectors"][number];
  routeIntent: CommercialLaunchPersona["profile"]["routeIntent"];
  qualificationCase: LaunchQualificationCase;
  locationCase: LaunchLocationCase;
  relevantOpenSourceBacked: number;
  opportunityIds: string[];
  minimum: 3;
  passes: boolean;
}

const now = "2026-08-10T12:00:00.000Z";
const freshnessExpiresAt = "2026-09-10T12:00:00.000Z";
const hesaAttribution = {
  credit: "HESA, www.hesa.ac.uk",
  licence: "https://creativecommons.org/licenses/by/4.0/",
  changes: "Selected launch-scope fields.",
};

const qualification = (
  id: string,
  subject: string,
  status: Qualification["status"],
  grade?: string,
): Qualification => ({
  id,
  qualificationType: "A level",
  subject,
  status,
  ...(grade ? { grade } : {}),
});

interface PersonaInput {
  id: string;
  label: string;
  scenario: string;
  sector: CommercialLaunchPersona["profile"]["sectors"][number];
  routeIntent: CommercialLaunchPersona["profile"]["routeIntent"];
  homeRegion: string;
  maxTravelMinutes: number;
  relocationPreference: StudentProfile["relocationPreference"];
  locationCase: LaunchLocationCase;
  qualificationCase: LaunchQualificationCase;
  qualifications: Qualification[];
  currentStage?: StudentProfile["currentStage"];
  qualificationsComplete?: boolean;
  constraints?: string[];
}

function makePersona(input: PersonaInput): CommercialLaunchPersona {
  return {
    id: input.id,
    label: input.label,
    scenario: input.scenario,
    qualificationCase: input.qualificationCase,
    locationCase: input.locationCase,
    qualifications: input.qualifications,
    profile: {
      id: input.id,
      currentStage: input.currentStage ?? "Year 12",
      applicationCycle: launchApplicationCycle,
      homeRegion: input.homeRegion,
      maxTravelMinutes: input.maxTravelMinutes,
      relocationPreference: input.relocationPreference,
      routeIntent: input.routeIntent,
      sectors: [input.sector],
      workStyles: ["academic", "practical"],
      financialPreference: "cost-aware",
      constraints: input.constraints ?? [],
      qualificationsComplete: input.qualificationsComplete ?? true,
    },
  };
}

/**
 * Fixed commercial launch cases. These are deliberately separate from the
 * legacy quiz personas: they describe the supported catalogue dimensions and
 * use the authenticated product's profile/qualification vocabulary.
 */
export const commercialLaunchPersonas: CommercialLaunchPersona[] = [
  makePersona({
    id: "technology-university-achieved-local",
    label: "Technology university applicant with achieved grades",
    scenario: "Technology, university-only, achieved grades, and a stay-local travel limit.",
    sector: "technology",
    routeIntent: "university",
    homeRegion: "London",
    maxTravelMinutes: 60,
    relocationPreference: "stay-local",
    locationCase: "stay-local",
    qualificationCase: "achieved",
    qualifications: [qualification("tech-maths", "Mathematics", "achieved", "A")],
    constraints: ["Keep travel within the recorded limit."],
  }),
  makePersona({
    id: "technology-apprenticeship-unknown-local",
    label: "Technology apprenticeship applicant with unknown qualification detail",
    scenario: "Technology, apprenticeship-only, an unknown qualification grade, and a stay-local limit.",
    sector: "technology",
    routeIntent: "apprenticeship",
    homeRegion: "Manchester",
    maxTravelMinutes: 45,
    relocationPreference: "stay-local",
    locationCase: "stay-local",
    qualificationCase: "unknown",
    qualifications: [qualification("tech-computing", "Computer Science", "unknown")],
    qualificationsComplete: false,
    constraints: ["Confirm the qualification detail before relying on a comparison."],
  }),
  makePersona({
    id: "engineering-university-predicted-local",
    label: "Engineering university applicant with predicted grades",
    scenario: "Engineering, university-only, predicted grades, and a local travel constraint.",
    sector: "engineering",
    routeIntent: "university",
    homeRegion: "Birmingham",
    maxTravelMinutes: 45,
    relocationPreference: "stay-local",
    locationCase: "stay-local",
    qualificationCase: "predicted",
    qualifications: [qualification("engineering-physics", "Physics", "predicted", "B")],
    constraints: ["Keep location and travel visible while grades remain predicted."],
  }),
  makePersona({
    id: "engineering-apprenticeship-lower-local",
    label: "Engineering apprenticeship applicant with lower achieved grades",
    scenario: "Engineering, apprenticeship-only, lower achieved grades, and a short travel limit.",
    sector: "engineering",
    routeIntent: "apprenticeship",
    homeRegion: "Leeds",
    maxTravelMinutes: 45,
    relocationPreference: "stay-local",
    locationCase: "stay-local",
    qualificationCase: "lower",
    qualifications: [qualification("engineering-maths", "Mathematics", "achieved", "C")],
    constraints: ["Check the published minimum rather than treating a lower grade as a final outcome."],
    currentStage: "Year 13",
  }),
  makePersona({
    id: "business-university-unknown-location",
    label: "Business university applicant with incomplete qualifications",
    scenario: "Business, university-only, incomplete qualification information, and uncertain relocation.",
    sector: "business",
    routeIntent: "university",
    homeRegion: "Manchester",
    maxTravelMinutes: 60,
    relocationPreference: "unsure",
    locationCase: "uncertain",
    qualificationCase: "unknown",
    qualifications: [qualification("business-maths", "Mathematics", "unknown")],
    qualificationsComplete: false,
    constraints: ["Confirm qualifications and compare travel before narrowing the portfolio."],
  }),
  makePersona({
    id: "business-apprenticeship-open-location",
    label: "Business apprenticeship applicant open to relocation",
    scenario: "Business, apprenticeship-only, achieved grades, and an open relocation preference.",
    sector: "business",
    routeIntent: "apprenticeship",
    homeRegion: "Bristol",
    maxTravelMinutes: 90,
    relocationPreference: "could-relocate",
    locationCase: "could-relocate",
    qualificationCase: "achieved",
    qualifications: [qualification("business-studies", "Business Studies", "achieved", "B")],
    constraints: ["Compare travel and relocation implications directly with the employer."],
  }),
  makePersona({
    id: "finance-university-achieved-open-location",
    label: "Finance university applicant with achieved grades",
    scenario: "Finance, university-only, achieved grades, and an open relocation preference.",
    sector: "finance",
    routeIntent: "university",
    homeRegion: "London",
    maxTravelMinutes: 90,
    relocationPreference: "could-relocate",
    locationCase: "could-relocate",
    qualificationCase: "achieved",
    qualifications: [qualification("finance-maths", "Mathematics", "achieved", "A")],
    constraints: ["Compare cost and travel alongside the published requirements."],
  }),
  makePersona({
    id: "finance-apprenticeship-predicted-local",
    label: "Finance apprenticeship applicant with predicted grades",
    scenario: "Finance, apprenticeship-only, predicted grades, and a stay-local travel limit.",
    sector: "finance",
    routeIntent: "apprenticeship",
    homeRegion: "Birmingham",
    maxTravelMinutes: 60,
    relocationPreference: "stay-local",
    locationCase: "stay-local",
    qualificationCase: "predicted",
    qualifications: [qualification("finance-business", "Business Studies", "predicted", "B")],
    constraints: ["Keep travel visible while predicted grades are confirmed."],
    currentStage: "Year 13",
  }),
  makePersona({
    id: "technology-combined-uncertain",
    label: "Technology applicant comparing both routes",
    scenario: "Technology, combined university and apprenticeship intent, unknown grades, and uncertain relocation.",
    sector: "technology",
    routeIntent: "combined",
    homeRegion: "Leeds",
    maxTravelMinutes: 60,
    relocationPreference: "unsure",
    locationCase: "uncertain",
    qualificationCase: "unknown",
    qualifications: [qualification("combined-tech", "Computer Science", "unknown")],
    qualificationsComplete: false,
    constraints: ["Keep both route types visible while qualification and relocation details are confirmed."],
  }),
  makePersona({
    id: "engineering-combined-relocation",
    label: "Engineering applicant open to comparing both routes",
    scenario: "Engineering, combined route intent, predicted grades, and openness to relocation.",
    sector: "engineering",
    routeIntent: "combined",
    homeRegion: "London",
    maxTravelMinutes: 90,
    relocationPreference: "could-relocate",
    locationCase: "could-relocate",
    qualificationCase: "predicted",
    qualifications: [qualification("combined-engineering", "Mathematics", "predicted", "B")],
    constraints: ["Compare requirements, travel, and application stages across both route types."],
    currentStage: "Year 13",
  }),
];

interface CellFixture {
  sector: (typeof launchCatalogueSectors)[number];
  kind: (typeof launchCatalogueKinds)[number];
  localRegion: string;
  subject: string;
  minimumGrade: string;
}

const cellFixtures: CellFixture[] = [
  { sector: "technology", kind: "university-course", localRegion: "London", subject: "Mathematics", minimumGrade: "B" },
  { sector: "technology", kind: "apprenticeship-vacancy", localRegion: "Manchester", subject: "Computer Science", minimumGrade: "C" },
  { sector: "engineering", kind: "university-course", localRegion: "Birmingham", subject: "Physics", minimumGrade: "B" },
  { sector: "engineering", kind: "apprenticeship-vacancy", localRegion: "Leeds", subject: "Mathematics", minimumGrade: "C" },
  { sector: "business", kind: "university-course", localRegion: "Manchester", subject: "Business Studies", minimumGrade: "C" },
  { sector: "business", kind: "apprenticeship-vacancy", localRegion: "London", subject: "Business Studies", minimumGrade: "C" },
  { sector: "finance", kind: "university-course", localRegion: "London", subject: "Mathematics", minimumGrade: "B" },
  { sector: "finance", kind: "apprenticeship-vacancy", localRegion: "Birmingham", subject: "Mathematics", minimumGrade: "C" },
];

function makeCoverageOpportunity(cell: CellFixture, index: number): LaunchCoverageOpportunity {
  const isUniversity = cell.kind === "university-course";
  const location = index < 3 ? cell.localRegion : "Bristol";
  const recordBase = `https://routefinder.test/commercial/${cell.sector}/${cell.kind}/${index}`;
  return {
    id: `${cell.sector}-${cell.kind}-${index}`,
    kind: cell.kind,
    sector: cell.sector,
    title: `${cell.sector} ${isUniversity ? "course" : "vacancy"} coverage fixture ${index + 1}`,
    provider_name: `${cell.sector} ${isUniversity ? "University" : "Employer"} ${index + 1}`,
    location,
    application_url: `${recordBase}/apply`,
    source_url: `${recordBase}/source`,
    source_authority: isUniversity ? "discover-uni-hesa" : "find-an-apprenticeship-api-v2",
    source_id: `${cell.sector}-${cell.kind}-source-${index}`,
    ...(isUniversity ? { attribution: hesaAttribution, application_cycle: launchApplicationCycle } : {}),
    deadline: isUniversity ? "2027-01-13T23:59:00.000Z" : "2026-12-31T23:59:00.000Z",
    verified_at: now,
    freshness: "high",
    freshness_expires_at: freshnessExpiresAt,
    state: "open",
    publication_state: "published",
    requirements: [{
      id: `${cell.sector}-${cell.kind}-requirement-${index}`,
      publication_state: "published",
      supporting_text: `Published ${cell.subject} minimum at grade ${cell.minimumGrade}.`,
      source_url: `${recordBase}/requirements`,
      verified_at: now,
      freshness: "high",
      freshness_expires_at: freshnessExpiresAt,
      conflict: false,
      hard_requirement: true,
      structured_value: {
        qualificationType: "A level",
        subject: cell.subject,
        minimumGrade: cell.minimumGrade,
      },
    }],
    catalogue_fact_revisions: [],
    source_issues: [],
    coverageRegions: [location],
    travelMinutesByRegion: { [location]: index < 3 ? 35 : 180 },
  };
}

/**
 * Source-shaped synthetic records for the deterministic launch gate. They
 * exercise provenance, freshness, reviewed requirements, route type, sector,
 * and open-state checks without pretending to be live catalogue content.
 */
export const commercialLaunchCoverageOpportunities: LaunchCoverageOpportunity[] = cellFixtures.flatMap((cell) =>
  Array.from({ length: 4 }, (_, index) => makeCoverageOpportunity(cell, index)),
);

export const commercialLaunchCoverageRuns: ReadinessSourceRun[] = [
  {
    id: "fixture-find-an-apprenticeship-run",
    source_authority: "find-an-apprenticeship-api-v2",
    status: "completed",
    started_at: "2026-08-10T08:00:00.000Z",
    completed_at: "2026-08-10T09:00:00.000Z",
    complete_snapshot: true,
  },
  {
    id: "fixture-discover-uni-run",
    source_authority: "discover-uni-hesa",
    status: "completed",
    started_at: "2026-08-10T08:00:00.000Z",
    completed_at: "2026-08-10T09:00:00.000Z",
    complete_snapshot: true,
  },
];

export const commercialLaunchCoverageAttestations: CatalogueSourceAttestation[] = [
  { source_authority: "find-an-apprenticeship-api-v2", attested_at: "2026-08-10T10:00:00.000Z" },
  { source_authority: "discover-uni-hesa", attested_at: "2026-08-10T10:00:00.000Z" },
];

const normaliseRegion = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function meetsLocationConstraint(persona: CommercialLaunchPersona, opportunity: LaunchCoverageOpportunity) {
  if (persona.profile.relocationPreference !== "stay-local") return true;
  const homeRegion = normaliseRegion(persona.profile.homeRegion);
  return Object.entries(opportunity.travelMinutesByRegion).some(([region, minutes]) =>
    normaliseRegion(region) === homeRegion
    && minutes <= persona.profile.maxTravelMinutes
    && opportunity.coverageRegions.some((coverageRegion) => normaliseRegion(coverageRegion) === homeRegion),
  );
}

function matchesRouteIntent(persona: CommercialLaunchPersona, opportunity: LaunchCoverageOpportunity) {
  return persona.profile.routeIntent === "combined"
    || (persona.profile.routeIntent === "university" && opportunity.kind === "university-course")
    || (persona.profile.routeIntent === "apprenticeship" && opportunity.kind === "apprenticeship-vacancy");
}

export function evaluateLaunchPersonaCoverage(
  personas: readonly CommercialLaunchPersona[],
  opportunities: readonly LaunchCoverageOpportunity[],
  nowDate: Date,
  sourceAttestations: readonly CatalogueSourceAttestation[],
): LaunchPersonaCoverage[] {
  return personas.map((persona) => {
    const relevant = opportunities.filter((opportunity) =>
      persona.profile.sectors.includes(opportunity.sector as CommercialLaunchPersona["profile"]["sectors"][number])
      && matchesRouteIntent(persona, opportunity)
      && meetsLocationConstraint(persona, opportunity)
      && opportunityPublicationFailures(opportunity, nowDate, [...sourceAttestations]).length === 0,
    );
    return {
      personaId: persona.id,
      label: persona.label,
      sector: persona.profile.sectors[0],
      routeIntent: persona.profile.routeIntent,
      qualificationCase: persona.qualificationCase,
      locationCase: persona.locationCase,
      relevantOpenSourceBacked: relevant.length,
      opportunityIds: relevant.map((opportunity) => opportunity.id),
      minimum: 3,
      passes: relevant.length >= 3,
    };
  });
}
