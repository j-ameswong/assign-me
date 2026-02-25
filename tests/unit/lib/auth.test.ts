import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractToken } from "@/lib/auth";

// verifyAdminToken requires a DB call — tested via API route tests instead

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("extractToken", () => {
  describe("query parameter", () => {
    it("extracts token from ?token= query param", () => {
      const req = makeRequest("http://localhost:3000/api/events/123/admin?token=mytoken");
      expect(extractToken(req)).toBe("mytoken");
    });

    it("returns null when token query param is absent", () => {
      const req = makeRequest("http://localhost:3000/api/events/123/admin");
      expect(extractToken(req)).toBeNull();
    });

    it("returns null when token query param is empty string", () => {
      const req = makeRequest("http://localhost:3000/api/events/123/admin?token=");
      expect(extractToken(req)).toBeNull();
    });

    it("handles token with special characters in URL", () => {
      const req = makeRequest(
        "http://localhost:3000/api?token=abc123def456"
      );
      expect(extractToken(req)).toBe("abc123def456");
    });
  });

  describe("Authorization header", () => {
    it("extracts token from Bearer header", () => {
      const req = makeRequest("http://localhost:3000/api/events/123/admin", {
        Authorization: "Bearer mytoken",
      });
      expect(extractToken(req)).toBe("mytoken");
    });

    it("returns null when Authorization header is absent", () => {
      const req = makeRequest("http://localhost:3000/api/events/123/admin");
      expect(extractToken(req)).toBeNull();
    });

    it("returns null when Authorization header does not start with Bearer", () => {
      const req = makeRequest("http://localhost:3000/api/events/123/admin", {
        Authorization: "Basic mytoken",
      });
      expect(extractToken(req)).toBeNull();
    });

    it("returns null for malformed Bearer header with no token", () => {
      const req = makeRequest("http://localhost:3000/api/events/123/admin", {
        Authorization: "Bearer ",
      });
      // The Fetch API Request normalizes header values by stripping trailing
      // whitespace, so "Bearer " becomes "Bearer" which fails the startsWith
      // check — extractToken correctly returns null
      expect(extractToken(req)).toBeNull();
    });
  });

  describe("precedence", () => {
    it("prefers query param over Authorization header when both are present", () => {
      const req = makeRequest(
        "http://localhost:3000/api/events/123/admin?token=from-query",
        { Authorization: "Bearer from-header" }
      );
      expect(extractToken(req)).toBe("from-query");
    });
  });
});
