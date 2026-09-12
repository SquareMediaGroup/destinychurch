import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit.server";
import { reviewSermonSpeakers } from "@/lib/speakerReview.server";

// AI review of the sermon archive's speaker attribution — see
// lib/speakerReview.server.ts. Runs a batch of OpenAI calls (a few dozen for a
// full-archive first pass), so this needs longer than the platform default.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;

  try {
    const result = await reviewSermonSpeakers({ force });

    await recordAudit({
      action: "update",
      section: "sermons",
      entity: "speaker attribution",
      entityLabel: "AI speaker review",
      summary: `Ran an AI speaker review: ${result.reviewed} reviewed, ${result.changed.length} corrected, ${result.skipped} already reviewed${result.errors ? `, ${result.errors} failed` : ""}`,
      after: { reviewed: result.reviewed, changed: result.changed.length, skipped: result.skipped, errors: result.errors },
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Speaker review failed" },
      { status: 500 }
    );
  }
}
