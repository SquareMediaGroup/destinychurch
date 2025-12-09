"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";

export type ReportFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitReport(
  _prev: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const issueType = String(formData.get("issueType") || "").trim() || "other";
  const sermonId = String(formData.get("sermonId") || "").trim() || null;

  if (!name || !email || !description) {
    return { status: "error", message: "All fields are required." };
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from("ai_reports").insert({
    name,
    email,
    description,
    issue_type: issueType,
    sermon_id: sermonId,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Could not submit report.",
    };
  }

  revalidatePath("/admin");
  return { status: "success", message: "Report submitted. Thank you!" };
}
