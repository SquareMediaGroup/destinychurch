import { createServiceClient } from "@/utils/supabase/service";
import { unstable_noStore as noStore } from "next/cache";

/** Fetch all key/value pairs for a given page slug from page_content. */
export async function getPageContent(page: string): Promise<Record<string, string>> {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("page_content")
      .select("key, value")
      .eq("page", page);
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}
