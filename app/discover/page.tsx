import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Eyebrow from "@/components/ui/Eyebrow";
import Icon from "@/components/ui/Icon";
import BeforeAfterGallery, { type Comparison } from "@/components/discover/BeforeAfterGallery";
import BeforeAfterSlider from "@/components/discover/BeforeAfterSlider";
import { FONT_ROBOTO } from "@/components/blocks/tokens";
import { IPhoneFrame, MacBookFrame } from "@/components/devices/DeviceFrames";

export const metadata: Metadata = {
  title: "Behind the build",
  description:
    "How we rebuilt destinytees.uk: before and after, the speed and accessibility numbers, the technology underneath, and how Smart Search works.",
  alternates: { canonical: "/discover" },
  openGraph: {
    title: "Behind the build | Destiny Church Tees Valley",
    description: "Before and after, the numbers, and the technology behind the new destinytees.uk.",
    url: "https://destinytees.uk/discover",
    images: [{ url: "/og/discover.webp", width: 1200, height: 630, alt: "The new Destiny Church website" }],
  },
  twitter: { card: "summary_large_image", images: ["/og/discover.webp"] },
};

const COMPARISONS: Comparison[] = [
  {
    key: "home",
    name: "Home",
    label: "home page",
    note: "Service times, the latest message and what's on now sit on the first page, instead of behind a full-screen photo.",
  },
  {
    key: "visit",
    name: "Plan your visit",
    label: "Plan your visit page",
    note: "A first Sunday, step by step: when and where, parking, what happens in the service, kids and the questions people ask.",
  },
  {
    key: "whatson",
    name: "What's On",
    label: "What's On page",
    note: "Events come live from ChurchSuite, each with its own page, sign-up, a map and a calendar invite.",
  },
  { key: "give", name: "Give", label: "Give page", note: "One clear page for giving online and by bank transfer." },
  { key: "alpha", name: "Alpha", label: "Alpha page", note: "Course pages show the next session from the calendar and how to sign up." },
  {
    key: "shop",
    name: "Shop",
    label: "shop",
    note: "The shop moved from shop.destinytees.uk into the main site, with Apple Pay, Google Pay and card checkout on the page.",
  },
];

// Google Lighthouse 12.8, mobile (simulated mid-range phone on a throttled
// connection), each home page, the middle result of three runs, 3 Nov 2026.
// The same numbers as the campaign film. Re-run before changing them.
const METRICS: { name: string; what: string; before: string; after: string; better: number }[] = [
  { name: "Performance score", what: "Google's overall speed score out of 100", before: "36", after: "90", better: 90 / 36 },
  { name: "Largest Contentful Paint", what: "When the main content has appeared", before: "7.3 s", after: "2.1 s", better: 7.3 / 2.1 },
  { name: "First Contentful Paint", what: "When anything first appears", before: "2.8 s", after: "1.1 s", better: 2.8 / 1.1 },
  { name: "Speed Index", what: "How quickly the page visibly fills in", before: "4.9 s", after: "2.9 s", better: 4.9 / 2.9 },
  { name: "Total Blocking Time", what: "Time the page is too busy to respond to a tap", before: "834 ms", after: "367 ms", better: 834 / 367 },
  { name: "Cumulative Layout Shift", what: "How much things jump around as it loads", before: "0.354", after: "0", better: Infinity },
  { name: "Page weight", what: "Data downloaded to open the home page", before: "13.7 MB", after: "0.8 MB", better: 13.7 / 0.8 },
  { name: "Accessibility score", what: "Automated checks out of 100", before: "71", after: "96", better: 96 / 71 },
  { name: "SEO score", what: "Search engine basics out of 100", before: "92", after: "100", better: 100 / 92 },
];

const change = (better: number) => (better === Infinity ? "Fixed" : `${better.toFixed(1)}× better`);

