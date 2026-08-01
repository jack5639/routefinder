import { describe, expect, it } from "vitest";
import { classifyApprenticeshipSector, fetchApprenticeshipDrafts } from "@/lib/catalog/commercial/find-apprenticeship";

describe("Find an Apprenticeship commercial boundary", () => {
  it("uses an explicit unclassified result rather than silently treating vacancies as technology", () => {
    expect(classifyApprenticeshipSector("Hospitality assistant")).toMatchObject({ sector: "unclassified" });
    expect(classifyApprenticeshipSector("Software engineer")).toMatchObject({ sector: "unclassified", reason: "ambiguous-sector-keywords" });
  });

  it("continues through API pages until the source says the snapshot is complete", async () => {
    let calls = 0;
    const result = await fetchApprenticeshipDrafts("key", { fetcher: async () => {
      calls += 1;
      return new Response(JSON.stringify({ vacancies: [{ vacancyReference: calls, title: "Software developer", employerName: "Example", description: "Build software", applicationUrl: "https://example.test/apply" }], hasNextPage: calls < 2 }));
    } });
    expect(calls).toBe(2);
    expect(result).toMatchObject({ complete: true });
    expect(result.drafts).toHaveLength(2);
  });

  it("fails rather than declaring a capped snapshot complete", async () => {
    await expect(fetchApprenticeshipDrafts("key", {
      maxPages: 1,
      fetcher: async () => new Response(JSON.stringify({
        vacancies: [{ vacancyReference: 1, title: "Digital support", employerName: "Example", description: "Support", applicationUrl: "https://example.test/apply" }],
        hasNextPage: true,
      })),
    })).rejects.toThrow("incomplete-pagination");
  });
});
