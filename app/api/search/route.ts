import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getVisibleVideos } from "@/lib/sermons";

// ── Rate limiting ────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000;       // 1-minute sliding window
const MAX_PER_WINDOW = 15;      // requests allowed per window
const COOLDOWN_MS = [           // progressive cooldown per offense
  5  * 60_000,  // 1st offense : 5 min
  10 * 60_000,  // 2nd offense : 10 min
  20 * 60_000,  // 3rd offense : 20 min
  40 * 60_000,  // 4th offense : 40 min
  60 * 60_000,  // 5th offense+: 60 min
];

interface RateLimitRecord {
  timestamps: number[];
  cooldownUntil: number;
  offenses: number;
}

const rlStore = new Map<string, RateLimitRecord>();

// Prune stale entries every 10 minutes to prevent memory creep
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60_000;
  for (const [ip, r] of rlStore) {
    if (r.cooldownUntil < Date.now() && (r.timestamps.at(-1) ?? 0) < cutoff) {
      rlStore.delete(ip);
    }
  }
}, 10 * 60_000);

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let r = rlStore.get(ip);
  if (!r) { r = { timestamps: [], cooldownUntil: 0, offenses: 0 }; rlStore.set(ip, r); }

  if (now < r.cooldownUntil) return true;

  r.timestamps = r.timestamps.filter((t) => now - t < WINDOW_MS);
  r.timestamps.push(now);

  if (r.timestamps.length > MAX_PER_WINDOW) {
    r.offenses += 1;
    r.cooldownUntil = now + COOLDOWN_MS[Math.min(r.offenses - 1, COOLDOWN_MS.length - 1)];
    r.timestamps = [];
    return true;
  }
  return false;
}
// ─────────────────────────────────────────────────────────────────────────────

const SITE_KNOWLEDGE = `
You are a friendly, warm assistant for Destiny Church Tees Valley (destinytees.uk).
Answer in 1–3 short sentences using a natural, conversational tone — like a helpful church member, not a formal document.
Never use the full church name "Destiny Church Tees Valley" in your answers — just say "Destiny" or "we/our" instead.
Never start your answer by restating the question.

Always respond with valid JSON in this exact format:
{
  "answer": "your 1–3 sentence answer here",
  "page": "/relevant-page-path or null",
  "ctaLabel": "Short inviting action label or null",
  "suggestedSermons": ["sermonId1", "sermonId2"]
}
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
- Babies & Toddlers (0–1): Balcony above main auditorium
- Destiny Tots (2–4): Tots Room — stories, crafts, play
- KS1 (5–7): Kids Room — worship, Bible teaching, games, creative activities
- KS2 (8–11): Kids Room — deeper Bible exploration, discussion, activities
- All leaders DBS-checked and trained
- Tots Mornings: free event for parents with children aged 0–4, 1st & 3rd Sunday morning every month

DESTINY YOUTH (Ages 11–18):
- Every Wednesday 7:00pm – 8:30pm at Destiny Centre
- KS3 (11–14): safe, energetic space — big questions, real friendships, identity in God
- KS4 (14–16): identity, purpose, following Jesus in the real world
- KS5 (16–18): preparing for adulthood, life skills, mentorship, calling and purpose
- Youth Alpha also available

YOUNG ADULTS (Ages 18–30s):
- Not a fixed weekly schedule — events, meals, trips, gatherings throughout year
- Connect Groups available for regular mid-week community
- Core values: Community, Purpose, Faith, Fun
- Contact church or join a Connect Group to get involved

CONNECT GROUPS:
- Small groups of 8–12 people meeting mid-week throughout the week
- Pray, study the Bible, support one another, do life together
- For all ages, stages, backgrounds
- Sign up: destinytees.churchsuite.com/forms/twuneiil
- Led by Tracy Reddy (tracy@destinytees.uk)

ALPHA COURSE:
- Free, no pressure, no commitment — for anyone curious about faith
- 11–13 sessions exploring Christian faith through food, talk, and discussion
- Topics: Is there more to life? Who is Jesus? Why did Jesus die? How can I have faith? Prayer, Bible, Holy Spirit, and more
- Youth Alpha available for ages 11+
- Contact church for current dates

SERVE / VOLUNTEER TEAMS:
Worship (David Bayode), Kids (Funke Awojide), Youth (Osas Obot), Stewarding & Welcome (Younes Moradi), Prayer (Debo Awojide), Connect Groups (Tracy Reddy), Hospitality (Thandi Mathema), Production (Daniel Park), Social Media & Photography (Daniel Park), Outreach & Missions (NK Ekanem), Administration (George Krezner), Decoration, Building Maintenance, Alpha hosting.
Most teams require active member status. DBS check required for Kids and Youth teams.

MISSION PARTNERS:
- The Moses Project (themosesproject.co.uk): supports adult males with drug/alcohol addictions — housing, mentoring, recovery
- Compassion (compassionuk.org): international children's charity in 29 countries, releases children from poverty; founded 1952
- Safe Families (safefamilies.uk): supports children, families and care leavers via local churches and trained volunteers

VENUE HIRE (Destiny Centre — NOT available Sundays; Wed/Thu hires end by 6pm):
- Main Auditorium: up to 400, full PA, projection, stage lighting, raised platform
- Meeting Rooms: up to 30 per room (2 rooms), projector, whiteboard, A/C, Wi-Fi
- Café / Foyer: up to 80, kitchen on request, natural light, ground floor
- All include: free parking, Wi-Fi, step-free access, no hidden fees, on-site staff, CCTV
- Production Team available at £25/hour extra
- Quote within 2 working days | viewings available | admin@destinytees.uk | 01642 559797

CORE BELIEFS:
- God exists eternally as Father, Son, and Holy Spirit (Trinity)
- Jesus Christ: Son of God, died for sins, rose after three days, will return as King
- The Holy Spirit lives in every Christian from moment of salvation, gives power and gifts
- The Bible: God's word, inspired, without error, supreme source of truth
- Salvation: free gift through faith in Jesus, not earned by good works
- Eternity: Heaven and Hell are real; people exist forever

SAFEGUARDING:
- Designated Safeguarding Lead: contact admin@destinytees.uk (mark for Safeguarding Lead)
- Emergency: 999
- Children's Services Stockton: 01642 130 025
- NSPCC: 0808 800 5000 | ChildLine: 0800 1111 | Samaritans: 116 123
- Adult Social Care Stockton: 01642 527 764
- Enhanced DBS checks required for all working with children/vulnerable adults
- Policy last updated: March 2026

SITE PAGES:
/ (Home), /sermons, /whats-on, /give, /visit, /new-here, /connect, /alpha, /serve, /about, /missions, /youth, /young-adults, /kids, /safeguarding, /beliefs, /contact, /privacy, /hire, /terms, /data-gdpr
`.trim();

