import { test, expect } from "@playwright/test";
import { BLOCK_LIST } from "../../components/blocks/registry";
import { BLOCK_RE, encodeProps, unescapeAttr, decodeProps } from "../../components/blocks/serialize";

/**
 * The tripwire for attribute-order drift.
 *
 * `createBlockNode`'s renderHTML writes the block div by hand rather than via
 * `mergeAttributes`, precisely so the attribute order can't change. If someone
 * "tidies" it back to mergeAttributes, or an extension starts injecting an
 * attribute, BLOCK_RE stops matching and every block silently disappears from
 * every public page. This test fails first.
 *
 * Mirrors renderHTML exactly — keep the two in step.
 */
function serialiseAsRenderHtmlDoes(name: string, version: number, props: unknown): string {
  const attributes: Record<string, string> = {
    "data-block": name,
    "data-block-version": String(version),
    "data-props": encodeProps(props),
  };
  // How a browser's DOM serialiser writes an attribute value: & and " escaped,
  // < and > deliberately NOT — which is why encodeProps handles those itself.
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const pairs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${escape(value)}"`)
    .join(" ");
  return `<div ${pairs}></div>`;
}

test("each registered block matches BLOCK_RE with correct captures", () => {
  for (const block of BLOCK_LIST) {
    const html = serialiseAsRenderHtmlDoes(block.name, block.version, block.defaults);
    const matches = [...html.matchAll(BLOCK_RE)];

    expect(matches, `${block.name} did not match BLOCK_RE`).toHaveLength(1);
    const [, name, version, rawProps] = matches[0];
    expect(name).toBe(block.name);
    expect(Number(version)).toBe(block.version);

    const decoded = decodeProps(block, unescapeAttr(rawProps), Number(version));
    expect(decoded).toEqual(block.schema.parse(block.defaults));
  }
});

test("blocks are found among surrounding prose, in order", () => {
  const [first] = BLOCK_LIST;
  const one = serialiseAsRenderHtmlDoes(first.name, first.version, first.defaults);
  const html =
    `<h2>Heading</h2><p>Intro &amp; more</p>${one}` +
    `<p>Between "quoted" text</p><ul><li>a &lt; b</li></ul>${one}<p>End</p>`;

  const matches = [...html.matchAll(BLOCK_RE)];
  expect(matches).toHaveLength(2);
  expect(matches[0].index).toBeLessThan(matches[1].index!);

  // The prose between the two blocks must come back intact — that's the part
  // RichContent hands to dangerouslySetInnerHTML.
  const between = html.slice(
    matches[0].index! + matches[0][0].length,
    matches[1].index!,
  );
  expect(between).toBe('<p>Between "quoted" text</p><ul><li>a &lt; b</li></ul>');
});

test("prose containing angle brackets never swallows a block", () => {
  const [first] = BLOCK_LIST;
  const one = serialiseAsRenderHtmlDoes(first.name, first.version, first.defaults);
  const html = `<p>if a &lt; b &amp;&amp; c &gt; d</p>${one}<p>x</p>`;
  expect([...html.matchAll(BLOCK_RE)]).toHaveLength(1);
});

test("attribute order is exactly block, version, props", () => {
  const [first] = BLOCK_LIST;
  const html = serialiseAsRenderHtmlDoes(first.name, first.version, first.defaults);
  expect(html.indexOf("data-block=")).toBeLessThan(html.indexOf("data-block-version="));
  expect(html.indexOf("data-block-version=")).toBeLessThan(html.indexOf("data-props="));
  // Self-closing or attribute-bearing variants would break the regex too.
  expect(html.endsWith("></div>")).toBe(true);
});

test("BLOCK_RE ignores a div that only looks like a block", () => {
  for (const html of [
    '<div data-block="faq"></div>', // no version/props
    '<div data-block="faq" data-props="{}" data-block-version="1"></div>', // wrong order
    '<div data-block="Faq" data-block-version="1" data-props="{}"></div>', // uppercase
    '<div data-block="faq" data-block-version="x" data-props="{}"></div>', // non-numeric
    '<div data-block="faq" data-block-version="1" data-props="{}">text</div>', // not empty
  ]) {
    expect([...html.matchAll(BLOCK_RE)], html).toHaveLength(0);
  }
});
