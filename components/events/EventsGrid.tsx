"use client";

// The /whats-on event grid.
//
// Groups arrive pre-filtered (upcoming only) and pre-sorted from the server —
// this component does *only* the text search. That split is deliberate: every
// clock-dependent decision has to happen server-side or the client renders a
// different set of events than the server did, which hydrates badly at midnight
// and around DST.

import { useMemo, useState } from "react";
import type { EventSeries } from "@destiny/shared";
import type { EventCardVariant } from "@/lib/events";
import AnimateIn from "@/components/AnimateIn";
import EventCard from "./EventCard";

export type EventMonthGroup = {
  key: string;
  label: string;
  events: EventSeries[];
};

export default function EventsGrid({
  groups,
  variant = "a",
}: {
  groups: EventMonthGroup[];
  variant?: EventCardVariant;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups
      .map((group) => ({
        ...group,
        events: group.events.filter((event) =>
          event.name.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.events.length > 0);
  }, [groups, search]);

  return (
    <section id="events" className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Search */}
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-black/8 bg-gray-50 px-4 py-3 shadow-sm transition-shadow focus-within:border-destiny-orange/30 focus-within:shadow-md">
          <svg className="h-4 w-4 shrink-0 text-destiny-grey/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search events"
            className="w-full bg-transparent text-sm text-destiny-grey placeholder-destiny-grey/40 outline-none"
          />
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-10">
            {filtered.map((group, groupIndex) => (
              <div key={group.key}>
                {/* `top` clears the fixed header; kept conservative because
                    BannerSpacer adds variable height when a banner is live. */}
                <h2
                  style={{ fontFamily: "var(--font-roboto)" }}
                  className="sticky top-[72px] z-[5] -mx-1 mb-4 bg-white/85 px-1 py-2 text-[13px] font-bold uppercase tracking-[0.14em] text-destiny-grey/45 backdrop-blur"
                >
                  {group.label}
                </h2>
                {/* AnimateIn wraps the group, never each card — a wrapper div
                    per cell would break the grid. */}
                <AnimateIn>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {group.events.map((event, index) => (
                      <EventCard
                        key={event.slug}
                        event={event}
                        variant={variant}
                        priority={groupIndex === 0 && index < 3}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ))}
                  </div>
                </AnimateIn>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
              <svg className="h-8 w-8 text-destiny-orange/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-destiny-grey/60">
              {search ? "No events found" : "No upcoming events"}
            </p>
            <p className="mt-1 text-sm text-destiny-grey/40">
              {search ? "Try a different search term" : "Check back soon."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
