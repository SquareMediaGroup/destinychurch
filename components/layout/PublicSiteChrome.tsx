import { Suspense, type ReactNode } from "react";
import ChurchHeader from "@/components/ChurchHeader";
import ChurchFooter from "@/components/ChurchFooter";
import Providers from "@/components/Providers";
import CookieBanner from "@/components/CookieBanner";
import AnalyticsGate from "@/components/AnalyticsGate";
import SiteBanner from "@/components/SiteBanner";
import LiveBanner from "@/components/LiveBanner";
import SitePopup from "@/components/SitePopup";
import EventPopup from "@/components/events/EventPopup";
import FloatingSmartSearch from "@/components/FloatingSmartSearch";
import GlassBloomTracker from "@/components/GlassBloomTracker";
import PerformanceGate from "@/components/PerformanceGate";
import BannerSpacer from "@/components/BannerSpacer";
import { PodcastPlayerProvider } from "@/components/sermons/podcast/PodcastPlayerProvider";
import SkipToMainLink from "@/components/layout/SkipToMainLink";
import { SmartSearchVisibilityProvider } from "@/lib/smartSearchVisibility";
import type { ResolvedEventPopup } from "@/lib/events.server";
import type { BannerData } from "@/contexts/BannerContext";
import type { LiveState } from "@/contexts/LiveContext";

type PopupData = {
  active: boolean;
  title: string | null;
  body: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  show_once: boolean;
  updated_at?: string;
} | null;

export type PublicSiteChromeProps = {
  children: ReactNode;
  siteBanner: BannerData | null | undefined;
  popup: PopupData;
  eventPopup: ResolvedEventPopup | null;
  smartSearchEnabled: boolean;
  liveStatus: LiveState;
  alphaActive: boolean;
  youtubeQuotaExceeded: boolean;
};

export default function PublicSiteChrome({
  children,
  siteBanner,
  popup,
  eventPopup,
  smartSearchEnabled,
  liveStatus,
  alphaActive,
  youtubeQuotaExceeded,
}: PublicSiteChromeProps) {
  return (
    <SmartSearchVisibilityProvider>
      <Providers banner={siteBanner} live={liveStatus}>
        <LiveBanner />
        <SiteBanner />
        <CookieBanner />
        <Suspense>
          <PerformanceGate />
        </Suspense>
        <PodcastPlayerProvider>
          <div
            className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]"
            style={{ paddingBottom: "var(--podcast-dock-height, 0px)" }}
          >
            <SkipToMainLink />
            <BannerSpacer />
            <Suspense>
              <ChurchHeader
                initialAlphaActive={alphaActive}
                initialYoutubeQuotaExceeded={youtubeQuotaExceeded}
              />
            </Suspense>
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <ChurchFooter />
          </div>
        </PodcastPlayerProvider>
        <AnalyticsGate />
        <GlassBloomTracker />
        <SitePopup popup={eventPopup ? null : popup} />
        <EventPopup popup={eventPopup} />
        <FloatingSmartSearch searchEnabled={smartSearchEnabled} />
      </Providers>
    </SmartSearchVisibilityProvider>
  );
}