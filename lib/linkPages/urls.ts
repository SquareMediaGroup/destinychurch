// URL handling for the links pages: which hrefs a block may carry, and how a
// pasted share link becomes something we can put in an iframe.
//
// Client-safe — the editor uses these for live feedback and the API for the
// real check. Every URL on a links page travels from a text input straight
// into an `href` or `src`, where React does not escape `javascript:`.

import { parseYouTubeId } from "@/lib/simulatedLive";
import { isEmbeddable } from "@/lib/nfcTiles";

/**
 * The href a block may link to, or null.
 *
 * Same rule as components/blocks/tokens.ts#safeUrl minus bare `#fragment`
 * (meaningless on a page of buttons) and minus protocol-relative `//host`,
 * which starts with a slash but leaves the site.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(url) ? url : null;
}

/** An image or video source: our own paths or https only. */
export function safeMediaUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  return /^(https:\/\/|\/(?!\/))/i.test(url) ? url : null;
}

export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

export type EmbedKind =
  | "youtube"
  | "vimeo"
  | "spotify"
  | "apple-podcasts"
  | "maps"
  | "churchsuite";

export interface EmbedTarget {
  kind: EmbedKind;
  src: string;
  /**
   * Fixed pixel height, for players that aren't 16:9 (Spotify, podcasts, maps,
   * forms). Null means "16:9 video".
   */
  height: number | null;
  /** Third-party players that set cookies wait behind the media consent gate. */
  needsConsent: boolean;
}

export const EMBED_HELP =
  "YouTube, Vimeo, Spotify, Apple Podcasts, a Google Maps embed link, or a ChurchSuite form or event.";

/**
 * Turn whatever an admin pasted into an embeddable player, or null.
 *
 * An allowlist rather than "any iframe": every provider here is one we know
 * frames cleanly, and nothing else gets to run inside a links page.
 */
export function toEmbed(input: unknown): EmbedTarget | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;

  // The /youtu\.?be/ check stops a bare eleven-character string (which
  // parseYouTubeId accepts as an id) from being read as a video.
  const yt = parseYouTubeId(value);
  if (yt && /youtu\.?be/.test(value)) {
    return {
      kind: "youtube",
      // youtube-nocookie, as components/blocks/video/VideoBlock.tsx does.
      src: `https://www.youtube-nocookie.com/embed/${yt}`,
      height: null,
      needsConsent: true,
    };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/(?:\/video)?\/(\d+)/)?.[1];
    return id
      ? {
          kind: "vimeo",
          // dnt=1: Vimeo's own "do not track" switch.
          src: `https://player.vimeo.com/video/${id}?dnt=1`,
          height: null,
          needsConsent: true,
        }
      : null;
  }

  if (host === "open.spotify.com") {
    const match = url.pathname.match(
      /^\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/,
    );
    if (!match) return null;
    const [, type, id] = match;
    return {
      kind: "spotify",
      src: `https://open.spotify.com/embed/${type}/${id}`,
      // Spotify's two standard sizes: compact for one track or episode, the
      // tall list player for anything with a tracklist.
      height: type === "track" || type === "episode" ? 152 : 352,
      needsConsent: true,
    };
  }

  if (host === "podcasts.apple.com" || host === "embed.podcasts.apple.com") {
    const episode = url.searchParams.has("i");
    return {
      kind: "apple-podcasts",
      src: `https://embed.podcasts.apple.com${url.pathname}${url.search}`,
      height: episode ? 175 : 450,
      needsConsent: true,
    };
  }

  // Only Google's own embed URLs — a normal maps.google.com link refuses to be
  // framed, which is the one mistake worth catching with a clear message.
  if (host === "google.com" && url.pathname.startsWith("/maps/embed")) {
    return { kind: "maps", src: url.toString(), height: 320, needsConsent: true };
  }

  if (isEmbeddable(value)) {
    // ChurchSuiteEmbed carries its own consent handling.
    return { kind: "churchsuite", src: url.toString(), height: 620, needsConsent: false };
  }

  return null;
}
