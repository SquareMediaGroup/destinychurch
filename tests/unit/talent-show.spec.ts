import { test, expect } from "@playwright/test";
import { cleanAct, hashValue, pickVoterId, rankActs, type ActTotal } from "../../lib/talentShow.server";

/**
 * Talent show voting: one vote per phone. The voter id comes from the cookie
 * first, so clearing local storage alone doesn't buy a second vote.
 */

const id = (c: string) => c.repeat(24);

test("the cookie wins over the stored id", () => {
  expect(pickVoterId(id("a"), id("b"))).toBe(id("a"));
});

test("falls back to the stored id, and rejects junk", () => {
  expect(pickVoterId(undefined, id("b"))).toBe(id("b"));
  expect(pickVoterId("short", id("b"))).toBe(id("b"));
  expect(pickVoterId("bad id with spaces and more", "x")).toBeNull();
  expect(pickVoterId(undefined, { not: "a string" })).toBeNull();
});

test("voter ids are stored hashed", () => {
  const h = hashValue(id("a"));
  expect(h).toHaveLength(32);
  expect(h).not.toContain(id("a"));
  expect(hashValue(id("a"))).toBe(h);
});

const act = (name: string, votes: number, sort_order: number): ActTotal => ({
  id: name,
  name,
  performers: "",
  description: "",
  sort_order,
  hidden: false,
  votes,
});

test("ranks by votes, then running order", () => {
  const ranked = rankActs([act("A", 3, 0), act("B", 5, 1), act("C", 3, 2), act("D", 0, 3)]);
  expect(ranked.map((a) => a.name)).toEqual(["B", "A", "C", "D"]);
});

test("acts need a name and stay within the limits", () => {
  expect(cleanAct({ name: "  " }).ok).toBe(false);
  expect(cleanAct({ name: "x".repeat(81) }).ok).toBe(false);
  const ok = cleanAct({ name: " The Band ", performers: " Sam, Jo " });
  expect(ok).toEqual({ ok: true, patch: { name: "The Band", performers: "Sam, Jo" } });
  // A partial edit (e.g. hide) doesn't need the name again.
  expect(cleanAct({ hidden: true }, { partial: true })).toEqual({ ok: true, patch: { hidden: true } });
  expect(cleanAct({ hidden: "yes" }, { partial: true }).ok).toBe(false);
});
