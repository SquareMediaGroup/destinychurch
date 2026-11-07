// Pure helpers for the church cards (see packages/shared/src/churchCards.ts):
// the people and visit cards, the text summary the model is given, the
// converter that makes the same cards out of the older tool results (weather,
// directions, shop) for the Destiny One app, and absolute-URL handling.
// Anything that reads the database or the live status is in
// lib/churchCards.server.ts; this file has no server-only imports so it can be
// unit tested.

import type { ChurchCardSet, InfoCardData, PersonCardData } from "@destiny/shared";
import { MAX_CARDS } from "@destiny/shared";
import { ADDRESS_ONE_LINE, BUS_NOTE, DIRECTIONS_URL, PARKING_NOTE, PHONE, SCHEDULE, VISIT_FACTS } from "@/lib/churchInfo";
import { COURSE_EVENT_META, type CourseEventType } from "@/lib/courseEvents";
import { COURSES } from "@/lib/courses";
import { formatPrice } from "@/lib/shop";
import { findTeamMembers, type TeamMember } from "@/lib/team";
import type { DirectionsToolResult, ProductResult, ToolResult, WeatherToolResult } from "@/lib/smartSearch/tools";

export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://destinytees.uk";

export const londonLong = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ── People ──────────────────────────────────────────────────────────────────

export function personCard(m: TeamMember): PersonCardData {
  return {
    id: m.id,
    name: m.name,
    role: m.role,
    photo: m.photo,
    email: m.email,
    bio: m.bio ?? null,
    leads: m.leads,
    href: m.href ?? null,
  };
}

export function personCards(query: string): PersonCardData[] {
  return findTeamMembers(query, MAX_CARDS).map(personCard);
}

// ── Visit ───────────────────────────────────────────────────────────────────

export function visitCard(): InfoCardData {
  return {
    id: "visit",
    variant: "visit",
    title: "Plan your visit",
    eyebrow: "Sundays",
    summary: "Come as you are: contemporary worship, Bible-based teaching, prayer and community. There is no dress code.",
    facts: [
      { label: "Doors open", value: SCHEDULE.doorsOpen },
      { label: "Prayer service", value: `${SCHEDULE.prayerServiceStart} to ${SCHEDULE.prayerServiceEnd}` },
      { label: "Main service", value: `${SCHEDULE.mainServiceStart} to about ${SCHEDULE.mainServiceEnd}` },
      { label: "Kids check-in", value: SCHEDULE.kidsCheckIn },
      { label: "Where", value: ADDRESS_ONE_LINE },
      { label: "Parking", value: PARKING_NOTE },
      { label: "Buses", value: BUS_NOTE },
      { label: "Access", value: VISIT_FACTS.join(", ") },
      { label: "Phone", value: PHONE.display },
    ],
    actions: [
      { label: "Get directions", href: DIRECTIONS_URL },
      { label: "Plan your visit", href: "/visit" },
    ],
    image: null,
  };
}

// ── Courses: which course a question is about ───────────────────────────────

