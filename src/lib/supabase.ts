import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabaseAdmin: SupabaseClient | null = null;
let _supabasePublic: SupabaseClient | null = null;

/** Server-side client with secret key access (for API routes) */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
      );
    }
    return Reflect.get(_supabaseAdmin, prop);
  },
});

/** Public client with publishable key (for client-side reads) */
export const supabasePublic: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabasePublic) {
      _supabasePublic = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      );
    }
    return Reflect.get(_supabasePublic, prop);
  },
});