export async function GET(request: NextRequest) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json({ answer: null, page: null, ctaLabel: null, sermons: [] });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ answer: null, page: null, ctaLabel: null, sermons: [] });
  }

  try {
    const videos = await getVisibleVideos(200);

    // Build a lookup map for fast ID → title resolution
    const sermonMap = new Map(videos.map((v) => [v.id, v.title]));

    // Simple title-match for the predictive dropdown (fast, no AI)
    const titleMatches = videos
      .filter((v) => v.title.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5)
      .map((v) => ({ id: v.id, title: v.title }));

    let answer: string | null = null;
    let page: string | null = null;
    let ctaLabel: string | null = null;
    let aiSermons: { id: string; title: string }[] = [];

    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Append the full sermon library so the AI can match by topic
      const sermonLibrary = videos.length
        ? "\n\nSERMON LIBRARY:\n" +
          videos.map((v) => `${v.id} | ${v.title}`).join("\n")
        : "";

      const userMessage =
        q +
        (sermonLibrary
          ? `\n\n---\nIf this query relates to sermons or spiritual topics, include up to 4 relevant sermon IDs from the library above in the "suggestedSermons" array. Match by topic — not just exact title words.`
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
            page = parsed.page ?? null;
            ctaLabel = parsed.ctaLabel ?? null;
          }
          // Resolve suggested sermon IDs to {id, title} objects
          const suggested: string[] = Array.isArray(parsed.suggestedSermons)
            ? parsed.suggestedSermons.slice(0, 4)
            : [];
          aiSermons = suggested
            .filter((id) => sermonMap.has(id))
            .map((id) => ({ id, title: sermonMap.get(id)! }));
        } catch {
          if (!/^(i don't know|i'm not sure|i cannot|i can't)/i.test(raw)) {
            answer = raw;
          }
        }
      }
    }

    return NextResponse.json({ answer, page, ctaLabel, sermons: titleMatches, aiSermons });
  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ answer: null, page: null, ctaLabel: null, sermons: [], aiSermons: [] });
  }
}
