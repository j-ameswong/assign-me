import { test, expect } from "@playwright/test";

test.describe("Event Creation", () => {
  test("homepage has Create Event button that links to /create", async ({ page }) => {
    await page.goto("/");
    const createButton = page.getByRole("link", { name: /create event/i });
    await expect(createButton).toBeVisible();
    await createButton.click();
    await expect(page).toHaveURL(/\/create/);
  });

  test("create page has all required form fields", async ({ page }) => {
    await page.goto("/create");
    await expect(page.getByLabel(/event title/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /add option/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create event/i })).toBeVisible();
  });

  test("shows validation error when submitting without a title", async ({ page }) => {
    await page.goto("/create");
    await page.getByRole("button", { name: /create event/i }).click();
    // Form HTML5 validation or custom error should prevent submission
    await expect(page.getByLabel(/event title/i)).toBeFocused();
  });

  test("can add and remove options dynamically", async ({ page }) => {
    await page.goto("/create");

    // Add two options
    await page.getByRole("button", { name: /add option/i }).click();
    await page.getByRole("button", { name: /add option/i }).click();

    const optionInputs = page.locator("input[placeholder*='Option']");
    await expect(optionInputs).toHaveCount(2);

    // Remove one
    const removeButtons = page.getByRole("button", { name: /remove/i });
    await removeButtons.first().click();
    await expect(optionInputs).toHaveCount(1);
  });

  test("full creation flow shows admin link on success", async ({ page }) => {
    await page.goto("/create");

    // Fill title
    await page.getByLabel(/event title/i).fill("E2E Test Event");

    // Add an option
    await page.getByRole("button", { name: /add option/i }).click();
    const optionInput = page.locator("input[placeholder*='Option']").first();
    await optionInput.fill("Option Alpha");

    // Submit
    await page.getByRole("button", { name: /create event/i }).click();

    // Should show success state with admin link
    await expect(page.getByText(/admin link/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/join code/i)).toBeVisible();

    // Admin link should contain /event/ and /admin
    const adminLink = page.locator("a, input, code").filter({ hasText: /\/event\// }).first();
    await expect(adminLink).toBeVisible();
  });

  test("created join code matches XXXX-XXXX format", async ({ page }) => {
    await page.goto("/create");
    await page.getByLabel(/event title/i).fill("Format Test Event");
    await page.getByRole("button", { name: /add option/i }).click();
    await page.locator("input[placeholder*='Option']").first().fill("Slot 1");
    await page.getByRole("button", { name: /create event/i }).click();

    await expect(page.getByText(/join code/i)).toBeVisible({ timeout: 10_000 });

    // Look for the join code pattern on the page
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/[A-Z2-9]{4}-[A-Z2-9]{4}/);
  });
});
