import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractToken, verifyAdminToken } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = extractToken(request);

  if (!token) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }

  const event = await verifyAdminToken(id, token);
  if (!event) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  // Fetch options
  const { data: options } = await supabaseAdmin
    .from("options")
    .select("*")
    .eq("event_id", id)
    .order("sort_order", { ascending: true });

  // Get submission count
  const { count } = await supabaseAdmin
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("event_id", id);

  // Return event without hashed admin_token
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { admin_token: _token, ...safeEvent } = event;

  return NextResponse.json({
    ...safeEvent,
    options: options ?? [],
    submission_count: count ?? 0,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = extractToken(request);

  if (!token) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }

  const event = await verifyAdminToken(id, token);
  if (!event) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body;

  if (!status || !["open", "closed"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be 'open' or 'closed'" },
      { status: 400 }
    );
  }

  // Can't reopen after allocation
  if (event.status === "allocated") {
    return NextResponse.json(
      { error: "Cannot change status after allocation" },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from("events")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { admin_token: _token, ...safeEvent } = updated;

  return NextResponse.json(safeEvent);
}
