import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getActiveAnnouncement } from "@/lib/announcements";

export const revalidate = 30;
export const runtime = "nodejs";

export default async function AnnouncementPage() {
  const announcement = await getActiveAnnouncement();
  const description = announcement?.description;
  const markdown = description ? description.replace(/\n/g, "  \n") : "";

  if (!announcement || !description) {
    return (
      <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-10 shadow-sm">
        <p className="subheading text-sm text-destiny-orange">Important update</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">
          Nothing to share right now
        </h1>
        <p className="mt-3 text-destiny-grey">
          There isn&apos;t an active notice at the moment. Please check back later.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
        >
          Back to home
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-10 shadow-sm">
      <div
        aria-hidden
        className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-destiny-orange/35 via-destiny-red/25 to-destiny-purple/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-20 bottom-[-80px] h-64 w-64 rounded-full bg-gradient-to-br from-destiny-blue/25 via-destiny-green/20 to-destiny-orange/25 blur-3xl"
      />
      <div className="relative space-y-4">
        <p className="subheading text-sm text-destiny-orange">Important update</p>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          {announcement.message}
        </h1>
        <div className="prose prose-base max-w-none text-[var(--foreground)] prose-headings:text-[var(--foreground)] prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
        >
          Back to home
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
