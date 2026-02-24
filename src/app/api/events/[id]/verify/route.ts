import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
// import { Resend } from "resend";
// const resend = new Resend(process.env.RESEND_API_KEY);
// const FROM = process.env.EMAIL_FROM ?? "AllocateMe <onboarding@resend.dev>";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Fetch event
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, status, email_verification, title")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.status !== "open") {
    return NextResponse.json(
      { error: "This event is no longer accepting submissions" },
      { status: 400 }
    );
  }

  if (!event.email_verification) {
    return NextResponse.json(
      { error: "Email verification is not enabled for this event" },
      { status: 400 }
    );
  }

  // ── SEND MODE: { email } ───────────────────────────────────────
  if (body.email && !body.submission_id) {
    const email = String(body.email).toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Check for already-verified submission
    const { data: existing } = await supabaseAdmin
      .from("submissions")
      .select("id, verified")
      .eq("event_id", eventId)
      .eq("email", email)
      .maybeSingle();

    if (existing?.verified) {
      return NextResponse.json(
        { error: "This email has already submitted to this event" },
        { status: 409 }
      );
    }

    let submissionId: string;

    if (existing) {
      // Reuse the unverified submission, issue a fresh code
      submissionId = existing.id;
      await supabaseAdmin
        .from("verification_codes")
        .delete()
        .eq("submission_id", submissionId);
    } else {
      // Create a placeholder unverified submission
      const { data: submission, error: insertErr } = await supabaseAdmin
        .from("submissions")
        .insert({ event_id: eventId, email, rankings: [], verified: false })
        .select()
        .single();

      if (insertErr) {
        if (insertErr.code === "23505") {
          return NextResponse.json(
            { error: "A submission with this email already exists" },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Failed to create submission" },
          { status: 500 }
        );
      }

      submissionId = submission.id;
    }

    // Generate and store the code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: codeErr } = await supabaseAdmin
      .from("verification_codes")
      .insert({ submission_id: submissionId, code, expires_at: expiresAt });

    if (codeErr) {
      return NextResponse.json(
        { error: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Email sending disabled — view the code at /dev/inbox
    // try {
    //   await resend.emails.send({
    //     from: FROM,
    //     to: email,
    //     subject: `Your verification code for "${event.title}"`,
    //     html: `<p>Your verification code is: <strong style="font-size:1.5em;letter-spacing:0.1em">${code}</strong></p><p>This code expires in 15 minutes.</p>`,
    //   });
    // } catch (err) {
    //   console.error("Failed to send verification email:", err);
    // }

    return NextResponse.json({ submission_id: submissionId });
  }

  // ── CONFIRM MODE: { submission_id, code } ─────────────────────
  if (body.submission_id && body.code) {
    const { submission_id, code } = body;

    const { data: record } = await supabaseAdmin
      .from("verification_codes")
      .select("code, expires_at")
      .eq("submission_id", submission_id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!record) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 404 }
      );
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (record.code !== String(code).trim()) {
      return NextResponse.json(
        { error: "Incorrect verification code." },
        { status: 400 }
      );
    }

    // Mark verified
    const { error: updateErr } = await supabaseAdmin
      .from("submissions")
      .update({ verified: true })
      .eq("id", submission_id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to verify submission" },
        { status: 500 }
      );
    }

    // Clean up used codes
    await supabaseAdmin
      .from("verification_codes")
      .delete()
      .eq("submission_id", submission_id);

    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
}
