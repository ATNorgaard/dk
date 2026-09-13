"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client for client components. One instance per page load. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
