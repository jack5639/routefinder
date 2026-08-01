import { expect, test } from "@playwright/test";

test("commercial landing is usable without exposing prototype scores", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Know where you stand");
  await expect(page.getByRole("link", { name: "Start the free readiness check" })).toBeVisible();
  await expect(page.getByText("Strong fit")).toHaveCount(0);
  await expect(page.getByText(/acceptance probability/i)).toHaveCount(0);
});

test("mobile public navigation and pricing stay inside the viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("prototype is visibly separated", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Prototype only — not the customer product", { exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
