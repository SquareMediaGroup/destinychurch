// The pre-publish checklist for Posts: things worth a second look before a page
// goes live. Warnings, never blockers — the editor shows them in Page settings
// all the time, and asks once ("Publish anyway?") when a draft is published.
//
// Pure and client-safe so the editor can run it on every change, and so it can
// be unit-tested without a browser. Blocks are read with the same regex the
// public renderer uses (components/blocks/serialize.ts).
import { BLOCK_RE, unescapeAttr } from "@/components/blocks/serialize";
import type { PostFields } from "@/lib/posts";
import { DESCRIPTION_LIMIT } from "@/lib/posts";

export interface ChecklistItem {
  id: string;
  /** One plain sentence saying what to fix. */
  message: string;
}

/** Google cuts titles off at about this many characters. */
export const TITLE_LIMIT = 60;

type Fields = Pick<
  PostFields,
  "title" | "body" | "description" | "og_image_url" | "hero_style" | "hero_image_url"
>;

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Images in the body (outside blocks) with no alt text, or an empty one. */
export function countImagesWithoutAlt(html: string): number {
  const withoutBlocks = html.replace(BLOCK_RE, "");
  let missing = 0;
  for (const [tag] of withoutBlocks.matchAll(/<img\b[^>]*>/gi)) {
    const alt = /\salt="([^"]*)"/i.exec(tag)?.[1];
    if (!alt || !alt.trim()) missing++;
  }
  return missing;
}

interface BlockScan {
  emptyButtons: number;
  galleryImagesWithoutAlt: number;
}

function scanBlocks(html: string): BlockScan {
  const scan: BlockScan = { emptyButtons: 0, galleryImagesWithoutAlt: 0 };
  for (const [, name, , rawProps] of html.matchAll(BLOCK_RE)) {
    let props: Record<string, unknown>;
    try {
      props = JSON.parse(unescapeAttr(rawProps));
    } catch {
      continue;
    }
    const items = Array.isArray(props.items) ? (props.items as Record<string, unknown>[]) : [];
    if (name === "buttons") {
      // An empty link renders as plain, unclickable text on the public page.
      scan.emptyButtons += items.filter((i) => !String(i.href ?? "").trim()).length;
    }
    if (name === "gallery") {
      scan.galleryImagesWithoutAlt += items.filter(
        (i) => String(i.src ?? "").trim() && !String(i.alt ?? "").trim(),
      ).length;
    }
  }
  return scan;
}

export function postChecklist(fields: Fields): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const body = fields.body ?? "";
  const title = fields.title.trim();
  const description = (fields.description ?? "").trim();

  const hasText = body.replace(/<[^>]*>/g, "").trim().length > 0;
  const hasMedia = /data-block=|<img\b|<iframe\b/i.test(body);
  if (!hasText && !hasMedia) {
    items.push({ id: "empty", message: "The page has no content yet." });
  }

  if (title.length > TITLE_LIMIT) {
    items.push({
      id: "title-long",
      message: `The title is ${title.length} characters. Google shows about ${TITLE_LIMIT}, so it may be cut off.`,
    });
  }
  if (!description) {
    items.push({
      id: "no-description",
      message: "Add a description. Google and WhatsApp show it under the title.",
    });
  } else if (description.length > DESCRIPTION_LIMIT) {
    items.push({
      id: "description-long",
      message: `The description is over ${DESCRIPTION_LIMIT} characters, so search results will cut it off.`,
    });
  }
  const hasShareImage = Boolean(fields.og_image_url || (fields.hero_style === "image" && fields.hero_image_url));
  if (!hasShareImage) {
    items.push({
      id: "no-share-image",
      message: "Add a share image. Without one, shared links show no picture.",
    });
  }

  const noAlt = countImagesWithoutAlt(body);
  const blocks = scanBlocks(body);
  const totalNoAlt = noAlt + blocks.galleryImagesWithoutAlt;
  if (totalNoAlt > 0) {
    items.push({
      id: "image-alt",
      message: `${plural(totalNoAlt, "image has", "images have")} no description for people using screen readers.`,
    });
  }
  if (blocks.emptyButtons > 0) {
    items.push({
      id: "empty-buttons",
      message: `${plural(blocks.emptyButtons, "button has", "buttons have")} no link, so ${
        blocks.emptyButtons === 1 ? "it shows" : "they show"
      } as plain text.`,
    });
  }
  return items;
}
