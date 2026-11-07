import { NextResponse } from "next/server";
import { getOpenAI, SMART_SEARCH_MODEL } from "@/lib/openaiClient";
import { DESCRIPTION_LIMIT } from "@/lib/posts";

// audit-exempt: returns a suggestion for the admin to read and edit; nothing
// is saved. Whatever they keep is audited when the post is saved.

/**
 * Writing help in the Posts editor. Always a suggestion the admin edits, never
 * applied automatically.
 *
 *   { kind: "description", title, body }  → a meta description from the page
 *   { kind: "alt", src }                  → alt text for an image (vision)
 */
const SYSTEM = `You help staff at Destiny Church, a church in Stockton-on-Tees, UK, write their website.
Write in plain, warm British English. No emojis, no hashtags, no quotation marks around the answer.`;

function textOf(html: string): string {
  return html
    .replace(/<div data-block=[^>]*><\/div>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

export async function POST(request: Request) {
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ error: "Writing help isn't set up on this site." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));

  try {
    if (body.kind === "description") {
      const title = typeof body.title === "string" ? body.title.slice(0, 200) : "";
      const text = textOf(typeof body.body === "string" ? body.body : "");
      if (!title && !text) {
        return NextResponse.json({ error: "Write some of the page first." }, { status: 400 });
      }
      const res = await openai.chat.completions.create({
        model: SMART_SEARCH_MODEL,
        temperature: 0.4,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Write a description of this web page for Google results and link previews. One or two sentences, under ${DESCRIPTION_LIMIT} characters. Say what it is and why someone would visit. Don't start with "Join us" or the page title.\n\nTitle: ${title}\n\nPage text: ${text}`,
          },
        ],
      });
      const suggestion = res.choices[0]?.message?.content?.trim().replace(/^"|"$/g, "") ?? "";
      return NextResponse.json({ suggestion });
    }

    if (body.kind === "alt") {
      const src = typeof body.src === "string" ? body.src : "";
      if (!/^https:\/\//.test(src)) return NextResponse.json({ error: "That image can't be read." }, { status: 400 });
      const res = await openai.chat.completions.create({
        model: SMART_SEARCH_MODEL,
        temperature: 0.2,
        max_tokens: 80,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Write alt text for this image on a church website: one short sentence describing what it shows, for someone using a screen reader. Don't start with \"Image of\" or \"Photo of\". Don't guess people's names.",
              },
              { type: "image_url", image_url: { url: src, detail: "low" } },
            ],
          },
        ],
      });
      const suggestion = res.choices[0]?.message?.content?.trim().replace(/^"|"$/g, "") ?? "";
      return NextResponse.json({ suggestion });
    }
  } catch (err) {
    console.error("⚠️ Posts writing help failed:", err);
    return NextResponse.json({ error: "Couldn't get a suggestion just now. Try again." }, { status: 502 });
  }

  return NextResponse.json({ error: "Unknown request." }, { status: 400 });
}
