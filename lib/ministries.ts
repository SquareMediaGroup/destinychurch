// ── Ministries, serve teams, next steps and mission partners ─────────────────
// Structured source for the info cards the assistants show (find_ministry).
// Every fact here is taken from lib/siteKnowledge.ts or the page it links to;
// add to it only what the church has actually published, because the cards
// are shown as fact. Leaders are looked up from lib/team.ts so a change of
// leader happens in one place.

import type { CardAction, CardFact, InfoCardData } from "@destiny/shared";
import { SCHEDULE } from "@/lib/churchInfo";
import { TEAM } from "@/lib/team";

export type MinistryTopic = "ministry" | "serve" | "connect" | "next-step" | "mission";

interface MinistryDef {
  id: string;
  topic: MinistryTopic;
  title: string;
  eyebrow: string;
  summary: string;
  facts: CardFact[];
  actions: CardAction[];
  /** Words a visitor might use for this, matched case-insensitively. */
  keywords: string[];
  /** id from lib/team.ts of the person who leads it, if there is one. */
  leaderId?: string;
}

const MINISTRIES: MinistryDef[] = [
  {
    id: "kids",
    topic: "ministry",
    title: "Destiny Kids",
    eyebrow: "Ages 0-11",
    summary: "Safe, fun and faith-filled classes every Sunday, with no registration and no charge. All leaders are DBS-checked and trained.",
    facts: [
      { label: "When", value: `Sundays, ${SCHEDULE.kidsCheckIn} to 12:30pm` },
      { label: "Groups", value: "Babies & Toddlers (0-1), Destiny Tots (2-4), KS1 (5-7), KS2 (8-11)" },
    ],
    actions: [{ label: "Destiny Kids", href: "/kids" }],
    keywords: ["kids", "children", "child", "toddler", "baby", "babies", "tots", "sunday school", "creche"],
    leaderId: "funke-awojide",
  },
  {
    id: "youth",
    topic: "ministry",
    title: "Destiny Youth",
    eyebrow: "Ages 11-18",
    summary: "An energetic, welcoming space for young people to ask big questions and build real friendships. Youth Alpha is also available.",
    facts: [
      { label: "When", value: "Wednesdays, 7:00pm to 8:30pm" },
      { label: "Where", value: "Destiny Centre" },
      { label: "Groups", value: "KS3 (11-14), KS4 (14-16), KS5 (16-18)" },
    ],
    actions: [{ label: "Destiny Youth", href: "/youth" }],
    keywords: ["youth", "teen", "teenager", "teenagers", "ks3", "ks4", "ks5", "secondary", "wednesday"],
  },
  {
    id: "young-adults",
    topic: "ministry",
    title: "Young Adults",
    eyebrow: "Ages 18-30s",
    summary: "A community for 18-30s: events, meals, trips and gatherings through the year, plus Connect Groups for regular mid-week community.",
    facts: [
      { label: "When", value: "Not a fixed weekly schedule: events and gatherings throughout the year" },
      { label: "Values", value: "Community, Purpose, Faith, Fun" },
    ],
    actions: [{ label: "Young Adults", href: "/young-adults" }],
    keywords: ["young adults", "young adult", "18-30", "students", "twenties", "thirties"],
  },
  {
    id: "prayer",
    topic: "ministry",
    title: "Prayer",
    eyebrow: "Prayer team",
    summary: "Doors open at 9:45am for prayer, with a prayer service before the main Sunday service.",
    facts: [{ label: "When", value: `Sundays, ${SCHEDULE.prayerServiceStart} to ${SCHEDULE.prayerServiceEnd}` }],
    actions: [{ label: "Get involved", href: "/serve" }],
    keywords: ["prayer", "pray", "intercession"],
    leaderId: "debo-awojide",
  },
  {
    id: "recovery",
    topic: "ministry",
    title: "Destiny 12:2",
    eyebrow: "Recovery",
    summary: "A 12-step Christian recovery course.",
    facts: [],
    actions: [{ label: "Find out more", href: "/twelvetwo" }],
    keywords: ["recovery", "12:2", "twelve two", "addiction", "12 step", "12-step"],
    leaderId: "louise-sheekey",
  },
  {
    id: "connect-groups",
    topic: "connect",
    title: "Connect Groups",
    eyebrow: "All ages",
    summary: "Small groups of 8-12 people meeting mid-week throughout the week. They pray, study the Bible, support one another and do life together.",
    facts: [{ label: "For", value: "All ages, stages and backgrounds" }],
    actions: [
      { label: "Sign up", href: "https://destinytees.churchsuite.com/forms/twuneiil" },
      { label: "About Connect Groups", href: "/connect" },
    ],
    keywords: ["connect group", "connect groups", "small group", "small groups", "life group", "home group", "midweek", "mid-week"],
    leaderId: "tracy-reddy",
  },
  {
    id: "serve-teams",
    topic: "serve",
    title: "Serve on a team",
    eyebrow: "Volunteer",
    summary: "Teams include Kids, Prayer, Connect Groups, Hospitality, Production, Social Media & Photography, Outreach & Missions, Administration, Decoration, Building Maintenance and Alpha hosting.",
    facts: [
      { label: "Requirement", value: "All teams require active member status" },
      { label: "Safeguarding", value: "A DBS check is required for the Kids and Youth teams" },
    ],
    actions: [{ label: "Get involved", href: "/serve" }],
    keywords: ["serve", "volunteer", "volunteering", "team", "teams", "hospitality", "production", "photography", "social media", "decoration", "maintenance", "usher", "welcome"],
  },
  {
    id: "baptism",
    topic: "next-step",
    title: "Get baptised",
    eyebrow: "Next step",
    summary: "Take the next step of faith. Sign up and the team will be in touch.",
    facts: [],
    actions: [{ label: "Get baptised", href: "/baptism" }],
    keywords: ["baptism", "baptised", "baptized", "baptise", "baptize", "get baptised"],
  },
  {
    id: "child-dedication",
    topic: "next-step",
    title: "Child dedication",
    eyebrow: "Next step",
    summary: "Dedicate your child to the Lord. Request a dedication and the team will be in touch.",
    facts: [],
    actions: [{ label: "Request a dedication", href: "/child-dedication" }],
    keywords: ["dedication", "dedicate", "baby dedication", "child dedication", "christening"],
  },
  {
    id: "moses-project",
    topic: "mission",
    title: "The Moses Project",
    eyebrow: "Mission partner",
    summary: "Supports adult males with drug and alcohol addictions through housing, mentoring and recovery.",
    facts: [],
    actions: [{ label: "themosesproject.co.uk", href: "https://themosesproject.co.uk" }],
    keywords: ["moses", "moses project", "addiction", "mission", "missions", "outreach", "charity", "charities", "partner", "partners"],
    leaderId: "tracy-reddy",
  },
  {
    id: "compassion",
    topic: "mission",
    title: "Compassion",
    eyebrow: "Mission partner",
    summary: "An international children's charity working in 29 countries to release children from poverty. Founded in 1952.",
    facts: [],
    actions: [{ label: "compassionuk.org", href: "https://compassionuk.org" }],
    keywords: ["compassion", "mission", "missions", "outreach", "charity", "charities", "partner", "partners", "sponsor", "child sponsorship"],
    leaderId: "tracy-reddy",
  },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9: ]/g, " ").replace(/\s+/g, " ").trim();

