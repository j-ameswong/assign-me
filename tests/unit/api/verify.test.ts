import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/events/[id]/verify/route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

import { supabaseAdmin } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

const EVENT_ID = "evt-123";
const SUB_ID = "sub-456";
const routeContext = { params: Promise.resolve({ id: EVENT_ID }) };

const openEvent = { id: EVENT_ID, status: "open", email_verification: true, title: "Test Event" };
const closedEvent = { ...openEvent, status: "closed" };
const noVerifyEvent = { ...openEvent, email_verification: false };

function makeChain(result: { data?: unknown; error?: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
}

function postRequest(body: unknown): Request {
  return new Request(`http://localhost:3000/api/events/${EVENT_ID}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/events/[id]/verify", () => {
  beforeEach(() => {
    vi.mocked(supabaseAdmin.from).mockReset();
  });

  describe("common validation", () => {
    it("returns 400 for invalid JSON", async () => {
      const req = new Request(`http://localhost:3000/api/events/${EVENT_ID}/verify`, {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req, routeContext);
      expect(res.status).toBe(400);
    });

    it("returns 404 when event does not exist", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: null, error: { message: "not found" } }) as ReturnType<typeof makeChain>
      );
      const res = await POST(postRequest({ email: "a@test.com" }), routeContext);
      expect(res.status).toBe(404);
    });

    it("returns 400 when event is closed", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: closedEvent, error: null }) as ReturnType<typeof makeChain>
      );
      const res = await POST(postRequest({ email: "a@test.com" }), routeContext);
      expect(res.status).toBe(400);
    });

    it("returns 400 when email_verification is disabled on the event", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: noVerifyEvent, error: null }) as ReturnType<typeof makeChain>
      );
      const res = await POST(postRequest({ email: "a@test.com" }), routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("not enabled") });
    });

    it("returns 400 for unrecognised body shape (no email, no submission_id)", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>
      );
      const res = await POST(postRequest({ unexpected: "field" }), routeContext);
      expect(res.status).toBe(400);
    });
  });

  describe("send mode ({ email })", () => {
    it("returns 400 for malformed email", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>
      );
      const res = await POST(postRequest({ email: "bad-email" }), routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Valid email is required" });
    });

    it("returns 409 when a verified submission already exists for this email", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: { id: SUB_ID, verified: true }, error: null }) as ReturnType<typeof makeChain>);

      const res = await POST(postRequest({ email: "a@test.com" }), routeContext);
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("already submitted") });
    });

    it("creates a new submission and returns submission_id for a new email", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)           // fetch event
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>)              // no existing submission
        .mockReturnValueOnce(makeChain({ data: { id: SUB_ID }, error: null }) as ReturnType<typeof makeChain>)    // insert submission
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>);             // insert code

      const res = await POST(postRequest({ email: "new@test.com" }), routeContext);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("submission_id", SUB_ID);
    });

    it("reuses existing unverified submission and returns its id", async () => {
      const existingUnverified = { id: SUB_ID, verified: false };
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: existingUnverified, error: null }) as ReturnType<typeof makeChain>) // existing unverified
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>)              // delete old codes
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>);             // insert new code

      const res = await POST(postRequest({ email: "existing@test.com" }), routeContext);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.submission_id).toBe(SUB_ID);
    });
  });

  describe("confirm mode ({ submission_id, code })", () => {
    const futureExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const pastExpiry = new Date(Date.now() - 1000).toISOString();

    it("returns 404 when no verification code exists for the submission", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>); // no code

      const res = await POST(postRequest({ submission_id: SUB_ID, code: "123456" }), routeContext);
      expect(res.status).toBe(404);
    });

    it("returns 400 when the verification code has expired", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: { code: "123456", expires_at: pastExpiry }, error: null }) as ReturnType<typeof makeChain>);

      const res = await POST(postRequest({ submission_id: SUB_ID, code: "123456" }), routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("expired") });
    });

    it("returns 400 for an incorrect code", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: { code: "111111", expires_at: futureExpiry }, error: null }) as ReturnType<typeof makeChain>);

      const res = await POST(postRequest({ submission_id: SUB_ID, code: "999999" }), routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("Incorrect") });
    });

    it("returns { verified: true } for correct, unexpired code", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)               // fetch event
        .mockReturnValueOnce(makeChain({ data: { code: "123456", expires_at: futureExpiry }, error: null }) as ReturnType<typeof makeChain>) // fetch code
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>)                    // mark verified
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>);                   // delete codes

      const res = await POST(postRequest({ submission_id: SUB_ID, code: "123456" }), routeContext);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ verified: true });
    });

    it("trims whitespace from the code before comparing", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: openEvent, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: { code: "123456", expires_at: futureExpiry }, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>);

      const res = await POST(postRequest({ submission_id: SUB_ID, code: " 123456 " }), routeContext);
      expect(res.status).toBe(200);
    });
  });
});
