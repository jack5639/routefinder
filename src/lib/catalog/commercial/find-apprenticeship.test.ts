import { describe, expect, it } from "vitest";
import { classifyApprenticeshipSector, displayVacancyApiUrl, fetchApprenticeshipDrafts } from "@/lib/catalog/commercial/find-apprenticeship";

describe("Find an Apprenticeship commercial boundary", () => {
  it("uses an explicit unclassified result rather than silently treating vacancies as technology", () => {
    expect(classifyApprenticeshipSector("Hospitality assistant")).toMatchObject({ sector: "unclassified" });
    expect(classifyApprenticeshipSector("Software engineer")).toMatchObject({ sector: "unclassified", reason: "ambiguous-sector-keywords" });
  });

  it("continues through API pages until the source says the snapshot is complete", async () => {
    let calls = 0;
    const requested: URL[] = [];
    const result = await fetchApprenticeshipDrafts("key", { fetcher: async (input) => {
      calls += 1;
      requested.push(new URL(String(input)));
      return new Response(JSON.stringify({ vacancies: [{ vacancyReference: calls, title: "Software developer", employerName: "Example", description: "Build software", applicationUrl: "https://example.test/apply" }], hasNextPage: calls < 2 }));
    } });
    expect(calls).toBe(2);
    expect(result).toMatchObject({ complete: true });
    expect(result.drafts).toHaveLength(2);
    expect(requested[0].origin + requested[0].pathname).toBe(displayVacancyApiUrl);
    expect(requested[0].searchParams.get("IncludeDetails")).toBe("true");
  });

  it("maps the v2 official source, external application destination, and address fields separately", async () => {
    const result = await fetchApprenticeshipDrafts("key", { fetcher: async () => new Response(JSON.stringify({
      vacancies: [{
        vacancyReference: "10001234",
        title: "Data analyst",
        employerName: "Example employer",
        description: "Analyse data",
        vacancyUrl: "https://www.findapprenticeship.service.gov.uk/apprenticeship/VAC10001234",
        applicationUrl: "https://example.test/apply",
        addresses: [{ addressLine2: "Central district", addressLine4: "Leeds", postcode: "LS1 1AA" }],
        course: { title: "Data technician", route: "Digital" },
      }],
      totalPages: 1,
    })) });

    expect(result.drafts[0]).toMatchObject({
      sourceId: "10001234",
      sourceUrl: "https://www.findapprenticeship.service.gov.uk/apprenticeship/VAC10001234",
      applicationUrl: "https://example.test/apply",
      location: "Central district, Leeds, LS1 1AA",
      sector: "technology",
    });
  });

  it("rejects an HTML response before attempting to treat it as API data", async () => {
    await expect(fetchApprenticeshipDrafts("key", {
      fetcher: async () => new Response("<html>not the API</html>", { headers: { "content-type": "text/html" } }),
    })).rejects.toThrow("unexpected-content-type");
  });

  it("reports invalid response fields without copying source values into the error", async () => {
    await expect(fetchApprenticeshipDrafts("key", {
      fetcher: async () => new Response(JSON.stringify({
        vacancies: [{ vacancyReference: 1, title: "" }],
        totalPages: 1,
      })),
    })).rejects.toThrow("display-api-invalid-response:vacancies.0.title");
  });

  it("falls back to the official vacancy page when an application URL is blank or malformed", async () => {
    const result = await fetchApprenticeshipDrafts("key", { fetcher: async () => new Response(JSON.stringify({
      vacancies: [{
        vacancyReference: "VAC10001234",
        title: "Data analyst",
        employerName: "Example employer",
        description: "Analyse data",
        vacancyUrl: "",
        applicationUrl: "not-a-url",
      }],
      totalPages: 1,
    })) });

    expect(result.drafts[0].sourceUrl).toBe("https://www.findapprenticeship.service.gov.uk/apprenticeship/VAC10001234");
    expect(result.drafts[0].applicationUrl).toBe(result.drafts[0].sourceUrl);
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
