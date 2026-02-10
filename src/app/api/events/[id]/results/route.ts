import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractToken, verifyAdminToken } from "@/lib/auth";

export async function GET(
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

  if (event.status !== "allocated") {
    return NextResponse.json(
      { error: "Allocation has not been run yet" },
      { status: 400 }
    );
  }

  // Fetch allocations with submission emails and option names
  const { data: allocations, error: allocErr } = await supabaseAdmin
    .from("allocations")
    .select("id, option_id, submissions(id, email), options(id, name)")
    .eq("event_id", eventId);

  if (allocErr) {
    return NextResponse.json(
      { error: "Failed to fetch allocations" },
      { status: 500 }
    );
  }

  // Fetch all options for the event (to include empty ones)
  const { data: options } = await supabaseAdmin
    .from("options")
    .select("id, name, capacity")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  // Group allocations by option
  const byOption = new Map<string, { name: string; capacity: number; assigned: string[] }>();
  for (const opt of options ?? []) {
    byOption.set(opt.id, { name: opt.name, capacity: opt.capacity, assigned: [] });
  }

  const unassigned: string[] = [];

  for (const alloc of allocations ?? []) {
    const email = (alloc.submissions as unknown as { id: string; email: string })?.email;
    if (!alloc.option_id || !email) {
      if (email) unassigned.push(email);
      continue;
    }
    const group = byOption.get(alloc.option_id);
    if (group) {
      group.assigned.push(email);
    }
  }

  // Check if CSV format requested
  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (format === "csv") {
    const lines: string[] = ["Option,Participant"];
    for (const [, group] of byOption) {
      if (group.assigned.length === 0) {
        lines.push(`"${group.name}",`);
      } else {
        for (const email of group.assigned) {
          lines.push(`"${group.name}","${email}"`);
        }
      }
    }
    if (unassigned.length > 0) {
      for (const email of unassigned) {
        lines.push(`"(Unassigned)","${email}"`);
      }
    }

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${event.title} - Results.csv"`,
      },
    });
  }

  // JSON response
  const grouped = Array.from(byOption.entries()).map(([optionId, group]) => ({
    option_id: optionId,
    option_name: group.name,
    capacity: group.capacity,
    assigned: group.assigned,
  }));

  return NextResponse.json({ options: grouped, unassigned });
}
