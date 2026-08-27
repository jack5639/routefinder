import { describe, expect, it } from "vitest";

import { applySharedOpportunityCounts, selectThisWeek } from "./tasks";
import type { TaskCandidate } from "./tasks";

describe("shared weekly gaps", () => {
  it("counts distinct saved opportunities with the same stable gap", () => {
    const candidates: TaskCandidate[] = [
      { id: "one:a", portfolioItemId: "one", sharedGapKey: "evidence:skill:teamwork", title: "A", whyItMatters: "A", effortMinutes: 20 },
      { id: "one:b", portfolioItemId: "one", sharedGapKey: "evidence:skill:teamwork", title: "B", whyItMatters: "B", effortMinutes: 20 },
      { id: "two:c", portfolioItemId: "two", sharedGapKey: "evidence:skill:teamwork", title: "C", whyItMatters: "C", effortMinutes: 20 },
      { id: "three:d", portfolioItemId: "three", sharedGapKey: "evidence:skill:analysis", title: "D", whyItMatters: "D", effortMinutes: 20 },
    ];

    const counted = applySharedOpportunityCounts(candidates);
    expect(counted.map((candidate) => candidate.sharedOpportunityCount)).toEqual([2, 2, 2, 1]);
    expect(selectThisWeek(counted).filter((candidate) => candidate.sharedGapKey === "evidence:skill:teamwork")).toHaveLength(1);
  });
});
