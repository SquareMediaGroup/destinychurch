import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { ensurePermalink } from "@/lib/playbook.server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("media_photos", id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const actorEmail = (await headers()).get(AUDIT_ACTOR_HEADERS.email) || null;

  // Permalinks are spent (plan-capped) only on approval — a photo that never
  // makes it past moderation never needed a permanent URL. Already-approved
  // photos (e.g. re-approving after an edit) keep their existing permalink.
  let permalinkUrl = before.playbook_permalink_url as string | null;
  if (!permalinkUrl && before.playbook_asset_token) {
    permalinkUrl = await ensurePermalink(before.playbook_asset_token as string);
  }

  const { data, error } = await supabase
    .from("media_photos")
    .update({
      status: "approved",
      reviewed_by: actorEmail,
      reviewed_at: new Date().toISOString(),
      playbook_permalink_url: permalinkUrl,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "approve",
    section: "media",
    entity: "photo",
    entityId: id,
    entityLabel: data.file_name,
    summary: `Approved the photo uploaded by ${data.uploader_name}`,
    before,
    after: data,
  });

  return NextResponse.json(data);
}
