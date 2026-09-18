import Section from "@/components/ui/Section";
import Icon from "@/components/ui/Icon";
import NextGatheringStatus from "@/components/home/NextGatheringStatus";
import PlanVisitCTA from "@/components/home/PlanVisitCTA";
import { ADDRESS, DIRECTIONS_URL, SCHEDULE } from "@/lib/churchInfo";
import { nextSundayService, formatServiceDay } from "@/lib/serviceTimes";

/**
 * "When and where do you meet?" — answered before the fold, which the
 * homepage did not do at all before this. Every high-performing church site
 * researched (Transformation, Cedarcrest, VOUS, The Orchard, Fusion) puts
 * service time and location within the first screen or two, because that is
 * the one question a first-time visitor actually came to the site to answer.
 * The data already existed, timezone-correct, in lib/serviceTimes.ts — it
 * just wasn't on the homepage.
 *
 * Sits between HeroSection and MissionSection in HomePageBody.
 *
 * Server-rendered: `next`/`day` are computed once per request from the real
 * clock, so there's no loading state and nothing to flash in after mount. The
 * one thing that DOES need the client — "is a service live right now" and
 * the relative countdown — is isolated into NextGatheringStatus, a small
 * client island that starts from this same server-computed instant and has
 * nothing to hydrate-mismatch against.
 */
export default function ServiceTimesBar() {
  const next = nextSundayService();
  const day = formatServiceDay(next);

  return (
    <Section tone="light" padding="sm">
      <div className="flex flex-col gap-4 rounded-panel bg-destiny-grey p-5 shadow-card sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/15">
              <Icon name="event" size="lg" className="text-destiny-orange" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Next gathering
              </p>
              <p className="text-lg font-black text-white">
                {day}, {SCHEDULE.mainServiceStart}
              </p>
              <NextGatheringStatus nextIso={next.toISOString()} />
            </div>
          </div>

          <div className="hidden h-10 w-px bg-white/15 lg:block" aria-hidden="true" />

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/15">
              <Icon name="location_on" size="lg" className="text-destiny-orange" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Where
              </p>
              <p className="text-lg font-black text-white">
                {ADDRESS.venue}
              </p>
              <p className="text-sm text-on-dark-subtle">{ADDRESS.streetShort}, {ADDRESS.locality}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-on-dark-subtle underline underline-offset-2 transition hover:text-white"
          >
            Get directions
            <Icon name="open_in_new" size="xs" />
            {/* The icon alone doesn't say "this leaves the site" to a screen
                reader — text does. */}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <PlanVisitCTA />
        </div>
      </div>
    </Section>
  );
}
