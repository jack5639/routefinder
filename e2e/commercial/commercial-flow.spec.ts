import { expect, test } from "@playwright/test";
import { IsolatedCommercialEnvironment, type SyntheticStudent } from "./isolated-supabase";

let isolated: IsolatedCommercialEnvironment;
let studentA: SyntheticStudent;
let studentB: SyntheticStudent;
let published: Record<string, unknown>;
let draft: Record<string, unknown>;
let withdrawn: Record<string, unknown>;

test.beforeAll(async () => {
  isolated = new IsolatedCommercialEnvironment();
  await isolated.verifySentinel();
  [studentA, studentB] = await Promise.all([isolated.createStudent("a"), isolated.createStudent("b")]);
  [published, draft, withdrawn] = await Promise.all([
    isolated.createOpportunity("published", "published"),
    isolated.createOpportunity("draft", "draft"),
    isolated.createOpportunity("withdrawn", "withdrawn"),
  ]);
});

test.afterAll(async () => {
  await isolated.cleanup();
});

test("protected workspace redirects an unauthenticated student", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/signin/);
});

test("readiness replacement preserves identities and explicit uncertainty", async ({ context, page }) => {
  await isolated.authenticate(context, studentA);
  const request = page.request;
  const first = await request.put("/api/profile", { data: {
    currentStage: "Year 13", applicationCycle: 2027, homeRegion: "London", maxTravelMinutes: 60,
    relocationPreference: "unsure", routeIntent: "combined", sectors: ["technology"],
    workStyles: ["practical"], financialPreference: "open", constraints: [],
    qualificationsComplete: false, policyVersion: "2026-07-29",
    qualifications: [
      { qualificationType: "A level", subject: "Mathematics", grade: "A", status: "predicted" },
      { qualificationType: "T Level", subject: "Digital", status: "unknown" },
    ],
  } });
  expect(first.ok()).toBe(true);
  const profile = await (await request.get("/api/profile")).json();
  expect(profile.qualifications).toHaveLength(2);
  const maths = profile.qualifications.find((item: Record<string, unknown>) => item.subject === "Mathematics");
  const digital = profile.qualifications.find((item: Record<string, unknown>) => item.subject === "Digital");
  expect(maths.status).toBe("predicted");
  expect(digital.status).toBe("unknown");
  const edited = await request.put("/api/profile", { data: {
    currentStage: "Year 13", applicationCycle: 2027, homeRegion: "London", maxTravelMinutes: 60,
    relocationPreference: "unsure", routeIntent: "combined", sectors: ["technology"],
    workStyles: ["practical"], financialPreference: "open", constraints: [],
    qualificationsComplete: false, policyVersion: "2026-07-29",
    qualifications: [
      { id: maths.id, qualificationType: "A level", subject: "Mathematics", grade: "A", status: "achieved" },
      { id: digital.id, qualificationType: "T Level", subject: "Digital", status: "unknown" },
    ],
  } });
  expect(edited.ok()).toBe(true);
  const after = await (await request.get("/api/profile")).json();
  expect(after.qualifications.map((item: Record<string, unknown>) => item.id)).toEqual(expect.arrayContaining([maths.id, digital.id]));
  expect(after.profile.qualifications_complete).toBe(false);
});

test("catalogue publishes only reviewed rows and duplicate saves are deliberate", async ({ context, page }) => {
  await isolated.authenticate(context, studentA);
  const request = page.request;
  const catalogue = await (await request.get("/api/catalogue/opportunities")).json();
  const ids = catalogue.opportunities.map((item: Record<string, unknown>) => item.id);
  expect(ids).toContain(published.id);
  expect(ids).not.toContain(draft.id);
  expect(ids).not.toContain(withdrawn.id);
  expect(JSON.stringify(catalogue)).not.toContain("restricted");

  const first = await request.post("/api/portfolio", { data: { opportunityId: published.id } });
  expect(first.status()).toBe(201);
  const duplicate = await request.post("/api/portfolio", { data: { opportunityId: published.id } });
  expect(duplicate.ok()).toBe(true);
  expect((await duplicate.json()).duplicate).toBe(true);
  const portfolio = await (await request.get("/api/portfolio")).json();
  expect(portfolio.items.filter((item: Record<string, unknown>) => item.opportunity_id === published.id && item.active)).toHaveLength(1);
});

test("one student cannot read or mutate another student's commercial records", async ({ context, page }) => {
  await isolated.authenticate(context, studentB);
  const request = page.request;
  const own = await (await request.get("/api/portfolio")).json();
  expect(own.items.some((item: Record<string, unknown>) => item.user_id === studentA.id)).toBe(false);
  const foreign = await request.delete(`/api/portfolio/${published.id}`);
  expect([404, 400]).toContain(foreign.status());
});

test("core authenticated workspace is usable at 390px without prohibited claims", async ({ context, page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-commercial", "Mobile-specific release gate");
  await isolated.authenticate(context, studentA);
  await page.goto("/app");
  await expect(page.getByRole("main")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.getByText(/acceptance probability/i)).toHaveCount(0);
  await expect(page.getByText(/total score/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
