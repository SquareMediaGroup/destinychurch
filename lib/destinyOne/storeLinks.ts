// Where Destiny One lives in the stores. One source for the app's update prompt
// (GET /api/app/v1/one/config) and the /app page's pre-order buttons, so the
// two can never point at different listings.
//
// iOS: TestFlight while in beta. Set D1_IOS_STORE_URL to the App Store link
// (https://apps.apple.com/app/id<number>) once the listing exists. The listing
// takes pre-orders before launch if pre-orders are switched on for it in App
// Store Connect, and the same link becomes the download page on release day.
//
// Android: the Play listing for uk.destinytees.one. Before launch it only works
// once pre-registration is switched on in the Play Console.

/** What the app itself opens: the App Store link, or TestFlight until there is one. */
export const IOS_STORE_URL = process.env.D1_IOS_STORE_URL || "itms-beta://";

export const ANDROID_STORE_URL =
  process.env.D1_ANDROID_STORE_URL || "https://play.google.com/store/apps/details?id=uk.destinytees.one";

/**
 * Store links a website visitor can follow, or null while a store isn't ready.
 *
 * Only links that were set on purpose count. The app's fallbacks (TestFlight,
 * and the Play listing before it is published or open for pre-registration)
 * would send a visitor to an error page, so the /app page shows "coming soon"
 * for a store until its variable is set in Vercel:
 *   D1_IOS_STORE_URL       once pre-orders are on in App Store Connect
 *   D1_ANDROID_STORE_URL   once pre-registration is on in the Play Console
 */
export function webStoreLinks(): { ios: string | null; android: string | null } {
  const web = (url: string | undefined) => (url && /^https:\/\//.test(url) ? url : null);
  return { ios: web(process.env.D1_IOS_STORE_URL), android: web(process.env.D1_ANDROID_STORE_URL) };
}
