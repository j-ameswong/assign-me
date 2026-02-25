import { test, expect } from "@playwright/test";
import { createTestEvent, getEventByJoinCode } from "./helpers";

test.describe("Join Event & Submit Rankings", () => {
  test("homepage join form navigates to the event join page", async ({ page, request }) => {
    const event = await createTestEvent(request);

    await page.goto("/");
    const joinInput = page.getByPlaceholder(/join code/i);
    await joinInput.fill(event.join_code);
    await page.getByRole("button", { name: /join/i }).click();

    await expect(page).toHaveURL(new RegExp(event.join_code), { timeout: 5_000 });
  });

  test("join page displays event title and options", async ({ page, request }) => {
    const event = await createTestEvent(request, {
      title: "Ranking UI Test",
      options: [{ name: "Project Alpha" }, { name: "Project Beta" }],
    });

    await page.goto(`/join/${event.join_code}`);

    await expect(page.getByRole("heading", { name: "Ranking UI Test" })).toBeVisible();
    await expect(page.getByText("Project Alpha")).toBeVisible();
    await expect(page.getByText("Project Beta")).toBeVisible();
  });

  test("submit button is disabled until at least one option is ranked", async ({ page, request }) => {
    const event = await createTestEvent(request);

    await page.goto(`/join/${event.join_code}`);
    await page.getByLabel(/your email/i).fill("voter@test.com");

    const submitButton = page.getByRole("button", { name: /submit rankings/i });
    await expect(submitButton).toBeDisabled();
  });

  test("can add an option to rankings and submit", async ({ page, request }) => {
    const event = await createTestEvent(request, {
      title: "Submit Rankings Test",
      options: [{ name: "Opt A" }, { name: "Opt B" }],
    });

    await page.goto(`/join/${event.join_code}`);
    await page.getByLabel(/your email/i).fill(`submit-${Date.now()}@test.com`);

    // Add the first option to rankings (use the Add button)
    await page.getByRole("button", { name: /add/i }).first().click();

    const submitButton = page.getByRole("button", { name: /submit rankings/i });
    await expect(submitButton).toBeEnabled();

    await submitButton.click();
    await expect(page).toHaveURL(/\/success/, { timeout: 10_000 });
  });

  test("success page shows a confirmation message", async ({ page, request }) => {
    const event = await createTestEvent(request);
    const eventData = await getEventByJoinCode(request, event.join_code);

    await page.goto(`/join/${event.join_code}`);
    await page.getByLabel(/your email/i).fill(`success-${Date.now()}@test.com`);
    await page.getByRole("button", { name: /add/i }).first().click();
    await page.getByRole("button", { name: /submit rankings/i }).click();

    await page.waitForURL(/\/success/);
    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/success|submitted|received|confirmed/);
  });

  test("shows error when submitting duplicate email", async ({ page, request }) => {
    const event = await createTestEvent(request);
    const email = `dup-${Date.now()}@test.com`;

    // First submission via API
    const eventData = await getEventByJoinCode(request, event.join_code);
    await request.post(`/api/events/${eventData.id}/submissions`, {
      data: { email, rankings: [eventData.options[0].id] },
    });

    // Second submission via UI
    await page.goto(`/join/${event.join_code}`);
    await page.getByLabel(/your email/i).fill(email);
    await page.getByRole("button", { name: /add/i }).first().click();
    await page.getByRole("button", { name: /submit rankings/i }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 5_000 });
  });

  test("closed event shows an appropriate message", async ({ page, request }) => {
    const event = await createTestEvent(request);

    // Close via API
    await request.patch(`/api/events/${event.id}/admin`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
      data: { status: "closed" },
    });

    await page.goto(`/join/${event.join_code}`);
    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/no longer accepting|closed/);
  });
});
