import type { AnyBlockDefinition } from "./types";

/**
 * The block wire format.
 *
 * A block serialises into the page's HTML string as a single EMPTY, TOP-LEVEL
 * div, with all of its state as JSON in an attribute:
 *
 *   <div data-block="faq" data-block-version="1" data-props="{&quot;heading&quot;:…}"></div>
 *
 * That shape is what lets `RichContent` split the stored HTML with a regex
 * instead of pulling in an HTML parser. Two invariants make the regex exact
 * rather than merely probable, and BOTH must hold:
 *
 * ── Invariant 1: the attribute value never contains " < or > ──
 *
 * `Editor.getHTML()` serialises through the real DOM (`DOMSerializer` +
 * `innerHTML`). Per the HTML serialisation spec, attribute values get exactly
 * three escapes: & → &amp;, " → &quot;, U+00A0 → &nbsp;. Critically, `<` and
 * `>` are NOT escaped in attribute values — a `>` inside `data-props` would
 * terminate the tag as far as a naive regex is concerned.
 *
 * So `encodeProps` escapes them itself, as JSON `<` / `>` (plus the
 * U+2028/U+2029 line separators, which are valid in JSON strings but break
 * JavaScript string literals). `"` is left to the DOM serialiser. The result
 * provably matches /^[^"<>]*$/, which is exactly what BLOCK_RE relies on.
 *
 * ── Invariant 2: a block can never nest ──
 *
 * Enforced in the ProseMirror schema, not by convention. Blocks belong to the
 * `dcblock` group and `Document` is extended to `content: "(block | dcblock)+"`.
 * Since `blockquote` and `listItem` declare `content: "block+"`, a block inside
 * one of them is structurally impossible. See `components/admin/blocks/
 * BlockDocument.ts`.
 *
 * `tests/unit/blocks-serialize.spec.ts` and `blocks-wire-format.spec.ts` guard
 * both invariants, and `RichContent` has a dev-mode canary for drift.
 */

/**
 * Matches one serialised block.
 *
 * Attribute order is pinned by a hand-written `renderHTML` in
 * `createBlockNode` — deliberately NOT `mergeAttributes`, which would let the
 * order drift and silently stop this from matching.
 */
export const BLOCK_RE =
  /<div data-block="([a-z0-9-]+)" data-block-version="(\d+)" data-props="([^"<>]*)"><\/div>/g;

/**
 * Serialise props for the `data-props` attribute.
 *
 * Escapes `<`, `>` and the U+2028/9 separators; leaves `"` and `&` to the DOM
 * serialiser, which will emit them as `&quot;` / `&amp;`.
 */
export function encodeProps(props: unknown): string {
  const json = JSON.stringify(props ?? {})
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  if (process.env.NODE_ENV !== "production" && /[<>]/.test(json)) {
    // Unreachable unless JSON.stringify changes behaviour. Loud in dev because
    // shipping this would corrupt every page the block appears on.
    throw new Error(
      "encodeProps invariant broken: serialised props contain < or >",
    );
  }
  return json;
}

const ENTITIES: Record<string, string> = {
  quot: '"',
  amp: "&",
  nbsp: "\u00a0",
  lt: "<",
  gt: ">",
  "#39": "'",
  apos: "'",
};

/**
 * Undo the DOM's attribute escaping.
 *
 * Single pass, deliberately. A sequential chain — `.replace("&amp;", "&")` then
 * `.replace("&quot;", '"')` — double-decodes: the literal text `&quot;` is
 * stored as `&amp;quot;`, and the chain would turn it into `"` instead of
 * `&quot;`. One combined regex visits each entity exactly once.
 */
export function unescapeAttr(value: string): string {
  return value.replace(
    /&(quot|amp|nbsp|lt|gt|#39|apos);/g,
    (_match, entity: string) => ENTITIES[entity] ?? _match,
  );
}

/**
 * Parse a `data-props` value back into typed props.
 *
 * Never throws and never returns a partial object: on any failure it falls back
 * to the block's defaults so a malformed attribute renders an empty block
 * rather than crashing the page.
 *
 * `raw` must already be entity-decoded — the editor gets that for free from
 * `getAttribute()`, the public renderer must call `unescapeAttr` first.
 */
export function decodeProps<P extends Record<string, unknown>>(
  def: AnyBlockDefinition,
  raw: string | null | undefined,
  storedVersion?: number,
): P {
  if (!raw) return def.defaults as P;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return def.defaults as P;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return def.defaults as P;
  }

  const version =
    typeof storedVersion === "number" && Number.isFinite(storedVersion)
      ? storedVersion
      : def.version;

  let candidate = parsed as Record<string, unknown>;
  if (version < def.version && def.migrate) {
    try {
      candidate = def.migrate(version, candidate);
    } catch {
      return def.defaults as P;
    }
  }

  // Spread over defaults so props authored before a field existed still parse.
  // This is why every schema key must carry a `.default()`.
  const result = def.schema.safeParse({ ...def.defaults, ...candidate });
  return result.success ? (result.data as P) : (def.defaults as P);
}
