import { supabaseAdmin } from "./supabase";
import { hashToken } from "./utils";
import type { Event } from "./types";

/**
 * Extract admin token from request query params or Authorization header.
 */
export function extractToken(request: Request): string | null {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken;

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Verify an admin token against the hashed token stored for an event.
 * Returns the event if valid, null otherwise.
 */
export async function verifyAdminToken(
  eventId: string,
  token: string
): Promise<Event | null> {
  const { data: event, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (error || !event) return null;

  const hashedInput = hashToken(token);
  if (hashedInput !== event.admin_token) return null;

  return event as Event;
}
