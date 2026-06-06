import type { Metadata } from "next";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import FaqAccordion from "@/app/hire/FaqAccordion";
import { getPublishedJobs } from "@/lib/jobs.server";
import {
  EMPLOYMENT_LABELS,
  isClosed,
  type Job,
} from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Jobs & Internships",
  description:
    "Work with Destiny Church Tees Valley. Explore our open jobs and internship opportunities and find a role where your gifts meet God's purpose.",
  alternates: { canonical: "/jobs" },
  openGraph: {
    title: "Jobs & Internships | Destiny Church Tees Valley",
    description:
      "It's not a career — it's a calling. Find out more about working in ministry at Destiny Church.",
    url: "https://destinytees.uk/jobs",
  },
};

export const revalidate = 300;

const DISPLAY = { fontFamily: "var(--font-anton), Impact, sans-serif" } as const;
const SERIF = { fontFamily: "var(--font-playfair), Georgia, serif" } as const;

const STEPS = [
  {
    icon: "search",
    title: "Find open roles",
    body: "Browse our open positions below — if there's a role that speaks to you, that's where to start.",
  },
  {
    icon: "description",
    title: "Apply online",
    body: "Complete a short application and attach your CV — tell us about you and your gifts.",
  },
  {
    icon: "schedule",
    title: "Hear from us",
    body: "Our team will review your application and guide you through the next steps if it's a fit.",
  },
];

const PERKS = [
  { icon: "volunteer_activism", label: "Pension Scheme" },
  { icon: "self_improvement", label: "On-Site Prayer & Chapel" },
  { icon: "diversity_1", label: "Pastoral Care & Support" },
  { icon: "school", label: "Training & Development" },
  { icon: "local_cafe", label: "On-Site Café" },
  { icon: "local_parking", label: "Free Parking" },
  { icon: "groups", label: "A Real Team Culture" },
  { icon: "favorite", label: "Generous Holiday" },
];

const VALUES = [
  "We are driven by our God-given calling to ministry.",
  "We look for people whose lifestyle leads the way in bringing people to Christ.",
  "We're learners — adaptable, committed to excellence, and serving with joy.",
  "We're serious about reaching people, and we have a lot of fun while we do it.",
];

const FAQS = [
  {
    q: "How can I find job openings?",
    a: "All of our current openings are listed on this page. New roles are added as they become available, so it's worth checking back or following us on social media.",
  },
  {
    q: "Do I need to be a member of the church to apply?",
    a: "For most roles we look for people who share our faith and values. Some positions require active membership at Destiny Church — this will be made clear in the role description.",
  },
  {
    q: "Are there other ways to get involved that aren't staff positions?",
    a: "Absolutely. Volunteering is the heartbeat of our church. Visit our Serve page to find a team, or consider one of our internship opportunities to develop your gifts.",
  },
  {
    q: "What happens after I apply?",
    a: "Our team reviews every application. If your experience and calling align with the role, we'll be in touch to arrange a conversation. Due to volume we may not be able to respond to every applicant.",
  },
  {
    q: "I have more questions — who do I contact?",
    a: "Email us at admin@destinytees.uk and a member of our team will be happy to help.",
  },
];

