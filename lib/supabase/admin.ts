import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

type AdminSupabaseClient = ReturnType<typeof createClient<Database>>;

let adminClient: AdminSupabaseClient | undefined;

export function getSupabaseAdminClient(): AdminSupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Supabase admin client is not configured. Missing: NEXT_PUBLIC_SUPABASE_URL.",
    );
  }

  if (!secretKey) {
    throw new Error(
      "Supabase admin client is not configured. Missing: SUPABASE_SECRET_KEY.",
    );
  }

  adminClient = createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
