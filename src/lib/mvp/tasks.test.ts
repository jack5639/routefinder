import { describe, expect, it } from "vitest";

import { selectThisWeek, type TaskCandidate } from "@/lib/mvp/tasks";

const candidates: TaskCandidate[] = [
  { id: "later", title: "Later task", whyItMatters: "Useful later", effortMinutes: 90, dueDate: "2026-10-20" },
  { id: "soon", title: "Soon task", whyItMatters: "Deadline", effortMinutes: 20, dueDate: "2026-08-02" },
  { id: "shared", title: "Shared evidence", whyItMatters: "Several opportunities", effortMinutes: 30, sharedOpportunityCount: 4 },
  { id: "blocked", title: "Unblock application", whyItMatters: "Stage blocker", effortMinutes: 45, applicationStageBlocked: true },
  { id: "extra", title: "Extra task", whyItMatters: "Lower priority", effortMinutes: 180 },
];

describe("This Week prioritisation", () => {
  it("returns no more than three deterministic actions", () => {
    const now = new Date("2026-07-29T00:00:00.000Z");
    const first = selectThisWeek(candidates, now);
    const second = selectThisWeek(candidates, now);

    expect(first).toHaveLength(3);
    expect(first.map((task) => task.id)).toEqual(second.map((task) => task.id));
    expect(first[0].id).toBe("soon");
  });
});