const STACK: { icon: string; name: string; body: string }[] = [
  { icon: "bolt", name: "Next.js and React", body: "Next.js 16 with React 19. Pages render on the server, so your phone downloads finished HTML rather than building the page itself." },
  { icon: "palette", name: "Tailwind CSS", body: "Tailwind v4 with the church's pillar palette and brand fonts as design tokens, shared by every page." },
  { icon: "database", name: "Supabase", body: "Postgres for everything the church edits (pages, the shop, Destiny One), with row-level security deciding who can read and change what." },
  { icon: "cloud", name: "Vercel", body: "Hosted in London, with pages cached at the edge and refreshed in the background when content changes." },
  { icon: "payments", name: "Stripe", body: "Shop checkout on the page: Apple Pay, Google Pay and card, without leaving the site." },
  { icon: "play_circle", name: "YouTube", body: "Every sermon, read live from the church's channel, with a listen-only mode when a podcast episode matches." },
  { icon: "event", name: "ChurchSuite", body: "Events and sign-ups come straight from the church's people and calendar system, so nothing is typed twice." },
  { icon: "auto_awesome", name: "OpenAI", body: "Powers Smart Search and DestinyAI, grounded in the church's own pages, sermons and events." },
];

export default function DiscoverPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white pt-16 pb-10 sm:pt-20">
        <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
          <AnimateIn>
            <Eyebrow className="mb-4">Behind the build</Eyebrow>
            <h1 className="text-4xl font-bold tracking-[-0.04em] text-destiny-grey sm:text-6xl" style={{ fontFamily: FONT_ROBOTO }}>
              How we built the new destinytees.uk
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              For anyone curious about what changed and how: the before and after, the numbers, and the technology
              underneath. It gets a little technical further down.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Before and after */}
      <Section tone="light" padding="md" className="pt-0 sm:pt-0">
        <AnimateIn>
          <BeforeAfterGallery items={COMPARISONS} />
        </AnimateIn>
        <AnimateIn className="mx-auto mt-20 grid max-w-5xl items-center gap-10 md:grid-cols-[1fr_320px]">
          <SectionHeading
            eyebrow="On your phone"
            title="Built for the phone first."
            lead="Most people visit on a phone, so every page was designed small first and grown up to the desktop, not squeezed down from it. Drag to compare the home page."
          />
          <IPhoneFrame className="mx-auto w-full max-w-[320px]">
            <BeforeAfterSlider
              bare
              label="home page on a phone"
              sizes="300px"
              before={{ src: "/img/discover/home-phone-before.webp", alt: "The old home page on a phone" }}
              after={{ src: "/img/discover/home-phone-after.webp", alt: "The new home page on a phone" }}
            />
          </IPhoneFrame>
        </AnimateIn>
      </Section>

      {/* Why */}
      <Section tone="muted" padding="lg">
        <AnimateIn>
          <SectionHeading
            eyebrow="Why rebuild?"
            title="Four reasons."
            lead="The old site was a WordPress theme that had grown over the years. Rather than patch it again, we started fresh around four aims."
          />
        </AnimateIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "accessibility_new", t: "Accessibility", b: "Readable text, calmer motion for anyone who needs it, and every page usable with just a keyboard." },
            { icon: "touch_app", t: "Ease of use", b: "Service times, events and sermons a tap away, and a search you can simply ask." },
            { icon: "speed", t: "Performance", b: "Pages that load over three times faster on a phone and use a fraction of the data." },
            { icon: "palette", t: "Design", b: "One consistent look built on the brand guide: our colours, our fonts, our photos." },
          ].map((r, i) => (
            <AnimateIn key={r.t} index={i} className="rounded-[20px] border border-black/[0.07] bg-white p-6">
              <Icon name={r.icon} size="xl" className="text-destiny-orange" />
              <h3 className="mt-4 text-lg font-bold text-destiny-grey" style={{ fontFamily: FONT_ROBOTO }}>
                {r.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{r.b}</p>
            </AnimateIn>
          ))}
        </div>
      </Section>

      {/* Numbers */}
      <Section tone="light" padding="lg" width="content">
        <AnimateIn>
          <SectionHeading
            eyebrow="The numbers"
            title="Faster in almost every way."
            lead="Google Lighthouse on a simulated mid-range phone, testing each home page three times and taking the middle result."
          />
        </AnimateIn>
        {/* Phones: one card per measure, since four columns don't fit. */}
        <AnimateIn className="mt-10 space-y-3 sm:hidden">
          {METRICS.map((m) => (
            <div key={m.name} className="rounded-[20px] border border-black/[0.07] p-5">
              <p className="font-semibold text-destiny-grey">{m.name}</p>
              <p className="text-sm text-muted">{m.what}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.09em] text-muted">Old</dt>
                  <dd className="tabular-nums text-muted">{m.before}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.09em] text-muted">New</dt>
                  <dd className="font-semibold tabular-nums text-destiny-grey">{m.after}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.09em] text-muted">Change</dt>
                  <dd className="font-semibold tabular-nums text-destiny-orange-dark">{change(m.better)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </AnimateIn>
        <AnimateIn className="mt-10 hidden overflow-hidden rounded-[20px] border border-black/[0.07] sm:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Old website compared with the new website</caption>
            <thead className="bg-[#f5f7fa] text-xs font-bold uppercase tracking-[0.09em] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3">Measure</th>
                <th scope="col" className="px-5 py-3 text-right">Old site</th>
                <th scope="col" className="px-5 py-3 text-right">New site</th>
                <th scope="col" className="px-5 py-3 text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {METRICS.map((m) => (
                <tr key={m.name}>
                  <th scope="row" className="px-5 py-4 font-normal">
                    <span className="block font-semibold text-destiny-grey">{m.name}</span>
                    <span className="block text-muted">{m.what}</span>
                  </th>
                  <td className="px-5 py-4 text-right tabular-nums text-muted">{m.before}</td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-destiny-grey">{m.after}</td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-destiny-orange-dark">
                    {change(m.better)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AnimateIn>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Best practices scored 100 on both. Tested 3 November 2026 with Lighthouse 12.8. Your own numbers will vary with
          your phone and connection, but the gap stays wide.
        </p>
      </Section>

      {/* How it is fast */}
      <Section tone="muted" padding="lg">
        <div className="grid gap-12 lg:grid-cols-2">
          <AnimateIn>
            <SectionHeading eyebrow="Speed" title="Where the time went." />
            <ul className="mt-8 space-y-5 text-base leading-relaxed text-destiny-grey">
              <li className="flex gap-3">
                <Icon name="dns" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>Finished pages from London.</strong> Pages are built on the server and cached, refreshing in the
                  background (the home page every 30 seconds, sermons every 30 minutes), so visits rarely wait on a database.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="image" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>Images sized for your screen.</strong> Every photo is resized and converted to a modern format
                  for the device asking for it, and only loads as it scrolls into view.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="data_usage" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>An icon font cut to 40 KB.</strong> The full icon set is about 410 KB. We ship only the icons
                  the site uses, from our own server, so nothing waits on a third party.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="code" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>Very little JavaScript.</strong> Most of the page is plain HTML. Script loads only where
                  something is interactive, like this page&apos;s sliders.
                </span>
              </li>
            </ul>
          </AnimateIn>
          <AnimateIn delay={120}>
            <SectionHeading eyebrow="Accessibility" title="Checked by machines and people." />
            <ul className="mt-8 space-y-5 text-base leading-relaxed text-destiny-grey">
              <li className="flex gap-3">
                <Icon name="contrast" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>Contrast is tested on every change.</strong> Automated tests read the site&apos;s colours and
                  fail if text drops below the WCAG AA minimum of 4.5:1.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="keyboard" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>Keyboard first.</strong> A skip link on every page, a visible focus ring on everything you can
                  press, and menus that stay out of the way when closed.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="motion_photos_off" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>Calmer when you need it.</strong> Turn off animation and glass effects on the{" "}
                  <Link href="/accessibility" className="font-semibold text-destiny-orange-dark underline underline-offset-2">
                    accessibility page
                  </Link>
                  . We aim to meet WCAG 2.2 level AA, and say plainly where we don&apos;t yet.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="touch_app" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  <strong>Room for your thumb.</strong> Icon buttons are 44 pixels square, the recommended minimum
                  touch target.
                </span>
              </li>
            </ul>
          </AnimateIn>
        </div>
      </Section>

      {/* Smart Search */}
      <Section tone="light" padding="lg">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.3fr]">
          <AnimateIn>
            <SectionHeading
              eyebrow="Smart Search"
              title="A search you can ask."
              lead="Type a question the way you'd ask it at the welcome desk. Smart Search answers in plain words and points you to the right page."
            />
            <ul className="mt-8 space-y-4 text-base leading-relaxed text-destiny-grey">
              <li className="flex gap-3">
                <Icon name="search" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  It starts from what the church has published (pages, sermons, events and the shop), and can check the
                  weather, give directions to the Destiny Centre or search the web when a question needs it.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="check_circle" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>
                  It can only link to pages on a fixed list, and any other link is thrown away, so it can&apos;t send you
                  somewhere that doesn&apos;t exist.
                </span>
              </li>
              <li className="flex gap-3">
                <Icon name="forum" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <span>If a question could mean two things, it asks which you meant, with a choice of answers.</span>
              </li>
            </ul>
          </AnimateIn>
          <AnimateIn delay={120}>
            <MacBookFrame>
              <Image
                src="/img/discover/smart-search.webp"
                alt="Smart Search answering 'Is there something for my kids on Sunday?' with Destiny Kids times and groups"
                fill
                sizes="(min-width: 1024px) 680px, 100vw"
                className="object-cover"
              />
            </MacBookFrame>
          </AnimateIn>
        </div>
      </Section>

      {/* Stack */}
      <Section tone="muted" padding="lg">
        <AnimateIn>
          <SectionHeading eyebrow="Under the hood" title="What it's built with." />
        </AnimateIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((s, i) => (
            <AnimateIn key={s.name} index={i} className="rounded-[20px] border border-black/[0.07] bg-white p-6">
              <Icon name={s.icon} size="xl" className="text-destiny-orange" />
              <h3 className="mt-4 text-lg font-bold text-destiny-grey" style={{ fontFamily: FONT_ROBOTO }}>
                {s.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </AnimateIn>
          ))}
        </div>
        <AnimateIn className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { t: "One set of building blocks", b: "Shared sections, headings, buttons and cards replaced dozens of near-identical copies, so every page lines up and a fix lands everywhere at once." },
            { t: "Privacy by default", b: "YouTube and other embeds stay as a placeholder until you agree to media cookies, so nothing loads behind your back." },
            { t: "Built to be edited", b: "Church staff write pages in a block editor with drafts, scheduling and history, no developer needed." },
          ].map((x) => (
            <div key={x.t}>
              <h3 className="text-lg font-bold text-destiny-grey" style={{ fontFamily: FONT_ROBOTO }}>
                {x.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{x.b}</p>
            </div>
          ))}
        </AnimateIn>
      </Section>

      {/* Next */}
      <Section tone="dark" padding="lg" containerClassName="text-center">
        <AnimateIn>
          <h2 className="text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl" style={{ fontFamily: FONT_ROBOTO }}>
            And there&apos;s one more thing.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
            Destiny One, our church family in your pocket, arrives in 2027.
          </p>
          <Link
            href="/app"
            className="mt-8 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-destiny-grey"
          >
            Meet Destiny One
            <Icon name="arrow_forward" size="md" />
          </Link>
        </AnimateIn>
      </Section>
    </>
  );
}
