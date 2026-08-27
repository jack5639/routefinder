import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }, testInfo) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const expectedUnavailableResponse = testInfo.title.includes("catalogue is unavailable") && /Failed to load resource.*503/.test(text);
    if (!expectedUnavailableResponse) errors.push(text);
  });
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

const opportunities = [
  {
    id: "11111111-1111-4111-8111-111111111111", title: "Computing", provider_name: "Example University", kind: "university-course", sector: "technology", location: "Leeds", application_url: "https://example.com/course", source_url: "https://example.com/source", verified_at: "2026-08-20T10:00:00.000Z", freshness: "high",
    requirements: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", kind: "skill", label: "Mathematical problem-solving", supporting_text: "Show mathematical problem-solving in your application.", source_url: "https://example.com/requirement", verified_at: "2026-08-20T10:00:00.000Z", freshness: "high", conflict: false, hard_requirement: false }],
  },
  {
    id: "22222222-2222-4222-8222-222222222222", title: "Software apprentice", provider_name: "Example Employer", kind: "apprenticeship-vacancy", sector: "technology", location: "Manchester", application_url: "https://example.com/vacancy", source_url: "https://example.com/vacancy-source", deadline: "2026-11-20T10:00:00.000Z", verified_at: "2026-08-21T10:00:00.000Z", freshness: "medium",
    requirements: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", kind: "skill", label: "Teamwork", supporting_text: "Give an example of teamwork.", source_url: "https://example.com/teamwork", verified_at: "2026-08-21T10:00:00.000Z", freshness: "medium", conflict: false, hard_requirement: false }],
  },
];

async function mockStart(page: import("@playwright/test").Page) {
  await page.route("**/api/opportunities**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ opportunities, configured: true, pagination: { page: 1, pageSize: 24, hasMore: false } }) }));
  await page.route("**/api/funnel", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
}

test("commercial landing is usable without exposing prototype scores", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("See what each application asks for");
  await expect(page.getByRole("link", { name: "Get my free first result" }).first()).toBeVisible();
  await expect(page.getByText("Strong fit")).toHaveCount(0);
  await expect(page.getByText(/acceptance probability/i)).toHaveCount(0);
});

test("focused start path produces a sourced result and carries campaign to sign-in", async ({ page }) => {
  await mockStart(page);
  await page.goto("/start?campaign=school-visit");
  await page.getByRole("button", { name: /I have one opportunity/ }).focus();
  await expect(page.getByRole("button", { name: /I have one opportunity/ })).toBeFocused();
  await expect.poll(() => page.getByRole("button", { name: /I have one opportunity/ }).evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
  await page.keyboard.press("Enter");
  await page.getByLabel("Reviewed opportunity").selectOption(opportunities[0].id);
  await page.getByRole("button", { name: "I have evidence" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Show my requirement result" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Requirement: Mathematical problem-solving")).toBeVisible();
  await expect(page.getByRole("link", { name: /Check the requirement source/ })).toHaveAttribute("href", "https://example.com/requirement");
  await page.getByRole("link", { name: "Sign in to continue" }).click();
  await expect(page).toHaveURL(/\/signin\?next=%2Freadiness&campaign=school-visit/);
});

test("focused official URL stays useful and honest when the catalogue is unavailable", async ({ page }) => {
  await page.route("**/api/opportunities**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Unavailable" } }) }));
  await page.route("**/api/funnel", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
  await page.goto("/start");
  await page.getByRole("button", { name: /I have one opportunity/ }).click();
  await expect(page.getByText("The reviewed catalogue is temporarily unavailable. No opportunity result will be inferred from missing data.")).toBeVisible();
  await expect(page.getByLabel("Reviewed opportunity")).toBeDisabled();
  await page.getByLabel("Official opportunity URL").fill("https://example.com/official-opportunity");
  await page.getByRole("button", { name: "Show my requirement result" }).click();
  await expect(page.getByRole("heading", { name: "Official opportunity needs checking" })).toBeVisible();
  await expect(page.getByText(/has not inferred or verified any requirement/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Check the official opportunity/ })).toHaveAttribute("href", "https://example.com/official-opportunity");
});

test("empty catalogue is labelled as a coverage gap without demo substitutions", async ({ page }) => {
  await page.route("**/api/opportunities**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ opportunities: [], configured: true, pagination: { page: 1, pageSize: 24, hasMore: false } }) }));
  await page.route("**/api/funnel", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ recorded: true }) }));
  await page.goto("/start");
  await page.getByRole("button", { name: /I am not sure yet/ }).click();
  await expect(page.getByText(/honest coverage gap/)).toBeVisible();
  await page.getByRole("button", { name: "Show route families to investigate" }).click();
  await expect(page.getByText(/not being filled with demo data/)).toBeVisible();
});

test("comparing start path keeps dimensions separate", async ({ page }) => {
  await mockStart(page);
  await page.goto("/start");
  await page.getByRole("button", { name: /I am comparing options/ }).click();
  await page.getByLabel(/Computing/).check();
  await page.getByLabel(/Software apprentice/).check();
  await page.getByRole("button", { name: "Compare these options" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("rowheader", { name: "Eligibility" })).toBeVisible();
  await expect(page.getByText(/No total score or acceptance likelihood/)).toBeVisible();
});

test("unsure start path gives bounded families, unknowns, and a low-cost action", async ({ page }) => {
  await mockStart(page);
  await page.goto("/start");
  await page.getByRole("button", { name: /I am not sure yet/ }).click();
  await page.getByText("Route openness").locator("select").selectOption("both");
  await page.getByRole("button", { name: "Show route families to investigate" }).click();
  await expect(page.getByText(/University courses and Higher and degree apprenticeships/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "What remains unknown" })).toBeVisible();
  await expect(page.getByText(/Low-cost next action/)).toBeVisible();
});

test("mobile public navigation and pricing stay inside the viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await mockStart(page);
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Checkout unavailable" })).toBeDisabled();
  await expect(page.getByText("Payments are closed or not fully configured. Free remains available.")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.goto("/start");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Routefinder/ })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("prototype is visibly separated", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Prototype only — not the customer product", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
