import type { Metadata } from "next";
import Link from "next/link";
import { getVisibleVideos } from "@/lib/sermons";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const SITE_KNOWLEDGE = `
You are a friendly, warm assistant for Destiny Church Tees Valley (destinytees.uk).
Only answer queries that are a direct question or request for information about the church — its services, people, events, beliefs, sermons, or practical information. Personal statements, opinions, or anything not phrased as a question about the church must return answer: null, page: null, ctaLabel: null, suggestedSermons: []. Do not try to find a church connection to an off-topic query.
Answer in 1–3 short sentences using a natural, conversational tone — like a helpful church member, not a formal document.
Never use the full church name "Destiny Church Tees Valley" in your answers — just say "Destiny" or "we/our" instead.
Never start your answer by restating the question.
You only have sermon titles and publish dates — you do not know the sermon content beyond the title. Do not describe or summarise what a sermon covers beyond what its title says.
Never assign a role (pastor, leader, staff, etc.) to any person unless their role is explicitly listed in the knowledge base below. If a name appears in a sermon title but is not in the leadership list, they are likely a guest speaker — say so if relevant, but do not invent a title for them.

Always respond with valid JSON in this exact format:
{
  "answer": "your 1–3 sentence answer here",
  "page": "/relevant-page-path or null",
  "ctaLabel": "Short inviting action label or null",
  "suggestedSermons": ["sermonId1", "sermonId2"]
}
The ctaLabel must always be a short action phrase (2–5 words) like "Give Now" or "Plan Your Visit" — never a sermon title, person's name, or description.
suggestedSermons must only contain IDs that appear in the SERMON LIBRARY section below — never IDs or text from the knowledge base above.
Always include a page and ctaLabel when your answer relates to any page — if in doubt, include one. Examples:
- giving/bank details → page: "/give", ctaLabel: "Give Now"
- hiring the building/venue/hall → page: "/hire", ctaLabel: "Enquire About Hiring"
- visiting/service times → page: "/visit", ctaLabel: "Plan Your Visit"
- pastors/team/leadership → page: "/about", ctaLabel: "Meet the Team"
- sermons/watch → page: "/sermons", ctaLabel: "Watch Sermons"
- alpha/faith questions → page: "/alpha", ctaLabel: "Find Out More"
- volunteering/serve → page: "/serve", ctaLabel: "Get Involved"
- kids/children → page: "/kids", ctaLabel: "Destiny Kids"
- youth → page: "/youth", ctaLabel: "Destiny Youth"
- connect groups → page: "/connect", ctaLabel: "Join a Group"
- beliefs/faith → page: "/beliefs", ctaLabel: "What We Believe"
- missions → page: "/missions", ctaLabel: "Our Missions"
Only set page and ctaLabel to null if the query is entirely unrelated to any page.

CHURCH BASICS:
- Name: Destiny Church Tees Valley
- Website: destinytees.uk
- Address: Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ
- Phone: 01642 559797
- Email: admin@destinytees.uk
- Mission: "Transforming Lives through Faith, Hope and Love for Jesus"
- Purpose: Bring people to Jesus, develop them to maturity in Christ, equip them for ministry and mission
- Bible-based, Spirit-led Christian church in Tees Valley, part of a wider network of churches

SUNDAY SERVICES:
- Prayer Service: 10:00am – 10:30am
- Main Sunday Service: 11:00am – approx 12:30pm (about 90 minutes)
- Doors open: 9:45am (coffee available early)
- Dress code: none — come as you are
- What to expect: contemporary worship, Bible-based teaching, prayer, community
- Free on-site parking | Step-free access | Accessible toilets | BSL interpretation | Hearing loop
- Several bus routes stop on Norton Road outside

LEAD PASTORS:
- Jonathan Harris — Senior Pastor. Has led Destiny for over 20 years. Passionate about building team and unleashing potential in others.
- Catherine (Cath) Harris — Lead Pastor. Heart for teaching, training, and leading the Community and Care Team. Serves the town.
- Together they are "Jonathan & Cath Harris, Lead Pastors"
- Daughters: Faith Harris (Associate Pastor) and Nadine Harris

FULL LEADERSHIP TEAM:
Lead Team:
- Jonathan Harris — Senior Pastor
- Cath Harris — Lead Pastor
- Faith Harris — Associate Pastor (faith@destinytees.uk)
- Tracy Reddy — Small Groups (tracy@destinytees.uk)
- Deveshin Reddy — Finance & Facilities (deveshin@destinytees.uk)
- Nkereuwem (NK) Ekanem — Creativity & Innovation (nk@destinytees.uk)

Department Leaders:
- Funke Awojide — Kids Pastor (funke@destinytees.uk)
- Younes Moradi — Stewarding (younes@destinytees.uk)
- David Bayode — Worship (david@destinytees.uk)
- Adebowale (Debo) Awojide — Prayer Team (debo@destinytees.uk)
- Osas Obot — Youth
- Thandi Mathema — Hospitality
- Daniel Park — Production & Social Media / Photography
- George Krezner — Administration

GIVING / BANK DETAILS:
- Account Name: Destiny Church Tees Valley
- Sort Code: 08-92-99
- Account Number: 67397646
- Reference: your full name
- Online: destinytees.churchsuite.com/donate (via ChurchSuite)
- Text to give: text DCTEES to 07380 307 800 (e.g. "give 10" or "give 10/mo" for monthly)
- Gift Aid: available for UK taxpayers — church reclaims 25p per £1, no extra cost to donor

DESTINY KIDS (Ages 0–11):
- Every Sunday 10:45am – 12:30pm (no registration, free)
- All leaders DBS-checked and trained

DESTINY YOUTH (Ages 11–18):
- Every Wednesday 7:00pm – 8:30pm at Destiny Centre

YOUNG ADULTS (Ages 18–30s):
- Events, meals, trips throughout year. Join a Connect Group for mid-week community.

CONNECT GROUPS:
- Small groups meeting mid-week, for all ages. Sign up: destinytees.churchsuite.com/forms/twuneiil

GIVING METHODS: Online (ChurchSuite), bank transfer, text to give, Gift Aid available.

VENUE HIRE: Destiny Centre available Mon–Sat (not Sundays). Main Auditorium (400 cap), Meeting Rooms (30 cap), Café/Foyer (80 cap). Contact admin@destinytees.uk or 01642 559797.

Keep answers short (2–4 sentences max). If you genuinely don't know, say so briefly.
`.trim();

