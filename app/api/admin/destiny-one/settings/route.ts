import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { churchSuiteConfigured } from "@/lib/destinyOne/churchsuite.server";
import { adminSettingsSchema } from "@/lib/destinyOne/schemas";
import { getSettings, retentionDays, type D1Settings } from "@/lib/destinyOne/settings.server";
import type { AdminSettings } from "@/lib/destinyOne/adminTypes";

// GET   /api/admin/destiny-one/settings
// PATCH /api/admin/destiny-one/settings  { allowAccessRequests?, inviteExpiryDays?,
//                                          minBuildIos?, minBuildAndroid?,
//                                          forceUpdateMessage?, maintenanceMessage? }
//
// allowAccessRequests off = invite-only: people without an invite are told to
// ask for one instead of seeing the request form. Retention is read-only here
// (D1_MESSAGE_RETENTION_DAYS) because it's a safeguarding-policy decision.
//
// The min builds and messages feed the app's public config
// (/api/app/v1/one/config): raising a minimum sends everyone on an older build
// to the "update the app" screen.

export const dynamic = "force-dynamic";

async function current(): Promise<AdminSettings> {
  const s = await getSettings();
  return { ...s, retentionDays: retentionDays(), churchSuiteConfigured: churchSuiteConfigured() };
}

function auditSummary(before: D1Settings, after: D1Settings): string {
  if (before.allowAccessRequests !== after.allowAccessRequests) {
    return after.allowAccessRequests ? "Opened Destiny One to access requests" : "Made Destiny One invite-only";
  }
  if (before.maintenanceMessage !== after.maintenanceMessage) {
    return after.maintenanceMessage ? "Took the Destiny One app offline for maintenance" : "Brought the Destiny One app back online";
  }
  if (before.minBuildIos !== after.minBuildIos || before.minBuildAndroid !== after.minBuildAndroid) {
    return `Set the minimum Destiny One app build to iOS ${after.minBuildIos}, Android ${after.minBuildAndroid}`;
  }
  return "Changed the Destiny One settings";
}

export async function GET() {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json(await current());
}

export async function PATCH(request: Request) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const body = await parseBody(request, adminSettingsSchema);
  if ("response" in body) return body.response;

  const before = await getSettings();
  const { error } = await createServiceClient()
    .from("d1_settings")
    .update({
      ...(body.data.allowAccessRequests !== undefined ? { allow_access_requests: body.data.allowAccessRequests } : {}),
      ...(body.data.inviteExpiryDays !== undefined ? { invite_expiry_days: body.data.inviteExpiryDays } : {}),
      ...(body.data.minBuildIos !== undefined ? { min_build_ios: body.data.minBuildIos } : {}),
      ...(body.data.minBuildAndroid !== undefined ? { min_build_android: body.data.minBuildAndroid } : {}),
      ...(body.data.forceUpdateMessage !== undefined ? { force_update_message: body.data.forceUpdateMessage } : {}),
      ...(body.data.maintenanceMessage !== undefined ? { maintenance_message: body.data.maintenanceMessage } : {}),
      updated_at: new Date().toISOString(),
      updated_by: admin.userId,
    })
    .eq("id", true);
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });

  const after = await getSettings();
  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "settings",
    entityLabel: "Destiny One settings",
    summary: auditSummary(before, after),
    before: { ...before },
    after: { ...after },
  });
  return NextResponse.json(await current());
}
