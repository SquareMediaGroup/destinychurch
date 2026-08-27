// Telling a person apart from a link preview, and reading a device off a
// user-agent string.
//
// This is the single most load-bearing piece of the click analytics, and the
// reason is specific to how a church shares links: someone posts
// destinytees.uk/alpha into a WhatsApp group of two hundred people, and every
// phone in that group silently fetches the URL to draw a preview card. Facebook,
// Slack, Telegram, iMessage and X all do the same. Without this file, "247
// clicks" would really mean "247 people had WhatsApp open", and the number would
// be worse than having no number at all — because someone would act on it.
//
// The rule everywhere downstream: FLAG, never drop. A row identified as a bot is
// still written, with is_bot = true. Dropping them would make a link that is
// genuinely doing well look broken, with nothing in the data to explain why, and
// no way to notice the detection itself had gone wrong.
//
// Deliberately not a dependency. The full UA-parser libraries carry a megabyte
// of regexes to distinguish browsers nobody here uses; this needs to separate a
// phone from a laptop and a person from a crawler, and does that in a page of
// code we can read. Same instinct as lib/cn.ts.

/**
 * Crawlers, preview fetchers and monitors, most-specific first.
 *
 * The named entries are the ones that actually reach this site. The generic
 * catch-alls at the end are what stop an unfamiliar crawler being counted as a
 * congregation member.
 */
const BOT_PATTERNS: RegExp[] = [
  // Messaging apps drawing preview cards — by far the biggest source here.
  /whatsapp/i,
  /facebookexternalhit|facebookcatalog|meta-externalagent/i,
  /slackbot|slack-imgproxy/i,
  /telegrambot/i,
  /discordbot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterest(bot)?/i,
  /redditbot/i,
  /skypeuripreview/i,
  /applebot|ios_app_preview/i,
  /snapchat/i,
  /viber|line-podcast|kakaotalk/i,

  // Search and AI crawlers.
  /googlebot|google-inspectiontool|google-extended|adsbot-google|mediapartners/i,
  /bingbot|bingpreview|msnbot/i,
  /duckduckbot|yandex(bot|images)|baiduspider|sogou/i,
  /gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai/i,
  /perplexitybot|ccbot|bytespider|amazonbot|applebot-extended/i,

  // Uptime monitors, security scanners and link checkers.
  /uptimerobot|pingdom|statuscake|betteruptime|site24x7/i,
  /ahrefsbot|semrushbot|mj12bot|dotbot|dataforseo/i,
  /lighthouse|chrome-lighthouse|pagespeed|gtmetrix/i,
  /vercel-screenshot|vercel-favicon|headlesschrome/i,

  // Command-line and library user agents — never a congregation member.
  /^curl\//i,
  /^wget/i,
  /python-requests|python-urllib|go-http-client|okhttp|axios\//i,
  /java\/|libwww-perl|guzzlehttp|node-fetch|got \(https/i,

  // Generic catch-alls, last so a named match wins and stays readable.
  /\bbot\b|crawler|spider|scraper|crawling/i,
  /preview|prerender|fetcher|monitoring|validator|archiver/i,
];

/**
 * Is this user agent a machine rather than a person?
 *
 * A missing or empty UA counts as a bot: every real browser sends one, and a
 * request without one is a script.
 */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true;
  const ua = userAgent.trim();
  if (ua.length === 0) return true;
  return BOT_PATTERNS.some((pattern) => pattern.test(ua));
}

export type DeviceType = "mobile" | "tablet" | "desktop";

/**
 * Phone, tablet or laptop.
 *
 * Tablet is checked before mobile because an iPad's UA contains neither
 * "Mobile" nor "Android" in the way a phone's does, and an Android tablet's
 * contains "Android" without "Mobile" — the one reliable way to tell the two
 * Android form factors apart.
 */
export function detectDevice(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return "desktop";
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk|kindle/.test(ua)) return "tablet";
  if (/android/.test(ua) && !/mobile/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|windows phone|blackberry|opera mini/.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

/** The operating system, at the granularity anyone would actually act on. */
export function detectOs(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent;

  // iPadOS 13+ reports itself as a Mac, so iPad has to be caught by name
  // before the macOS test or every tablet visitor reads as a desktop one.
  if (/iPad/i.test(ua)) return "iPadOS";
  if (/iPhone|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return null;
}

/**
 * The browser.
 *
 * Order is everything here, because every browser lies. Chrome's UA contains
 * "Safari", Edge's contains both "Chrome" and "Safari", and Brave's is
 * byte-identical to Chrome's on purpose. So the impostors are ruled out first
 * and Safari is only believed once nothing else has claimed the request.
 */
export function detectBrowser(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent;

  // In-app browsers first: on a church's links these are common (a link opened
  // from inside the Facebook or Instagram app), and each one also claims to be
  // Safari or Chrome further along the string.
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook app";
  if (/Instagram/i.test(ua)) return "Instagram app";
  if (/\bGSA\b/i.test(ua)) return "Google app";

  if (/Edg[A-Z]?\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox\/|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS/i.test(ua)) return "Chrome";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return null;
}
