import { expect, test } from "@playwright/test";
import { IsolatedCommercialEnvironment, type SyntheticReviewedOpportunity, type SyntheticStudent } from "./isolated-supabase";

let isolated: IsolatedCommercialEnvironment;
let studentA: SyntheticStudent;
let studentB: SyntheticStudent;
let studentCatalogue: SyntheticStudent;
let deletionStudent: SyntheticStudent;
let reviewed: SyntheticReviewedOpportunity[];
let published: Record<string, unknown>;
let draft: Record<string, unknown>;
let withdrawn: Record<string, unknown>;

test.beforeAll(async () => {
  isolated = new IsolatedCommercialEnvironment();
  await isolated.verifySentinel();
  [studentA, studentB, studentCatalogue, deletionStudent] = await Promise.all([
    isolated.createStudent("activation"),
    isolated.createStudent("limits"),
    isolated.createStudent("catalogue"),
    isolated.createStudent("deletion"),
  ]);
  reviewed = await Promise.all([
    isolated.createReviewedOpportunity("one", studentA.id, "university-course"),
    isolated.createReviewedOpportunity("two", studentA.id, "apprenticeship-vacancy"),
    isolated.createReviewedOpportunity("three", studentA.id, "university-course"),
    isolated.createReviewedOpportunity("limit-one", studentA.id, "apprenticeship-vacancy"),
    isolated.createReviewedOpportunity("limit-two", studentA.id, "university-course"),
    isolated.createReviewedOpportunity("limit-three", studentA.id, "apprenticeship-vacancy"),
  ]);
  published = await isolated.createOpportunity("published", "published");
  draft = await isolated.createOpportunity("draft", "draft");
  withdrawn = await isolated.createOpportunity("withdrawn", "withdrawn");
});

test.afterAll(async () => {
  // Configuration is validated in beforeAll. Avoid hiding that intentional
  // fail-closed error with a secondary cleanup error when setup never ran.
  if (isolated) await isolated.cleanup();
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
  await isolated.authenticate(context, studentCatalogue);
  const request = page.request;
  const catalogue = await (await request.get("/api/opportunities")).json();
  const ids = catalogue.opportunities.map((item: Record<string, unknown>) => item.id);
  expect(ids).toContain(reviewed[0].id);
  expect(ids).not.toContain(published.id);
  expect(ids).not.toContain(draft.id);
  expect(ids).not.toContain(withdrawn.id);
  expect(JSON.stringify(catalogue)).not.toContain("restricted");

  const first = await request.post("/api/portfolio", { data: { opportunityId: reviewed[0].id } });
  expect(first.status()).toBe(201);
  const duplicate = await request.post("/api/portfolio", { data: { opportunityId: reviewed[0].id } });
  expect(duplicate.ok()).toBe(true);
  expect((await duplicate.json()).duplicate).toBe(true);
  const portfolio = await (await request.get("/api/portfolio")).json();
  expect(portfolio.items.filter((item: Record<string, unknown>) => item.opportunity_id === reviewed[0].id && item.active)).toHaveLength(1);
});

test("authenticated activation completes the evidence-backed action journey and exports it", async ({ context, page }) => {
  await isolated.authenticate(context, studentA);
  const request = page.request;

  const readiness = await request.put("/api/profile", { data: {
    currentStage: "Year 13", applicationCycle: 2027, homeRegion: "London", maxTravelMinutes: 60,
    relocationPreference: "unsure", routeIntent: "combined", sectors: ["technology"],
    workStyles: ["practical"], financialPreference: "open", constraints: [], experienceSummary: "Synthetic activation evidence.",
    qualificationsComplete: false, policyVersion: "2026-07-29",
    qualifications: [{ qualificationType: "A level", subject: "Mathematics", grade: "A", status: "predicted" }],
  } });
  expect(readiness.ok()).toBe(true);

  const savedResponses = await Promise.all(reviewed.slice(0, 3).map((opportunity) => request.post("/api/portfolio", { data: { opportunityId: opportunity.id } })));
  expect(savedResponses.map((response) => response.status())).toEqual([201, 201, 201]);
  const portfolio = await (await request.get("/api/portfolio")).json();
  const savedItems = portfolio.items.filter((item: Record<string, unknown>) => item.active);
  expect(savedItems).toHaveLength(3);
  expect(new Set(savedItems.map((item: Record<string, unknown>) => item.opportunity_id))).toEqual(new Set(reviewed.slice(0, 3).map((opportunity) => opportunity.id)));

  const evidenceResponse = await request.post("/api/evidence", { data: {
    evidenceType: "Project",
    happened: "Built a small synthetic data project for this test.",
    contribution: "Planned the work, implemented the model, and reviewed the result.",
    outcome: "The project produced a working result and a documented improvement.",
    learned: "I learned how to test an assumption and explain a technical decision.",
    supportingDetail: "Synthetic data only.",
  } });
  expect(evidenceResponse.status()).toBe(201);
  const evidence = (await evidenceResponse.json()).item as Record<string, unknown>;

  const mapping = await request.post("/api/evidence-links", { data: {
    evidenceId: evidence.id,
    requirementId: reviewed[0].requirementId,
    relevance: "The project demonstrates the reviewed requirement through a genuine student-owned example.",
    coverage: "supported",
    confirmedByStudent: true,
  } });
  expect(mapping.ok()).toBe(true);
  expect((await mapping.json()).link).toMatchObject({ evidence_id: evidence.id, requirement_id: reviewed[0].requirementId, coverage: "supported" });

  const portfolioItem = savedItems.find((item: Record<string, unknown>) => item.opportunity_id === reviewed[0].id) as Record<string, unknown>;
  const scheduled = await request.post("/api/tasks", { data: {
    title: "Check the official requirement wording",
    whyItMatters: "Confirm the reviewed requirement before preparing the next application step.",
    effortMinutes: 20,
    dueDate: "2026-09-01",
    portfolioItemId: portfolioItem.id,
    requirementId: reviewed[0].requirementId,
  } });
  expect(scheduled.status()).toBe(201);
  const task = (await scheduled.json()).task as Record<string, unknown>;
  expect(task).toMatchObject({ portfolio_item_id: portfolioItem.id, requirement_id: reviewed[0].requirementId, status: "scheduled" });

  const completed = await request.patch(`/api/tasks/${task.id}`, { data: { status: "completed", reflection: "Synthetic activation action completed." } });
  expect(completed.ok()).toBe(true);
  expect((await completed.json()).task).toMatchObject({ id: task.id, status: "completed" });

  const exported = await request.get("/api/account/export");
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-disposition"]).toMatch(/routefinder-export-\d{4}-\d{2}-\d{2}\.json/);
  const exportBody = await exported.json();
  expect(exportBody.account.id).toBe(studentA.id);
  expect(exportBody.data.portfolio_items.some((item: Record<string, unknown>) => item.id === portfolioItem.id)).toBe(true);
  expect(exportBody.data.evidence_items.some((item: Record<string, unknown>) => item.id === evidence.id)).toBe(true);
  expect(exportBody.data.tasks.some((item: Record<string, unknown>) => item.id === task.id && item.status === "completed")).toBe(true);
});