export const COURSE_KEYWORDS: Record<CourseEventType, string[]> = {
  alpha: ["alpha", "explore faith", "exploring faith"],
  youth_alpha: ["youth alpha"],
  recovery: ["recovery", "12:2", "twelve two", "12 step", "addiction"],
  bible_course: ["bible course", "bible"],
  cap: ["cap", "money", "budget", "budgeting", "debt"],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function courseTypesFor(query: string): CourseEventType[] {
  const q = query.toLowerCase();
  const hit = (Object.keys(COURSE_KEYWORDS) as CourseEventType[]).filter((t) =>
    COURSE_KEYWORDS[t].some((k) => new RegExp(`\\b${escapeRe(k)}\\b`).test(q)),
  );
  // "youth alpha" also contains "alpha": the more specific type wins.
  if (hit.includes("youth_alpha")) return hit.filter((t) => t !== "alpha");
  return hit;
}

export function matchesCourse(query: string): boolean {
  return courseTypesFor(query).length > 0;
}

export function courseSummary(type: CourseEventType): string {
  if (type === "youth_alpha") return "Alpha for young people, a place to ask the big questions.";
  return COURSES[type as keyof typeof COURSES]?.card.description ?? COURSE_EVENT_META[type].hint;
}

// ── What the model is told ──────────────────────────────────────────────────

/**
 * One compact plain-text block per card: the facts the model may use in its
 * one-line reply. Photo paths and button links stay out of it.
 */
export function summarizeCards(set: ChurchCardSet): string {
  const lines: string[] = [];
  for (const p of set.people ?? []) {
    lines.push(
      [`${p.name}, ${p.role}.`, p.bio, p.leads.length ? `Leads: ${p.leads.join(", ")}.` : null, p.email ? `Email: ${p.email}.` : null, p.bio ? null : "No bio is published."]
        .filter(Boolean)
        .join(" "),
    );
  }
  for (const c of set.info ?? []) {
    lines.push(
      [`${c.title}${c.eyebrow ? ` (${c.eyebrow})` : ""}.`, c.summary, ...c.facts.map((f) => `${f.label}: ${f.value}.`), c.actions.length ? `Buttons: ${c.actions.map((a) => a.label).join(", ")}.` : null]
        .filter(Boolean)
        .join(" "),
    );
  }
  return lines.join("\n");
}

// ── Older tool results as cards, for the Destiny One app ────────────────────
// The website renders weather, directions and shop results with their own
// richer components; the app shows them through the same InfoCard.

function weatherAsInfo(w: WeatherToolResult): InfoCardData | null {
  if (!w.available) return null;
  return {
    id: `weather-${w.date}`,
    variant: "weather",
    title: `${w.condition}, ${w.tempMinC} to ${w.tempMaxC} degrees C`,
    eyebrow: [w.location, w.date ? londonLong(new Date(`${w.date}T12:00:00`)) : null].filter(Boolean).join(", "),
    summary: null,
    facts: typeof w.precipitationChance === "number" ? [{ label: "Chance of rain", value: `${w.precipitationChance}%` }] : [],
    actions: [],
    image: null,
  };
}

function directionsAsInfo(d: DirectionsToolResult): InfoCardData {
  return {
    id: "directions",
    variant: "directions",
    title: "Destiny Centre",
    eyebrow: "Directions",
    summary: null,
    facts: [{ label: "Address", value: d.address, copy: true }],
    actions: [{ label: "Open in Maps", href: d.mapsUrl }],
    image: null,
  };
}

function productsAsInfo(products: ProductResult[]): InfoCardData[] {
  return products.slice(0, MAX_CARDS).map((p) => ({
    id: `product-${p.id}`,
    variant: "product" as const,
    title: p.name,
    eyebrow: p.fitLabel,
    summary: `From ${formatPrice(p.fromPennies)}`,
    facts: [],
    actions: [{ label: "View in shop", href: `/shop/${p.slug}` }],
    image: p.image,
  }));
}

/** The cards a tool result carries, or null when it has none (or wasn't available). */
export function cardsFromToolResult(result: ToolResult): ChurchCardSet | null {
  switch (result.name) {
    case "find_person":
    case "find_ministry":
    case "church_info":
    case "find_jobs":
      return result.data.cards ?? null;
    case "get_weather": {
      const c = weatherAsInfo(result.data);
      return c ? { info: [c] } : null;
    }
    case "get_directions":
      return { info: [directionsAsInfo(result.data)] };
    case "find_products":
      return result.data.products?.length ? { info: productsAsInfo(result.data.products) } : null;
    default:
      return null;
  }
}

// ── Absolute URLs for the app ───────────────────────────────────────────────

const abs = (href: string): string => (href.startsWith("/") ? `${SITE_ORIGIN}${href}` : href);

/** The app has no site origin of its own, so every link and photo is made absolute here. */
export function absolutizeCards(set: ChurchCardSet): ChurchCardSet {
  return {
    people: set.people?.map((p) => ({ ...p, photo: p.photo ? abs(p.photo) : null, href: p.href ? abs(p.href) : null })),
    info: set.info?.map((c) => ({
      ...c,
      image: c.image ? abs(c.image) : null,
      actions: c.actions.map((a) => ({ ...a, href: abs(a.href) })),
    })),
  };
}
