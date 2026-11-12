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
  /** Newest version in the stores ("0.13"). Older X.X apps get a dismissible "update available" prompt. */
  latestVersion: string | null;
  /** What's in it, one feature per line, shown on that prompt. */
  latestVersionNotes: string | null;
  /** The church's default Bible version (YouVersion Platform id; 113 = NIV UK). */
  bibleId: number;
}

const DEFAULTS: D1Settings = {
  allowAccessRequests: true,
  inviteExpiryDays: 30,
  minBuildIos: 1,
  minBuildAndroid: 1,
  forceUpdateMessage: null,
  maintenanceMessage: null,
  latestVersion: null,
  latestVersionNotes: null,
  bibleId: 113,
};

export async function getSettings(): Promise<D1Settings> {
  const { data } = await createServiceClient()
    .from("d1_settings")
    .select("*")
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
    latestVersion: data.latest_version,
    latestVersionNotes: data.latest_version_notes,
    // Read with select("*") so the settings still load before migration 20261113_01 adds it.
    bibleId: Number((data as { bible_id?: number }).bible_id) || 113,
  };
}

/** The retention window the purge cron uses (env-configured, shown read-only in the admin). */
export function retentionDays(): number {
  const configured = Number(process.env.D1_MESSAGE_RETENTION_DAYS);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 365;
}
