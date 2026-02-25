import { test, expect } from "@playwright/test";
import {
  createTestEvent,
  getEventByJoinCode,
  submitRankings,
  closeEvent,
  goToAdminDashboard,
} from "./helpers";

test.describe("Allocation Flow", () => {
  test("full flow: submit → close → allocate → results", async ({ page, request }) => {
    const event = await createTestEvent(request, {
      title: "Full Allocation Test",
      options: [{ name: "Project A", capacity: 1 }, { name: "Project B", capacity: 1 }],
    });
    const eventData = await getEventByJoinCode(request, event.join_code);
    const [optA, optB] = eventData.options;

    // Two participants with opposing preferences
    await submitRankings(request, event.id, `first-${Date.now()}@test.com`, [optA.id, optB.id]);
    await submitRankings(request, event.id, `second-${Date.now()}@test.com`, [optA.id, optB.id]);

    // Close the event
    await closeEvent(request, event.id, event.admin_token);

    // Run allocation from the admin dashboard
    await goToAdminDashboard(page, event.id, event.admin_token);
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /run allocation/i }).click();

    // Should redirect to results page
    await page.waitForURL(/\/results/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /allocation results/i })).toBeVisible();
  });

  test("results page shows options with assigned participants", async ({ page, request }) => {
    const email = `result-voter-${Date.now()}@test.com`;
    const event = await createTestEvent(request, {
      title: "Results Display Test",
      options: [{ name: "Slot One", capacity: 2 }],
    });
    const eventData = await getEventByJoinCode(request, event.join_code);

    await submitRankings(request, event.id, email, [eventData.options[0].id]);
    await closeEvent(request, event.id, event.admin_token);

    // Allocate via API
    await request.post(`/api/events/${event.id}/allocate`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
    });

    // Navigate to results
    await page.goto(`/event/${event.id}/admin/results?token=${event.admin_token}`);

    await expect(page.getByText("Slot One")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(email)).toBeVisible();
  });

  test("unassigned participants appear in results when options are full", async ({ page, request }) => {
    const event = await createTestEvent(request, {
      title: "Unassigned Test",
      options: [{ name: "Limited Slot", capacity: 1 }],
    });
    const eventData = await getEventByJoinCode(request, event.join_code);
    const optId = eventData.options[0].id;
    const unassignedEmail = `unassigned-${Date.now()}@test.com`;

    await submitRankings(request, event.id, `winner-${Date.now()}@test.com`, [optId]);
    await submitRankings(request, event.id, unassignedEmail, [optId]);
    await closeEvent(request, event.id, event.admin_token);

    await request.post(`/api/events/${event.id}/allocate`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
    });

    await page.goto(`/event/${event.id}/admin/results?token=${event.admin_token}`);

    await expect(page.getByText(unassignedEmail)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/unassigned/i)).toBeVisible();
  });

  test("results page has Export CSV button", async ({ page, request }) => {
    const event = await createTestEvent(request, {
      options: [{ name: "A" }],
    });
    const eventData = await getEventByJoinCode(request, event.join_code);

    await submitRankings(request, event.id, `csv-${Date.now()}@test.com`, [eventData.options[0].id]);
    await closeEvent(request, event.id, event.admin_token);
    await request.post(`/api/events/${event.id}/allocate`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
    });

    await page.goto(`/event/${event.id}/admin/results?token=${event.admin_token}`);
    await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible({ timeout: 5_000 });
  });

  test("results page has Preview Emails link", async ({ page, request }) => {
    const event = await createTestEvent(request, { options: [{ name: "A" }] });
    const eventData = await getEventByJoinCode(request, event.join_code);

    await submitRankings(request, event.id, `email-prev-${Date.now()}@test.com`, [eventData.options[0].id]);
    await closeEvent(request, event.id, event.admin_token);
    await request.post(`/api/events/${event.id}/allocate`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
    });

    await page.goto(`/event/${event.id}/admin/results?token=${event.admin_token}`);
    await expect(page.getByRole("link", { name: /preview emails/i })).toBeVisible({ timeout: 5_000 });
  });

  test("cannot run allocation on an open event", async ({ request }) => {
    const event = await createTestEvent(request);

    const res = await request.post(`/api/events/${event.id}/allocate`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
    });

    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error).toMatch(/close/i);
  });

  test("cannot run allocation twice", async ({ request }) => {
    const event = await createTestEvent(request, { options: [{ name: "A" }] });
    const eventData = await getEventByJoinCode(request, event.join_code);

    await submitRankings(request, event.id, `double-${Date.now()}@test.com`, [eventData.options[0].id]);
    await closeEvent(request, event.id, event.admin_token);
    await request.post(`/api/events/${event.id}/allocate`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
    });

    // Second attempt
    const res = await request.post(`/api/events/${event.id}/allocate`, {
      headers: { Authorization: `Bearer ${event.admin_token}` },
    });

    expect(res.ok()).toBe(false);
    const body = await res.json();
    expect(body.error).toMatch(/already been run/i);
  });
});
