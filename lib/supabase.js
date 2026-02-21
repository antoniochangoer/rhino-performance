import { createBrowserClient } from "@supabase/ssr";

let client;

/**
 * Browser (client-side) Supabase client.
 * Singleton so we don't create multiple GoTrue instances.
 */
export function getSupabase() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
