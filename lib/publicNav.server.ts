import { createServiceClient } from "@/utils/supabase/service";
import { isYouTubeQuotaExceeded } from "@/lib/youtube";

/** Whether an active Alpha course should appear in public nav (header/footer). */
export async function isAlphaCourseActive(): Promise<boolean> {
  try {
    const { data } = await createServiceClient()
      .from("alpha_events")
      .select("type, active")
      .eq("active", true);
    return (data ?? []).some(
      (row) => row.type === "alpha" && row.active === true,
    );
  } catch {
    return false;
  }
}

export async function getPublicHeaderNavState(): Promise<{
  alphaActive: boolean;
  youtubeQuotaExceeded: boolean;
}> {
  const [alphaActive, youtubeQuotaExceeded] = await Promise.all([
    isAlphaCourseActive(),
    isYouTubeQuotaExceeded(),
  ]);
  return { alphaActive, youtubeQuotaExceeded };
}