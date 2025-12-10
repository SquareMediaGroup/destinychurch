import type { PostgrestError } from "@supabase/supabase-js";
import { AiReport } from "./types";
import { tryGetSupabaseAdmin } from "./supabase";

type AiReportRow = {
  id: string;
  sermon_id: string | null;
  issue_type: string;
  name: string;
  email: string;
  description: string;
  created_at?: string;
};

export async function listReports(limit = 50): Promise<AiReport[]> {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ai_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // If the table hasn't been created yet, fail gracefully in production.
    if ((error as PostgrestError).code === "42P01") return [];
    throw error;
  }

  return (
    data?.map((row) => ({
      id: (row as AiReportRow).id,
      sermonId: (row as AiReportRow).sermon_id ?? null,
      issueType: (row as AiReportRow).issue_type ?? "other",
      name: (row as AiReportRow).name ?? "",
      email: (row as AiReportRow).email ?? "",
      description: (row as AiReportRow).description ?? "",
      createdAt: (row as AiReportRow).created_at ?? undefined,
    })) ?? []
  );
}
