import { test, expect } from "@playwright/test";
import { isBot, detectDevice, detectOs, detectBrowser } from "../../lib/botDetect";
import {
  ENGAGEMENT_SOURCE_KEYS,
  isEngagementSource,
  normaliseSrcTag,
  srcTagLabel,
  countryName,
  regionName,
  referrerName,
  compactNumber,
  shortDay,
} from "../../lib/engagement";
import { BEACON_SOURCES, isBeaconSource } from "../../lib/track";
import { LINKS_STEPS, findLinksStep } from "../../lib/linksSteps";

/**
 * lib/botDetect.ts is the single most load-bearing piece of the click
 * analytics: post a shortlink in a church WhatsApp group and every member's
 * phone fetches a link-preview, which would double-count "clicks" as "people
 * who opened WhatsApp" if nothing told the two apart. These pin real
 * crawler and real browser user agents against the classifier so a change
 * here can't silently start counting previews as visitors — or, just as
 * bad, start flagging real phones as bots.
 */

/* ── Bot detection ────────────────────────────────────────────────────────── */

const CRAWLER_UAS = [
  "WhatsApp/2.23.20.79 A",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
  "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  "TelegramBot (like TwitterBot)",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
  "curl/8.4.0",
  "python-requests/2.31.0",
];

for (const ua of CRAWLER_UAS) {
  test(`"${ua.slice(0, 40)}…" is detected as a bot`, () => {
    expect(isBot(ua)).toBe(true);
  });
}

test("a missing or empty user agent counts as a bot", () => {
  expect(isBot(null)).toBe(true);
  expect(isBot(undefined)).toBe(true);
  expect(isBot("")).toBe(true);
  expect(isBot("   ")).toBe(true);
});

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

test("a real iPhone Safari UA is not flagged as a bot", () => {
  expect(isBot(IPHONE_SAFARI)).toBe(false);
});

test("a real Android Chrome UA is not flagged as a bot", () => {
  expect(isBot(ANDROID_CHROME)).toBe(false);
});

test("a real desktop Chrome UA is not flagged as a bot", () => {
  expect(isBot(WINDOWS_CHROME)).toBe(false);
});

/* ── Device / OS / browser ───────────────────────────────────────────────── */

test("iPhone reads as mobile / iOS / Safari", () => {
  expect(detectDevice(IPHONE_SAFARI)).toBe("mobile");
  expect(detectOs(IPHONE_SAFARI)).toBe("iOS");
  expect(detectBrowser(IPHONE_SAFARI)).toBe("Safari");
});

test("Android Chrome reads as mobile / Android / Chrome", () => {
  expect(detectDevice(ANDROID_CHROME)).toBe("mobile");
  expect(detectOs(ANDROID_CHROME)).toBe("Android");
  expect(detectBrowser(ANDROID_CHROME)).toBe("Chrome");
});

test("Windows Chrome reads as desktop / Windows / Chrome", () => {
  expect(detectDevice(WINDOWS_CHROME)).toBe("desktop");
  expect(detectOs(WINDOWS_CHROME)).toBe("Windows");
  expect(detectBrowser(WINDOWS_CHROME)).toBe("Chrome");
});

test("Mac Safari reads as desktop / macOS / Safari", () => {
  expect(detectDevice(MAC_SAFARI)).toBe("desktop");
  expect(detectOs(MAC_SAFARI)).toBe("macOS");
  expect(detectBrowser(MAC_SAFARI)).toBe("Safari");
});

test("iPad is a tablet, not a phone — the classic mis-bucket", () => {
  expect(detectDevice(IPAD_SAFARI)).toBe("tablet");
  expect(detectOs(IPAD_SAFARI)).toBe("iPadOS");
});

test("an Android tablet (no 'Mobile' token) is a tablet, not a phone", () => {
  const ua =
    "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  expect(detectDevice(ua)).toBe("tablet");
});

test("Edge is not misread as Chrome, even though it contains 'Chrome/'", () => {
  const edge =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
  expect(detectBrowser(edge)).toBe("Edge");
});

test("an in-app Facebook browser is named as itself, not as Safari", () => {
  const fbApp =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]";
  expect(detectBrowser(fbApp)).toBe("Facebook app");
});

test("no user agent means no device/os/browser guess, not a wrong one", () => {
  expect(detectOs(null)).toBeNull();
  expect(detectBrowser(null)).toBeNull();
});

/* ── Engagement sources ──────────────────────────────────────────────────── */

