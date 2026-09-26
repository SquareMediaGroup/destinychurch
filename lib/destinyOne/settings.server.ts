// Destiny One — the one-row settings table (d1_settings), edited at
// /admin/destiny-one/settings.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";

export interface D1Settings {
  allowAccessRequests: boolean;
  inviteExpiryDays: number;
}

const DEFAULTS: D1Settings = { allowAccessRequests: true, inviteExpiryDays: 30 };

export async function getSettings(): Promise<D1Settings> {
  const { data } = await createServiceClient()
    .from("d1_settings")
    .select("allow_access_requests, invite_expiry_days")
    .eq("id", true)
    .maybeSingle();
  if (!data) return DEFAULTS;
  return { allowAccessRequests: data.allow_access_requests, inviteExpiryDays: data.invite_expiry_days };
}

/** The retention window the purge cron uses (env-configured, shown read-only in the admin). */
export function retentionDays(): number {
  const configured = Number(process.env.D1_MESSAGE_RETENTION_DAYS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 365;
}
