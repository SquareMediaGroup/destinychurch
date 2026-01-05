"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processSermonAI } from "@/lib/aiWorkflow";
import { generateSummaryPointsForSermon } from "@/lib/summaryPoints";
import { parseSrt } from "@/lib/srt";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatSummaryNumbered, generateSermonSummary } from "@/lib/summary";
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
    redirect(`/admin?aiError=${encodeURIComponent(message)}&id=${encodeURIComponent(id)}`);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
  redirect(`/admin?ai=ok&id=${encodeURIComponent(id)}`);
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
      const summary = formatSummaryNumbered(bullets).trim();
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
    redirect(`/admin?aiError=${encodeURIComponent(message)}&id=${encodeURIComponent(id)}`);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
  redirect(`/admin?ai=ok&id=${encodeURIComponent(id)}`);
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
    redirect(`/admin?aiError=${encodeURIComponent(message)}&id=${encodeURIComponent(id)}`);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
  redirect(`/admin?ai=ok&id=${encodeURIComponent(id)}`);
}

export async function processSermonSummary(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing sermon id");

  const supabase = getSupabaseAdmin();

  try {
    const { data: sermon, error: sermonError } = await supabase
      .from("sermons")
      .select("transcript")
      .eq("id", id)
      .maybeSingle();

    if (sermonError) {
      throw new Error(`Failed to load sermon transcript: ${sermonError.message}`);
    }

    const transcript =
      typeof sermon?.transcript === "string" ? sermon.transcript.trim() : "";
    if (!transcript) {
      throw new Error("Transcript is required to run the summary model.");
    }

    const bullets = await generateSermonSummary(transcript);
    const summary = formatSummaryNumbered(bullets).trim();

    if (!summary) {
      throw new Error("Summary model returned an empty result.");
    }

    await supabase
      .from("sermons")
      .update({ summary, updated_at: new Date().toISOString() })
      .eq("id", id);
  } catch (error) {
    console.error(`[admin] Summary model failed for sermon ${id}`, error);
    const message = error instanceof Error ? error.message : "Summary model failed";
    redirect(`/admin?aiError=${encodeURIComponent(message)}&id=${encodeURIComponent(id)}`);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
  redirect(`/admin?ai=ok&id=${encodeURIComponent(id)}`);
}