test("Free limits fail closed and a synthetic Cycle entitlement removes the opportunity limit", async ({ context, page }) => {
  await isolated.authenticate(context, studentB);
  const request = page.request;
  const freeOpportunities = reviewed.slice(1, 6);
  for (const opportunity of freeOpportunities) {
    const response = await request.post("/api/portfolio", { data: { opportunityId: opportunity.id } });
    expect(response.status()).toBe(201);
  }
  const limited = await request.post("/api/portfolio", { data: { opportunityId: reviewed[0].id } });
  expect(limited.status()).toBe(403);
  expect((await limited.json()).error).toMatchObject({ code: "limit-reached" });

  const entitlement = await isolated.provisionCycleEntitlement(studentB.id);
  expect(entitlement).toMatchObject({ user_id: studentB.id, plan: "cycle", status: "active" });
  const cycleSave = await request.post("/api/portfolio", { data: { opportunityId: reviewed[0].id } });
  expect(cycleSave.status()).toBe(201);
});

test("one student cannot read or mutate another student's commercial records or cross-object relationships", async ({ context, page }) => {
  await isolated.authenticate(context, studentB);
  const request = page.request;
  const own = await (await request.get("/api/portfolio")).json();
  expect(own.items.some((item: Record<string, unknown>) => item.user_id === studentA.id)).toBe(false);
  const foreignPortfolioItemId = await isolated.portfolioItemId(studentA.id, reviewed[0].id);
  const foreign = await request.delete(`/api/portfolio/${foreignPortfolioItemId}`);
  expect(foreign.status()).toBe(404);

  const ownPortfolioItem = own.items.find((item: Record<string, unknown>) => item.opportunity_id === reviewed[1].id) as Record<string, unknown>;
  const crossObject = await request.post("/api/tasks", { data: {
    title: "Attempt a mismatched relationship",
    whyItMatters: "This synthetic request must not create a cross-object task.",
    effortMinutes: 10,
    portfolioItemId: ownPortfolioItem.id,
    requirementId: reviewed[0].requirementId,
  } });
  expect(crossObject.status()).toBe(409);
  expect((await crossObject.json()).error).toMatchObject({ code: "relationship-invalid" });
});

test("account deletion requires exact confirmation and is fail-closed unless the opt-in durable ledger is configured", async ({ context, page }) => {
  await isolated.authenticate(context, deletionStudent);
  const request = page.request;
  const wrongConfirmation = await request.post("/api/account/delete", { data: { confirmation: "delete" } });
  expect(wrongConfirmation.status()).toBe(400);

  const deletion = await request.post("/api/account/delete", { data: { confirmation: "DELETE" } });
  if (!isolated.destructiveDeletionEnabled) {
    expect(deletion.status()).toBe(503);
    expect((await deletion.json()).error).toMatchObject({ code: "unavailable" });
    const stillPresent = await isolated.admin.auth.admin.getUserById(deletionStudent.id);
    expect(stillPresent.error).toBeNull();
  } else {
    expect(deletion.status()).toBe(200);
    expect(await deletion.json()).toEqual({ deleted: true });
    const deleted = await isolated.admin.auth.admin.getUserById(deletionStudent.id);
    expect(deleted.error).not.toBeNull();
  }
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