const SITE_PAGES = [
  { title: "Sermons",      href: "/sermons",       desc: "Watch sermons from Destiny Church" },
  { title: "Give",         href: "/give",           desc: "Support Destiny Church" },
  { title: "Visit",        href: "/visit",          desc: "Plan your first visit" },
  { title: "New Here",     href: "/new-here",       desc: "Everything you need to know" },
  { title: "What's On",    href: "/whats-on",       desc: "Events, courses and more" },
  { title: "Alpha",        href: "/alpha",          desc: "Explore the Christian faith" },
  { title: "Serve",        href: "/serve",          desc: "Join a volunteer team" },
  { title: "About",        href: "/about",          desc: "Our mission, team and vision" },
  { title: "Missions",     href: "/missions",       desc: "Our mission partners" },
  { title: "Contact",      href: "/contact",        desc: "Get in touch" },
  { title: "Youth",        href: "/youth",          desc: "Destiny Youth, ages 11–18" },
  { title: "Young Adults", href: "/young-adults",   desc: "Community for 18–30s" },
  { title: "Kids",         href: "/kids",           desc: "Destiny Kids, ages 0–11" },
  { title: "Safeguarding", href: "/safeguarding",   desc: "Our safeguarding policy" },
  { title: "Beliefs",      href: "/beliefs",        desc: "What we believe" },
  { title: "Connect",      href: "/connect",        desc: "Join a connect group" },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q} — Destiny Church` : "Search — Destiny Church",
  };
}

async function fetchSearchData(q: string) {
  const videos = await getVisibleVideos(200);
  const sermonMap = new Map(videos.map((v) => [v.id, v.title]));

  const sermons = videos
    .filter((v) => v.title.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8)
    .map((v) => ({ id: v.id, title: v.title, thumbnail: v.thumbnail }));

  const pages = SITE_PAGES.filter((p) =>
    p.title.toLowerCase().includes(q.toLowerCase())
  );

  let answer: string | null = null;
  let aiPage: string | null = null;
  let ctaLabel: string | null = null;
  let aiSermons: { id: string; title: string }[] = [];

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const sermonLibrary = videos.length
        ? "\n\nSERMON LIBRARY (newest first):\n" +
          videos.map((v) => `${v.id} | ${v.publishedAt.slice(0, 10)} | ${v.title}`).join("\n")
        : "";

      const userMessage =
        q +
        (sermonLibrary
          ? `\n\n---\nOnly include sermon IDs in "suggestedSermons" where the sermon title clearly and directly contains or matches the query words. Do not guess or infer — if a title doesn't obviously relate, exclude it. If none match closely, return an empty array.`
          : "");

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: SITE_KNOWLEDGE + sermonLibrary },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const ans = parsed.answer?.trim() ?? null;
          if (ans && !/^(i don't know|i'm not sure|i cannot|i can't)/i.test(ans)) {
            answer = ans;
            aiPage = parsed.page ?? null;
            ctaLabel = parsed.ctaLabel ?? null;
          }
          const suggested: string[] = Array.isArray(parsed.suggestedSermons)
            ? parsed.suggestedSermons.slice(0, 4)
            : [];
          aiSermons = suggested
            .filter((id) => sermonMap.has(id))
            .map((id) => ({ id, title: sermonMap.get(id)! }));
        } catch {
          if (!/^(i don't know|i'm not sure|i cannot|i can't)/i.test(raw)) answer = raw;
        }
      }
    } catch {
      // silently skip AI if unavailable
    }
  }

  return { sermons, pages, answer, aiPage, ctaLabel, aiSermons };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const { sermons, pages, answer, aiPage, ctaLabel, aiSermons } = query
    ? await fetchSearchData(query)
    : { sermons: [], pages: [], answer: null, aiPage: null, ctaLabel: null, aiSermons: [] };

  const hasResults = sermons.length > 0 || pages.length > 0 || Boolean(answer);

  return (
    <div className="min-h-screen bg-[#f5f7fa] pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">

        {/* Search bar */}
        <form action="/search" method="GET" className="mb-8">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-destiny-grey/40"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Search Anything Destiny…"
              autoFocus
              className="w-full rounded-full border border-destiny-grey/15 bg-white py-4 pl-12 pr-5 text-destiny-grey shadow-sm focus:border-destiny-orange/40 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>
        </form>

        {!query && (
          <p className="text-center text-destiny-grey/50">Enter a search term above.</p>
        )}

        {query && !hasResults && (
          <p className="text-center text-destiny-grey/50">
            No results found for &ldquo;{query}&rdquo;
          </p>
        )}

        {/* AI Overview */}
        {answer && (
          <div className="mb-6 rounded-2xl border border-destiny-orange/20 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <svg
                className="h-4 w-4 text-destiny-orange"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider text-destiny-orange">
                AI Overview
              </span>
            </div>
            <p className="text-sm leading-relaxed text-destiny-grey/80">{answer}</p>

            {/* AI-suggested sermons */}
            {aiSermons.length > 0 && (
              <div className="mt-4 space-y-1">
                {aiSermons.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sermons/${s.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destiny-grey/70 transition hover:bg-destiny-orange/5 hover:text-destiny-grey"
                  >
                    <svg className="h-4 w-4 shrink-0 text-destiny-orange/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="truncate">{s.title}</span>
                  </Link>
                ))}
              </div>
            )}

            {aiPage && ctaLabel && aiSermons.length === 0 && (
              <Link
                href={aiPage}
                className="mt-4 inline-block rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        )}

        {/* Page results */}
        {pages.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">Pages</h2>
            <div className="overflow-hidden rounded-2xl border border-destiny-grey/10 bg-white shadow-sm">
              {pages.map((page, i) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className={`flex items-center gap-3 px-5 py-4 transition hover:bg-gray-50 ${
                    i < pages.length - 1 ? "border-b border-destiny-grey/8" : ""
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0 text-destiny-grey/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-destiny-grey">{page.title}</p>
                    <p className="text-xs text-destiny-grey/50">{page.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sermon results */}
        {sermons.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">Sermons</h2>
            <div className="overflow-hidden rounded-2xl border border-destiny-grey/10 bg-white shadow-sm">
              {sermons.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/sermons/${s.id}`}
                  className={`flex items-center gap-3 px-5 py-4 transition hover:bg-gray-50 ${
                    i < sermons.length - 1 ? "border-b border-destiny-grey/8" : ""
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0 text-destiny-orange/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-sm font-medium text-destiny-grey">{s.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
