import { test, expect } from "@playwright/test";
import { blockSize, hasWideBlocks } from "../../components/blocks/size";
import { encodeProps } from "../../components/blocks/serialize";
import { BLOCKS } from "../../components/blocks/registry";
import { extractPostLinks, isPrivateHost } from "../../lib/postLinks";
import { promoteHref, readPromote } from "../../lib/promote";
import { POST_TEMPLATES } from "../../lib/postTemplates";

/** The editor round of Posts: block widths, the link check's parsing, and promote links. */

function block(name: string, props: unknown) {
  // What Editor.getHTML() produces: the DOM serialiser escapes " and &.
  const attr = encodeProps(props).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<div data-block="${name}" data-block-version="1" data-props="${attr}"></div>`;
}

test.describe("block widths", () => {
  test("blockSize falls back to normal for anything unknown", () => {
    expect(blockSize({ size: "wide" })).toBe("wide");
    expect(blockSize({ size: "full" })).toBe("full");
    expect(blockSize({ size: "huge" })).toBe("normal");
    expect(blockSize({})).toBe("normal");
    expect(blockSize(null)).toBe("normal");
  });

  test("hasWideBlocks spots a wide or full block and ignores the rest", () => {
    expect(hasWideBlocks(null)).toBe(false);
    expect(hasWideBlocks("<p>Just text</p>")).toBe(false);
    expect(hasWideBlocks(block("gallery", { images: [] }))).toBe(false);
    expect(hasWideBlocks(block("gallery", { size: "normal" }))).toBe(false);
    expect(hasWideBlocks(`<p>Hi</p>${block("video", { size: "full" })}`)).toBe(true);
    expect(hasWideBlocks(block("card-grid", { size: "wide" }))).toBe(true);
  });

  test("blocks that take a width parse old content as normal", () => {
    for (const name of ["gallery", "card-grid", "video"]) {
      const def = BLOCKS[name];
      const parsed = def.schema.parse(def.defaults as object) as { size?: string };
      expect(parsed.size, name).toBe("normal");
    }
  });

  test("the Landing template uses wide blocks", () => {
    const landing = POST_TEMPLATES.find((t) => t.id === "landing");
    expect(landing).toBeTruthy();
    expect(hasWideBlocks(landing!.fields.body)).toBe(true);
  });
});

test.describe("link check", () => {
  test("finds text links and block links once each", () => {
    const html =
      `<p><a href="https://example.com/a?x=1&amp;y=2">A</a> and <a href="/easter">Easter</a></p>` +
      block("buttons", { items: [{ label: "Sign up", href: "/easter" }, { label: "Give", href: "/give" }] }) +
      block("card-grid", { items: [{ title: "Kids", href: "https://example.com/kids" }] });
    expect(extractPostLinks(html)).toEqual([
      { href: "https://example.com/a?x=1&y=2", where: "Text link" },
      { href: "/easter", where: "Text link" },
      { href: "/give", where: "Button “Give”" },
      { href: "https://example.com/kids", where: "Card “Kids”" },
    ]);
  });

  test("private and internal hosts are refused, public ones aren't", () => {
    for (const host of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.1", "169.254.169.254", "[::1]", "fd00::1", "::ffff:7f00:1", "db.internal"]) {
      expect(isPrivateHost(host), host).toBe(true);
    }
    for (const host of ["destinytees.uk", "example.com", "8.8.8.8", "fcbarcelona.com", "fd.example.org", "2606:4700::1111"]) {
      expect(isPrivateHost(host), host).toBe(false);
    }
  });
});

test.describe("promote", () => {
  test("round-trips a page's details", () => {
    const href = promoteHref("popup", {
      title: "Easter & more",
      text: "Services all weekend.",
      link: "/easter",
      image: "https://cdn.example.com/a.webp",
    });
    expect(href.startsWith("/admin/popup?")).toBe(true);
    expect(readPromote(href.slice(href.indexOf("?")))).toEqual({
      title: "Easter & more",
      text: "Services all weekend.",
      link: "/easter",
      image: "https://cdn.example.com/a.webp",
    });
  });

  test("ignores anything that isn't a promote link, and unsafe values", () => {
    expect(readPromote("?title=x")).toBeNull();
    expect(readPromote("?promote=1&title=x&link=javascript:alert(1)")).toBeNull();
    expect(readPromote("?promote=1&title=x&link=//evil.example")).toBeNull();
    expect(readPromote("?promote=1&title=x&link=/a&image=http://insecure/a.png")?.image).toBeNull();
  });
});
