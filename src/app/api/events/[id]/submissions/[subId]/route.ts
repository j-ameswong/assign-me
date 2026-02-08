import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractToken, verifyAdminToken } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { id: eventId, subId } = await params;
  const token = extractToken(request);

  if (!token) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }

  const event = await verifyAdminToken(eventId, token);
  if (!event) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  // Verify the submission belongs to this event
  const { data: submission, error: fetchError } = await supabaseAdmin
    .from("submissions")
    .select("id, event_id")
    .eq("id", subId)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  if (submission.event_id !== eventId) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  // Delete the submission (cascade will remove verification_codes too)
  const { error: deleteError } = await supabaseAdmin
    .from("submissions")
    .delete()
    .eq("id", subId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
