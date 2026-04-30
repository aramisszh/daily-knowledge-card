import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn("Supabase env vars are missing. API routes will fail until configured.");
}

export const supabaseAdmin = createClient(supabaseUrl || "http://localhost:54321", serviceRoleKey || "missing", {
  auth: { persistSession: false },
});
