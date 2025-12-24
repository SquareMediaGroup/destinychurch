import Link from "next/link";

export const revalidate = 30;

export default function ComingSoonPage() {
  return (
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] px-6 py-10 shadow-sm lg:px-12">
      <p className="subheading text-sm text-destiny-orange">Coming soon</p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">
        We’re getting this ready.
      </h1>
      <p className="mt-3 max-w-2xl text-destiny-grey">
        This page is on the way. Check back soon for updates.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95"
        >
          Back to home
        </Link>
        <Link
          href="/sermons"
          className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
        >
          Browse sermons
        </Link>
      </div>
    </div>
  );
}
