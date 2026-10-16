// Build-time configuration (VITE_* in .env.local). Compiled into the app, so
// public by definition: the Supabase URL and its publishable key only.

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export const config = {
  supabaseUrl: required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  supabaseKey: required("VITE_SUPABASE_PUBLISHABLE_KEY", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) || "https://destinychurch.vercel.app",
  version: "1.0",
} as const;
