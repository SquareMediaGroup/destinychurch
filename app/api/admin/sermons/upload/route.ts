import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit.server";
import { createBuzzsproutEpisode } from "@/lib/buzzsprout.server";

// Publishes sermon audio straight to Buzzsprout — no Supabase Storage write,
// nothing new persisted in this app's own database. The video keeps going to
// YouTube the normal way; this route only ever creates the audio episode.
export const runtime = "nodejs";
export const maxDuration = 120;

// Sermons are typically produced as .mp3; a couple of other common audio
// formats are accepted in case a different export happens to land here.
const ALLOWED = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-m4a", "audio/mp4"]);
const MAX_BYTES = 300 * 1024 * 1024; // ~300MB — comfortably covers a 1-2hr sermon MP3

const YT_ID_RE = /^[\w-]{11}$/;

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const title = String(form.get("title") ?? "").trim();
  const speaker = String(form.get("speaker") ?? "").trim() || null;
  const notes = String(form.get("notes") ?? "").trim() || null;
  const youtubeVideoIdRaw = String(form.get("youtubeVideoId") ?? "").trim();
  const youtubeVideoId = YT_ID_RE.test(youtubeVideoIdRaw) ? youtubeVideoIdRaw : null;

  if (!title) {
    return NextResponse.json({ error: "A title is required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An audio file is required" }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only MP3, WAV or M4A audio files are accepted here" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 300MB" }, { status: 413 });
  }

  try {
    const episode = await createBuzzsproutEpisode({
      title,
      speaker,
      notes,
      audioFile: file,
      youtubeVideoId,
    });

    await recordAudit({
      action: "upload",
      section: "sermons",
      entity: "sermon",
      entityId: episode.id,
      entityLabel: title,
      summary: `Published the sermon “${title}” to the podcast feed`,
      after: { title, speaker, youtube_video_id: youtubeVideoId },
    });

    return NextResponse.json(episode, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
