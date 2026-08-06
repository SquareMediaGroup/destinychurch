import type { ReactNode } from "react";
import { BLOCKS } from "@/components/blocks/registry";
import { BLOCK_RE, decodeProps, unescapeAttr } from "@/components/blocks/serialize";

/**
 * Renders admin-authored rich text, upgrading any embedded content blocks into
 * real React components.
 *
 * This replaces the bare `dangerouslySetInnerHTML` that every rich-text surface
 * used to do. Stored content is a single HTML string; blocks live inside it as
 * empty `<div data-block=… data-props=…>` markers (see
 * `components/blocks/serialize.ts` for the format and why it's regex-splittable
 * rather than needing an HTML parser).
 *
 * The component is deliberately NOT "use client". Block components are shared
 * modules, so on a public page they server-render to plain HTML with zero
 * client JS, while the very same modules render inside the editor's React
 * NodeView. That is what makes the editor genuinely WYSIWYG.
 */
export default function RichContent({
  html,
  className,
  jsonLd = true,
}: {
  html: string | null | undefined;
  /** Applied to the wrapper. Callers pass `rte-content` plus type utilities. */
  className?: string;
  /**
   * Emit the schema.org JSON-LD contributed by blocks. Turn off on pages that
   * already emit their own primary entity (e.g. shop products).
   */
  jsonLd?: boolean;
}) {
  if (!html) return null;

  /*
   * Safety valve.
   *
   * Content with no blocks — which is every post, job, training post and
   * product description authored before this feature — takes the exact code
   * path it took before, byte for byte. That makes adopting RichContent across
   * all five surfaces a provable no-op rather than a leap of faith, and it
   * means a bug in the splitting logic below can never affect legacy content.
   */
  if (!html.includes("data-block=")) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  const parts: ReactNode[] = [];
  const entities: Record<string, unknown>[] = [];
  let cursor = 0;
  let key = 0;
  let matched = 0;

  // BLOCK_RE is a module-level /g regex; matchAll doesn't mutate lastIndex the
  // way exec would, so it's safe to share.
  for (const match of html.matchAll(BLOCK_RE)) {
    const [full, name, version, rawProps] = match;
    const start = match.index ?? 0;
    matched += 1;

    if (start > cursor) {
      parts.push(
        <div
          key={key++}
          className="dc-html"
          dangerouslySetInnerHTML={{ __html: html.slice(cursor, start) }}
        />,
      );
    }

    const def = BLOCKS[name];
    if (def) {
      const props = decodeProps(def, unescapeAttr(rawProps), Number(version));
      const Component = def.Component;
      parts.push(
        <div key={key++} data-dc-block={name}>
          <Component {...props} mode="view" />
        </div>,
      );
      const entity = def.jsonLd?.(props);
      if (entity) entities.push(entity);
    }
    // Unknown block name — a rolled-back deploy, or a block removed from the
    // registry. Render nothing rather than raw markup or an error. The stored
    // HTML is untouched, so the block reappears the moment the code is back.

    cursor = start + full.length;
  }

  if (cursor < html.length) {
    parts.push(
      <div
        key={key++}
        className="dc-html"
        dangerouslySetInnerHTML={{ __html: html.slice(cursor) }}
      />,
    );
  }

  if (process.env.NODE_ENV !== "production" && matched === 0) {
    // We only get here when the sniff found `data-block=` but the regex matched
    // nothing — i.e. the serialised attribute order or shape has drifted away
    // from what `createBlockNode`'s renderHTML emits. Blocks would silently
    // vanish from the page, so make it loud in dev.
    console.warn(
      "[RichContent] content contains `data-block=` but no block matched BLOCK_RE — " +
        "the wire format has drifted. See components/blocks/serialize.ts.",
    );
  }

  return (
    <>
      <div className={className}>{parts}</div>
      {jsonLd && entities.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(mergeEntities(entities)) }}
        />
      )}
    </>
  );
}

/**
 * Combine per-block schema.org entities into one payload.
 *
 * Multiple FAQ blocks on a page must not emit multiple FAQPage entities —
 * Google treats that as invalid — so same-typed pages are merged by
 * concatenating their `mainEntity`.
 */
function mergeEntities(
  entities: Record<string, unknown>[],
): Record<string, unknown> | Record<string, unknown>[] {
  const byType = new Map<string, Record<string, unknown>>();
  const passthrough: Record<string, unknown>[] = [];

  for (const entity of entities) {
    const type = typeof entity["@type"] === "string" ? (entity["@type"] as string) : null;
    const mainEntity = entity.mainEntity;

    if (!type || !Array.isArray(mainEntity)) {
      passthrough.push(entity);
      continue;
    }
    const existing = byType.get(type);
    if (existing) {
      (existing.mainEntity as unknown[]).push(...mainEntity);
    } else {
      byType.set(type, { ...entity, mainEntity: [...mainEntity] });
    }
  }

  const all = [...byType.values(), ...passthrough].map((entity) => ({
    "@context": "https://schema.org",
    ...entity,
  }));
  return all.length === 1 ? all[0] : all;
}
