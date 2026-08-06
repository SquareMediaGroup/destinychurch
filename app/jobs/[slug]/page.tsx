import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import AnimateIn from "@/components/AnimateIn";
import ApplyForm from "../ApplyForm";
import { getJobBySlug, getPublishedJobs } from "@/lib/jobs.server";
import { EMPLOYMENT_LABELS, KIND_LABELS, isClosed } from "@/lib/jobs";
import RichContent from "@/components/content/RichContent";

export const revalidate = 300;

export async function generateStaticParams() {
  const jobs = await getPublishedJobs();
  return jobs.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return { title: "Role not found" };
  return {
    title: `${job.title} | Jobs`,
    description:
      job.summary ||
      `Apply for ${job.title} at Destiny Church Tees Valley.`,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      title: `${job.title} | Destiny Church Tees Valley`,
      description: job.summary || `Apply for ${job.title} at Destiny Church.`,
      url: `https://destinytees.uk/jobs/${job.slug}`,
    },
  };
}

const DISPLAY = { fontFamily: "var(--font-anton), Impact, sans-serif" } as const;

// Descriptions are authored in the admin's rich-text editor and stored as HTML.
// Older rows may still hold Markdown, so fall back to rendering that.
const looksLikeHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);

function Meta({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="material-symbols-rounded mt-0.5 text-xl text-destiny-orange">
        {icon}
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-destiny-grey/40">
          {label}
        </p>
        <p className="text-sm font-bold text-destiny-grey">{value}</p>
      </div>
    </div>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();

  const closed = isClosed(job);

  const metaItems = [
    { icon: "category", label: "Type", value: KIND_LABELS[job.kind] },
    {
      icon: "schedule",
      label: "Employment",
      value: EMPLOYMENT_LABELS[job.employment_type],
    },
    job.department && {
      icon: "diversity_3",
      label: "Department",
      value: job.department,
    },
    job.location && { icon: "place", label: "Location", value: job.location },
    job.hours && { icon: "timer", label: "Hours", value: job.hours },
    job.salary && { icon: "payments", label: "Salary", value: job.salary },
    job.closing_date && {
      icon: "event",
      label: "Closing date",
      value: new Date(job.closing_date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section
          className="relative overflow-hidden rounded-3xl px-6 py-20 md:py-24"
          style={{ background: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 100%)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/70" />
          <AnimateIn className="relative z-10 mx-auto max-w-4xl">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/60 transition hover:text-white"
            >
              <span className="material-symbols-rounded text-base">arrow_back</span>
              All roles
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-destiny-orange/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destiny-orange">
                {KIND_LABELS[job.kind]}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/70">
                {EMPLOYMENT_LABELS[job.employment_type]}
              </span>
              {closed && (
                <span className="rounded-full bg-destiny-red/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-destiny-red">
                  Applications closed
                </span>
              )}
            </div>
            <h1
              className="mt-4 text-4xl uppercase leading-[0.98] text-white md:text-6xl"
              style={DISPLAY}
            >
              {job.title}
            </h1>
            {job.summary && (
              <p className="mt-4 max-w-2xl text-base text-white/65 md:text-lg">
                {job.summary}
              </p>
            )}
            {!closed && (
              <a
                href="#apply"
                className="mt-8 inline-flex rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
              >
                Apply for this role
              </a>
            )}
          </AnimateIn>
        </section>
      </div>

      {/* Body */}
      <section className="bg-white pb-24">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 lg:grid-cols-[1fr_300px] lg:px-8">
          {/* Description */}
          <AnimateIn className="order-2 lg:order-1">
            {job.description ? (
              looksLikeHtml(job.description) ? (
                <RichContent
                  html={job.description}
                  className="rte-content text-[0.95rem] text-destiny-grey/80"
                />
              ) : (
                <div className="rte-content text-[0.95rem] text-destiny-grey/80">
                  <ReactMarkdown>{job.description}</ReactMarkdown>
                </div>
              )
            ) : (
              <p className="text-sm leading-relaxed text-destiny-grey/60">
                We&apos;d love to tell you more about this role. Apply below or get in
                touch and our team will share the full details.
              </p>
            )}
          </AnimateIn>

          {/* Sidebar meta */}
          <AnimateIn className="order-1 lg:order-2" delay={80}>
            <div className="sticky top-24 rounded-3xl border border-black/5 bg-[#f5f7fa] p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
                Role details
              </p>
              <div className="space-y-4">
                {metaItems.map((m) => (
                  <Meta key={m.label} {...m} />
                ))}
              </div>
              {!closed && (
                <a
                  href="#apply"
                  className="mt-6 block rounded-full bg-destiny-orange px-5 py-3 text-center text-sm font-bold text-white transition hover:brightness-110"
                >
                  Apply now
                </a>
              )}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* Apply */}
      <section id="apply" className="scroll-mt-24 bg-[#f5f7fa] py-20">
        <div className="mx-auto max-w-2xl px-4 lg:px-8">
          {closed ? (
            <div className="rounded-3xl border border-black/5 bg-white p-8 text-center">
              <h2 className="text-2xl font-black text-destiny-grey">
                Applications are closed
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-destiny-grey/60">
                The closing date for this role has passed. Take a look at our other
                opportunities — the right one may be waiting.
              </p>
              <Link
                href="/jobs"
                className="mt-6 inline-flex rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
              >
                View open roles
              </Link>
            </div>
          ) : (
            <>
              <AnimateIn className="mb-8 text-center">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                  Apply
                </p>
                <h2 className="text-3xl font-black text-destiny-grey">
                  Apply for {job.title}
                </h2>
                <p className="mt-2 text-sm text-destiny-grey/55">
                  Tell us about yourself — we read every application.
                </p>
              </AnimateIn>
              <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm md:p-9">
                <ApplyForm jobId={job.id} jobTitle={job.title} />
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
