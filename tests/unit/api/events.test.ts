import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/events/route";

// ── Mock Supabase ─────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

// Mock utils so we control token/code values in assertions
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    generateJoinCode: vi.fn().mockReturnValue("ABCD-1234"),
    generateToken: vi.fn().mockReturnValue("raw-token-abc"),
    hashToken: vi.fn().mockReturnValue("hashed-token-abc"),
  };
});

import { supabaseAdmin } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(result: { data?: unknown; error?: unknown }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  title: "Test Event",
  description: "A description",
  email_verification: false,
  options: [{ name: "Option A", capacity: 2 }, { name: "Option B" }],
};

const createdEvent = { id: "evt-123", join_code: "ABCD-1234" };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/events", () => {
  beforeEach(() => {
    vi.mocked(supabaseAdmin.from).mockReset();
  });

  describe("validation", () => {
    it("returns 400 for invalid JSON", async () => {
      const req = new Request("http://localhost:3000/api/events", {
        method: "POST",
        body: "not-json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Invalid JSON" });
    });

    it("returns 400 when title is missing", async () => {
      const res = await POST(postRequest({ options: [{ name: "A" }] }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Title is required" });
    });

    it("returns 400 when title is empty string", async () => {
      const res = await POST(postRequest({ title: "   ", options: [{ name: "A" }] }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Title is required" });
    });

    it("returns 400 when options array is missing", async () => {
      const res = await POST(postRequest({ title: "Event" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "At least one option is required" });
    });

    it("returns 400 when options array is empty", async () => {
      const res = await POST(postRequest({ title: "Event", options: [] }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "At least one option is required" });
    });

    it("returns 400 when an option has no name", async () => {
      const res = await POST(postRequest({ title: "Event", options: [{ name: "" }] }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Each option must have a name" });
    });

    it("returns 400 when an option has capacity less than 1", async () => {
      const res = await POST(postRequest({ title: "Event", options: [{ name: "A", capacity: 0 }] }));
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ error: "Option capacity must be at least 1" });
    });

    it("returns 400 for negative capacity", async () => {
      const res = await POST(postRequest({ title: "Event", options: [{ name: "A", capacity: -1 }] }));
      expect(res.status).toBe(400);
    });
  });

  describe("success", () => {
    it("returns 201 with join_code, admin_token, and admin_url", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: createdEvent, error: null }) as ReturnType<typeof makeChain>)   // event insert
        .mockReturnValueOnce(makeChain({ data: [], error: null }) as ReturnType<typeof makeChain>);            // options insert

      const res = await POST(postRequest(validBody));
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.join_code).toBe("ABCD-1234");
      expect(body.admin_token).toBe("raw-token-abc");
      expect(body.admin_url).toContain("evt-123");
      expect(body.admin_url).toContain("raw-token-abc");
    });

    it("does not expose the hashed token in the response", async () => {
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: createdEvent, error: null }) as ReturnType<typeof makeChain>)
        .mockReturnValueOnce(makeChain({ data: [], error: null }) as ReturnType<typeof makeChain>);

      const res = await POST(postRequest(validBody));
      const body = await res.json();

      expect(body.admin_token).toBe("raw-token-abc");
      expect(body.admin_token).not.toBe("hashed-token-abc");
    });
  });

  describe("database errors", () => {
    it("returns 500 when event insertion fails", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValueOnce(
        makeChain({ data: null, error: { message: "DB error" } }) as ReturnType<typeof makeChain>
      );

      const res = await POST(postRequest(validBody));
      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ error: "Failed to create event" });
    });

    it("returns 500 and cleans up event when options insertion fails", async () => {
      const deleteMock = makeChain({ data: null, error: null });
      vi.mocked(supabaseAdmin.from)
        .mockReturnValueOnce(makeChain({ data: createdEvent, error: null }) as ReturnType<typeof makeChain>)   // event insert ok
        .mockReturnValueOnce(makeChain({ data: null, error: { message: "fail" } }) as ReturnType<typeof makeChain>) // options fail
        .mockReturnValueOnce(deleteMock as ReturnType<typeof makeChain>);                                       // cleanup delete

      const res = await POST(postRequest(validBody));

      expect(res.status).toBe(500);
      expect(await res.json()).toMatchObject({ error: "Failed to create options" });
      expect(deleteMock.delete).toHaveBeenCalled();
    });
  });
});
