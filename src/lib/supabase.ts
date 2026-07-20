import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your project's values.",
  );
}

// Read-only, RLS-protected client shared by server components and the
// client-side pagination route. Writes (seeding, future ingestion) use the
// service role key directly in scripts/server-only code, never this client.
export const supabase = createClient(url, anonKey);
