import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type PublicSupabaseClient = ReturnType<typeof createClient<Database>>;

let publicClient: PublicSupabaseClient | undefined;

export function getSupabasePublicClient(): PublicSupabaseClient {
  if (publicClient) return publicClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Supabase public client is not configured. Missing: NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  if (!publishableKey) {
    throw new Error(
      "Supabase public client is not configured. Missing: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  publicClient = createClient<Database>(supabaseUrl, publishableKey);
  return publicClient;
}
