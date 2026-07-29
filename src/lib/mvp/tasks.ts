import type { EvidenceCoverage, Requirement } from "@/lib/mvp/types";

export interface TaskCandidate {
  id: string;
  title: string;
  whyItMatters: string;
  effortMinutes: number;
  dueDate?: string;
  requirement?: Requirement;
  coverage?: EvidenceCoverage;
  applicationStageBlocked?: boolean;
  sharedOpportunityCount?: number;
}

function priority(candidate: TaskCandidate, now: Date) {
  let score = 0;

  if (candidate.dueDate) {
    const days = Math.ceil((new Date(candidate.dueDate).getTime() - now.getTime()) / 86_400_000);
    score += days <= 3 ? 100 : days <= 14 ? 70 : days <= 30 ? 40 : 10;
  }

  if (candidate.requirement?.hardRequirement && candidate.coverage === "apparently-unmet") {
    score += 90;
  } else if (candidate.requirement?.hardRequirement && candidate.coverage === "needs-confirmation") {
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
  return [...candidates]
    .sort((a, b) => {
      const difference = priority(b, now) - priority(a, now);
      return difference || a.id.localeCompare(b.id);
    })
    .slice(0, 3);
}