function leaderFact(m: MinistryDef): CardFact[] {
  const person = m.leaderId ? TEAM.find((p) => p.id === m.leaderId) : undefined;
  return person ? [{ label: m.topic === "mission" ? "Outreach & Missions led by" : "Led by", value: person.name }] : [];
}

function toCard(m: MinistryDef): InfoCardData {
  return {
    id: m.id,
    variant: m.topic === "ministry" ? "ministry" : m.topic,
    title: m.title,
    eyebrow: m.eyebrow,
    summary: m.summary,
    facts: [...m.facts, ...leaderFact(m)],
    actions: m.actions,
    image: null,
  };
}

/**
 * Find ministry-type cards. `topic` narrows to one kind; `query` ranks by
 * keyword. With a topic and no query, every item of that topic is returned.
 * Returns at most `limit` cards, best match first. No match returns [].
 */
export function findMinistries(query: string | undefined, topic?: MinistryTopic, limit = 3): InfoCardData[] {
  const pool = topic ? MINISTRIES.filter((m) => m.topic === topic) : MINISTRIES;
  const q = norm(query ?? "");
  if (!q) return topic ? pool.slice(0, limit).map(toCard) : [];

  const scored = pool
    .map((m) => {
      let score = 0;
      for (const k of [m.title, ...m.keywords]) {
        const kn = norm(k);
        if (kn.length > 1 && new RegExp(`\\b${kn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(q)) score += kn.split(" ").length + 1;
      }
      return { m, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => toCard(s.m));
}
