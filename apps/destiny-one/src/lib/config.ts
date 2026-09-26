// Build-time configuration. EXPO_PUBLIC_* values are compiled into the app
// bundle, so they are public by definition — only the Supabase URL and its
// publishable (anon) key belong here, never a secret.

import Constants from "expo-constants";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

export const config = {
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: required("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    "https://destinychurch.vercel.app",
  easProjectId:
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    null,
} as const;
