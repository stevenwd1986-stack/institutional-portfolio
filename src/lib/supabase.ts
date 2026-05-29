import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Use placeholder values so createClient doesn't throw when env vars aren't set yet.
// All queries will fail gracefully; hooks fall back to demo data.
const PLACEHOLDER_URL  = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY  = "placeholder-anon-key";

if (!supabaseUrl || !supabaseAnon) {
  console.warn("Supabase env vars not set — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
}

export const supabase = createClient(
  supabaseUrl  || PLACEHOLDER_URL,
  supabaseAnon || PLACEHOLDER_KEY
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnon);
