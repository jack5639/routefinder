import type { EvidenceCoverage, Requirement } from "@/lib/mvp/types";
import type { RequirementAssessmentState } from "@/lib/mvp/requirement-assessment";

export interface TaskCandidate {
  id: string;
  portfolioItemId?: string;
  opportunityTitle?: string;
  providerName?: string;
  sharedGapKey?: string;
  title: string;
  whyItMatters: string;
  effortMinutes: number;
  dueDate?: string;
  requirement?: Requirement;
  coverage?: EvidenceCoverage;
  requirementState?: RequirementAssessmentState;
  applicationStageBlocked?: boolean;
  sharedOpportunityCount?: number;
}

export function applySharedOpportunityCounts(candidates: TaskCandidate[]) {
  const opportunitiesByGap = new Map<string, Set<string>>();
  for (const candidate of candidates) {
    if (!candidate.sharedGapKey || !candidate.portfolioItemId) continue;
    const ids = opportunitiesByGap.get(candidate.sharedGapKey) ?? new Set<string>();
    ids.add(candidate.portfolioItemId);
    opportunitiesByGap.set(candidate.sharedGapKey, ids);
  }
  return candidates.map((candidate) => ({
    ...candidate,
    sharedOpportunityCount: candidate.sharedGapKey ? opportunitiesByGap.get(candidate.sharedGapKey)?.size ?? 1 : 1,
  }));
}

function priority(candidate: TaskCandidate, now: Date) {
  let score = 0;

  if (candidate.dueDate) {
    const days = Math.ceil((new Date(candidate.dueDate).getTime() - now.getTime()) / 86_400_000);
    score += days <= 3 ? 100 : days <= 14 ? 70 : days <= 30 ? 40 : 10;
  }

  if (candidate.requirement?.hardRequirement && (candidate.requirementState ?? candidate.coverage) === "apparently-unmet") {
    score += 90;
  } else if (candidate.requirement?.hardRequirement && ["predicted", "unknown-grade", "unsupported-qualification", "needs-checking", "needs-confirmation"].includes(candidate.requirementState ?? candidate.coverage ?? "")) {
    score += 75;
  }

  if (candidate.applicationStageBlocked) {
    score += 65;
  }

  score += Math.min(candidate.sharedOpportunityCount ?? 0, 5) * 8;
  score += candidate.effortMinutes <= 30 ? 12 : candidate.effortMinutes <= 60 ? 6 : 0;
  return score;
}

export function selectThisWeek(candidates: TaskCandidate[], now = new Date()) {
  const ranked = [...candidates]
    .sort((a, b) => {
      const difference = priority(b, now) - priority(a, now);
      return difference || a.id.localeCompare(b.id);
    });
  const selected: TaskCandidate[] = [];
  const selectedGaps = new Set<string>();
  for (const candidate of ranked) {
    if (candidate.sharedGapKey && selectedGaps.has(candidate.sharedGapKey)) continue;
    selected.push(candidate);
    if (candidate.sharedGapKey) selectedGaps.add(candidate.sharedGapKey);
    if (selected.length === 3) break;
  }
  return selected;
}
