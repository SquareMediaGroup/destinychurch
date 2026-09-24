"use client";

// Choosing a ChurchSuite event — shared by the /nfc tile editor and the links
// page editor. Lifted out of app/admin/nfc/page.tsx, where it was written.
//
// The caller decides which events are pickable (`disabledReason`): /nfc needs
// a signup form it can frame, a links page event card doesn't. Unpickable
// events are shown disabled with the reason rather than hidden — "why isn't my
// event here?" is a worse question than a visible answer.

import { useCallback, useEffect, useState } from "react";
import { inputClass, labelClass } from "@/components/admin/AdminUI";

/** One upcoming event as /api/admin/events projects it. */
export interface PickerEvent {
  slug: string;
  identifier: string | null;
  sequence: number | null;
  name: string;
  start: string;
  end: string;
  endsAt: string;
  image: string | null;
  category: string | null;
  location: string | null;
  sessionCount: number;
  signupUrl: string | null;
  signupEmbeddable: boolean;
}

/** Feed dates are space-separated ("2026-09-27 11:00:00"). */
export function formatPickerDate(value: string): string {
  return new Date(value.replace(" ", "T")).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The ChurchSuite feed, loaded once `enabled` turns true — most edits never
 * touch an event, so there's no point paying for the feed up front.
 */
export function useEventFeed(enabled: boolean) {
  const [events, setEvents] = useState<PickerEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents((data.events ?? []) as PickerEvent[]);
    } catch {
      setEvents([]);
      setError("Could not load the ChurchSuite calendar. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && events === null && !loading) load();
  }, [enabled, events, loading, load]);

  return { events, loading, error, reload: load };
}

export default function EventPicker({
  events,
  loading,
  selectedIdentifier,
  selectedName,
  selectedNote,
  disabledReason,
  onPick,
  help,
}: {
  events: PickerEvent[] | null;
  loading: boolean;
  selectedIdentifier: string;
  selectedName: string;
  /** A line under the selected event — "Runs until …", or a warning. */
  selectedNote?: string | null;
  disabledReason?: (event: PickerEvent) => string | null;
  onPick: (event: PickerEvent) => void;
  help?: React.ReactNode;
}) {
  const [filter, setFilter] = useState("");

  return (
    <div>
      <label className={labelClass}>Which event</label>

      {selectedIdentifier && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border-2 border-destiny-orange bg-destiny-orange/5 px-4 py-3">
          <span className="material-symbols-rounded text-xl text-destiny-orange" aria-hidden="true">
            event_available
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-destiny-grey dark:text-white">
              {selectedName || "Selected event"}
            </p>
            {selectedNote && (
              <p className="truncate text-xs text-destiny-grey/50 dark:text-white/50">{selectedNote}</p>
            )}
          </div>
        </div>
      )}

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search upcoming events"
        className={inputClass}
      />

      <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10">
        {loading || events === null ? (
          <p className="px-4 py-8 text-center text-sm text-destiny-grey/45 dark:text-white/45">
            Loading the ChurchSuite calendar…
          </p>
        ) : events.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-destiny-grey/45 dark:text-white/45">
            No upcoming events in ChurchSuite.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/8">
            {events
              .filter((ev) => ev.name.toLowerCase().includes(filter.toLowerCase()))
              .map((ev) => {
                const chosen = !!ev.identifier && ev.identifier === selectedIdentifier;
                const reason = disabledReason?.(ev) ?? null;
                return (
                  <li key={ev.slug}>
                    <button
                      type="button"
                      disabled={!!reason || !ev.identifier}
                      onClick={() => onPick(ev)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                        chosen
                          ? "bg-destiny-orange/5"
                          : "hover:bg-gray-50 dark:hover:bg-white/10 disabled:hover:bg-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-destiny-grey dark:text-white">{ev.name}</p>
                        <p className="truncate text-xs text-destiny-grey/50 dark:text-white/50">
                          {formatPickerDate(ev.start)}
                          {ev.sessionCount > 1 ? ` · ${ev.sessionCount} sessions` : ""}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </p>
                      </div>
                      {reason ? (
                        <span className="shrink-0 text-xs font-bold text-destiny-grey/40 dark:text-white/40">
                          {reason}
                        </span>
                      ) : chosen ? (
                        <span className="material-symbols-rounded shrink-0 text-lg text-destiny-orange" aria-hidden="true">
                          check_circle
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </div>

      {help && <p className="mt-1.5 text-xs text-destiny-grey/45 dark:text-white/45">{help}</p>}
    </div>
  );
}
