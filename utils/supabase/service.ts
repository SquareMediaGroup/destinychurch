import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Prefer the new secret key (sb_secret_…); fall back to the legacy service_role
// JWT during the transition. Both bypass RLS.
const serviceKey = (process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY)!;

export const createServiceClient = () =>
  createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
