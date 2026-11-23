import { createServiceClient } from "@/utils/supabase/service";
import { COURSE_EVENT_TYPES, isCourseEventType } from "@/lib/courseEvents";
import { isWithinWindow } from "@/lib/schedule";
import type { BannerType } from "@/contexts/BannerContext";
import { getLiveStatus } from "@/lib/liveStatus.server";
import { isSmartSearchEnabled } from "@/lib/serviceStatus";
import { getActiveEventPopup } from "@/lib/events.server";
import { getOutageState, STATUS_PAGE_URL } from "@/lib/outage";
import type { BannerData } from "@/contexts/BannerContext";
import { unstable_noStore as noStore } from "next/cache";

async function getActiveBanner() {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data: rows } = await supabase
      .from("site_banner")
      .select("*")
      .eq("active", true);

    const banners = (rows ?? [])
      .filter((b) => isWithinWindow(b))
      .map((b) => ({
        active: b.active as boolean,
        message: b.message as string,
        type: b.type as BannerType,
        link: b.link as string | null,
        link_text: b.link_text as string | null,
      }));
    if (banners.length === 0) return null;

    const sitewide = banners.find((b) => b.type === "sitewide");
    if (sitewide) return sitewide;

    async function resolveEvent(b: (typeof banners)[number]) {
      const { data: alpha } = await supabase
        .from("alpha_events")
        .select(
          "start_date, signup_url, frequency, custom_interval_days, format, location, meeting_platform",
        )
        .eq("type", b.type)
        .eq("active", true)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!alpha) return { ...b, active: false };
      return { ...b, alpha };
    }

    const resolved = await Promise.all(
      COURSE_EVENT_TYPES.map(async (type) => {
        const row = banners.find((b) => b.type === type);
        return row ? await resolveEvent(row) : null;
      }),
    );
    const other = banners.find((b) => !isCourseEventType(b.type));

    const activeResolved = resolved.filter(
      (b): b is NonNullable<typeof b> => !!b?.active,
    );

    const primary = activeResolved[0] ?? other ?? null;
    if (!primary) return null;

    const companion = activeResolved.find((b) => b !== primary) ?? null;
    return companion ? { ...primary, companion } : primary;
  } catch {
    return null;
  }
}

async function getActivePopup() {
  noStore();
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("site_popup")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!data || !isWithinWindow(data)) return null;
    return {
      active: data.active as boolean,
      title: data.title as string | null,
      body: data.body as string | null,
      cta_text: data.cta_text as string | null,
      cta_link: data.cta_link as string | null,
      image_url: data.image_url as string | null,
      show_once: data.show_once as boolean,
      updated_at: data.updated_at as string,
    };
  } catch {
    return null;
  }
}

export async function getPublicSiteShellData() {
  const [banner, popup, eventPopup, smartSearchEnabled, liveStatus] =
    await Promise.all([
      getActiveBanner(),
      getActivePopup(),
      getActiveEventPopup(),
      isSmartSearchEnabled(),
      getLiveStatus(),
    ]);

  const outage = getOutageState();
  const outageBanner: BannerData | null =
    outage.data || outage.events
      ? {
          active: true,
          type: "outage",
          message: outage.data
            ? "Some parts of our website aren't working right now."
            : "Our events calendar isn't loading right now.",
          link: STATUS_PAGE_URL,
          link_text: "Service status",
        }
      : null;
  const siteBanner =
    outageBanner && banner?.type !== "sitewide" ? outageBanner : banner;

  return {
    siteBanner,
    popup,
    eventPopup,
    smartSearchEnabled,
    liveStatus,
  };
}