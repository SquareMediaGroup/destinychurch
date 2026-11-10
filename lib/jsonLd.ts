/**
 * The text for a `<script type="application/ld+json">` block.
 *
 * JSON.stringify leaves "<" alone, so a value containing "</script>" would end
 * the block and whatever followed would be parsed as page markup. Writing "<"
 * as < keeps the JSON identical to a parser and inert to the HTML one.
 * Use this for every JSON-LD block, including ones built from fixed data, so
 * the safe form is the only form in the codebase.
 */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
