import { test, expect } from "@playwright/test";
import { actScore, cleanAct, hashValue, pickVoterId, rankActs, type ActTotal } from "../../lib/talentShow.server";

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

const act = (name: string, votes: number, sort_order: number, judge_xs = 0): ActTotal => ({
  id: name,
  name,
  performers: "",
  description: "",
  sort_order,
  hidden: false,
  judge_xs,
  votes,
  score: actScore(votes, judge_xs),
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

test("each judge's X counts as 2 votes", () => {
  expect(actScore(5, 0)).toBe(5);
  expect(actScore(5, 3)).toBe(11);
  // B has fewer audience votes but more X's from the judges.
  const ranked = rankActs([act("A", 8, 0, 1), act("B", 6, 1, 3), act("C", 10, 2, 0)]);
  expect(ranked.map((a) => [a.name, a.score])).toEqual([["B", 12], ["A", 10], ["C", 10]]);
});

test("judges' X's are a whole number from 0 to 4", () => {
  expect(cleanAct({ judgeXs: 3 }, { partial: true })).toEqual({ ok: true, patch: { judge_xs: 3 } });
  expect(cleanAct({ judgeXs: "0" }, { partial: true })).toEqual({ ok: true, patch: { judge_xs: 0 } });
  for (const bad of [-1, 5, 1.5, "lots"]) expect(cleanAct({ judgeXs: bad }, { partial: true }).ok).toBe(false);
});