function RoleCard({ job }: { job: Job }) {
  const closed = isClosed(job);
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="group flex h-full flex-col rounded-3xl border border-black/5 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-destiny-orange/30 hover:shadow-xl"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-destiny-orange/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destiny-orange">
          {EMPLOYMENT_LABELS[job.employment_type]}
        </span>
        {closed && (
          <span className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/45">
            Closed
          </span>
        )}
      </div>
      <h3 className="text-xl font-black text-destiny-grey">{job.title}</h3>
      {(job.department || job.location) && (
        <p className="mt-1 text-sm text-destiny-grey/45">
          {[job.department, job.location].filter(Boolean).join(" · ")}
        </p>
      )}
      {job.summary && (
        <p className="mt-4 flex-1 text-sm leading-relaxed text-destiny-grey/60">
          {job.summary}
        </p>
      )}
      <div className="mt-6 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-destiny-orange">
          View role
          <span className="material-symbols-rounded text-base transition-transform group-hover:translate-x-1">
            arrow_forward
          </span>
        </span>
        {job.closing_date && !closed && (
          <span className="text-xs text-destiny-grey/40">
            Closes{" "}
            {new Date(job.closing_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function JobsPage() {
  const jobs = await getPublishedJobs();
  const openJobs = jobs.filter((j) => j.kind === "job");
  const internships = jobs.filter((j) => j.kind === "internship");
  const hasAny = jobs.length > 0;

  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl px-6 py-[9rem] text-center"
          style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: "url('/img/photos/Community.webp')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/85" />
          <AnimateIn className="relative z-10">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-destiny-orange">
              Work With Us
            </p>
            <h1
              className="mx-auto max-w-3xl text-5xl uppercase leading-[0.95] text-white md:text-7xl"
              style={DISPLAY}
            >
              It&apos;s not a career.
              <br />
              It&apos;s a{" "}
              <span className="text-destiny-orange" style={SERIF}>
                <em>calling.</em>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-white/65 md:text-lg">
              Find out more about working in ministry at Destiny Church — where your
              gifts and passion meet God&apos;s purpose for your life.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#openings"
                className="rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
              >
                View open roles
              </a>
              <Link
                href="/serve"
                className="rounded-full border-2 border-white/25 px-7 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10"
              >
                Volunteer instead
              </Link>
            </div>
          </AnimateIn>
        </section>
      </div>

      {/* Intro */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <h2 className="text-3xl font-black leading-tight text-destiny-grey md:text-4xl">
              Join your talents with your passion for the local church
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              God has equipped you with unique gifts and a purpose. At Destiny Church
              we&apos;re committed to creating an environment where you can use those
              gifts to serve, grow and make an impact. We hear we say this a lot — it&apos;s
              more than just a job. Find a role where your passion meets God&apos;s purpose.
            </p>
          </AnimateIn>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <AnimateIn className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              How It Works
            </p>
            <h2 className="text-3xl font-black text-destiny-grey md:text-4xl">
              Finding your fit doesn&apos;t have to be difficult
            </h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <AnimateIn key={step.title} delay={i * 90}>
                <div className="flex h-full flex-col rounded-3xl bg-white p-7 shadow-sm">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="mb-2 font-black text-destiny-grey">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">
                    {step.body}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section id="openings" className="scroll-mt-24 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <AnimateIn className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Open Positions
            </p>
            <h2 className="text-3xl font-black text-destiny-grey md:text-4xl">
              Current opportunities
            </h2>
          </AnimateIn>

          {!hasAny ? (
            <AnimateIn>
              <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-black/10 bg-[#f5f7fa] px-6 py-16 text-center">
                <span className="material-symbols-rounded mb-3 text-4xl text-destiny-grey/25">
                  work_off
                </span>
                <p className="font-black text-destiny-grey">No open roles right now</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-destiny-grey/50">
                  We don&apos;t have any vacancies at the moment, but new roles appear
                  here as they open. In the meantime, there are always ways to get
                  involved.
                </p>
                <Link
                  href="/serve"
                  className="mt-6 inline-flex rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Explore volunteering
                </Link>
              </div>
            </AnimateIn>
          ) : (
            <div className="space-y-14">
              {openJobs.length > 0 && (
                <div>
                  <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-destiny-grey/40">
                    Jobs
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {openJobs.map((job, i) => (
                      <AnimateIn key={job.id} delay={i * 70}>
                        <RoleCard job={job} />
                      </AnimateIn>
                    ))}
                  </div>
                </div>
              )}

              {internships.length > 0 && (
                <div>
                  <h3 className="mb-6 text-sm font-bold uppercase tracking-widest text-destiny-grey/40">
                    Internships
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {internships.map((job, i) => (
                      <AnimateIn key={job.id} delay={i * 70}>
                        <RoleCard job={job} />
                      </AnimateIn>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Perks */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <AnimateIn className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Looking After You
            </p>
            <h2 className="text-3xl font-black text-destiny-grey md:text-4xl">
              Perks to support you &amp; your family
            </h2>
          </AnimateIn>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PERKS.map((perk, i) => (
              <AnimateIn key={perk.label} delay={i * 50}>
                <div className="flex h-full flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">
                      {perk.icon}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-destiny-grey">{perk.label}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Who we hire */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-destiny-grey text-white">
            <div className="grid md:grid-cols-2">
              <div
                className="relative min-h-[260px]"
                style={{
                  backgroundImage: "url('/img/photos/Training_DC-scaled.webp')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="p-9 md:p-12">
                <AnimateIn>
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                    Our Culture
                  </p>
                  <h2 className="text-2xl font-black md:text-3xl">
                    Who we hire to join our team
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-white/60">
                    Our team members come from diverse backgrounds and ministry
                    experiences, but they all share some distinct passions.
                  </p>
                  <ul className="mt-6 space-y-3">
                    {VALUES.map((v) => (
                      <li key={v} className="flex items-start gap-2.5">
                        <span className="material-symbols-rounded mt-0.5 text-base text-destiny-orange">
                          check_circle
                        </span>
                        <span className="text-sm leading-relaxed text-white/80">
                          {v}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AnimateIn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-3xl px-4 lg:px-8">
          <AnimateIn className="text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Questions
            </p>
            <h2 className="text-3xl font-black text-destiny-grey md:text-4xl">
              Have more questions for us?
            </h2>
          </AnimateIn>
          <FaqAccordion faqs={FAQS} />
        </div>
      </section>
    </>
  );
}
