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

  const { data: submissions, error } = await supabaseAdmin
    .from("submissions")
    .select("id, email, rankings, verified, submitted_at")
    .eq("event_id", eventId)
    .order("submitted_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    );
  }

  return NextResponse.json({ submissions: submissions ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  // 1. Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, rankings } = body;

  // 2. Validate email format
  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  // 3. Validate rankings is a non-empty array of strings
  if (!Array.isArray(rankings) || rankings.length === 0) {
    return NextResponse.json(
      { error: "Rankings must be a non-empty array of option IDs" },
      { status: 400 }
    );
  }

  // 4. Fetch the event and check it's open
  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, status, email_verification")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status !== "open") {
    return NextResponse.json(
      { error: "This event is no longer accepting submissions" },
      { status: 400 }
    );
  }

  // 5. Validate that all ranking IDs are real options for this event
  const { data: eventOptions } = await supabaseAdmin
    .from("options")
    .select("id")
    .eq("event_id", eventId);

  const validOptionIds = new Set((eventOptions ?? []).map((o) => o.id));

  for (const optionId of rankings) {
    if (!validOptionIds.has(optionId)) {
      return NextResponse.json(
        { error: `Invalid option ID: ${optionId}` },
        { status: 400 }
      );
    }
  }

  // Check for duplicates in rankings
  if (new Set(rankings).size !== rankings.length) {
    return NextResponse.json(
      { error: "Rankings must not contain duplicate options" },
      { status: 400 }
    );
  }

  // 6. Insert or update submission depending on email_verification setting
  if (event.email_verification) {
    // A verified submission must already exist (created during email verification)
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("submissions")
      .select("id, verified, submitted_at")
      .eq("event_id", eventId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (findErr) {
      return NextResponse.json(
        { error: "Failed to look up submission" },
        { status: 500 }
      );
    }

    if (!existing || !existing.verified) {
      return NextResponse.json(
        { error: "Please verify your email before submitting rankings" },
        { status: 403 }
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from("submissions")
      .update({ rankings })
      .eq("id", existing.id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to save rankings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: existing.id,
      email,
      verified: true,
      submitted_at: existing.submitted_at,
    });
  }

  // No email verification — insert fresh submission
  const { data: submission, error: insertError } = await supabaseAdmin
    .from("submissions")
    .insert({
      event_id: eventId,
      email: email.toLowerCase().trim(),
      rankings,
      verified: true,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "A submission with this email already exists for this event" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      id: submission.id,
      email: submission.email,
      verified: submission.verified,
      submitted_at: submission.submitted_at,
    },
    { status: 201 }
  );
}
