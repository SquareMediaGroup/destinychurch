"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";
import { transcribeAudio } from "@/lib/whisper";
import { generateSermonSummary } from "@/lib/summary";
import { getSermonById } from "@/lib/db";

const ADMIN_COOKIE = "destiny-admin";

export async function processSermon(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Missing sermon id");

  const supabase = getSupabaseAdmin();
  const sermon = await getSermonById(id);
  if (!sermon) throw new Error("Sermon not found");
  if (!sermon.podcastAudioUrl) throw new Error("No podcast audio URL to transcribe");
  if (sermon.summary && sermon.transcript) return;

  const transcript = await transcribeAudio(sermon.podcastAudioUrl);
  const summaryBullets = await generateSermonSummary(transcript);
  const summary = summaryBullets.map((b) => `• ${b}`).join("\n");

  const { error } = await supabase
    .from("sermons")
    .update({
      transcript,
      summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/sermons");
  revalidatePath("/admin");
  revalidatePath(`/sermons/view?viewId=${encodeURIComponent(id)}`);
}
