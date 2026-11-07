import { test, expect } from "@playwright/test";
import { postChecklist, countImagesWithoutAlt, TITLE_LIMIT } from "../../lib/postChecklist";
import { normaliseTags, MAX_TAGS, MAX_TAG_LENGTH } from "../../lib/posts";
import { encodeProps } from "../../components/blocks/serialize";

/**
 * The Posts pre-publish checklist reads the stored HTML, including serialised
 * blocks, so these cases are built in the real wire format.
 */

function block(name: string, props: unknown) {
  // What Editor.getHTML() produces: the DOM serialiser escapes " and &.
  const attr = encodeProps(props).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<div data-block="${name}" data-block-version="1" data-props="${attr}"></div>`;
}

const complete = {
  title: "Easter at Destiny",
  body: "<p>Join us.</p>",
  description: "Services, kids' activities and an egg hunt.",
  og_image_url: "https://example.com/share.webp",
  hero_style: "plain" as const,
  hero_image_url: null,
};

const ids = (fields: Parameters<typeof postChecklist>[0]) => postChecklist(fields).map((i) => i.id);

test("a finished page has nothing to flag", () => {
  expect(postChecklist(complete)).toEqual([]);
});

test("an empty page is flagged, but a page that is only blocks is not", () => {
  expect(ids({ ...complete, body: "" })).toContain("empty");
  expect(ids({ ...complete, body: "<p></p>" })).toContain("empty");
  expect(ids({ ...complete, body: block("faq", { items: [] }) })).not.toContain("empty");
});

test("long titles and missing or long descriptions are flagged", () => {
  expect(ids({ ...complete, title: "x".repeat(TITLE_LIMIT + 1) })).toContain("title-long");
  expect(ids({ ...complete, description: "  " })).toContain("no-description");
  expect(ids({ ...complete, description: "x".repeat(200) })).toContain("description-long");
});

test("the header image counts as a share image only for the Image header", () => {
  const noShare = { ...complete, og_image_url: null };
  expect(ids(noShare)).toContain("no-share-image");
  expect(ids({ ...noShare, hero_style: "image", hero_image_url: "https://example.com/h.webp" })).not.toContain(
    "no-share-image",
  );
  expect(ids({ ...noShare, hero_style: "banner", hero_image_url: "https://example.com/h.webp" })).toContain(
    "no-share-image",
  );
});

test("images without alt text are counted, in the body and in galleries", () => {
  expect(countImagesWithoutAlt('<img src="a.webp"><img src="b.webp" alt=""><img src="c.webp" alt="A choir">')).toBe(2);
  const body =
    '<img src="a.webp">' +
    block("gallery", {
      items: [
        { id: "1", src: "x.webp", alt: "" },
        { id: "2", src: "y.webp", alt: "Baptism" },
        { id: "3", src: "", alt: "" }, // an empty slot isn't an image yet
      ],
    });
  const item = postChecklist({ ...complete, body }).find((i) => i.id === "image-alt");
  expect(item?.message).toMatch(/^2 images have/);
});

test("buttons with no link are flagged, because they render as plain text", () => {
  const body = block("buttons", {
    items: [
      { id: "a", label: "Sign up", href: "", style: "primary", icon: "" },
      { id: "b", label: "Info", href: "/info", style: "primary", icon: "" },
    ],
  });
  const item = postChecklist({ ...complete, body }).find((i) => i.id === "empty-buttons");
  expect(item?.message).toMatch(/^1 button has no link/);
});

test("tags are trimmed, de-duplicated without regard to case, and capped", () => {
  expect(normaliseTags(["Alpha", " alpha ", "", "Easter  2027", 7])).toEqual(["Alpha", "Easter 2027"]);
  expect(normaliseTags("Alpha")).toEqual([]);
  expect(normaliseTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(MAX_TAGS);
  expect(normaliseTags(["x".repeat(100)])[0]).toHaveLength(MAX_TAG_LENGTH);
});
