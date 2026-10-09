// Destiny One — link previews, the pure half: finding a link in a message,
// reading a page's Open Graph tags, and deciding whether an IP address is on
// the public internet. Kept free of network and `server-only` so the unit
// tests can drive it; linkPreview.server.ts does the fetching.

import { isIP } from "node:net";
import type { D1LinkPreview } from "@destiny/shared";

const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/i;
const MAX_TITLE = 200;
const MAX_DESCRIPTION = 300;

/** The first http(s) link in a message, without trailing punctuation, or null. */
export function firstUrl(text: string | null | undefined): string | null {
  const m = text?.match(URL_RE);
  if (!m) return null;
  const raw = m[0].replace(/[.,;:!?)\]}'"]+$/, "");
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", nbsp: " " };

function decode(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (all, code: string) => {
      const c = code.toLowerCase();
      if (c.startsWith("#x")) return String.fromCodePoint(parseInt(c.slice(2), 16));
      if (c.startsWith("#") && c !== "#39") return String.fromCodePoint(parseInt(c.slice(1), 10));
      return ENTITIES[c] ?? all;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s: string | null, max: number): string | null {
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** Every <meta> tag's property/name → content, first one wins. */
function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    const key = attr("property") ?? attr("name");
    const content = attr("content");
    if (!key || !content) continue;
    const k = (key[2] ?? key[3] ?? key[4] ?? "").toLowerCase();
    const v = content[2] ?? content[3] ?? content[4] ?? "";
    if (k && !out.has(k)) out.set(k, v);
  }
  return out;
}

/**
 * A preview from a page's HTML: Open Graph first, then Twitter cards, then
 * <title>. Null when there's nothing worth showing (no title). The image must
 * be https, so the app never loads anything insecure.
 */
export function parsePreview(html: string, pageUrl: string): D1LinkPreview | null {
  const head = html.slice(0, 200_000);
  const meta = metaTags(head);
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = meta.get(k);
      if (v && decode(v)) return decode(v);
    }
    return null;
  };
  const titleTag = head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const title = pick("og:title", "twitter:title") ?? (titleTag ? decode(titleTag) || null : null);
  if (!title) return null;

  let imageUrl: string | null = null;
  const image = pick("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  if (image) {
    try {
      const u = new URL(image, pageUrl);
      if (u.protocol === "https:") imageUrl = u.toString();
    } catch {
      // a broken image link just means no picture
    }
  }

  return {
    url: pageUrl,
    title: clip(title, MAX_TITLE)!,
    description: clip(pick("og:description", "twitter:description", "description"), MAX_DESCRIPTION),
    siteName: clip(pick("og:site_name") ?? new URL(pageUrl).hostname.replace(/^www\./, ""), 80),
    imageUrl,
  };
}

/**
 * True only for addresses on the public internet: never loopback, private
 * ranges, link-local (cloud metadata lives at 169.254.169.254), carrier-grade
 * NAT, multicast, or their IPv6 equivalents (including IPv4-mapped ones).
 */
export function isPublicAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
    if (a === 169 && b === 254) return false; // link-local, cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0) return false; // 192.0.0.0/24 and 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
    if (a >= 224) return false; // multicast and reserved
    return true;
  }
  if (version === 6) {
    const v6 = ip.toLowerCase();
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicAddress(mapped[1]);
    if (v6 === "::" || v6 === "::1") return false;
    if (/^f[cd]/.test(v6)) return false; // unique local
    if (/^fe[89ab]/.test(v6)) return false; // link-local
    if (/^ff/.test(v6)) return false; // multicast
    if (v6.startsWith("64:ff9b:") || v6.startsWith("2001:db8:")) return false;
    return true;
  }
  return false;
}
