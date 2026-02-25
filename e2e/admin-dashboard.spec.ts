import { test, expect } from "@playwright/test";
import { createTestEvent, getEventByJoinCode, goToAdminDashboard } from "./helpers";

test.describe("Admin Dashboard", () => {
  test("shows event title, join code, and open status", async ({ page, request }) => {
    const event = await createTestEvent(request, { title: "Dashboard Display Test" });

    await goToAdminDashboard(page, event.id, event.admin_token);

    await expect(page.getByRole("heading", { name: "Dashboard Display Test" })).toBeVisible();
    await expect(page.getByText("open")).toBeVisible();
    await expect(page.getByText(event.join_code)).toBeVisible();
  });

  test("refuses access with wrong token", async ({ page, request }) => {
    const event = await createTestEvent(request);

    await page.goto(`/event/${event.id}/admin?token=wrong-token`);

    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/invalid|denied|error/);
  });

  test("shows submissions list after a participant submits", async ({ page, request }) => {
    const event = await createTestEvent(request);
    const eventData = await getEventByJoinCode(request, event.join_code);
    const email = `dashboard-voter-${Date.now()}@test.com`;

    await request.post(`/api/events/${eventData.id}/submissions`, {
      data: { email, rankings: [eventData.options[0].id] },
    });

    await goToAdminDashboard(page, event.id, event.admin_token);

    await expect(page.getByText(email)).toBeVisible({ timeout: 5_000 });
  });

  test("can close the event", async ({ page, request }) => {
    const event = await createTestEvent(request, { title: "Close Event Test" });

    await goToAdminDashboard(page, event.id, event.admin_token);

    await page.getByRole("button", { name: /close submissions/i }).click();

    await expect(page.getByText("closed")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /reopen/i })).toBeVisible();
  });

  test("can reopen a closed event", async ({ page, request }) => {
    const event = await createTestEvent(request);

    // Close it first via API
    await request.patch(`/api/events/${event.id}/admin`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
      data: { status: "closed" },
    });

    await goToAdminDashboard(page, event.id, event.admin_token);
    await expect(page.getByText("closed")).toBeVisible();

    await page.getByRole("button", { name: /reopen/i }).click();

    await expect(page.getByText("open")).toBeVisible({ timeout: 5_000 });
  });

  test("run allocation button only appears when event is closed", async ({ page, request }) => {
    const event = await createTestEvent(request);

    await goToAdminDashboard(page, event.id, event.admin_token);

    // Should NOT be visible when open
    await expect(page.getByRole("button", { name: /run allocation/i })).not.toBeVisible();

    // Close it
    await page.getByRole("button", { name: /close submissions/i }).click();
    await expect(page.getByText("closed")).toBeVisible({ timeout: 5_000 });

    // Now should be visible
    await expect(page.getByRole("button", { name: /run allocation/i })).toBeVisible();
  });

  test("can delete a submission", async ({ page, request }) => {
    const event = await createTestEvent(request);
    const eventData = await getEventByJoinCode(request, event.join_code);
    const email = `delete-me-${Date.now()}@test.com`;

    await request.post(`/api/events/${eventData.id}/submissions`, {
      data: { email, rankings: [eventData.options[0].id] },
    });

    await goToAdminDashboard(page, event.id, event.admin_token);
    await expect(page.getByText(email)).toBeVisible();

    // Intercept the confirm dialog
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /delete/i }).first().click();

    await expect(page.getByText(email)).not.toBeVisible({ timeout: 5_000 });
  });
});
