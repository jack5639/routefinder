import { z } from "zod";

import { launchApplicationCycle } from "@/lib/catalog/commercial/policy";
import { launchSectors } from "@/lib/mvp/types";

export const privacyTermsVersion = "2026-07-29" as const;

export const qualificationSchema = z.object({
  id: z.string().uuid().optional(),
  qualificationType: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(100),
  grade: z.string().trim().min(1).max(20).optional(),
  status: z.enum(["predicted", "achieved", "unknown"]),
}).superRefine((qualification, context) => {
  if (qualification.status === "unknown" && qualification.grade) {
    context.addIssue({ code: "custom", path: ["grade"], message: "Unknown qualifications cannot include a grade." });
  }
  if (qualification.status !== "unknown" && !qualification.grade) {
    context.addIssue({ code: "custom", path: ["grade"], message: "Add the predicted or achieved grade." });
  }
});

export const profileSchema = z.object({
  currentStage: z.enum(["Year 12", "Year 13"]),
  applicationCycle: z.literal(launchApplicationCycle),
  homeRegion: z.string().trim().min(2).max(100),
  maxTravelMinutes: z.number().int().min(0).max(360),
  relocationPreference: z.enum(["stay-local", "could-relocate", "unsure"]),
  routeIntent: z.enum(["university", "apprenticeship", "combined"]),
  sectors: z.array(z.enum(launchSectors)).min(1).max(4),
  workStyles: z.array(z.string().trim().min(1).max(60)).max(6),
  financialPreference: z.enum(["open", "cost-aware", "prefer-lower-debt"]),
  constraints: z.array(z.string().trim().min(1).max(120)).max(10),
  experienceSummary: z.string().trim().max(1000).optional(),
  qualifications: z.array(qualificationSchema).max(20),
  qualificationsComplete: z.boolean(),
  policyVersion: z.literal(privacyTermsVersion),
});

export const portfolioCreateSchema = z.union([
  z.object({ opportunityId: z.string().uuid() }),
  z.object({
    externalTitle: z.string().trim().min(2).max(160),
    externalUrl: z.string().url().max(1000),
  }),
]);

export const evidenceSchema = z.object({
  evidenceType: z.string().trim().min(2).max(80),
  happened: z.string().trim().min(10).max(1200),
  contribution: z.string().trim().min(10).max(1200),
  outcome: z.string().trim().min(2).max(1200),
  learned: z.string().trim().min(10).max(1200),
  supportingDetail: z.string().trim().max(1200).optional(),
  evidenceDate: z.union([z.string().date(), z.literal("")]).optional(),
});

export const evidenceLinkSchema = z.object({
  evidenceId: z.string().uuid(),
  requirementId: z.string().uuid(),
  relevance: z.string().trim().min(5).max(600),
  coverage: z.enum(["supported", "weak", "missing", "apparently-unmet", "needs-confirmation"]),
  missingSpecificity: z.string().trim().max(600).optional(),
  confirmedByStudent: z.boolean(),
});

export const applicationSchema = z.object({
  portfolioItemId: z.string().uuid(),
  stage: z.enum([
    "planned",
    "preparing",
    "submitted",
    "online-assessment",
    "interview",
    "assessment-centre",
    "decision",
    "offer",
    "declined",
    "withdrawn",
  ]),
  deadline: z.string().datetime().optional(),
  officialUrl: z.string().url().max(1000),
  nextAction: z.string().trim().max(600).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const analyticsSchema = z.object({
  eventName: z.literal("readiness_started"),
  properties: z.object({}).strict().default({}),
});
