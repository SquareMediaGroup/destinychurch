import { test, expect } from "@playwright/test";
import {
  BLOCK_RE,
  decodeProps,
  encodeProps,
  unescapeAttr,
} from "../../components/blocks/serialize";
import type { AnyBlockDefinition } from "../../components/blocks/types";
import { z } from "zod";

/**
 * Guards the two invariants that let RichContent split stored HTML with a
 * regex instead of an HTML parser. If anything here fails, blocks will either
 * vanish from public pages or corrupt the markup around them.
 */

/** Strings chosen to break a naive implementation. */
const HOSTILE = [
  "<script>alert(1)</script>",
  '"quoted"',
  '\\"escaped quote\\"',
  "a & b",
  "&quot;",
  "&amp;",
  "&amp;quot;",
  "&lt;div&gt;",
  "5 > 3 && 2 < 4",
  "</div><div data-block=\"evil\">",
  "line\nbreak\r\nhere",
  "tab\there",
  "emoji 🎉 ✝ 中文",
  "\u2028line separator",
  "\u2029paragraph separator",
  "\u00a0non-breaking",
  "'single' ‘smart’ “quotes”",
  "back\\slash",
  "",
];

test("encodeProps never emits < or >", () => {
  for (const value of HOSTILE) {
    const encoded = encodeProps({ value });
    expect(encoded, `input: ${JSON.stringify(value)}`).not.toMatch(/[<>]/);
  }
  // Also at depth, and in keys.
  const nested = encodeProps({
    a: { b: [{ c: "<b>x</b>" }] },
    "<key>": ">value<",
  });
  expect(nested).not.toMatch(/[<>]/);
});

test("encodeProps escapes the JS line separators", () => {
  const encoded = encodeProps({ value: "a\u2028b\u2029c" });
  expect(encoded).toContain("\\u2028");
  expect(encoded).toContain("\\u2029");
  expect(encoded).not.toContain("\u2028");
  expect(encoded).not.toContain("\u2029");
});

test("props survive a full encode/decode round trip", () => {
  const def = makeDef();
  for (const value of HOSTILE) {
    const encoded = encodeProps({ ...def.defaults, text: value });
    const decoded = decodeProps<{ text: string }>(def, encoded);
    expect(decoded.text, `input: ${JSON.stringify(value)}`).toBe(value);
  }
});

test("round trip survives the DOM's own attribute escaping", () => {
  const def = makeDef();
  for (const value of HOSTILE) {
    const encoded = encodeProps({ ...def.defaults, text: value });
    // What a browser writes into the attribute…
    const asAttribute = encoded.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    // …and what RichContent reads back out.
    const decoded = decodeProps<{ text: string }>(def, unescapeAttr(asAttribute));
    expect(decoded.text, `input: ${JSON.stringify(value)}`).toBe(value);
  }
});

test("unescapeAttr decodes in a single pass", () => {
  // The regression this exists for: a sequential replace chain turns the stored
  // form of the literal text `&quot;` into `"` instead of back into `&quot;`.
  expect(unescapeAttr("&amp;quot;")).toBe("&quot;");
  expect(unescapeAttr("&amp;amp;")).toBe("&amp;");
  expect(unescapeAttr("&quot;hi&quot;")).toBe('"hi"');
  expect(unescapeAttr("a &amp; b")).toBe("a & b");
  expect(unescapeAttr("&lt;b&gt;")).toBe("<b>");
  expect(unescapeAttr("&nbsp;")).toBe("\u00a0");
  expect(unescapeAttr("&unknown;")).toBe("&unknown;");
});

test("a serialised block always matches BLOCK_RE exactly once", () => {
  const def = makeDef();
  for (const value of HOSTILE) {
    const encoded = encodeProps({ ...def.defaults, text: value });
    const attribute = encoded.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    const html = `<p>before</p><div data-block="demo" data-block-version="1" data-props="${attribute}"></div><p>after</p>`;

    const matches = [...html.matchAll(BLOCK_RE)];
    expect(matches, `input: ${JSON.stringify(value)}`).toHaveLength(1);
    expect(matches[0][1]).toBe("demo");
    expect(matches[0][2]).toBe("1");

    const decoded = decodeProps<{ text: string }>(def, unescapeAttr(matches[0][3]));
    expect(decoded.text).toBe(value);
  }
});

test("decodeProps falls back to defaults rather than throwing", () => {
  const def = makeDef();
  for (const bad of [null, undefined, "", "not json", "[1,2,3]", '"a string"', "123"]) {
    expect(decodeProps(def, bad as string | null)).toEqual(def.defaults);
  }
});

test("decodeProps fills in fields added after the content was authored", () => {
  const def = makeDef();
  // Authored before `count` existed.
  const decoded = decodeProps<{ text: string; count: number }>(
    def,
    JSON.stringify({ text: "kept" }),
  );
  expect(decoded.text).toBe("kept");
  expect(decoded.count).toBe(0);
});

test("decodeProps runs migrate for older versions only", () => {
  const calls: number[] = [];
  const def: AnyBlockDefinition = {
    ...makeDef(),
    version: 3,
    migrate: (from, raw) => {
      calls.push(from);
      return { ...raw, text: `migrated-${from}` };
    },
  };

  expect(decodeProps<{ text: string }>(def, JSON.stringify({ text: "x" }), 1).text)
    .toBe("migrated-1");
  expect(decodeProps<{ text: string }>(def, JSON.stringify({ text: "x" }), 3).text)
    .toBe("x");
  expect(calls).toEqual([1]);
});

test("large payloads round-trip", () => {
  const def = makeDef();
  const items = Array.from({ length: 200 }, (_, i) => `item <${i}> & "more"`);
  const encoded = encodeProps({ ...def.defaults, text: items.join("|") });
  expect(encoded).not.toMatch(/[<>]/);
  expect(decodeProps<{ text: string }>(def, encoded).text).toBe(items.join("|"));
});

function makeDef(): AnyBlockDefinition {
  return {
    name: "demo",
    version: 1,
    label: "Demo",
    icon: "circle",
    category: "content",
    description: "Test fixture.",
    width: "column",
    schema: z.object({
      text: z.string().default(""),
      count: z.number().default(0),
    }),
    defaults: { text: "", count: 0 },
    fields: [],
    Component: () => null,
  };
}
