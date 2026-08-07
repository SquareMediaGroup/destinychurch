import { notFound } from "next/navigation";
import { BLOCK_LIST } from "@/components/blocks/registry";
import { encodeProps } from "@/components/blocks/serialize";
import RichContent from "@/components/content/RichContent";

/**
 * Development-only gallery of every registered content block.
 *
 * Renders each block through the real public pipeline — serialised to the wire
 * format, then parsed back by RichContent — rather than by importing the
 * components directly. That means this page exercises the same code path a live
 * post does, so it catches serialisation and CSS problems, not just component
 * bugs.
 *
 * Useful when building a block (no need to create a draft post to look at it),
 * and it is how the block CSS gets verified against the real `.rte-content`
 * cascade.
 */
export const dynamic = "force-static";

export default function DevBlocksPage() {
  // Never reachable in production — this exposes nothing sensitive, but it
  // isn't content and shouldn't be indexed or linked.
  if (process.env.NODE_ENV === "production") notFound();

  // Built exactly as createBlockNode's renderHTML would, including the DOM's
  // own attribute escaping.
  const html = BLOCK_LIST.map((block) => {
    const props = encodeProps(fillBlanks(block.defaults))
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    return (
      `<h2>${block.label}</h2>` +
      `<p>Prose before the block, with an &amp; and a &lt;tag&gt; to prove ` +
      `the surrounding markup survives the split.</p>` +
      `<div data-block="${block.name}" data-block-version="${block.version}" data-props="${props}"></div>` +
      `<p>Prose after the block.</p>`
    );
  }).join("");

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-black text-destiny-grey">Block gallery</h1>
      <p className="mt-1 text-sm text-destiny-grey/55">
        Development only. {BLOCK_LIST.length} block
        {BLOCK_LIST.length === 1 ? "" : "s"} rendered through RichContent at
        their default settings.
      </p>

      <RichContent
        html={html}
        className="rte-content mt-8 text-[0.97rem] text-destiny-grey/80"
      />
    </main>
  );
}

/**
 * Replace empty strings in a block's defaults with placeholder copy.
 *
 * Seeded defaults leave optional text blank on purpose — an author should see
 * prompts, not invented facts about the church. But that also means features
 * gated on having content (the FAQ's JSON-LD needs a filled-in answer) never
 * fire, so the gallery fills the blanks with obvious placeholder text.
 */
function fillBlanks<T>(value: T): T {
  if (typeof value === "string") {
    return (value === "" ? "Example text for previewing this block." : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(fillBlanks) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        // ids are structural, not copy.
        key === "id" ? inner : fillBlanks(inner),
      ]),
    ) as T;
  }
  return value;
}