test("the three engagement sources are exactly redirect, nfc and links", () => {
  expect(ENGAGEMENT_SOURCE_KEYS.sort()).toEqual(["links", "nfc", "redirect"]);
});

test("isEngagementSource rejects anything outside the closed set", () => {
  expect(isEngagementSource("redirect")).toBe(true);
  expect(isEngagementSource("nfc")).toBe(true);
  expect(isEngagementSource("links")).toBe(true);
  expect(isEngagementSource("shortlink")).toBe(false);
  expect(isEngagementSource("")).toBe(false);
  expect(isEngagementSource(null)).toBe(false);
  expect(isEngagementSource(42)).toBe(false);
});

/**
 * "redirect" must never be a valid beacon source: shortlink numbers decide
 * print spend, so they may only ever be written by the server-side path in
 * app/[slug]/page.tsx. If a browser could report one via /api/track, anyone
 * with curl could inflate a flyer's click count to order.
 */
test("redirect is not a beacon source — a security boundary, not an oversight", () => {
  expect(BEACON_SOURCES).not.toContain("redirect");
  expect(isBeaconSource("redirect")).toBe(false);
  expect(isBeaconSource("nfc")).toBe(true);
  expect(isBeaconSource("links")).toBe(true);
  expect(isBeaconSource("anything-else")).toBe(false);
});

/* ── Source tags (?s=) ───────────────────────────────────────────────────── */

test("normaliseSrcTag accepts only the closed set, case-insensitively", () => {
  expect(normaliseSrcTag("qr")).toBe("qr");
  expect(normaliseSrcTag("QR")).toBe("qr");
  expect(normaliseSrcTag(" nfc ")).toBe("nfc");
  expect(normaliseSrcTag("flyer-jan")).toBeNull();
  expect(normaliseSrcTag(null)).toBeNull();
  expect(normaliseSrcTag(undefined)).toBeNull();
  expect(normaliseSrcTag(123)).toBeNull();
});

test("srcTagLabel reads a null tag as Direct, not as an empty string", () => {
  expect(srcTagLabel(null)).toBe("Direct");
  expect(srcTagLabel("qr")).toBe("QR code");
  expect(srcTagLabel("made-up")).toBe("made-up");
});

/* ── Display helpers ─────────────────────────────────────────────────────── */

test("countryName spells out a known code and falls back to the code itself", () => {
  expect(countryName("GB")).toBe("United Kingdom");
  expect(countryName("gb")).toBe("United Kingdom");
  expect(countryName("ZZ")).toBe("ZZ");
  expect(countryName(null)).toBe("Unknown");
});

test("regionName reads the UK's ISO 3166-2 fragment as a country, not a code", () => {
  expect(regionName("ENG")).toBe("England");
  expect(regionName("SCT")).toBe("Scotland");
  expect(regionName(null)).toBe("Unknown");
});

test("referrerName recognises common hosts and falls back to the bare host", () => {
  expect(referrerName("facebook.com")).toBe("Facebook");
  expect(referrerName("www.facebook.com")).toBe("Facebook");
  expect(referrerName("some-church-blog.example")).toBe("some-church-blog.example");
  expect(referrerName(null)).toBe("Direct");
});

test("compactNumber keeps small numbers exact and abbreviates big ones", () => {
  expect(compactNumber(0)).toBe("0");
  expect(compactNumber(999)).toBe("999");
  expect(compactNumber(1200)).toBe("1.2k");
  expect(compactNumber(15000)).toBe("15k");
  expect(compactNumber(2_500_000)).toBe("2.5m");
});

test("shortDay formats a YYYY-MM-DD bucket for the chart axis", () => {
  expect(shortDay("2026-08-27")).toBe("27 Aug");
});

/* ── /links validation ───────────────────────────────────────────────────── */

/**
 * The beacon at /api/track checks a "links" click against this list before
 * writing anything — this test is the integrity guarantee that the list is
 * never empty and every entry has a real, unique href to match against.
 */
test("every /links step has a unique href", () => {
  expect(LINKS_STEPS.length).toBeGreaterThan(0);
  const hrefs = LINKS_STEPS.map((s) => s.href);
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

test("findLinksStep resolves a real href and rejects everything else", () => {
  const first = LINKS_STEPS[0];
  expect(findLinksStep(first.href)).toEqual(first);
  expect(findLinksStep("/not-a-real-step")).toBeNull();
  expect(findLinksStep("")).toBeNull();
});
