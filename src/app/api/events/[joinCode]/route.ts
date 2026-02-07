import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ joinCode: string }> }
) {
  const { joinCode } = await params;

  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("id, title, description, status, email_verification, created_at")
    .eq("join_code", joinCode)
    .single();

  if (error || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Fetch options (public info)
  const { data: options } = await supabaseAdmin
    .from("options")
    .select("id, name, description, capacity, sort_order")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    ...event,
    options: options ?? [],
  });
}
