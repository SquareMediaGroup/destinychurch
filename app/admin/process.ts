"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { processSermonAI } from "@/lib/aiWorkflow";
import { generateSummaryPointsForSermon } from "@/lib/summaryPoints";

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
