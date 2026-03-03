import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }

  const deleted = data?.length ?? 0;
  console.log(`Cron cleanup: deleted ${deleted} expired event(s)`);
  return NextResponse.json({ deleted });
}
