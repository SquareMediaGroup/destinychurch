// ── Pastors and team: single source of truth ─────────────────────────────────
// Read by the /about page (TeamSection, MeetPastorsSection), the Smart Search
// knowledge prompt (lib/siteKnowledge.ts) and the person cards returned by the
// assistants. Edit people HERE and nowhere else, so the page, the AI and the
// cards cannot drift apart.
//
// `bio` is optional on purpose: the assistant must never invent one. A person
// with no bio renders as a role-and-ministry card.

export type TeamGroup = "lead-pastors" | "lead-team" | "department-head";

export type TeamMember = {
  id: string;
  name: string;
  /** Other names people use ("NK", "Cath"), matched case-insensitively. */
  aliases: string[];
  role: string;
  group: TeamGroup;
  /** Public path under /public. */
  photo: string | null;
  email: string | null;
  bio?: string;
  /** Ministries or areas they lead, used for "who runs kids?" lookups. */
  leads: string[];
  /** Page that explains what they lead, if there is one. */
  href?: string;
};

export const TEAM: TeamMember[] = [
  {
    id: "jonathan-harris",
    name: "Jonathan Harris",
    aliases: ["Jonathan", "Pastor Jonathan"],
    role: "Senior Pastor",
    group: "lead-pastors",
    photo: "/img/brand/Team/JonathanCath.webp",
    email: null,
    bio: "Jonathan has led Destiny for over 25 years, and is passionate about building team and unleashing the potential in others.",
    leads: ["Church leadership"],
    href: "/about",
  },
  {
    id: "cath-harris",
    name: "Catherine Harris",
    aliases: ["Cath", "Cath Harris", "Catherine", "Pastor Cath"],
    role: "Community & Care Pastor",
    group: "lead-pastors",
    photo: "/img/brand/Team/JonathanCath.webp",
    email: null,
    bio: "Cath has served at Destiny for over 25 years with Jonathan. She has a heart for teaching and training, leads the Community and Care Team, and serves the town.",
    leads: ["Community and Care"],
    href: "/about",
  },
  {
    id: "faith-moradi",
    name: "Faith Moradi",
    aliases: ["Faith"],
    role: "Associate Pastor",
    group: "lead-team",
    photo: "/img/brand/Team/FH.webp",
    email: "faith@destinytees.uk",
    leads: [],
    href: "/about",
  },
  {
    id: "tracy-reddy",
    name: "Tracy Reddy",
    aliases: ["Tracy"],
    role: "Small Groups",
    group: "lead-team",
    photo: "/img/brand/Team/TR.webp",
    email: "tracy@destinytees.uk",
    leads: ["Connect Groups", "Outreach & Missions"],
    href: "/connect",
  },
  {
    id: "deveshin-reddy",
    name: "Deveshin Reddy",
    aliases: ["Deveshin", "Dev"],
    role: "Finance & Facilities",
    group: "lead-team",
    photo: "/img/brand/Team/DR.webp",
    email: "deveshin@destinytees.uk",
    leads: ["Finance", "Facilities"],
    href: "/about",
  },
  {
    id: "nk-ekanem",
    name: "Nkereuwem Ekanem",
    aliases: ["NK", "Nkereuwem", "NK Ekanem"],
    role: "Creativity & Innovation",
    group: "lead-team",
    photo: "/img/brand/Team/NE.webp",
    email: "nk@destinytees.uk",
    leads: ["Production", "Social Media & Photography"],
    href: "/serve",
  },
  {
    id: "funke-awojide",
    name: "Funke Awojide",
    aliases: ["Funke"],
    role: "Kids Pastor",
    group: "department-head",
    photo: "/img/brand/Team/FA.webp",
    email: "funke@destinytees.uk",
    leads: ["Destiny Kids", "Kids"],
    href: "/kids",
  },
  {
    id: "debo-awojide",
    name: "Adebowale Awojide",
    aliases: ["Debo", "Adebowale", "Debo Awojide"],
    role: "Prayer Team",
    group: "department-head",
    photo: "/img/brand/Team/Debo.webp",
    email: "debo@destinytees.uk",
    leads: ["Prayer"],
    href: "/serve",
  },
  {
    id: "george-krezner",
    name: "George Krezner",
    aliases: ["George"],
    role: "Administration",
    group: "department-head",
    photo: "/img/brand/Team/GK.webp",
    email: "george@destinytees.uk",
    leads: ["Administration"],
    href: "/serve",
  },
  {
    id: "louise-sheekey",
    name: "Louise Sheekey",
    aliases: ["Louise"],
    role: "Recovery Pastor",
    group: "department-head",
    photo: "/img/brand/Team/LS.webp",
    email: "louise@destinytees.uk",
    leads: ["Recovery"],
    href: "/about",
  },
];

export const LEAD_TEAM = TEAM.filter((m) => m.group === "lead-team");
export const DEPARTMENT_HEADS = TEAM.filter((m) => m.group === "department-head");

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Find people by name, alias, role or what they lead. Ranked: exact name or
 * alias, then name/alias contained in the query, then role or ministry words.
 * Returns at most `limit` members. An empty or no-match query returns [].
 */
export function findTeamMembers(query: string, limit = 3): TeamMember[] {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(" ").filter((w) => w.length > 2);

  const scored: { m: TeamMember; score: number }[] = [];
  for (const m of TEAM) {
    const names = [m.name, ...m.aliases].map(norm);
    let score = 0;
    if (names.includes(q)) score = 100;
    else if (names.some((n) => n.length > 1 && new RegExp(`\\b${n}\\b`).test(q))) score = 80;
    else {
      const text = norm([m.role, ...m.leads].join(" "));
      const hits = words.filter((w) => text.includes(w)).length;
      if (hits > 0) score = 10 * hits;
    }
    if (score > 0) scored.push({ m, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.m);
}

/** One line per person, for the AI knowledge prompt. */
export function teamKnowledgeLines(): string {
  const line = (m: TeamMember) =>
    `- ${m.name} — ${m.role}${m.email ? ` (${m.email})` : ""}${m.bio ? `. ${m.bio}` : ""}`;
  const section = (title: string, members: TeamMember[]) =>
    `${title}:\n${members.map(line).join("\n")}`;
  return [
    section("Lead Pastors", TEAM.filter((m) => m.group === "lead-pastors")),
    section("Lead Team", LEAD_TEAM),
    section("Department Leaders", DEPARTMENT_HEADS),
  ].join("\n\n");
}
