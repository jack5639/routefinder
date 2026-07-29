import type { Qualification, StudentProfile } from "@/lib/mvp/types";

export interface StartingStrategy {
  headline: string;
  observations: string[];
  firstActions: string[];
  caveat: string;
}

export function buildStartingStrategy(profile: StudentProfile, qualifications: Qualification[]): StartingStrategy {
  const unknownSubjects = qualifications.filter((qualification) => qualification.status === "unknown" || !qualification.grade);
  const routeLabel =
    profile.routeIntent === "combined"
      ? "university and apprenticeship opportunities"
      : profile.routeIntent === "university"
        ? "university opportunities"
        : "apprenticeship opportunities";
  const observations = [
    `Start by comparing reviewed ${routeLabel} across ${profile.sectors.join(", ")}.`,
    profile.relocationPreference === "stay-local"
      ? `Use ${profile.homeRegion} and a ${profile.maxTravelMinutes}-minute travel limit as early filters.`
      : `Keep location visible while your relocation preference is ${profile.relocationPreference === "unsure" ? "still uncertain" : "open"}.`,
  ];
  if (unknownSubjects.length) {
    observations.push(`${unknownSubjects.length} qualification detail${unknownSubjects.length === 1 ? "" : "s"} still need confirmation.`);
  }
  if (profile.constraints.length) {
    observations.push("Your recorded constraints should stay visible in every comparison.");
  }
  return {
    headline: `A starting strategy for ${profile.applicationCycle} entry`,
    observations,
    firstActions: [
      "Save three source-backed opportunities that are different enough to compare.",
      unknownSubjects.length ? `Confirm the recorded detail for ${unknownSubjects[0].subject}.` : "Check one important requirement directly at its source.",
      "Add one genuine evidence example from a project, responsibility, or experience.",
    ],
    caveat: "This is a preparation sequence, not a route ranking or an application-outcome prediction.",
  };
}
