// The social platforms a links page can show in its icon row.
//
// Brand marks come from simple-icons (CC0) — Material Symbols has no brand
// glyphs — imported one by one so only these ship. Email, phone and website
// use Material Symbols, like every other icon on the site.
//
// Client-safe: the editor and the renderer both read this.

import {
  siApplepodcasts,
  siDiscord,
  siFacebook,
  siInstagram,
  siSnapchat,
  siSpotify,
  siTelegram,
  siThreads,
  siTiktok,
  siVimeo,
  siWhatsapp,
  siX,
  siYoutube,
} from "simple-icons";

export interface SocialPlatform {
  label: string;
  /** SVG path in a 24×24 box, for brand marks. */
  path?: string;
  /** Material Symbols ligature, for the generic ones. */
  material?: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS = {
  instagram: { label: "Instagram", path: siInstagram.path, placeholder: "https://instagram.com/…" },
  facebook: { label: "Facebook", path: siFacebook.path, placeholder: "https://facebook.com/…" },
  youtube: { label: "YouTube", path: siYoutube.path, placeholder: "https://youtube.com/@…" },
  tiktok: { label: "TikTok", path: siTiktok.path, placeholder: "https://tiktok.com/@…" },
  whatsapp: { label: "WhatsApp", path: siWhatsapp.path, placeholder: "https://chat.whatsapp.com/…" },
  x: { label: "X", path: siX.path, placeholder: "https://x.com/…" },
  threads: { label: "Threads", path: siThreads.path, placeholder: "https://threads.net/@…" },
  spotify: { label: "Spotify", path: siSpotify.path, placeholder: "https://open.spotify.com/…" },
  applepodcasts: { label: "Apple Podcasts", path: siApplepodcasts.path, placeholder: "https://podcasts.apple.com/…" },
  vimeo: { label: "Vimeo", path: siVimeo.path, placeholder: "https://vimeo.com/…" },
  snapchat: { label: "Snapchat", path: siSnapchat.path, placeholder: "https://snapchat.com/add/…" },
  discord: { label: "Discord", path: siDiscord.path, placeholder: "https://discord.gg/…" },
  telegram: { label: "Telegram", path: siTelegram.path, placeholder: "https://t.me/…" },
  email: { label: "Email", material: "mail", placeholder: "hello@destinytees.uk" },
  phone: { label: "Phone", material: "call", placeholder: "01642 …" },
  website: { label: "Website", material: "language", placeholder: "https://…" },
} satisfies Record<string, SocialPlatform>;

export type SocialKey = keyof typeof SOCIAL_PLATFORMS;
export const SOCIAL_KEYS = Object.keys(SOCIAL_PLATFORMS) as [SocialKey, ...SocialKey[]];

/**
 * Turn what an admin typed into an href: a bare address becomes mailto:, a
 * bare number becomes tel:. Everything else is left for safeHref to judge.
 */
export function normaliseSocialUrl(platform: SocialKey, value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (platform === "email" && !/^mailto:/i.test(v)) return `mailto:${v}`;
  if (platform === "phone" && !/^tel:/i.test(v)) return `tel:${v.replace(/[^\d+]/g, "")}`;
  return v;
}
