import { test, expect } from "@playwright/test";
import type { ChurchCardSet, InfoCardData } from "@destiny/shared";
import { findMinistries } from "../../lib/ministries";
import { GIVE_DEFAULTS, buildGivingCard, resolveGiveContent } from "../../lib/giving";
import {
  SITE_ORIGIN,
  absolutizeCards,
  cardsFromToolResult,
  courseTypesFor,
  matchesCourse,
  personCards,
  summarizeCards,
  visitCard,
} from "../../lib/churchCards";
import { SCHEDULE } from "../../lib/churchInfo";

/**
 * The church cards are shown as fact and never written by the model, so these
 * pin what each one says, how a question finds it, and that the model is only
 * given the compact summary (no photo paths or button links).
 */

const OK_HREF = /^(\/|https?:\/\/|mailto:|tel:)/;

function allHrefs(info: InfoCardData[]) {
  return info.flatMap((c) => c.actions.map((a) => a.href));
}

// ── Ministries ──────────────────────────────────────────────────────────────

test("a question finds its ministry card by keyword", () => {
  expect(findMinistries("what time is kids church")[0].id).toBe("kids");
  expect(findMinistries("how do I get baptised")[0].id).toBe("baptism");
  expect(findMinistries("tell me about connect groups")[0].id).toBe("connect-groups");
  expect(findMinistries("can I volunteer")[0].id).toBe("serve-teams");
});

test("a topic with no query lists that topic, and no match returns nothing", () => {
  expect(findMinistries(undefined, "mission").map((c) => c.id)).toEqual(["moses-project", "compassion"]);
  expect(findMinistries("zzzz qqqq")).toEqual([]);
  expect(findMinistries(undefined)).toEqual([]);
});

test("a ministry card names its leader from the team data", () => {
  const kids = findMinistries("kids")[0];
  expect(kids.facts).toContainEqual({ label: "Led by", value: "Funke Awojide" });
  expect(kids.facts.find((f) => f.label === "When")?.value).toContain(SCHEDULE.kidsCheckIn);
});

test("every ministry button points somewhere real-looking", () => {
  const all = (["ministry", "serve", "connect", "next-step", "mission"] as const).flatMap((t) => findMinistries(undefined, t, 20));
  expect(all.length).toBeGreaterThanOrEqual(10);
  for (const href of allHrefs(all)) expect(href).toMatch(OK_HREF);
});

// ── Giving ──────────────────────────────────────────────────────────────────

test("giving content falls back to the defaults for missing or blank keys", () => {
  expect(resolveGiveContent(null)).toEqual(GIVE_DEFAULTS);
  expect(resolveGiveContent({ sort_code: "  ", account_number: "11112222" })).toEqual({
    ...GIVE_DEFAULTS,
    account_number: "11112222",
  });
});

test("the giving card has copy buttons on the bank details only", () => {
  const card = buildGivingCard(resolveGiveContent({}));
  const copyable = card.facts.filter((f) => f.copy).map((f) => f.label);
  expect(copyable).toEqual(["Account name", "Sort code", "Account number"]);
  expect(card.facts.find((f) => f.label === "Sort code")?.value).toBe("08-92-99");
  expect(card.facts.find((f) => f.label === "Text to give")?.value).toContain(GIVE_DEFAULTS.text_number);
  expect(allHrefs([card])).toContain("https://destinytees.churchsuite.com/donate");
});

// ── People, visit, courses ──────────────────────────────────────────────────

test("a person card carries only what is published", () => {
  const [nk] = personCards("who is NK?");
  expect(nk.name).toBe("Nkereuwem Ekanem");
  expect(nk.bio).toBeNull();
  expect(nk.photo).toBe("/img/brand/Team/NE.webp");
  expect(personCards("zzzz")).toEqual([]);
});

test("the visit card quotes the schedule from churchInfo", () => {
  const card = visitCard();
  expect(card.facts.find((f) => f.label === "Main service")?.value).toContain(SCHEDULE.mainServiceStart);
  expect(card.facts.find((f) => f.label === "Doors open")?.value).toBe(SCHEDULE.doorsOpen);
});

test("a course question resolves to the right course, youth alpha winning over alpha", () => {
  expect(courseTypesFor("when does alpha start")).toEqual(["alpha"]);
  expect(courseTypesFor("youth alpha")).toEqual(["youth_alpha"]);
  expect(courseTypesFor("help with debt")).toEqual(["cap"]);
  expect(matchesCourse("where is the toilet")).toBe(false);
});

// ── What the model sees and what the app receives ───────────────────────────

test("the model summary has the facts but no photo paths or links", () => {
  const set: ChurchCardSet = { people: personCards("Cath"), info: [buildGivingCard(resolveGiveContent({}))] };
  const text = summarizeCards(set);
  expect(text).toContain("Catherine Harris, Community & Care Pastor.");
  expect(text).toContain("Sort code: 08-92-99.");
  expect(text).not.toContain(".webp");
  expect(text).not.toContain("http");
});

test("a person without a bio is flagged so the model does not invent one", () => {
  expect(summarizeCards({ people: personCards("Faith") })).toContain("No bio is published.");
});

test("app cards get absolute photos and links, and absolute ones are left alone", () => {
  const set = absolutizeCards({ people: personCards("NK"), info: [buildGivingCard(resolveGiveContent({}))] });
  expect(set.people?.[0].photo).toBe(`${SITE_ORIGIN}/img/brand/Team/NE.webp`);
  const hrefs = allHrefs(set.info ?? []);
  expect(hrefs).toContain(`${SITE_ORIGIN}/give`);
  expect(hrefs).toContain("https://destinytees.churchsuite.com/donate");
  for (const href of hrefs) expect(href).toMatch(/^https?:\/\//);
});

test("older tool results become app cards only when they have something to show", () => {
  expect(cardsFromToolResult({ name: "get_weather", data: { available: false, reason: "no" } })).toBeNull();
  const directions = cardsFromToolResult({
    name: "get_directions",
    data: { available: true, address: "Destiny Centre, 395 Norton Road", mapsUrl: "https://maps.example/x" },
  });
  expect(directions?.info?.[0].facts[0]).toEqual({ label: "Address", value: "Destiny Centre, 395 Norton Road", copy: true });
  expect(cardsFromToolResult({ name: "find_products", data: { available: true, products: [] } })).toBeNull();
  expect(cardsFromToolResult({ name: "find_person", data: { available: false, reason: "none" } })).toBeNull();
  expect(cardsFromToolResult({ name: "search_web", data: { available: true, results: [] } })).toBeNull();
});
