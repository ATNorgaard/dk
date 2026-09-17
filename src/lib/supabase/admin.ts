import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for the few server paths that act for someone who
 * has no session: a booking requester following the token in their mail.
 * It bypasses row-level security, so every caller must check the token
 * (or equivalent) itself before reading or writing. Never import this
 * from a client component; the key exists only on the server.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is not set on the server");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
