import { AiReport } from "./types";
import { tryGetSupabaseAdmin } from "./supabase";

export async function listReports(limit = 50): Promise<AiReport[]> {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ai_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (
    data?.map((row) => ({
      id: row.id as string,
      sermonId: (row as any).sermon_id ?? null,
      issueType: (row as any).issue_type ?? "other",
      name: (row as any).name ?? "",
      email: (row as any).email ?? "",
      description: (row as any).description ?? "",
      createdAt: (row as any).created_at ?? undefined,
    })) ?? []
  );
}
