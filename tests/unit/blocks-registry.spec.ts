import { test, expect } from "@playwright/test";
import { BLOCK_CATEGORIES, BLOCK_LIST, BLOCKS, blockNameFromNode, nodeNameFor } from "../../components/blocks/registry";

/**
 * Integrity checks for every registered block.
 *
 * These are what keep "one registry entry drives everything" honest. The field
 * schema deliberately types `name` as a plain string rather than `keyof P` —
 * a fully-typed version needs a builder DSL and fights the repeater — so the
 * link between a field and the prop it edits is verified here instead. A typo
 * in a field name would otherwise produce an inspector control that silently
 * edits nothing.
 */

test("the registry is non-empty and consistent", () => {
  expect(BLOCK_LIST.length).toBeGreaterThan(0);
  expect(Object.keys(BLOCKS)).toHaveLength(BLOCK_LIST.length);
  for (const block of BLOCK_LIST) {
    expect(BLOCKS[block.name]).toBe(block);
  }
});

test("block names are unique, kebab-case and node-name safe", () => {
  const seen = new Set<string>();
  for (const block of BLOCK_LIST) {
    expect(block.name, `"${block.name}" must be kebab-case`).toMatch(
      /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
    );
    expect(seen.has(block.name), `duplicate block name "${block.name}"`).toBe(false);
    seen.add(block.name);

    // The kebab ⇄ snake bridge must be lossless in both directions.
    expect(blockNameFromNode(nodeNameFor(block.name))).toBe(block.name);
  }
});

test("every block's defaults parse against its own schema", () => {
  for (const block of BLOCK_LIST) {
    const result = block.schema.safeParse(block.defaults);
    expect(result.success, `${block.name}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
  }
});

test("an empty object parses, proving every schema key has a default", () => {
  // This is what makes content authored before a field existed keep working.
  for (const block of BLOCK_LIST) {
    const result = block.schema.safeParse({});
    expect(result.success, `${block.name} has a schema key without .default()`).toBe(true);
  }
});

test("every field edits a prop that actually exists", () => {
  for (const block of BLOCK_LIST) {
    const defaults = block.defaults as Record<string, unknown>;
    for (const field of block.fields) {
      expect(
        Object.prototype.hasOwnProperty.call(defaults, field.name),
        `${block.name}: field "${field.name}" is not a key of defaults`,
      ).toBe(true);

      if (field.kind === "repeater") {
        for (const itemField of field.itemFields) {
          expect(
            Object.prototype.hasOwnProperty.call(field.itemDefaults, itemField.name),
            `${block.name}.${field.name}: item field "${itemField.name}" is not a key of itemDefaults`,
          ).toBe(true);
          // The type union forbids this, but a hand-built schema could still
          // slip one through and the renderer throws at runtime if it does.
          expect(
            (itemField as { kind: string }).kind,
            `${block.name}: nested repeaters are not supported`,
          ).not.toBe("repeater");
        }
        // Rows get an id injected on add; it must not collide with a field.
        expect(Object.keys(field.itemDefaults)).not.toContain("id");
      }
    }
  }
});

test("field names are unique within a block", () => {
  for (const block of BLOCK_LIST) {
    const names = block.fields.map((field) => field.name);
    expect(new Set(names).size, `${block.name} has duplicate field names`).toBe(names.length);
  }
});

test("every block declares a known category and a non-empty icon", () => {
  const known = new Set(BLOCK_CATEGORIES.map((category) => category.id));
  for (const block of BLOCK_LIST) {
    expect(known.has(block.category), `${block.name}: unknown category "${block.category}"`).toBe(true);
    expect(block.icon.trim().length, `${block.name} needs an icon`).toBeGreaterThan(0);
    expect(block.description.trim().length, `${block.name} needs a description`).toBeGreaterThan(0);
    expect(["column", "wide"]).toContain(block.width);
    expect(block.version).toBeGreaterThanOrEqual(1);
  }
});

test("summary and jsonLd survive defaults and empty props", () => {
  for (const block of BLOCK_LIST) {
    const empty = block.schema.parse({});
    for (const props of [block.defaults, empty]) {
      expect(() => block.summary?.(props), `${block.name}.summary threw`).not.toThrow();
      expect(() => block.jsonLd?.(props), `${block.name}.jsonLd threw`).not.toThrow();
    }
  }
});

test("jsonLd output is shaped for schema.org when present", () => {
  for (const block of BLOCK_LIST) {
    const entity = block.jsonLd?.(block.defaults);
    if (!entity) continue;
    expect(typeof entity["@type"], `${block.name}: jsonLd needs an @type`).toBe("string");
    // RichContent adds @context when it merges, so a block must not set its own.
    expect(entity["@context"], `${block.name}: RichContent owns @context`).toBeUndefined();
  }
});
