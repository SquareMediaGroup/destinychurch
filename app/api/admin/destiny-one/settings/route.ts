import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { churchSuiteConfigured } from "@/lib/destinyOne/churchsuite.server";
import { adminSettingsSchema } from "@/lib/destinyOne/schemas";
import { getSettings, retentionDays } from "@/lib/destinyOne/settings.server";
import type { AdminSettings } from "@/lib/destinyOne/adminTypes";

// GET   /api/admin/destiny-one/settings
// PATCH /api/admin/destiny-one/settings  { allowAccessRequests?, inviteExpiryDays? }
//
// allowAccessRequests off = invite-only: people without an invite are told to
// ask for one instead of seeing the request form. Retention is read-only here
// (D1_MESSAGE_RETENTION_DAYS) because it's a safeguarding-policy decision.

export const dynamic = "force-dynamic";

async function current(): Promise<AdminSettings> {
  const s = await getSettings();
  return { ...s, retentionDays: retentionDays(), churchSuiteConfigured: churchSuiteConfigured() };
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
    summary:
      before.allowAccessRequests !== after.allowAccessRequests
        ? after.allowAccessRequests
          ? "Opened Destiny One to access requests"
          : "Made Destiny One invite-only"
        : "Changed the Destiny One settings",
    before: { ...before },
    after: { ...after },
  });
  return NextResponse.json(await current());
}
