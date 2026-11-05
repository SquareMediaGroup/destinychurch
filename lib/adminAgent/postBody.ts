// Post bodies DestinyAI writes. Client-safe and pure.
//
// The model never writes HTML: it sends plain-text sections and this escapes
// every character that could become markup, so nothing it produces (or read
// from somewhere, such as a post title) reaches a public page as HTML.

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text sections to the editor's HTML: <h2> headings and <p> paragraphs. */
export function buildBody(sections: { heading?: string; paragraphs: string[] }[]): string {
  return sections
    .map((section) => {
      const heading = section.heading?.trim() ? `<h2>${escapeHtml(section.heading.trim())}</h2>` : "";
      const paragraphs = section.paragraphs
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      return heading + paragraphs;
    })
    .join("");
}
