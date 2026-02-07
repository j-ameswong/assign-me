import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateJoinCode, generateToken, hashToken } from "@/lib/utils";

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, description, email_verification, options } = body;

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!Array.isArray(options) || options.length === 0) {
    return NextResponse.json(
      { error: "At least one option is required" },
      { status: 400 }
    );
  }

  for (const opt of options) {
    if (!opt.name || typeof opt.name !== "string" || opt.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Each option must have a name" },
        { status: 400 }
      );
    }
    if (opt.capacity !== undefined && (typeof opt.capacity !== "number" || opt.capacity < 1)) {
      return NextResponse.json(
        { error: "Option capacity must be at least 1" },
        { status: 400 }
      );
    }
  }

  const joinCode = generateJoinCode();
  const rawToken = generateToken();
  const hashedToken = hashToken(rawToken);

  // Insert the event
  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      join_code: joinCode,
      admin_token: hashedToken,
      email_verification: email_verification ?? false,
    })
    .select()
    .single();

  if (eventError) {
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }

  // Insert options
  const optionRows = options.map(
    (opt: { name: string; description?: string; capacity?: number }, index: number) => ({
      event_id: event.id,
      name: opt.name.trim(),
      description: opt.description?.trim() || null,
      capacity: opt.capacity ?? 1,
      sort_order: index,
    })
  );

  const { error: optionsError } = await supabaseAdmin
    .from("options")
    .insert(optionRows);

  if (optionsError) {
    // Clean up the event if options insertion fails
    await supabaseAdmin.from("events").delete().eq("id", event.id);
    return NextResponse.json(
      { error: "Failed to create options" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      id: event.id,
      join_code: joinCode,
      admin_token: rawToken,
      admin_url: `/event/${event.id}/admin?token=${rawToken}`,
    },
    { status: 201 }
  );
}
