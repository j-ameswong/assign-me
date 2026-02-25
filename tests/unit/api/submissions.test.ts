import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/events/[id]/submissions/route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  extractToken: vi.fn().mockReturnValue("valid-token"),
  verifyAdminToken: vi.fn().mockResolvedValue({ id: "evt-1", status: "open", email_verification: false }),
}));

import { supabaseAdmin } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

const OPT_A = "opt-a-uuid";
const OPT_B = "opt-b-uuid";
const EVENT_ID = "evt-123";

function makeChain(result: { data?: unknown; error?: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
}

function postRequest(body: unknown): Request {
  return new Request(`http://localhost:3000/api/events/${EVENT_ID}/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routeContext = { params: Promise.resolve({ id: EVENT_ID }) };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/events/[id]/submissions", () => {
  beforeEach(() => {
    vi.mocked(supabaseAdmin.from).mockReset();
  });

  describe("input validation", () => {
    it("returns 400 for invalid JSON", async () => {
      const req = new Request(`http://localhost:3000/api/events/${EVENT_ID}/submissions`, {
        method: "POST",
        body: "bad",
      });
      const res = await POST(req, routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Invalid JSON" });
    });

    it("returns 400 for missing email", async () => {
      const res = await POST(postRequest({ rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Valid email is required" });
    });

    it("returns 400 for malformed email", async () => {
      const res = await POST(postRequest({ email: "not-an-email", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty rankings array", async () => {
      const res = await POST(postRequest({ email: "a@test.com", rankings: [] }), routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("non-empty") });
    });

    it("returns 400 for missing rankings", async () => {
      const res = await POST(postRequest({ email: "a@test.com" }), routeContext);
      expect(res.status).toBe(400);
    });
  });

  describe("event validation", () => {
    it("returns 404 when event is not found", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: null, error: { message: "not found" } }) as ReturnType<typeof makeChain>
      );

      const res = await POST(postRequest({ email: "a@test.com", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(404);
    });

    it("returns 400 when event is closed", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: { id: EVENT_ID, status: "closed", email_verification: false }, error: null }) as ReturnType<typeof makeChain>
      );

      const res = await POST(postRequest({ email: "a@test.com", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("no longer accepting") });
    });

    it("returns 400 when event is allocated", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        makeChain({ data: { id: EVENT_ID, status: "allocated", email_verification: false }, error: null }) as ReturnType<typeof makeChain>
      );

      const res = await POST(postRequest({ email: "a@test.com", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(400);
    });
  });

  describe("option validation", () => {
    beforeEach(() => {
      // First call: fetch event (open, no verification)
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(
          makeChain({ data: { id: EVENT_ID, status: "open", email_verification: false }, error: null }) as ReturnType<typeof makeChain>
        );
    });

    it("returns 400 when ranking contains an invalid option ID", async () => {
      // Second call: fetch options
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        ...makeChain({ data: [{ id: OPT_A }], error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: OPT_A }], error: null }).then(resolve),
      } as ReturnType<typeof makeChain>);

      const res = await POST(
        postRequest({ email: "a@test.com", rankings: ["totally-fake-id"] }),
        routeContext
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("Invalid option ID") });
    });

    it("returns 400 for duplicate option IDs in rankings", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
        ...makeChain({ data: [{ id: OPT_A }], error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: OPT_A }], error: null }).then(resolve),
      } as ReturnType<typeof makeChain>);

      const res = await POST(
        postRequest({ email: "a@test.com", rankings: [OPT_A, OPT_A] }),
        routeContext
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("duplicate") });
    });
  });

  describe("duplicate submission", () => {
    it("returns 409 for duplicate email (unique constraint violation)", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: { id: EVENT_ID, status: "open", email_verification: false }, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce({
          ...makeChain({ data: [{ id: OPT_A }], error: null }),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: OPT_A }], error: null }).then(resolve),
        } as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: null, error: { code: "23505" } }) as ReturnType<typeof makeChain>);

      const res = await POST(postRequest({ email: "a@test.com", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("already exists") });
    });
  });

  describe("email verification gating", () => {
    it("returns 403 when event requires verification but no verified submission exists", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: { id: EVENT_ID, status: "open", email_verification: true }, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce({
          ...makeChain({ data: [{ id: OPT_A }], error: null }),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: OPT_A }], error: null }).then(resolve),
        } as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>); // no existing submission

      const res = await POST(postRequest({ email: "a@test.com", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ error: expect.stringContaining("verify your email") });
    });

    it("returns 403 when submission exists but is not verified", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: { id: EVENT_ID, status: "open", email_verification: true }, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce({
          ...makeChain({ data: [{ id: OPT_A }], error: null }),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: OPT_A }], error: null }).then(resolve),
        } as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: { id: "sub-1", verified: false, submitted_at: "2024-01-01" }, error: null }) as ReturnType<typeof makeChain>);

      const res = await POST(postRequest({ email: "a@test.com", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(403);
    });

    it("returns 200 and updates rankings when verified submission exists", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: { id: EVENT_ID, status: "open", email_verification: true }, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce({
          ...makeChain({ data: [{ id: OPT_A }], error: null }),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: OPT_A }], error: null }).then(resolve),
        } as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: { id: "sub-1", verified: true, submitted_at: "2024-01-01" }, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: null, error: null }) as ReturnType<typeof makeChain>); // update

      const res = await POST(postRequest({ email: "a@test.com", rankings: [OPT_A] }), routeContext);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.verified).toBe(true);
    });
  });
});
