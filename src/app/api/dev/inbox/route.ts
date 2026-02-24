import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  // Fetch all pending verification codes with their associated email + event
  const { data, error } = await supabaseAdmin
    .from("verification_codes")
    .select("code, expires_at, submissions(email, events(title))")
    .order("expires_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch inbox" }, { status: 500 });
  }

  const emails = (data ?? []).map((row) => {
    const submission = row.submissions as { email: string; events: { title: string } | null } | null;
    const email = submission?.email ?? "(unknown)";
    const eventTitle = submission?.events?.title ?? "(unknown event)";
    const expired = new Date(row.expires_at) < new Date();

    return {
      to: email,
      subject: `Your verification code for "${eventTitle}"`,
      html: `<p>Your verification code is: <strong style="font-size:1.5em;letter-spacing:0.1em">${row.code}</strong></p><p>This code expires in 15 minutes.</p>`,
      code: row.code,
      expires_at: row.expires_at,
      expired,
    };
  });

  return NextResponse.json({ emails });
}
