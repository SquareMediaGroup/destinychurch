import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

// Manual speaker corrections — the human counterpart to the AI batch review
// in app/api/admin/sermons/review-speakers/route.ts. Both write the same
// speaker_overrides table (see supabase/migrations/20260912_02_speaker_overrides.sql),
// read everywhere through lib/speakerOverrides.server.ts.
const YT_ID_RE = /^[\w-]{11}$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const videoId = String(body?.video_id ?? "").trim();
  const speakerRaw = typeof body?.speaker === "string" ? body.speaker.trim() : "";
  const speaker = speakerRaw.length > 0 ? speakerRaw : null;

  if (!YT_ID_RE.test(videoId)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  const before = await readForAudit("speaker_overrides", videoId, "video_id, speaker", "video_id");

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("speaker_overrides")
    .upsert(
      { video_id: videoId, speaker, reviewed_by: "admin", reviewed_at: new Date().toISOString() },
      { onConflict: "video_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAudit({
    action: before ? "update" : "create",
    section: "sermons",
    entity: "speaker attribution",
    entityId: videoId,
    entityLabel: speaker ?? "No speaker",
    summary: `Set the speaker for sermon ${videoId} to ${speaker ?? "no individual speaker"}`,
    before,
    after: data,
  });

  return NextResponse.json(data);
}

// Reverts a manual (or AI) correction — deletes the override row entirely, so
// the video falls back to lib/sermonTitle.ts's regex-parsed speaker. Distinct
// from POSTing speaker: null, which records a *confirmed* "no speaker".
export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const videoId = String(body?.video_id ?? "").trim();

  if (!YT_ID_RE.test(videoId)) {
    return NextResponse.json({ error: "Invalid video id" }, { status: 400 });
  }

  const before = await readForAudit("speaker_overrides", videoId, "video_id, speaker", "video_id");
  if (!before) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("speaker_overrides").delete().eq("video_id", videoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAudit({
    action: "delete",
    section: "sermons",
    entity: "speaker attribution",
    entityId: videoId,
    entityLabel: (before.speaker as string | null) ?? "No speaker",
    summary: `Reverted the speaker for sermon ${videoId} to YouTube's parsed name`,
    before,
  });

  return NextResponse.json({ ok: true });
}
