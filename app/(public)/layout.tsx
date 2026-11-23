import PublicSiteChrome from "@/components/layout/PublicSiteChrome";
import { getPublicSiteShellData } from "@/lib/siteShell.server";
import { getPublicHeaderNavState } from "@/lib/publicNav.server";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [shell, navState] = await Promise.all([
    getPublicSiteShellData(),
    getPublicHeaderNavState(),
  ]);

  return (
    <PublicSiteChrome
      siteBanner={shell.siteBanner}
      popup={shell.popup}
      eventPopup={shell.eventPopup}
      smartSearchEnabled={shell.smartSearchEnabled}
      liveStatus={shell.liveStatus}
      alphaActive={navState.alphaActive}
      youtubeQuotaExceeded={navState.youtubeQuotaExceeded}
    >
      {children}
    </PublicSiteChrome>
  );
}