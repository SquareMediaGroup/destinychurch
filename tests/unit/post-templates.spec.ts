import { test, expect } from "@playwright/test";
import { POST_TEMPLATES } from "../../lib/postTemplates";
import { BLOCK_RE, unescapeAttr } from "../../components/blocks/serialize";
import { BLOCKS } from "../../components/blocks/registry";
import { HERO_STYLES } from "../../lib/posts";

/**
 * Templates hand-assemble serialised blocks, so they're checked against the
 * same wire format RichContent parses. A template that drifts from a block's
 * schema would otherwise create posts with blocks that silently don't render.
 */

test("template ids are unique and Blank comes first", () => {
  const ids = POST_TEMPLATES.map((t) => t.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids[0]).toBe("blank");
});

for (const template of POST_TEMPLATES) {
  test(`${template.id}: every block matches the wire format and parses`, () => {
    const body = template.fields.body ?? "";
    const matches = [...body.matchAll(BLOCK_RE)];
    // Every data-block div in the body must be matched by the regex.
    expect(matches.length).toBe((body.match(/data-block=/g) ?? []).length);

    for (const [, name, version, rawProps] of matches) {
      const def = BLOCKS[name];
      expect(def, `unknown block ${name}`).toBeDefined();
      expect(Number(version)).toBe(def.version);
      // Parsed directly rather than via decodeProps, which falls back to the
      // block's defaults on failure and would hide exactly this bug.
      const props = JSON.parse(unescapeAttr(rawProps));
      const parsed = def.schema.safeParse(props);
      expect(parsed.success, `${name}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    }
  });

  test(`${template.id}: page settings are valid`, () => {
    const { hero_style } = template.fields;
    if (hero_style) expect(HERO_STYLES.map((s) => s.value)).toContain(hero_style);
  });
}
