"use client";

// Inline helper for the Alpha / Bible Course / Recovery "Add Event" forms:
// pick a live ChurchSuite event to fill in the start date, location and
// signup URL instead of typing them by hand. Format, frequency and meeting
// details stay manual — ChurchSuite has no equivalent for those, and the
// form already supports things ChurchSuite events don't (online sessions,
// recurring cadence, multiple concurrent cohorts).

import { useEffect, useMemo, useState } from "react";

type PickerEvent = {
  slug: string;
  identifier: string | null;
  name: string;
  start: string;
  location: string | null;
  sessionCount: number;
  signupUrl: string | null;
};

export type ChurchSuiteFillDetails = {
  startDate: string; // YYYY-MM-DD, for <input type="date">
  location: string | null;
  signupUrl: string | null;
  name: string;
};

/** ISO-ish feed date ("2026-07-30 00:00:00") → YYYY-MM-DD for a date input. */
function toDateInputValue(raw: string): string {
  const d = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(raw: string): string {
  const d = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ChurchSuiteEventFill({
  onFill,
}: {
  onFill: (details: ChurchSuiteFillDetails) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<PickerEvent[]>([]);
  const [filter, setFilter] = useState("");
  const [filledFrom, setFilledFrom] = useState<string | null>(null);

  const loading = open && !loaded;

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data.events) ? data.events : []))
      .catch(() => setEvents([]))
      .finally(() => {
        setLoaded(true);
      });
  }, [open, loaded]);

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query
      ? events.filter((e) => e.name.toLowerCase().includes(query))
      : events;
  }, [events, filter]);

  function handlePick(event: PickerEvent) {
    onFill({
      startDate: toDateInputValue(event.start),
      location: event.location,
      signupUrl: event.signupUrl,
      name: event.name,
    });
    setFilledFrom(event.name);
    setOpen(false);
    setFilter("");
  }

  return (
    <div className="rounded-xl border border-dashed border-destiny-orange/30 bg-destiny-orange/[0.03] p-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-destiny-orange"
        >
          <span className="material-symbols-rounded text-base leading-none">
            bolt
          </span>
          Fill from ChurchSuite event
        </button>
        {filledFrom && !open && (
          <span className="inline-flex items-center gap-1.5 truncate text-[11px] text-destiny-grey/50 dark:text-white/50">
            Filled from &quot;{filledFrom}&quot;
            <button
              type="button"
              onClick={() => setFilledFrom(null)}
              className="text-destiny-grey/30 dark:text-white/30 hover:text-destiny-grey/60 dark:hover:text-white/60"
              aria-label="Dismiss"
            >
              <span className="material-symbols-rounded text-sm leading-none">
                close
              </span>
            </button>
          </span>
        )}
      </div>

      {open && (
        <div className="mt-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter events…"
            aria-label="Filter ChurchSuite events"
            className="mb-2 w-full rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3 py-2 text-sm outline-none focus:border-destiny-orange"
          />

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <span className="material-symbols-rounded animate-spin text-xl text-destiny-grey/20 dark:text-white/20">
                progress_activity
              </span>
            </div>
          ) : visible.length === 0 ? (
            <p className="rounded-lg bg-white px-3 py-4 text-center text-xs text-destiny-grey/50 dark:text-white/50 dark:bg-destiny-grey-800">
              {events.length === 0
                ? "No upcoming events in the ChurchSuite feed."
                : "No events match that filter."}
            </p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {visible.map((event) => (
                <button
                  key={event.identifier ?? event.slug}
                  type="button"
                  onClick={() => handlePick(event)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 px-3 py-2 text-left transition hover:border-destiny-orange/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-destiny-grey dark:text-white">
                        {event.name}
                      </span>
                      {event.sessionCount > 1 && (
                        <span className="shrink-0 rounded-full bg-destiny-grey/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destiny-grey/60 dark:text-white/60">
                          {event.sessionCount} sessions
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-destiny-grey/50 dark:text-white/50">
                      {formatDate(event.start)}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                  </span>
                  <span className="material-symbols-rounded shrink-0 text-base text-destiny-grey/20 dark:text-white/20">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
