import { describe, it, expect } from "vitest";
import { serialDictatorship } from "@/lib/algorithm";
import type { Option, Submission } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOption(id: string, capacity: number): Option {
  return { id, event_id: "evt", name: id, description: null, capacity, sort_order: 0 };
}

function makeSubmission(
  id: string,
  rankings: string[],
  submittedAt: string = "2024-01-01T00:00:00Z"
): Submission {
  return { id, event_id: "evt", email: `${id}@test.com`, rankings, verified: true, submitted_at: submittedAt };
}

// ── Basic assignment ──────────────────────────────────────────────────────────

describe("serialDictatorship", () => {
  it("assigns a single participant to their first choice", () => {
    const options = [makeOption("opt-a", 1)];
    const submissions = [makeSubmission("s1", ["opt-a"])];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.get("s1")).toBe("opt-a");
    expect(unassigned).toHaveLength(0);
  });

  it("assigns participants to first available choice", () => {
    const options = [makeOption("opt-a", 1), makeOption("opt-b", 1)];
    const submissions = [
      makeSubmission("s1", ["opt-a", "opt-b"], "2024-01-01T00:00:00Z"),
      makeSubmission("s2", ["opt-a", "opt-b"], "2024-01-01T00:01:00Z"),
    ];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.get("s1")).toBe("opt-a");
    expect(assignments.get("s2")).toBe("opt-b"); // opt-a full, falls back to opt-b
    expect(unassigned).toHaveLength(0);
  });

  it("marks participant as unassigned when all ranked options are full", () => {
    const options = [makeOption("opt-a", 1)];
    const submissions = [
      makeSubmission("s1", ["opt-a"], "2024-01-01T00:00:00Z"),
      makeSubmission("s2", ["opt-a"], "2024-01-01T00:01:00Z"),
    ];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.get("s1")).toBe("opt-a");
    expect(unassigned).toContain("s2");
  });

  // ── FCFS ordering ─────────────────────────────────────────────────────────

  it("processes submissions in ascending submitted_at order regardless of input order", () => {
    const options = [makeOption("opt-a", 1)];
    // s2 submitted later — passed first in array, should still lose to s1
    const submissions = [
      makeSubmission("s2", ["opt-a"], "2024-01-01T00:02:00Z"),
      makeSubmission("s1", ["opt-a"], "2024-01-01T00:01:00Z"),
    ];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.get("s1")).toBe("opt-a");
    expect(unassigned).toContain("s2");
  });

  it("breaks ties by earlier submitted_at timestamp", () => {
    const options = [makeOption("opt-a", 1), makeOption("opt-b", 1)];
    const submissions = [
      makeSubmission("s-late", ["opt-a", "opt-b"], "2024-01-01T12:00:00Z"),
      makeSubmission("s-early", ["opt-a", "opt-b"], "2024-01-01T08:00:00Z"),
    ];

    const { assignments } = serialDictatorship(options, submissions);

    expect(assignments.get("s-early")).toBe("opt-a");
    expect(assignments.get("s-late")).toBe("opt-b");
  });

  // ── Capacity ──────────────────────────────────────────────────────────────

  it("respects option capacity greater than 1", () => {
    const options = [makeOption("opt-a", 3)];
    const submissions = [
      makeSubmission("s1", ["opt-a"], "2024-01-01T00:00:00Z"),
      makeSubmission("s2", ["opt-a"], "2024-01-01T00:01:00Z"),
      makeSubmission("s3", ["opt-a"], "2024-01-01T00:02:00Z"),
      makeSubmission("s4", ["opt-a"], "2024-01-01T00:03:00Z"),
    ];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.get("s1")).toBe("opt-a");
    expect(assignments.get("s2")).toBe("opt-a");
    expect(assignments.get("s3")).toBe("opt-a");
    expect(unassigned).toContain("s4"); // 4th participant — capacity exhausted
  });

  it("fills options independently up to their respective capacities", () => {
    const options = [makeOption("opt-a", 2), makeOption("opt-b", 2)];
    const submissions = Array.from({ length: 5 }, (_, i) =>
      makeSubmission(`s${i + 1}`, ["opt-a", "opt-b"], `2024-01-01T00:0${i}:00Z`)
    );

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    const assigned = Array.from(assignments.values());
    const optA = assigned.filter((v) => v === "opt-a");
    const optB = assigned.filter((v) => v === "opt-b");

    expect(optA).toHaveLength(2);
    expect(optB).toHaveLength(2);
    expect(unassigned).toHaveLength(1);
  });

  // ── Rankings preference ───────────────────────────────────────────────────

  it("assigns first-ranked choice when available, not second", () => {
    const options = [makeOption("opt-a", 1), makeOption("opt-b", 1)];
    const submissions = [makeSubmission("s1", ["opt-b", "opt-a"])];

    const { assignments } = serialDictatorship(options, submissions);

    expect(assignments.get("s1")).toBe("opt-b"); // ranked first, available
  });

  it("skips ranked options with zero remaining capacity", () => {
    const options = [makeOption("opt-a", 1), makeOption("opt-b", 1)];
    const submissions = [
      makeSubmission("s1", ["opt-a"], "2024-01-01T00:00:00Z"),
      makeSubmission("s2", ["opt-a", "opt-b"], "2024-01-01T00:01:00Z"),
    ];

    const { assignments } = serialDictatorship(options, submissions);

    expect(assignments.get("s2")).toBe("opt-b"); // opt-a full, falls back
  });

  it("ignores option IDs in rankings that are not in the options list", () => {
    const options = [makeOption("opt-a", 1)];
    const submissions = [makeSubmission("s1", ["unknown-id", "opt-a"])];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.get("s1")).toBe("opt-a");
    expect(unassigned).toHaveLength(0);
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it("returns empty results for no submissions", () => {
    const options = [makeOption("opt-a", 1)];
    const { assignments, unassigned } = serialDictatorship(options, []);

    expect(assignments.size).toBe(0);
    expect(unassigned).toHaveLength(0);
  });

  it("returns empty results for no options", () => {
    const submissions = [makeSubmission("s1", [])];
    const { assignments, unassigned } = serialDictatorship([], submissions);

    expect(assignments.size).toBe(0);
    expect(unassigned).toContain("s1");
  });

  it("marks participant with empty rankings as unassigned", () => {
    const options = [makeOption("opt-a", 1)];
    const submissions = [makeSubmission("s1", [])];

    const { unassigned } = serialDictatorship(options, submissions);

    expect(unassigned).toContain("s1");
  });

  it("does not mutate the original submissions array order", () => {
    const options = [makeOption("opt-a", 1)];
    const submissions = [
      makeSubmission("s2", ["opt-a"], "2024-01-01T00:02:00Z"),
      makeSubmission("s1", ["opt-a"], "2024-01-01T00:01:00Z"),
    ];
    const originalOrder = submissions.map((s) => s.id);

    serialDictatorship(options, submissions);

    expect(submissions.map((s) => s.id)).toEqual(originalOrder);
  });

  it("handles all participants being unassigned", () => {
    const options = [makeOption("opt-a", 1)];
    const submissions = [
      makeSubmission("s1", ["opt-a"], "2024-01-01T00:00:00Z"),
      makeSubmission("s2", ["opt-a"], "2024-01-01T00:01:00Z"),
      makeSubmission("s3", ["opt-a"], "2024-01-01T00:02:00Z"),
    ];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.size).toBe(1);
    expect(unassigned).toHaveLength(2);
    expect(unassigned).toContain("s2");
    expect(unassigned).toContain("s3");
  });

  it("handles multiple options all with capacity 0 (all unassigned)", () => {
    const options = [makeOption("opt-a", 0), makeOption("opt-b", 0)];
    const submissions = [makeSubmission("s1", ["opt-a", "opt-b"])];

    const { assignments, unassigned } = serialDictatorship(options, submissions);

    expect(assignments.size).toBe(0);
    expect(unassigned).toContain("s1");
  });

  // ── Return type ───────────────────────────────────────────────────────────

  it("returns a Map for assignments and an array for unassigned", () => {
    const options = [makeOption("opt-a", 1)];
    const submissions = [makeSubmission("s1", ["opt-a"])];

    const result = serialDictatorship(options, submissions);

    expect(result.assignments).toBeInstanceOf(Map);
    expect(Array.isArray(result.unassigned)).toBe(true);
  });
});
