import { describe, it, expect } from "vitest";
import { generateJoinCode, generateToken, hashToken } from "@/lib/utils";

const ALLOWED_CHARS = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
const FORBIDDEN_CHARS = ["I", "O", "0", "1"];

describe("generateJoinCode", () => {
  it("returns a string in XXXX-XXXX format", () => {
    const code = generateJoinCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("is exactly 9 characters long (4 + dash + 4)", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(9);
  });

  it("contains only allowed characters (no I, O, 0, or 1)", () => {
    // Generate many codes to increase confidence
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode().replace("-", "");
      for (const char of code) {
        expect(ALLOWED_CHARS.has(char)).toBe(true);
      }
      for (const forbidden of FORBIDDEN_CHARS) {
        expect(code).not.toContain(forbidden);
      }
    }
  });

  it("has a dash at position 4", () => {
    const code = generateJoinCode();
    expect(code[4]).toBe("-");
  });

  it("generates unique codes across many calls", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateJoinCode()));
    // With 32^8 ≈ 10^12 possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});

describe("generateToken", () => {
  it("returns a 64-character hex string (32 bytes)", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens across many calls", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
    expect(tokens.size).toBe(100);
  });

  it("returns only lowercase hex characters", () => {
    const token = generateToken();
    expect(token).toBe(token.toLowerCase());
  });
});

describe("hashToken", () => {
  it("returns a 64-character hex string (SHA-256 output)", () => {
    const hash = hashToken("some-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input always produces same output", () => {
    const token = "test-token-123";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("is sensitive to input — differs by a single character", () => {
    expect(hashToken("abcdef")).not.toBe(hashToken("abcdeF"));
  });

  it("handles empty string input", () => {
    const hash = hashToken("");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the known SHA-256 of 'abc'", () => {
    // SHA-256("abc") as computed by this system's crypto library
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
