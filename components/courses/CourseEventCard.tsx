import AnimateIn from "@/components/AnimateIn";
import { getNextAlphaSession } from "@/lib/alphaSession";
import type { CourseEvent } from "@/lib/useCourseEvents";

/**
 * The ticket-stub "when and where" card every course page shows for its next
 * session(s) — Alpha, The Bible Course, Destiny 12:2 and CAP Money all built
 * this exact same card by hand, differing only in which colour their brand
 * uses for the small labels and the "Join meeting" pill.
 *
 * `label` is Alpha's one real variation: it runs Alpha and Youth Alpha
 * through the same feed, so when more than one event is showing it needs a
 * header strip saying which is which. The other three courses never pass it.
 */
export default function CourseEventCard({
  event,
  accentColor,
  shadowColor = accentColor,
  label,
}: {
  event: CourseEvent;
  accentColor: string;
  /** Defaults to `accentColor`. Alpha's card shadow is tinted from its dark maroon hero rather than its orange accent. */
  shadowColor?: string;
  label?: string;
}) {
  const session = getNextAlphaSession(event.start_date, event.frequency, event.custom_interval_days);
  const d = session.date;
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" });
  const day = d.toLocaleDateString("en-GB", { day: "numeric" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  const year = d.toLocaleDateString("en-GB", { year: "numeric" });
  const cadenceLabel = session.isFirst ? "Starting" : "Next session";
  const isOnline = event.format === "online";
  const platformLabel =
    event.meeting_platform === "zoom" ? "Zoom" : event.meeting_platform === "google_meet" ? "Google Meet" : "Online";

  return (
    <AnimateIn>
      <div
        className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-black/5"
        style={{ boxShadow: `0 30px 60px -30px ${shadowColor}59` }}
      >
        {/* Ticket-stub notches */}
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f7fa]" />
        <span aria-hidden="true" className="absolute right-0 top-1/2 h-6 w-6 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f7fa]" />

        {label && (
          <div className="border-b border-dashed border-destiny-grey/15 px-8 py-4 md:px-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-subtle">{label}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Date */}
          <div className="border-b border-dashed border-destiny-grey/15 px-8 py-7 md:border-b-0 md:border-r md:px-10">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: accentColor }}>
              <span className="material-symbols-rounded text-sm leading-none" aria-hidden="true">event</span>
              {cadenceLabel}
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-subtle">{weekday}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span
                className="text-5xl font-normal italic leading-none text-destiny-grey md:text-6xl"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                {day}
              </span>
              <span className="text-lg font-black uppercase tracking-wide text-destiny-grey md:text-xl">
                {month} <span className="text-subtle">{year}</span>
              </span>
            </div>
          </div>

          {/* Where / Online */}
          {isOnline ? (
            <div className="px-8 py-7 md:px-10">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: accentColor }}>
                <span className="material-symbols-rounded text-sm leading-none" aria-hidden="true">videocam</span>
                Online
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-subtle">Join via</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-2xl font-black leading-tight text-destiny-grey md:text-3xl">{platformLabel}</span>
                {event.meeting_id && <span className="font-mono text-xs text-subtle">#{event.meeting_id}</span>}
              </div>
              {(event.meeting_url || event.meeting_passcode) && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {event.meeting_url && (
                    <a
                      href={event.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:brightness-110"
                      style={{ backgroundColor: accentColor }}
                    >
                      <span className="material-symbols-rounded text-[14px] leading-none" aria-hidden="true">open_in_new</span>
                      Join meeting
                    </a>
                  )}
                  {event.meeting_passcode && (
                    <span className="text-[11px] uppercase tracking-wide text-subtle">
                      Passcode{" "}
                      <span className="font-mono text-destiny-grey/80 normal-case tracking-normal">{event.meeting_passcode}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="px-8 py-7 md:px-10">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: accentColor }}>
                <span className="material-symbols-rounded text-sm leading-none" aria-hidden="true">place</span>
                Where
              </div>
              {event.location ? (
                <>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-subtle">Join us at</div>
                  <div className="mt-1 text-2xl font-black leading-tight text-destiny-grey md:text-3xl">{event.location}</div>
                </>
              ) : (
                <>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-subtle">Venue</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className="text-5xl font-normal italic leading-none text-subtle md:text-6xl"
                      style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                    >
                      tba
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AnimateIn>
  );
}
