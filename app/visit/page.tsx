import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import VisitSlideshow from "@/components/visit/VisitSlideshow";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Card from "@/components/ui/Card";
import Disclosure from "@/components/ui/Disclosure";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { TONE_SURFACE, TONE_ACCENT } from "@/components/blocks/tokens";
import {
  ADDRESS,
  ADDRESS_ONE_LINE,
  BUS_NOTE,
  DIRECTIONS_URL,
  MAPS_URL,
  PARKING_NOTE,
  PHONE,
  SCHEDULE,
} from "@/lib/churchInfo";

export const metadata: Metadata = {
  title: "Plan Your Visit",
  description: "Everything you need to know before visiting Destiny Church. We meet every Sunday at 11am at Destiny Centre, Norton Road, Stockton-on-Tees, TS20 2QQ. Free parking.",
  alternates: { canonical: "/visit" },
  openGraph: {
    title: "Plan Your Visit | Destiny Church Tees Valley",
    description: "Sunday 11am at Destiny Centre, Norton Road, Stockton-on-Tees. Free parking, BSL available, kids provision from 10:45am.",
    url: "https://destinytees.uk/visit",
    images: [{ url: "/og/visit.webp", width: 1200, height: 630, alt: "Plan Your Visit | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/visit.webp"],
  },
};

/**
 * The physical journey through a Sunday, in order — the pattern every source
 * on "plan your visit" pages converges on and the site did not have: a
 * step-by-step walk from arrival to feeling settled, distinct from the
 * "What happens in the service" section below it, which is about content
 * (worship, teaching) rather than logistics (where do I go, when).
 */
const timeline = [
  {
    icon: "directions_car",
    title: "Park up",
    time: null,
    body: "Free parking on site — pull straight in, no need to book.",
  },
  {
    icon: "door_front",
    title: "Doors open",
    time: SCHEDULE.doorsOpen,
    body: "Arrive early to settle in and grab a coffee. Our Welcome Team will point you in the right direction.",
  },
  {
    icon: "self_improvement",
    title: "Prayer Service (optional)",
    time: SCHEDULE.prayerServiceStart,
    body: "A quieter, shorter gathering before the main service. Come for this too, or skip straight to 11am — both are completely normal.",
  },
  {
    icon: "child_care",
    title: "Kids check in",
    time: SCHEDULE.kidsCheckIn,
    body: "Age-appropriate classes for babies through Year 6. All leaders are DBS-checked and trained.",
  },
  {
    icon: "groups",
    title: "Main service",
    time: SCHEDULE.mainServiceStart,
    body: `About ${SCHEDULE.mainServiceDurationMinutes} minutes — worship, Bible teaching and prayer. Sit anywhere; nothing is assigned.`,
  },
  {
    icon: "waving_hand",
    title: "Meet the team",
    time: null,
    body: "We hang around after for coffee. No pressure to talk to anyone — but we'd love to say hello.",
  },
] as const;

const whatToExpect = [
  {
    icon: "music_note",
    title: "Worship",
    body: "We start with uplifting, contemporary worship music — sung together as a church family. Come ready to engage, or just take it in.",
  },
  {
    icon: "menu_book",
    title: "Bible Teaching",
    body: "Our sermons are Bible-based, relevant and practical. Whether you've been a Christian for decades or never opened a Bible, there's something for you.",
  },
  {
    icon: "volunteer_activism",
    title: "Prayer",
    body: "We believe prayer makes a difference. There's space in every service to respond — whether publicly or quietly in your own heart.",
  },
  {
    icon: "waving_hand",
    title: "Community",
    body: "After the service we hang around, grab a coffee and catch up. It's one of the best parts of the week. You're always welcome to join us.",
  },
] as const;

const ageGroups = [
  {
    tone: "orange" as const,
    icon: "child_care",
    title: "Destiny Kids",
    meta: `Ages 0–11 · From ${SCHEDULE.kidsCheckIn}`,
    body: "Age-appropriate classes for babies through to Year 6 — packed with stories, crafts, games and worship. All leaders are DBS-checked and trained.",
    href: "/kids",
    cta: "Learn about Destiny Kids",
  },
  {
    tone: "purple" as const,
    icon: "bolt",
    title: "Destiny Youth",
    meta: "Ages 11–18 · Wednesday 7pm",
    body: "A dedicated midweek gathering for young people aged 11–18. KS3, KS4 and KS5 groups — energetic, welcoming and rooted in faith.",
    href: "/youth",
    cta: "Learn about Destiny Youth",
  },
  {
    tone: "green" as const,
    icon: "group",
    title: "Young Adults",
    meta: "Ages 18–30+",
    body: "A community for those in their 18s–30s. Events, meals, Connect Groups and doing life together throughout the year.",
    href: "/young-adults",
    cta: "Learn about Young Adults",
  },
];

const faqs = [
  {
    q: "What time does the service start?",
    a: `Our main Sunday service runs from ${SCHEDULE.mainServiceStart} to approximately ${SCHEDULE.mainServiceEnd}. We also hold a Prayer Service from ${SCHEDULE.prayerServiceStart} to ${SCHEDULE.prayerServiceEnd}. Doors open from ${SCHEDULE.doorsOpen} so you can arrive early, settle in and grab a coffee.`,
  },
  {
    q: "What should I wear?",
    a: "Come as you are — seriously. You'll see everything from jeans and trainers to Sunday best. There's no dress code, no judgement.",
  },
  {
    q: "Is there parking?",
    a: PARKING_NOTE,
  },
  {
    q: "What about my children?",
    a: `Destiny Kids runs every Sunday from ${SCHEDULE.kidsCheckIn} to ${SCHEDULE.mainServiceEnd} for children aged 0–11. All leaders are DBS-checked and trained. Children are warmly welcomed into the service and head out to their classes during the gathering.`,
  },
  {
    q: "Do I need to book or register?",
    a: "No booking needed — just show up. If you'd like to let us know you're coming for the first time, you're welcome to fill in our Connect form so we can give you a proper welcome.",
  },
  {
    q: "Is the building accessible?",
    a: "Yes. Destiny Centre has step-free access, accessible toilets and BSL interpretation available. If you have specific accessibility requirements, please contact us in advance and we'll do everything we can to help.",
  },
  {
    q: "What if I have questions about faith?",
    a: "Brilliant — bring them. Whether you've got doubts, curiosity or you're exploring faith for the first time, you're in the right place. You might also want to check out our Alpha course.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function VisitPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PageHero
        image="/img/photos/Plan a Visit.webp"
        imageAlt=""
        eyebrow="You're Welcome Here"
        title="Plan Your Visit"
        subtitle="Everything you need to know before you walk through the doors."
      />

      {/* When & Where */}
      <Section>
        <SectionHeading
          eyebrow="Join us"
          title="When & where"
          lead="We meet every Sunday — and we'd love to see you there."
          align="center"
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <Card className="flex items-center gap-4 bg-surface-muted p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
              <Icon name="calendar_month" size="xl" className="text-destiny-orange" />
            </div>
            <div>
              <p className="mb-1 font-black text-destiny-grey">Every Sunday</p>
              <p className="text-sm text-muted">Prayer Service: {SCHEDULE.prayerServiceStart} – {SCHEDULE.prayerServiceEnd}</p>
              <p className="mt-1 text-sm text-muted">Main Service: {SCHEDULE.mainServiceStart} – {SCHEDULE.mainServiceEnd}</p>
              <p className="mt-1 text-xs text-subtle">Doors open from {SCHEDULE.doorsOpen}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 bg-surface-muted p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
              <Icon name="location_on" size="xl" className="text-destiny-orange" />
            </div>
            <div>
              <p className="mb-1 font-black text-destiny-grey">{ADDRESS.venue}</p>
              <p className="text-sm text-muted">{ADDRESS.streetShort}</p>
              <p className="text-sm text-muted">{ADDRESS.locality}</p>
              <p className="mt-1 text-xs text-subtle">{ADDRESS.postcode}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 bg-surface-muted p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
              <Icon name="local_parking" size="xl" className="text-destiny-orange" />
            </div>
            <div>
              <p className="mb-1 font-black text-destiny-grey">Free Parking</p>
              <p className="text-sm text-muted">On-site car park</p>
              <p className="mt-1 text-xs text-subtle">Step-free access available</p>
            </div>
          </Card>
        </div>
      </Section>

      {/* Your first Sunday — the step-by-step walkthrough the research
          consistently recommends and the page didn't have: the physical
          journey from arrival to feeling settled, as distinct from what
          happens content-wise once you're in your seat (below). */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Step by step"
          title="Your first Sunday"
          lead="Exactly what to expect, from parking the car to your first coffee."
          align="center"
        />
        <ol className="relative mx-auto mt-12 max-w-xl space-y-10">
          {timeline.map((step, i) => (
            <AnimateIn key={step.title} delay={i * 60}>
              <li className="relative flex flex-col items-center text-center">
                {/* Connects this dot to the next one only — not a single line
                    for the whole list — so it stops short after the last
                    step. Decorative, so it's aria-hidden and excluded from
                    the list semantics. */}
                {i < timeline.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="absolute left-1/2 top-6 hidden h-[calc(100%+2.5rem)] w-px -translate-x-1/2 bg-hairline sm:block"
                  />
                )}
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destiny-orange text-white shadow-lg shadow-destiny-orange/25">
                  <Icon name={step.icon} size="lg" />
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap items-baseline justify-center gap-2">
                    <p className="font-black text-destiny-grey">{step.title}</p>
                    {step.time && (
                      <span className="text-xs font-bold uppercase tracking-wider text-destiny-orange">
                        {step.time}
                      </span>
                    )}
                  </div>
                  <p className="mx-auto mt-1 max-w-xl text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </div>
              </li>
            </AnimateIn>
          ))}
        </ol>
      </Section>

      {/* What happens in the service — content, not logistics. */}
      <Section>
        <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
          <AnimateIn className="w-full md:w-1/2">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">What Happens</p>
            <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">In the service</h2>
            <p className="mb-8 text-base leading-relaxed text-muted">
              Whether it&apos;s your first time in a church or your hundredth, we want you to feel at home. Our Sunday services last around {SCHEDULE.mainServiceDurationMinutes} minutes and are relaxed, warm and welcoming.
            </p>
            <div className="grid gap-5">
              {whatToExpect.map((item, i) => (
                <AnimateIn key={item.title} delay={i * 60}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
                      <Icon name={item.icon} size="lg" className="text-destiny-orange" />
                    </div>
                    <div>
                      <p className="mb-1 font-black text-destiny-grey">{item.title}</p>
                      <p className="text-sm leading-relaxed text-muted">{item.body}</p>
                    </div>
                  </div>
                </AnimateIn>
              ))}
            </div>
          </AnimateIn>
          <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
            <div className="col-span-2 overflow-hidden rounded-panel">
              <Image src="/img/photos/Plan a Visit.webp" alt="Destiny Church" width={640} height={300} className="w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-card">
              <Image src="/img/photos/Gallery/Speaker.webp" alt="" width={300} height={220} className="w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-card">
              <Image src="/img/photos/Gallery/Speaker2.webp" alt="" width={300} height={220} className="w-full object-cover" />
            </div>
          </AnimateIn>
        </div>
      </Section>

      {/* Kids & Youth */}
      <Section tone="muted">
        <SectionHeading
          eyebrow="Bringing the Family?"
          title="We've got the kids covered"
          lead="Safe, fun and faith-filled spaces for every age group."
          align="center"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {ageGroups.map((group, i) => (
            <AnimateIn key={group.title} delay={i * 80}>
              <Card className="flex h-full flex-col bg-white p-7">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${TONE_SURFACE[group.tone]}`}>
                  <Icon name={group.icon} size="xl" className={TONE_ACCENT[group.tone]} />
                </div>
                <h3 className="mb-1 font-black text-destiny-grey">{group.title}</h3>
                <p className="mb-2 text-xs font-bold text-destiny-orange">{group.meta}</p>
                <p className="mb-5 flex-1 text-sm leading-relaxed text-muted">{group.body}</p>
                <Link href={group.href} className="inline-flex items-center gap-1.5 text-sm font-bold text-destiny-orange transition hover:gap-2.5">
                  {group.cta}
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </Card>
            </AnimateIn>
          ))}
        </div>
      </Section>

      {/* Accessibility — previously buried in FAQ answer 6, and this is
          exactly the sort of fact a visitor with an access need shouldn't
          have to hunt an accordion for. */}
      <Section>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Accessibility</p>
          <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">Everyone is welcome</h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
          {[
            { icon: "accessible", label: "Step-free access throughout" },
            { icon: "wc", label: "Accessible toilets" },
            { icon: "sign_language", label: "BSL interpretation available" },
            { icon: "hearing", label: "Hearing loop fitted" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-card border border-hairline bg-white p-4">
              <Icon name={item.icon} size="lg" className="shrink-0 text-destiny-orange" />
              <p className="text-sm font-medium text-destiny-grey">{item.label}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted">
          Got a specific requirement?{" "}
          <Link href="/contact" className="font-bold text-destiny-orange hover:underline">
            Let us know in advance
          </Link>{" "}
          and we&apos;ll make sure it&apos;s ready for you.
        </p>
      </Section>

      {/* Map + address */}
      <Section tone="muted">
        <div className="flex flex-col items-start gap-10 md:flex-row md:gap-16">
          <AnimateIn className="w-full md:w-1/2">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Getting Here</p>
            <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">Find us</h2>
            <div className="mb-6 space-y-4 text-sm text-muted">
              <div className="flex items-start gap-3">
                <Icon name="location_on" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <div>
                  <p className="font-bold text-destiny-grey">{ADDRESS.venue}</p>
                  <p>{ADDRESS_ONE_LINE.replace(`${ADDRESS.venue}, `, "")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="local_parking" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <div>
                  <p className="font-bold text-destiny-grey">Parking</p>
                  <p>{PARKING_NOTE}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="directions_bus" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <div>
                  <p className="font-bold text-destiny-grey">By Bus</p>
                  <p className="mb-1.5">{BUS_NOTE}</p>
                  <a
                    href="https://moovitapp.com/index/en-gb/public_transportation-Destiny_Centre-North_East-site_163915994-2104"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-destiny-orange transition hover:underline"
                  >
                    Plan your journey
                    <Icon name="open_in_new" size="xs" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="accessible" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <div>
                  <p className="font-bold text-destiny-grey">Accessibility</p>
                  <p>Step-free access, accessible toilets and BSL interpretation available. Contact us in advance for specific requirements.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="call" size="lg" className="mt-0.5 shrink-0 text-destiny-orange" />
                <div>
                  <p className="font-bold text-destiny-grey">Phone</p>
                  <a href={PHONE.href} className="transition hover:text-destiny-orange">{PHONE.display}</a>
                </div>
              </div>
            </div>
            <Button href={DIRECTIONS_URL} variant="accentOutline">
              Get directions
              <Icon name="open_in_new" size="xs" />
              <span className="sr-only">(opens in a new tab)</span>
            </Button>
          </AnimateIn>
          <AnimateIn delay={100} className="w-full overflow-hidden rounded-panel md:w-1/2">
            <iframe
              src={`${MAPS_URL}&output=embed`}
              width="100%"
              height="380"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${ADDRESS.venue} map`}
              className="rounded-panel"
            />
          </AnimateIn>
        </div>
      </Section>

      {/* FAQ — real disclosures now, matching the FAQPage JSON-LD above,
          rather than seven permanently-open blocks with no expand/collapse
          semantics at all. */}
      <Section>
        <SectionHeading
          eyebrow="Anything else?"
          title="Common questions"
          lead="Just ask us if you don't see it here."
          align="center"
        />
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {faqs.map((faq) => (
            <Disclosure key={faq.q} summary={faq.q}>
              {faq.a}
            </Disclosure>
          ))}
        </div>
      </Section>

      {/* Connect-card CTA — the natural close for a visitor who's decided to
          come: let us know you're coming, so we can give a proper welcome. */}
      <Section tone="dark" padding="md">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <h2 className="text-3xl font-black text-white md:text-4xl">
            Ready to come along?
          </h2>
          <p className="max-w-xl text-on-dark-muted">
            You don&apos;t need to book — just show up. But if you&apos;d like
            us to know you&apos;re coming, fill in a Connect Card and
            we&apos;ll be ready to give you a proper welcome.
          </p>
          <Link
            href="/connect-card"
            className="inline-flex items-center justify-center rounded-full bg-destiny-orange px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
          >
            Fill in a Connect Card
          </Link>
        </div>
      </Section>

      {/* Full-width slideshow */}
      <VisitSlideshow />
    </>
  );
}
