// Sanitising ChurchSuite event descriptions for on-site rendering.
//
// SCOPE: this is hardening over an already-trusted source. Descriptions are
// written by church staff inside ChurchSuite; this is not a defence against a
// hostile input channel. If ChurchSuite ever becomes untrusted, this needs
// replacing with a real parser, not patching.
//
// The immediate job is presentational. The live feed carries markup written
// against ChurchSuite's own stylesheet — `<h2 class="branded">`,
// `<span style="font-size:18pt">`, `<span style="color:#f9c100">` (a yellow
// that is invisible on the site's white background) — which renders badly here.
// So the rewriter drops every attribute except `href`, rather than only
// guarding against scripts.
//
// Deliberately dependency-free: `isomorphic-dompurify` pulls jsdom into the
// server bundle, and a /whats-on route hitting the 250MB function limit is
// exactly what commit 2185023 had to unwind.

import { stripEmoji } from "./events";

/** Tags kept as-is. Everything else is remapped, unwrapped, or dropped. */
const ALLOWED = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "blockquote", "h3", "h4",
]);

/**
 * Tags rewritten to a supported equivalent. Feed descriptions open at `<h2>`,
 * which would outrank the page's own headings, so headings step down.
 */
const REMAP: Record<string, string> = {
  h1: "h3", h2: "h3", h5: "h4", h6: "h4", div: "p",
};

/** Tags dropped while keeping their text — the styling carriers. */
const UNWRAP = new Set(["span", "font", "section", "article", "small"]);

/** Elements whose *contents* go too, not just the tag. */
const STRIP_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "noscript"];

const NBSP = /&nbsp;|\u00a0/g;

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Rewrite feed HTML to a small allowlist of tags, dropping every attribute
 * except a validated `href`. Returns HTML safe to pass to
 * `dangerouslySetInnerHTML` within the caveats in the file header.
 */
export function sanitizeEventHtml(html: string | null | undefined): string {
  if (!html) return "";

  let working = html;

  // Elements whose contents must go with them. The `[^]` class matches across
  // newlines; the optional closing tag handles unbalanced feed markup.
  for (const tag of STRIP_WITH_CONTENT) {
    working = working.replace(
      new RegExp(`<${tag}\\b[^>]*>[^]*?(?:</${tag}>|$)`, "gi"),
      "",
    );
  }
  working = working.replace(/<!--[^]*?-->/g, "");

  const out: string[] = [];
  const openTags: string[] = [];
  const tagPattern = /<(\/)?([a-z][a-z0-9]*)\b([^>]*)>/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (!text) return;
    const normalised = text.replace(NBSP, " ");

    // `stripEmoji` trims, which is correct for a whole string but wrong for a
    // fragment: in `children <span>aged 4</span>` the space sits at the edge of
    // a text run, and dropping it renders "childrenaged". Remember whether the
    // run had edge whitespace and put it back.
    const lead = /^\s/.test(normalised) ? " " : "";
    const trail = /\s$/.test(normalised) ? " " : "";

    // Emoji are stripped from *text only*, so an emoji inside an href can
    // never corrupt the URL.
    const core = stripEmoji(normalised);
    if (core) out.push(`${lead}${core}${trail}`);
    else if (lead || trail) out.push(" ");
  };

  while ((match = tagPattern.exec(working)) !== null) {
    pushText(working.slice(cursor, match.index));
    cursor = tagPattern.lastIndex;

    const closing = Boolean(match[1]);
    const raw = match[2].toLowerCase();
    const attrs = match[3] ?? "";
    const tag = REMAP[raw] ?? raw;

    if (UNWRAP.has(tag)) continue;
    if (!ALLOWED.has(tag)) continue;

    if (closing) {
      // Only close a tag we actually opened, so remapped/unwrapped markup
      // cannot emit a stray closer.
      const index = openTags.lastIndexOf(tag);
      if (index === -1) continue;
      openTags.splice(index, 1);
      out.push(`</${tag}>`);
      continue;
    }

    if (tag === "br") {
      out.push("<br />");
      continue;
    }

    if (tag === "a") {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const value = (href?.[2] ?? href?.[3] ?? href?.[4] ?? "").trim();
      if (!SAFE_HREF.test(value)) {
        // Unusable or unsafe link (javascript:, data:, protocol-relative //):
        // keep the text, drop the anchor.
        continue;
      }
      const external = /^https?:\/\//i.test(value);
      out.push(
        external
          ? `<a href="${escapeAttr(value)}" target="_blank" rel="noopener noreferrer">`
          : `<a href="${escapeAttr(value)}">`,
      );
      openTags.push("a");
      continue;
    }

    out.push(`<${tag}>`);
    openTags.push(tag);
  }

  pushText(working.slice(cursor));

  // Close anything the feed left open, innermost first.
  for (let i = openTags.length - 1; i >= 0; i--) out.push(`</${openTags[i]}>`);

  return out
    .join("")
    .replace(/<p>\s*(<br \/>\s*)*<\/p>/gi, "")
    .replace(/(<br \/>\s*){3,}/gi, "<br /><br />")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
