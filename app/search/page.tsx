import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getVisibleVideos } from "@/lib/sermons";
import OpenAI from "openai";
import SearchChat from "@/components/SearchChat";

export const dynamic = "force-dynamic";

const SITE_KNOWLEDGE = `
You are a friendly, warm assistant for Destiny Church Tees Valley (destinytees.uk).
Only answer queries that are a direct question or request for information about the church — its services, people, events, beliefs, sermons, or practical information. For any off-topic query, you MUST set answer to the JSON value null (not a string, not a deflection message — literally null). Do not explain that you can't help, do not suggest alternatives, do not try to find a church connection. Just return null.
Answer in 1–3 short sentences using a natural, conversational tone — like a helpful church member, not a formal document.
Never use the full church name "Destiny Church Tees Valley" in your answers — just say "Destiny" or "we/our" instead.
Never start your answer by restating the question.
Never assign a role (pastor, leader, staff, etc.) to any person unless their role is explicitly listed in the knowledge base below. If a name appears in a sermon title but is not in the leadership list, they are likely a guest speaker — say so if relevant, but do not invent a title for them.

Always respond with valid JSON in this exact format:
{
  "answer": "your 1–3 sentence answer here",
  "page": "/relevant-page-path or null",
  "ctaLabel": "Short inviting action label or null",
  "suggestedSermons": []
}
The ctaLabel must always be a short action phrase (2–5 words) like "Give Now" or "Plan Your Visit" — never a sermon title, person's name, or description.
Always return suggestedSermons as an empty array.
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
- Catherine (Cath) Harris — Community & Care Pastor. Heart for teaching, training, and leading the Community and Care Team. Serves the town.
- Together they are "Jonathan & Cath Harris, Lead Pastors"
- Daughters: Faith Moradi (Associate Pastor) and Nadine Harris (Life Church Bradford, Youth Pastor (not at Destiny but part of the family))

FULL LEADERSHIP TEAM:
Lead Team:
- Jonathan Harris — Senior Pastor
- Cath Harris — Community & Care Pastor
- Faith Moradi — Associate Pastor (faith@destinytees.uk)
- Tracy Reddy — Small Groups (tracy@destinytees.uk)
- Deveshin Reddy — Finance & Facilities (deveshin@destinytees.uk)
- Nkereuwem (NK) Ekanem — Creativity & Innovation (nk@destinytees.uk)

Department Leaders:
- Funke Awojide — Kids Pastor (funke@destinytees.uk)
- Younes Moradi — Stewarding (younes@destinytees.uk)
- David Bayode — Worship (david@destinytees.uk)
- Adebowale (Debo) Awojide — Prayer Team (debo@destinytees.uk)

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

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: SITE_KNOWLEDGE },
          { role: "user", content: q },
        ],
        max_tokens: 600,
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
    <div className="min-h-screen bg-[#f5f5f5] pt-28 pb-20">
      <div className="mx-auto max-w-2xl px-4 lg:px-6">

        {/* Search bar */}
        <form action="/search" method="GET" className="mb-7">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
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
              className="w-full rounded-full border border-gray-200 bg-white py-3.5 pl-12 pr-5 text-gray-800 shadow-sm focus:border-destiny-orange/40 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>
        </form>

        {/* Empty state */}
        {!query && (
          <div className="py-16 text-center">
            <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-400">Enter a search term above to get started.</p>
          </div>
        )}

        {/* No results */}
        {query && !hasResults && (
          <div className="py-16 text-center">
            <p className="text-gray-500">No results found for <span className="font-semibold text-gray-700">&ldquo;{query}&rdquo;</span></p>
            <p className="mt-1 text-sm text-gray-400">Try a different search term or browse the pages below.</p>
          </div>
        )}

        {/* AI Overview with chat */}
        {answer && (
          <SearchChat
            initialAnswer={answer}
            initialPage={aiPage}
            initialCtaLabel={ctaLabel}
            aiSermons={aiSermons}
            query={query}
          />
        )}

        {/* Page results */}
        {pages.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Pages</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {pages.map((page, i) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50 ${
                    i < pages.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition group-hover:bg-destiny-orange/10 group-hover:text-destiny-orange">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-destiny-orange transition">{page.title}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      destinytees.uk{page.href}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sermon results */}
        {sermons.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Sermons</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {sermons.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/sermons/${s.id}`}
                  className={`group flex items-center gap-4 px-5 py-3.5 transition hover:bg-gray-50 ${
                    i < sermons.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  {s.thumbnail ? (
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={s.thumbnail}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                        <svg className="h-4 w-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destiny-orange/10 text-destiny-orange transition group-hover:bg-destiny-orange group-hover:text-white">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 group-hover:text-destiny-orange transition">{s.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">destinytees.uk/sermons/{s.id}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
