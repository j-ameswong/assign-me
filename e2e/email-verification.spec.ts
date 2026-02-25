import { test, expect } from "@playwright/test";
import { createTestEvent } from "./helpers";

test.describe("Email Verification Flow", () => {
  test("join page shows Send Code button when event has email_verification enabled", async ({
    page,
    request,
  }) => {
    const event = await createTestEvent(request, { email_verification: true });

    await page.goto(`/join/${event.join_code}`);

    await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
  });

  test("join page does NOT show Send Code button when verification is disabled", async ({
    page,
    request,
  }) => {
    const event = await createTestEvent(request, { email_verification: false });

    await page.goto(`/join/${event.join_code}`);

    await expect(page.getByRole("button", { name: /send code/i })).not.toBeVisible();
  });

  test("submit button is disabled until email is verified", async ({ page, request }) => {
    const event = await createTestEvent(request, { email_verification: true });

    await page.goto(`/join/${event.join_code}`);

    const submitButton = page.getByRole("button", { name: /submit rankings/i });
    await expect(submitButton).toBeDisabled();

    // Add a ranking — button should still be disabled without verification
    await page.getByLabel(/your email/i).fill("voter@test.com");
    await page.getByRole("button", { name: /add/i }).first().click();

    await expect(submitButton).toBeDisabled();
  });

  test("requesting a code shows the dev inbox link and code input", async ({ page, request }) => {
    const event = await createTestEvent(request, { email_verification: true });

    await page.goto(`/join/${event.join_code}`);
    await page.getByLabel(/your email/i).fill(`verify-${Date.now()}@test.com`);
    await page.getByRole("button", { name: /send code/i }).click();

    await expect(page.getByText(/dev inbox/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("input[maxlength='6']")).toBeVisible();
  });

  test("entering wrong code shows an error", async ({ page, request }) => {
    const event = await createTestEvent(request, { email_verification: true });

    await page.goto(`/join/${event.join_code}`);
    await page.getByLabel(/your email/i).fill(`wrong-code-${Date.now()}@test.com`);
    await page.getByRole("button", { name: /send code/i }).click();

    await expect(page.locator("input[maxlength='6']")).toBeVisible({ timeout: 5_000 });
    await page.locator("input[maxlength='6']").fill("000000");
    await page.getByRole("button", { name: /^verify$/i }).click();

    await expect(page.getByText(/incorrect/i)).toBeVisible({ timeout: 5_000 });
  });

  test("full email verification flow: request code → dev inbox → verify → submit", async ({
    page,
    request,
  }) => {
    const event = await createTestEvent(request, {
      email_verification: true,
      options: [{ name: "Verified Slot", capacity: 5 }],
    });
    const email = `full-verify-${Date.now()}@test.com`;

    // Step 1: request code
    await page.goto(`/join/${event.join_code}`);
    await page.getByLabel(/your email/i).fill(email);
    await page.getByRole("button", { name: /send code/i }).click();
    await expect(page.locator("input[maxlength='6']")).toBeVisible({ timeout: 5_000 });

    // Step 2: get code from dev inbox API
    const inboxRes = await request.get("/api/dev/inbox");
    const inbox = await inboxRes.json();
    const emailEntry = inbox.emails.find(
      (e: { to: string; code: string }) => e.to === email
    );
    expect(emailEntry).toBeDefined();
    const code: string = emailEntry.code;

    // Step 3: enter code
    await page.locator("input[maxlength='6']").fill(code);
    await page.getByRole("button", { name: /^verify$/i }).click();
    await expect(page.getByText(/verified/i)).toBeVisible({ timeout: 5_000 });

    // Step 4: rank an option and submit
    await page.getByRole("button", { name: /add/i }).first().click();
    const submitButton = page.getByRole("button", { name: /submit rankings/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await page.waitForURL(/\/success/, { timeout: 10_000 });
    const body = await page.textContent("body");
    expect(body?.toLowerCase()).toMatch(/success|submitted|confirmed/);
  });

  test("dev inbox page shows pending verification codes", async ({ page, request }) => {
    const event = await createTestEvent(request, { email_verification: true });
    const email = `inbox-check-${Date.now()}@test.com`;

    // Request a code
    const joinPage = await request.get(`/join/${event.join_code}`);
    const eventRes = await request.get(`/api/events/join/${event.join_code}`);
    const eventData = await eventRes.json();

    await request.post(`/api/events/${eventData.id}/verify`, {
      data: { email },
    });

    // Check dev inbox page
    await page.goto("/dev/inbox");
    await expect(page.getByText(email)).toBeVisible({ timeout: 5_000 });
  });

  test("dev inbox API returns email with code and expiry", async ({ request }) => {
    const event = await createTestEvent(request, { email_verification: true });
    const email = `api-inbox-${Date.now()}@test.com`;

    const eventRes = await request.get(`/api/events/join/${event.join_code}`);
    const eventData = await eventRes.json();

    await request.post(`/api/events/${eventData.id}/verify`, {
      data: { email },
    });

    const inboxRes = await request.get("/api/dev/inbox");
    expect(inboxRes.ok()).toBe(true);

    const inbox = await inboxRes.json();
    const entry = inbox.emails.find((e: { to: string }) => e.to === email);

    expect(entry).toBeDefined();
    expect(entry.code).toMatch(/^\d{6}$/);
    expect(entry.expired).toBe(false);
    expect(entry.to).toBe(email);
    expect(entry.subject).toContain(event.join_code.split("-")[0]); // part of event title or code
  });
});
