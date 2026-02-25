import { type Page, type APIRequestContext } from "@playwright/test";

export interface CreatedEvent {
  id: string;
  join_code: string;
  admin_token: string;
  admin_url: string;
}

/** Create a test event via the API and return its details. */
export async function createTestEvent(
  request: APIRequestContext,
  overrides: {
    title?: string;
    email_verification?: boolean;
    options?: { name: string; capacity?: number }[];
  } = {}
): Promise<CreatedEvent> {
  const res = await request.post("/api/events", {
    data: {
      title: overrides.title ?? `Test Event ${Date.now()}`,
      description: "Created by E2E test",
      email_verification: overrides.email_verification ?? false,
      options: overrides.options ?? [
        { name: "Option A", capacity: 2 },
        { name: "Option B", capacity: 1 },
      ],
    },
  });

  if (!res.ok()) {
    throw new Error(`Failed to create test event: ${await res.text()}`);
  }

  return res.json();
}

/** Submit rankings for a participant via the API. */
export async function submitRankings(
  request: APIRequestContext,
  eventId: string,
  email: string,
  rankings: string[]
): Promise<void> {
  const res = await request.post(`/api/events/${eventId}/submissions`, {
    data: { email, rankings },
  });

  if (!res.ok()) {
    throw new Error(`Failed to submit rankings: ${await res.text()}`);
  }
}

/** Fetch options for an event by join code. */
export async function getEventByJoinCode(
  request: APIRequestContext,
  joinCode: string
): Promise<{ id: string; options: { id: string; name: string }[] }> {
  const res = await request.get(`/api/events/join/${joinCode}`);
  if (!res.ok()) throw new Error(`Failed to fetch event: ${await res.text()}`);
  return res.json();
}

/** Close an event via the admin PATCH endpoint. */
export async function closeEvent(
  request: APIRequestContext,
  eventId: string,
  token: string
): Promise<void> {
  const res = await request.patch(`/api/events/${eventId}/admin`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: "closed" },
  });
  if (!res.ok()) throw new Error(`Failed to close event: ${await res.text()}`);
}

/** Run allocation via the admin endpoint. */
export async function runAllocation(
  request: APIRequestContext,
  eventId: string,
  token: string
): Promise<{ assigned: number; unassigned: number }> {
  const res = await request.post(`/api/events/${eventId}/allocate`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) throw new Error(`Failed to run allocation: ${await res.text()}`);
  return res.json();
}

/** Navigate to the admin dashboard and wait for it to load. */
export async function goToAdminDashboard(
  page: Page,
  eventId: string,
  token: string
): Promise<void> {
  await page.goto(`/event/${eventId}/admin?token=${token}`);
  await page.waitForSelector("h1");
}
