"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { processSermonAI } from "@/lib/aiWorkflow";
import { generateSummaryPointsForSermon } from "@/lib/summaryPoints";
import { parseSrt } from "@/lib/srt";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatSummaryBullets, generateSermonSummary } from "@/lib/summary";
import { upsertTranscriptSegments } from "@/lib/transcriptSegments";

const ADMIN_COOKIE = "destiny-admin";

export async function processSermon(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing sermon id");

  try {
    await processSermonAI(id);
  } catch (error) {
    console.error(`[admin] AI processing failed for sermon ${id}`, error);
    const message = error instanceof Error ? error.message : "AI processing failed";
    throw new Error(message);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
}

export async function processSermonSrt(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing sermon id");

  const file = formData.get("srt");
  if (!(file instanceof File)) {
    throw new Error("No SRT/VTT file uploaded");
  }

  const fileText = (await file.text()).trim();
  if (!fileText) {
    throw new Error("Uploaded file is empty");
  }

  const segments = parseSrt(fileText);
  if (!segments.length) {
    throw new Error("No timed segments could be read from the uploaded file");
  }

  const transcript = segments.map((segment) => segment.text).join("\n");
  const supabase = getSupabaseAdmin();

  try {
    await upsertTranscriptSegments(supabase, id, segments, "ready");
    await supabase
      .from("sermons")
      .update({ transcript, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Generate summary text.
    try {
      const bullets = await generateSermonSummary(transcript);
      const summary = formatSummaryBullets(bullets).trim();
      if (summary) {
        await supabase
          .from("sermons")
          .update({ summary, updated_at: new Date().toISOString() })
          .eq("id", id);
      }
    } catch (summaryError) {
      console.warn(`[admin] Summary generation from SRT failed for ${id}`, summaryError);
    }

    // Generate structured points.
    try {
      await generateSummaryPointsForSermon(id);
    } catch (pointsError) {
      console.warn(`[admin] Summary points generation from SRT failed for ${id}`, pointsError);
    }
  } catch (error) {
    console.error(`[admin] SRT ingest failed for sermon ${id}`, error);
    const message =
      error instanceof Error ? error.message : "SRT ingest failed. Please try again.";
    throw new Error(message);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
}

export async function processSermonV2(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing sermon id");

  try {
    await generateSummaryPointsForSermon(id);
  } catch (error) {
    console.error(`[admin] AI v2 summary-points failed for sermon ${id}`, error);
    const message =
      error instanceof Error ? error.message : "AI v2 summary-points processing failed";
    throw new Error(message);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
}
