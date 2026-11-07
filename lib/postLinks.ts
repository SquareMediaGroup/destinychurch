// Every link a post body points at: <a href> in the text, plus the links inside
// blocks (buttons, cards). Pure and client-safe, so it can be unit-tested and
// reused; the network checking lives in app/api/admin/posts/check-links.
import { BLOCK_RE, unescapeAttr } from "@/components/blocks/serialize";

export interface PostLink {
  href: string;
  /** Where it is, in the editor's words: "Text link", "Button “Sign up”". */
  where: string;
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export function extractPostLinks(html: string | null | undefined): PostLink[] {
  if (!html) return [];
  const links: PostLink[] = [];
  const text = html.replace(BLOCK_RE, "");
  for (const [, href] of text.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)) {
    if (href.trim()) links.push({ href: decode(href.trim()), where: "Text link" });
  }
  for (const [, name, , rawProps] of html.matchAll(BLOCK_RE)) {
    let props: Record<string, unknown>;
    try {
      props = JSON.parse(unescapeAttr(rawProps));
    } catch {
      continue;
    }
    const items = Array.isArray(props.items) ? (props.items as Record<string, unknown>[]) : [];
    for (const item of items) {
      const href = String(item.href ?? "").trim();
      if (!href) continue;
      if (name === "buttons") links.push({ href, where: `Button “${String(item.label ?? "").trim() || "untitled"}”` });
      else if (name === "card-grid") links.push({ href, where: `Card “${String(item.title ?? "").trim() || "untitled"}”` });
    }
  }
  // One check per URL, keeping the first place it appears.
  const seen = new Set<string>();
  return links.filter((l) => (seen.has(l.href) ? false : (seen.add(l.href), true)));
}

/**
 * Hosts a server-side link check must never fetch: loopback, private and
 * link-local ranges, and internal names. The check runs on admin input, but
 * it's still a server making requests on someone's behalf.
 */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h.includes(":")) {
    // IPv6 literal. An IPv4-mapped address is judged by its IPv4 part.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
    if (mapped) return isPrivateHost(mapped[1]);
    return h === "::" || h === "::1" || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith("::ffff:");
  }
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}
