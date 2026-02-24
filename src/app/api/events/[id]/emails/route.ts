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

  const { data: allocations, error: allocErr } = await supabaseAdmin
    .from("allocations")
    .select("option_id, submissions(email), options(name)")
    .eq("event_id", eventId);

  if (allocErr) {
    return NextResponse.json(
      { error: "Failed to fetch allocations" },
      { status: 500 }
    );
  }

  const emails = (allocations ?? [])
    .filter((a) => (a.submissions as { email: string } | null)?.email)
    .map((a) => {
      const email = (a.submissions as { email: string }).email;
      const optionName = a.option_id
        ? ((a.options as { name: string } | null)?.name ?? null)
        : null;

      const subject = `Your allocation result for "${event.title}"`;
      const html = optionName
        ? `<p>Good news! You have been allocated to <strong>${optionName}</strong> for the event <em>${event.title}</em>.</p>`
        : `<p>Unfortunately, you were not allocated to any option for the event <em>${event.title}</em>.</p>`;

      return { to: email, subject, html, assigned: !!optionName };
    });

  return NextResponse.json({ emails });
}
