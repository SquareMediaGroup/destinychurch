import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { indexTerms, isSealed, open, parseKeyring, queryTerms, seal, searchWords, type Keyring } from "../../lib/destinyOne/sealing";

/**
 * Destiny One seals chat text before it reaches the database (encryption at
 * rest). These pin the properties the design relies on: values only open in
 * the group and role they were sealed for, tampering is caught, old keys keep
 * working through a rotation, and search terms match prefixes without being
 * comparable across groups.
 */

const k = () => randomBytes(32).toString("base64");
const GROUP_A = "11111111-1111-1111-1111-111111111111";
const GROUP_B = "22222222-2222-2222-2222-222222222222";

function ring(keys = `v1:${k()}`, current = "v1", search = k()): Keyring {
  return parseKeyring({ keys, current, search });
}

test.describe("sealing", () => {
  test("seals to the d1e: format and opens back", () => {
    const r = ring();
    const sealed = seal(r, "See you at 7 — bring the slides 🙌", "msg", GROUP_A);
    expect(isSealed(sealed)).toBe(true);
    expect(sealed).toMatch(/^d1e:v1:[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(sealed).not.toContain("slides");
    expect(open(r, sealed, "msg", GROUP_A)).toBe("See you at 7 — bring the slides 🙌");
  });

  test("the same text seals differently every time", () => {
    const r = ring();
    expect(seal(r, "hi", "msg", GROUP_A)).not.toBe(seal(r, "hi", "msg", GROUP_A));
  });

  test("a sealed value only opens in its own group, as its own kind of thing", () => {
    const r = ring();
    const sealed = seal(r, "hello", "msg", GROUP_A);
    expect(() => open(r, sealed, "msg", GROUP_B)).toThrow();
    expect(() => open(r, sealed, "report", GROUP_A)).toThrow();
  });

  test("tampering is caught", () => {
    const r = ring();
    const sealed = seal(r, "hello there", "msg", GROUP_A);
    const flipped = sealed.slice(0, -2) + (sealed.at(-2) === "A" ? "B" : "A") + sealed.at(-1);
    expect(() => open(r, flipped, "msg", GROUP_A)).toThrow();
  });

  test("the wrong key won't open it", () => {
    const sealed = seal(ring(), "hello", "msg", GROUP_A);
    expect(() => open(ring(), sealed, "msg", GROUP_A)).toThrow();
  });

  test("old values still open after a key rotation", () => {
    const v1 = k();
    const before = ring(`v1:${v1}`, "v1");
    const sealed = seal(before, "from last year", "msg", GROUP_A);
    const after = ring(`v1:${v1},v2:${k()}`, "v2", before.searchKey.toString("base64"));
    expect(open(after, sealed, "msg", GROUP_A)).toBe("from last year");
    expect(seal(after, "new", "msg", GROUP_A).startsWith("d1e:v2:")).toBe(true);
  });

  test("plaintext from before the backfill passes through unchanged", () => {
    expect(open(ring(), "written before encryption", "msg", GROUP_A)).toBe("written before encryption");
  });

  test("a missing or malformed keyring is refused, never a plaintext fallback", () => {
    expect(() => parseKeyring({})).toThrow();
    expect(() => parseKeyring({ keys: "v1:short", current: "v1", search: k() })).toThrow();
    expect(() => parseKeyring({ keys: `v1:${k()}`, current: "v2", search: k() })).toThrow();
  });
});

test.describe("search terms", () => {
  test("words split the same way as the search box", () => {
    expect(searchWords("Prayer meeting: Café at 7!")).toEqual(["prayer", "meeting", "café", "at", "7"]);
  });

  test("a prefix of a word matches; a different word doesn't", () => {
    const r = ring();
    const stored = new Set(indexTerms(r, "Prayer meeting tonight", GROUP_A));
    const [pra] = queryTerms(r, ["pra"], GROUP_A);
    const [prayer] = queryTerms(r, ["prayer"], GROUP_A);
    const [pizza] = queryTerms(r, ["pizza"], GROUP_A);
    expect(stored.has(pra)).toBe(true);
    expect(stored.has(prayer)).toBe(true);
    expect(stored.has(pizza)).toBe(false);
  });

  test("the same word gives different terms in different groups", () => {
    const r = ring();
    expect(queryTerms(r, ["prayer"], GROUP_A)).not.toEqual(queryTerms(r, ["prayer"], GROUP_B));
  });

  test("very long words still match, cut to the indexed length", () => {
    const r = ring();
    const word = "supercalifragilisticexpialidocious";
    const stored = new Set(indexTerms(r, word, GROUP_A));
    expect(stored.has(queryTerms(r, [word], GROUP_A)[0])).toBe(true);
  });

  test("terms are 32 hex characters, as the database requires", () => {
    for (const t of indexTerms(ring(), "hello world", GROUP_A)) expect(t).toMatch(/^[0-9a-f]{32}$/);
  });
});
