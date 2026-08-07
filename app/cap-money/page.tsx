import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

// CAP brand palette: money-course green over CAP's dark grey.
const ACCENT = "#78be20";
const ACCENT_DARK = "#363f48";
const ACCENT_TINT = "#f2f8ea";

const CAP_URL = "https://capuk.org/i-want-help/cap-money-course/introduction";

const features = [
  {
    icon: "savings",
    title: "A system that works",
    body: "The CAP Money system splits your money across three simple accounts — regular payments, everyday spending and savings — so you always know where you stand.",
  },
  {
    icon: "payments",
    title: "Completely free",
    body: "There is no cost to attend and nothing to sign up to afterwards. No products are sold and nobody is asked to share their bank details.",
  },
  {
    icon: "groups",
    title: "Friendly and relaxed",
    body: "Small groups, no jargon and no awkward questions. You never have to talk about your own finances in front of anyone else.",
  },
  {
    icon: "schedule",
    title: "Just three sessions",
    body: "Three short sessions is all it takes. You leave with a working budget and a plan you can actually stick to.",
  },
];

const sessions = [
  {
    n: "01",
    title: "Where your money goes",
    body: "Get a clear, honest picture of what comes in and what goes out each month — the step most budgets never get past.",
  },
  {
    n: "02",
    title: "Build your budget",
    body: "Put together a budget that balances, with practical ideas for cutting costs and making the most of what you have.",
  },
  {
    n: "03",
    title: "Live the system",
    body: "Learn how to run the three-account system week to week so the budget survives contact with real life.",
  },
];

const audience = [
  "Anyone who finds the end of the month arrives before the money does",
  "Couples wanting to get on the same page about spending",
  "Students and young adults budgeting for the first time",
  "Families looking to make savings go further",
  "Anyone who simply wants to be better with money",
];

