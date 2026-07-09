import type { QuizAnswers, RouteType } from "@/types";

export interface TestPersonaExpectedRanking {
  likelyStrongRouteTypes: RouteType[];
  stretchRouteTypes: RouteType[];
  viableBackupRouteTypes: RouteType[];
  constraintsThatShouldMatterMost: string[];
  notes: string;
}

export interface TestPersonaProfile {
  id: string;
  scenario: string;
  answers: QuizAnswers;
  expectedRanking: TestPersonaExpectedRanking;
}

export const testPersonaProfiles: TestPersonaProfile[] = [
  {
    id: "unsure-high-grades-open-university",
    scenario: "Completely unsure, high grades, open to university",
    answers: {
      currentStage: "Year 12",
      subjects: ["maths", "computer science", "biology"],
      predictedGrades: "high",
      interests: ["technology", "maths", "people", "problem solving"],
      location: "London",
      maxTravelMinutes: 90,
      debtPreference: "open",
      earnSoon: 2,
      workStyles: ["academic", "technical", "people"],
      constraints: ["wants broad options"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["University degree", "Degree apprenticeship", "Foundation year"],
      stretchRouteTypes: ["Degree apprenticeship", "University degree"],
      viableBackupRouteTypes: ["Higher apprenticeship", "College course", "Direct work/training"],
      constraintsThatShouldMatterMost: ["wants broad options", "missing target career", "missing target course"],
      notes:
        "High attainment and openness to university should keep academic routes visible, while uncertainty should preserve practical backups.",
    },
  },
  {
    id: "unsure-lower-grades-earn-soon",
    scenario: "Completely unsure, lower grades, wants to earn soon",
    answers: {
      currentStage: "Year 13",
      subjects: ["english", "business", "media"],
      predictedGrades: "needs-building",
      interests: ["people", "organisation", "technology"],
      location: "Liverpool",
      maxTravelMinutes: 45,
      debtPreference: "avoid",
      earnSoon: 5,
      workStyles: ["practical", "people"],
      constraints: ["grade-constrained", "money pressure", "debt concern"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["Direct work/training", "Higher apprenticeship", "College course", "Portfolio/project route"],
      stretchRouteTypes: ["University degree", "Degree apprenticeship", "Foundation year"],
      viableBackupRouteTypes: ["College course", "Portfolio/project route", "Access course"],
      constraintsThatShouldMatterMost: ["grade-constrained", "money pressure", "debt concern", "earning soon"],
      notes:
        "Lower-debt and earlier-earning routes should be treated as realistic starting points, not as second-best options.",
    },
  },
  {
    id: "software-developer-debt-averse",
    scenario: "Target career: software developer, debt-averse",
    answers: {
      currentStage: "Year 13",
      subjects: ["maths", "computer science", "business"],
      predictedGrades: "strong",
      interests: ["technology", "problem solving"],
      targetCareer: "software developer",
      targetCourse: "computer science",
      location: "Leeds",
      maxTravelMinutes: 70,
      debtPreference: "avoid",
      earnSoon: 5,
      workStyles: ["technical", "practical"],
      constraints: ["debt concern", "money pressure"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["Degree apprenticeship", "Direct work/training", "Portfolio/project route"],
      stretchRouteTypes: ["University degree"],
      viableBackupRouteTypes: ["Higher apprenticeship", "College course", "Portfolio/project route"],
      constraintsThatShouldMatterMost: ["debt concern", "money pressure", "earning soon", "technical fit"],
      notes:
        "A software target plus debt aversion should lift paid technical routes while keeping university visible as a cost-sensitive stretch.",
    },
  },
  {
    id: "solicitor-high-grades",
    scenario: "Target career: solicitor, high grades",
    answers: {
      currentStage: "Year 13",
      subjects: ["english", "history", "politics"],
      predictedGrades: "high",
      interests: ["law", "people", "writing"],
      targetCareer: "solicitor",
      targetCourse: "law",
      location: "Birmingham",
      maxTravelMinutes: 90,
      debtPreference: "some-concern",
      earnSoon: 2,
      workStyles: ["academic", "people"],
      constraints: ["competitive-course applicant", "wants broad options"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["University degree", "Access course"],
      stretchRouteTypes: ["Degree apprenticeship"],
      viableBackupRouteTypes: ["Access course", "Higher apprenticeship", "College course"],
      constraintsThatShouldMatterMost: ["competitive-course applicant", "course requirements", "debt concern"],
      notes:
        "Current mock data does not include a full law route. Expectations should survive a future law degree or solicitor apprenticeship record.",
    },
  },
  {
    id: "psychology-medium-grades",
    scenario: "Target course: psychology, medium grades",
    answers: {
      currentStage: "Year 12",
      subjects: ["psychology", "biology", "english"],
      predictedGrades: "steady",
      interests: ["people", "social science", "biology"],
      targetCourse: "psychology",
      location: "Manchester",
      maxTravelMinutes: 60,
      debtPreference: "some-concern",
      earnSoon: 3,
      workStyles: ["academic", "people"],
      constraints: ["needs structured study", "wants broad options"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["Access course", "College course", "University degree", "Foundation year"],
      stretchRouteTypes: ["University degree", "Degree apprenticeship"],
      viableBackupRouteTypes: ["College course", "Access course", "Direct work/training"],
      constraintsThatShouldMatterMost: ["medium grades", "course requirements", "structured study"],
      notes:
        "Until psychology records exist, related people, biology, social science, and academic routes should carry the expectation.",
    },
  },
  {
    id: "healthcare-location-constrained",
    scenario: "Healthcare interest, location-constrained",
    answers: {
      currentStage: "College",
      subjects: ["biology", "health and social care", "psychology"],
      predictedGrades: "steady",
      interests: ["health", "people", "community"],
      targetCareer: "nurse",
      location: "Sheffield",
      maxTravelMinutes: 30,
      debtPreference: "some-concern",
      earnSoon: 3,
      workStyles: ["people", "practical"],
      constraints: ["location limit", "practical learning"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["College course", "Access course", "Direct work/training"],
      stretchRouteTypes: ["University degree", "Foundation year"],
      viableBackupRouteTypes: ["Higher apprenticeship", "Direct work/training", "College course"],
      constraintsThatShouldMatterMost: ["location limit", "placement travel", "practical learning"],
      notes:
        "Local, practical healthcare routes should rank strongly; distant or high-cost study should stay visible as stretch checks.",
    },
  },
  {
    id: "creative-media-portfolio",
    scenario: "Creative/media interest, portfolio-oriented",
    answers: {
      currentStage: "College",
      subjects: ["art", "media", "english"],
      predictedGrades: "steady",
      interests: ["design", "media", "creative", "writing"],
      targetCareer: "content creator",
      targetCourse: "graphic design",
      location: "Norwich",
      maxTravelMinutes: 35,
      debtPreference: "avoid",
      earnSoon: 4,
      workStyles: ["creative", "practical"],
      constraints: ["needs evidence of work", "location limit", "debt concern"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["Portfolio/project route", "College course"],
      stretchRouteTypes: ["University degree", "Degree apprenticeship"],
      viableBackupRouteTypes: ["College course", "Direct work/training", "Foundation year"],
      constraintsThatShouldMatterMost: ["needs evidence of work", "location limit", "debt concern"],
      notes:
        "Portfolio evidence should matter more than exact grades, with local college or direct work as viable backups.",
    },
  },
  {
    id: "engineering-practical-learner",
    scenario: "Engineering interest, practical learner",
    answers: {
      currentStage: "Year 13",
      subjects: ["maths", "physics", "design technology"],
      predictedGrades: "steady",
      interests: ["engineering", "making", "maths", "physics"],
      targetCareer: "engineer",
      targetCourse: "engineering",
      location: "Bristol",
      maxTravelMinutes: 80,
      debtPreference: "some-concern",
      earnSoon: 3,
      workStyles: ["technical", "practical"],
      constraints: ["subject gap", "practical learning"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["Foundation year", "Higher apprenticeship", "Degree apprenticeship", "College course"],
      stretchRouteTypes: ["University degree", "Foundation year"],
      viableBackupRouteTypes: ["Higher apprenticeship", "College course", "Access course"],
      constraintsThatShouldMatterMost: ["subject gap", "practical learning", "travel"],
      notes:
        "A practical engineering learner may need both applied routes and bridge routes; costs and entry checks should affect stretch status.",
    },
  },
  {
    id: "business-finance-high-earnings",
    scenario: "Business/finance interest, wants high earnings",
    answers: {
      currentStage: "Year 13",
      subjects: ["business", "maths", "economics"],
      predictedGrades: "strong",
      interests: ["business", "finance", "organisation", "maths"],
      targetCareer: "finance analyst",
      targetCourse: "business",
      location: "Manchester",
      maxTravelMinutes: 70,
      debtPreference: "some-concern",
      earnSoon: 5,
      workStyles: ["people", "practical", "technical"],
      constraints: ["money pressure", "debt concern"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["Higher apprenticeship", "Degree apprenticeship", "Direct work/training"],
      stretchRouteTypes: ["University degree"],
      viableBackupRouteTypes: ["Higher apprenticeship", "Direct work/training", "College course"],
      constraintsThatShouldMatterMost: ["earning soon", "debt concern", "high earnings"],
      notes:
        "Paid business or finance routes should rank strongly when earning soon matters, while degree routes remain comparison options.",
    },
  },
  {
    id: "low-grades-no-debt-local-options",
    scenario: "Low grades, does not want debt, wants local options",
    answers: {
      currentStage: "GCSE",
      subjects: ["english", "business", "media"],
      predictedGrades: "needs-building",
      interests: ["people", "technology", "creative"],
      location: "Local area",
      maxTravelMinutes: 25,
      debtPreference: "avoid",
      earnSoon: 5,
      workStyles: ["practical", "people", "creative"],
      constraints: ["grade-constrained", "location limit", "debt concern", "money pressure"],
    },
    expectedRanking: {
      likelyStrongRouteTypes: ["Direct work/training", "Portfolio/project route", "College course"],
      stretchRouteTypes: ["University degree", "Foundation year", "Degree apprenticeship"],
      viableBackupRouteTypes: ["College course", "Higher apprenticeship", "Access course"],
      constraintsThatShouldMatterMost: ["grade-constrained", "location limit", "debt concern", "money pressure"],
      notes:
        "Local, low-debt, practical routes should be viable without framing lower grades as a character judgement.",
    },
  },
];

export const testPersonas: QuizAnswers[] = testPersonaProfiles.map((profile) => profile.answers);
