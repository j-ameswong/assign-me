import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractToken, verifyAdminToken } from "@/lib/auth";
import { serialDictatorship } from "@/lib/algorithm";
import type { Option, Submission } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const token = extractToken(request);

  if (!token) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }

  const event = await verifyAdminToken(eventId, token);
  if (!event) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  // Event must be closed to run allocation
  if (event.status !== "closed") {
    const msg =
      event.status === "open"
        ? "Close submissions before running the allocation"
        : "Allocation has already been run";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Fetch options
  const { data: options, error: optErr } = await supabaseAdmin
    .from("options")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (optErr || !options || options.length === 0) {
    return NextResponse.json(
      { error: "No options found for this event" },
      { status: 400 }
    );
  }

  // Fetch submissions (FCFS order)
  const { data: submissions, error: subErr } = await supabaseAdmin
    .from("submissions")
    .select("*")
    .eq("event_id", eventId)
    .order("submitted_at", { ascending: true });

  if (subErr) {
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }

  if (!submissions || submissions.length === 0) {
    return NextResponse.json(
      { error: "No submissions to allocate" },
      { status: 400 }
    );
  }

  // Run algorithm
  const result = serialDictatorship(
    options as Option[],
    submissions as Submission[]
  );

  // Build allocation rows
  const rows = [
    // Assigned participants
    ...Array.from(result.assignments.entries()).map(([subId, optId]) => ({
      event_id: eventId,
      submission_id: subId,
      option_id: optId,
    })),
    // Unassigned participants
    ...result.unassigned.map((subId) => ({
      event_id: eventId,
      submission_id: subId,
      option_id: null,
    })),
  ];

  // Insert allocations
  const { error: insertErr } = await supabaseAdmin
    .from("allocations")
    .insert(rows);

  if (insertErr) {
    return NextResponse.json(
      { error: "Failed to save allocations" },
      { status: 500 }
    );
  }

  // Update event status to "allocated"
  const { error: updateErr } = await supabaseAdmin
    .from("events")
    .update({ status: "allocated" })
    .eq("id", eventId);

  if (updateErr) {
    return NextResponse.json(
      { error: "Allocations saved but failed to update event status" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    assigned: result.assignments.size,
    unassigned: result.unassigned.length,
    total: submissions.length,
  });
}
