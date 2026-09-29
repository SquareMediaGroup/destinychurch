// Destiny One — the one-row settings table (d1_settings), edited at
// /admin/destiny-one/settings.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";

export interface D1Settings {
  allowAccessRequests: boolean;
  inviteExpiryDays: number;
  /** Builds below these are shown the "update the app" screen. */
  minBuildIos: number;
  minBuildAndroid: number;
  /** Replaces the default copy on the update screen. */
  forceUpdateMessage: string | null;
  /** When set, the whole app shows this instead of working (emergency off switch). */
  maintenanceMessage: string | null;
}

const DEFAULTS: D1Settings = {
  allowAccessRequests: true,
  inviteExpiryDays: 30,
  minBuildIos: 1,
  minBuildAndroid: 1,
  forceUpdateMessage: null,
  maintenanceMessage: null,
};

export async function getSettings(): Promise<D1Settings> {
  const { data } = await createServiceClient()
    .from("d1_settings")
    .select("allow_access_requests, invite_expiry_days, min_build_ios, min_build_android, force_update_message, maintenance_message")
    .eq("id", true)
    .maybeSingle();
  if (!data) return DEFAULTS;
  return {
    allowAccessRequests: data.allow_access_requests,
    inviteExpiryDays: data.invite_expiry_days,
    minBuildIos: data.min_build_ios,
    minBuildAndroid: data.min_build_android,
    forceUpdateMessage: data.force_update_message,
    maintenanceMessage: data.maintenance_message,
  };
}

/** The retention window the purge cron uses (env-configured, shown read-only in the admin). */
export function retentionDays(): number {
  const configured = Number(process.env.D1_MESSAGE_RETENTION_DAYS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 365;
}
