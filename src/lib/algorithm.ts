import type { Option, Submission } from "./types";

export interface AllocationResult {
  /** submission_id → option_id mapping for assigned participants */
  assignments: Map<string, string>;
  /** submission_ids of participants who could not be assigned */
  unassigned: string[];
}

/**
 * Serial Dictatorship allocation algorithm.
 *
 * Participants are processed in FCFS order (by submitted_at).
 * Each participant is assigned their highest-ranked option that
 * still has remaining capacity. If no ranked option has capacity,
 * the participant is left unassigned.
 *
 * Properties: strategy-proof, deterministic, Pareto efficient.
 */
export function serialDictatorship(
  options: Option[],
  submissions: Submission[]
): AllocationResult {
  // Build capacity map: option_id → remaining capacity
  const remaining = new Map<string, number>();
  for (const opt of options) {
    remaining.set(opt.id, opt.capacity);
  }

  // Sort submissions by submitted_at ascending (FCFS)
  const sorted = [...submissions].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
  );

  const assignments = new Map<string, string>();
  const unassigned: string[] = [];

  for (const sub of sorted) {
    let assigned = false;

    for (const optionId of sub.rankings) {
      const cap = remaining.get(optionId);
      if (cap !== undefined && cap > 0) {
        assignments.set(sub.id, optionId);
        remaining.set(optionId, cap - 1);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      unassigned.push(sub.id);
    }
  }

  return { assignments, unassigned };
}
