// "Are we live?" — the one answer the site should ask for.
//
// A thin wrapper over the YouTube check (lib/youtube.ts), stamped with the
// server clock. The banner, the home page status line and the mobile app's
// BFF all read this.

import "server-only";
import { getYouTubeLiveStatus, type LiveStatus } from "@/lib/youtube";

export type { LiveStatus };

export async function getLiveStatus(): Promise<LiveStatus> {
  const real = await getYouTubeLiveStatus();
  return { ...real, serverTime: new Date().toISOString() };
}