export default function CapMoneyPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <Image
            src="/img/CAPMoney/hero.webp"
            alt="Two people working through a budget together"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(54,63,72,0.9) 0%, rgba(54,63,72,0.68) 50%, rgba(43,64,20,0.62) 100%)",
            }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center justify-center py-[11rem] px-6 md:px-12 text-center">
            <AnimateIn>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-white/70">
                By Christians Against Poverty
              </p>
              <h1 className="mb-8 max-w-3xl text-5xl font-black leading-[0.95] text-white md:text-6xl lg:text-7xl">
                CAP Money Course
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
                A free, three-session course that teaches a simple budgeting
                system that really works — so you can budget, save and spend
                with confidence.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-3 rounded-full px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                  style={{
                    backgroundColor: ACCENT,
                    boxShadow: "0 12px 30px -10px rgba(120,190,32,0.7)",
                  }}
                >
                  <span className="material-symbols-rounded text-lg">
                    person_add
                  </span>
                  Register your interest
                </Link>
                <a
                  href={CAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <span className="material-symbols-rounded text-base">
                    open_in_new
                  </span>
                  About CAP
                </a>
              </div>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Headline facts */}
      <section className="bg-white pb-16 pt-4">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { stat: "Free", label: "No cost, no catch" },
              { stat: "3", label: "Short sessions" },
              { stat: "Everyone", label: "Whatever your income" },
            ].map((item, i) => (
              <AnimateIn key={item.label} delay={i * 80}>
                <div className="rounded-3xl bg-[#f5f7fa] px-6 py-7 text-center shadow-sm">
                  <div
                    className="text-3xl font-black md:text-4xl"
                    style={{ color: ACCENT }}
                  >
                    {item.stat}
                  </div>
                  <div className="mt-1 text-sm text-destiny-grey/60">
                    {item.label}
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-white pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl">
                <Image
                  src="/img/CAPMoney/coach.webp"
                  alt="A CAP Money coach talking someone through their budget"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </AnimateIn>
            <AnimateIn className="w-full md:w-1/2">
              <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: ACCENT }}
              >
                What is the CAP Money Course?
              </p>
              <h2 className="mb-6 text-3xl font-black text-destiny-grey md:text-4xl">
                Budget. Save. Spend.
              </h2>
              <div className="space-y-4 text-base leading-relaxed text-destiny-grey/70 md:text-lg">
                <p>
                  The CAP Money Course is a free money management course that
                  teaches a simple, cash-based budgeting system that really
                  works. It is run by trained CAP Money coaches from our church,
                  usually over three sessions.
                </p>
                <p>
                  You&apos;ll work out exactly where your money goes, build a
                  budget that balances, and learn the CAP Money system — three
                  accounts covering your regular payments, your everyday
                  spending and your savings.
                </p>
                <p>
                  It isn&apos;t a debt-advice appointment and it isn&apos;t a
                  sales pitch. Nothing is sold, nobody looks at your bank
                  statements, and you never have to share a single figure with
                  the room.
                </p>
              </div>
              <p className="mt-8 text-xs text-destiny-grey/50">
                Created by Christians Against Poverty (CAP), a UK charity
                working to lift people out of debt and poverty.
              </p>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Sessions */}
      <section className="py-16" style={{ backgroundColor: ACCENT_TINT }}>
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              What happens on the course
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-base text-destiny-grey/60">
              Three short sessions that take you from &ldquo;where did it all
              go?&rdquo; to a budget you can live on.
            </p>
          </AnimateIn>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s, i) => (
              <AnimateIn key={s.n} delay={i * 80}>
                <div className="flex h-full flex-col rounded-3xl bg-white p-8 shadow-sm">
                  <span
                    className="mb-3 text-sm font-black italic"
                    style={{
                      color: ACCENT,
                      fontFamily: "var(--font-playfair), Georgia, serif",
                    }}
                  >
                    {s.n}
                  </span>
                  <h3 className="mb-2 text-lg font-black text-destiny-grey">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">
                    {s.body}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Why you'll love it */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Why you&apos;ll love it
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <AnimateIn key={f.title} delay={i * 80}>
                <div className="flex h-full flex-col items-start rounded-3xl bg-[#f5f7fa] p-8 shadow-sm">
                  <div
                    className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: "rgba(120,190,32,0.14)" }}
                  >
                    <span
                      className="material-symbols-rounded text-3xl"
                      style={{ color: ACCENT }}
                    >
                      {f.icon}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-black text-destiny-grey">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">
                    {f.body}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20" style={{ backgroundColor: ACCENT_TINT }}>
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col-reverse items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p
                className="mb-3 text-xs font-bold uppercase tracking-widest"
                style={{ color: ACCENT }}
              >
                Who is it for?
              </p>
              <h2 className="mb-6 text-3xl font-black text-destiny-grey md:text-4xl">
                Honestly — everyone
              </h2>
              <p className="mb-6 text-base leading-relaxed text-destiny-grey/70 md:text-lg">
                You don&apos;t need to be in trouble with money to come. Most
                people leave saying they wish they&apos;d done it years earlier.
              </p>
              <ul className="space-y-3">
                {audience.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-3 text-base text-destiny-grey/70"
                  >
                    <span
                      className="material-symbols-rounded mt-0.5 text-xl leading-none"
                      style={{ color: ACCENT }}
                    >
                      check_circle
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </AnimateIn>
            <AnimateIn className="w-full md:w-1/2">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-xl">
                <Image
                  src="/img/CAPMoney/group.webp"
                  alt="A small group chatting around a table"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Struggling with debt */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <div
              className="rounded-3xl px-8 py-10 text-center md:px-12"
              style={{ backgroundColor: ACCENT_DARK }}
            >
              <h2 className="mb-4 text-2xl font-black text-white md:text-3xl">
                Struggling with debt?
              </h2>
              <p className="mx-auto mb-7 max-w-2xl text-base leading-relaxed text-white/75">
                The CAP Money Course is about budgeting, not debt help. If debt
                is the bigger worry right now, CAP offers free, confidential
                debt advice across the UK — and we&apos;d be glad to help you
                take that first step.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href="https://capuk.org/i-want-help/cap-debt-help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full px-7 py-3 text-sm font-bold text-white transition hover:brightness-110"
                  style={{ backgroundColor: ACCENT }}
                >
                  CAP debt help
                </a>
                <Link
                  href="/contact"
                  className="rounded-full bg-white/10 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Talk to us
                </Link>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Sign-up CTA */}
      <section className="py-20" style={{ backgroundColor: ACCENT_TINT }}>
        <div className="mx-auto max-w-2xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              Save your seat
            </h2>
            <p className="mb-8 text-base leading-relaxed text-destiny-grey/60">
              Courses run a few times a year and places are limited. Register
              your interest and we&apos;ll let you know as soon as the next
              dates are set.
            </p>
            <Link
              href="/contact"
              className="inline-block rounded-full px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              style={{
                backgroundColor: ACCENT,
                boxShadow: "0 12px 30px -10px rgba(120,190,32,0.5)",
              }}
            >
              Register your interest
            </Link>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
