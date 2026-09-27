import type { D1AppConfig } from "@destiny/shared";
import { oneJson, oneRoute } from "@/lib/destinyOne/http";
import { getSettings } from "@/lib/destinyOne/settings.server";

// GET /api/app/v1/one/config   (no sign-in needed)
//
// Read by the app on launch and on every return to the foreground, BEFORE
// sign-in, so it still reaches a signed-out or broken build. Builds below
// minBuild see the "update the app" screen; a maintenance message takes the
// whole app offline. Both are edited at /admin/destiny-one/settings, so a bad
// build can be retired without a deploy or an App Store release.
//
// Nothing here is about a person, so unlike every other /one route it may sit
// in the CDN, briefly: a raised minimum reaches everyone within about a minute.

export const dynamic = "force-dynamic";

// iOS: TestFlight while in beta. Set D1_IOS_STORE_URL to the App Store link
// (https://apps.apple.com/app/id<number>) once the app is published.
const IOS_STORE_URL = process.env.D1_IOS_STORE_URL || "itms-beta://";
const ANDROID_STORE_URL =
  process.env.D1_ANDROID_STORE_URL || "https://play.google.com/store/apps/details?id=uk.destinytees.one";

export const GET = oneRoute(async () => {
  const s = await getSettings();
  const config: D1AppConfig = {
    minBuild: { ios: s.minBuildIos, android: s.minBuildAndroid },
    forceUpdateMessage: s.forceUpdateMessage,
    maintenanceMessage: s.maintenanceMessage,
    storeUrl: { ios: IOS_STORE_URL, android: ANDROID_STORE_URL },
  };
  const res = oneJson(config);
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res;
});
