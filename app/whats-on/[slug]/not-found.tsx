import Link from "next/link";

/**
 * The ChurchSuite feed is forward-only — a finished event simply stops being
 * returned — so shared links to past events land here rather than on a generic
 * 404. Renamed events do too, unless the URL carried an occurrence identifier.
 */
export default function EventNotFound() {
  return (
    <div className="bg-white py-24">
      <div className="mx-auto max-w-lg px-4 text-center lg:px-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
          <svg className="h-8 w-8 text-destiny-orange/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>
        </div>
        <h1
          style={{ fontFamily: "var(--font-roboto)" }}
          className="text-[26px] font-semibold tracking-[-0.02em] text-destiny-grey"
        >
          This event has finished or moved
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-destiny-grey/60">
          It may have already taken place, or been renamed in our calendar.
          Have a look at what&apos;s coming up instead.
        </p>
        <Link
          href="/whats-on#events"
          className="mt-7 inline-flex items-center justify-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
        >
          See what&apos;s on
        </Link>
      </div>
    </div>
  );
}
