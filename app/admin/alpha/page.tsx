"use client";

import { useEffect, useState, useCallback } from "react";

interface AlphaEvent {
  id: string;
  type: "alpha" | "youth_alpha";
  start_date: string;
  signup_url: string;
  location: string | null;
  active: boolean;
  created_at: string;
}

export default function AlphaPage() {
  const [events, setEvents] = useState<AlphaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [type, setType] = useState<"alpha" | "youth_alpha">("alpha");
  const [startDate, setStartDate] = useState("");
  const [signupUrl, setSignupUrl] = useState("");
  const [location, setLocation] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/alpha-events");
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) && data?.error) {
        setError(`Database error: ${data.error}`);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const res = await fetch("/api/admin/alpha-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        start_date: startDate,
        signup_url: signupUrl,
        location: location || null,
        active: true,
      }),
    });

    if (res.ok) {
      setType("alpha");
      setStartDate("");
      setSignupUrl("");
      setLocation("");
      await fetchEvents();
    } else {
      const d = await res.json();
      setError(d.error ?? "Something went wrong");
    }
    setCreating(false);
  }

  async function handleToggle(event: AlphaEvent) {
    await fetch(`/api/admin/alpha-events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !event.active }),
    });
    setEvents((prev) =>
      prev.map((x) => (x.id === event.id ? { ...x, active: !x.active } : x))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/admin/alpha-events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((x) => x.id !== id));
  }

  const alphaEvents = events.filter((e) => e.type === "alpha");
  const youthAlphaEvents = events.filter((e) => e.type === "youth_alpha");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">Alpha Events</h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Manage Alpha and Youth Alpha event dates, signup links, and availability.
          </p>
        </div>

        {/* Create form */}
        <div className="mb-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            Add Event
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "alpha" | "youth_alpha")
                  }
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                >
                  <option value="alpha">Alpha</option>
                  <option value="youth_alpha">Youth Alpha</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                Signup URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={signupUrl}
                onChange={(e) => setSignupUrl(e.target.value)}
                required
                placeholder="https://destinytees.churchsuite.com/forms/..."
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                Location <span className="font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Campus"
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create event"}
              </button>
            </div>
          </form>
        </div>

        {/* Alpha Events */}
        <EventSection
          title="Alpha Events"
          events={alphaEvents}
          loading={loading}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />

        {/* Youth Alpha Events */}
        <EventSection
          title="Youth Alpha Events"
          events={youthAlphaEvents}
          loading={loading}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}

interface EventSectionProps {
  title: string;
  events: AlphaEvent[];
  loading: boolean;
  onToggle: (event: AlphaEvent) => void;
  onDelete: (id: string) => void;
}

function EventSection({
  title,
  events,
  loading,
  onToggle,
  onDelete,
}: EventSectionProps) {
  return (
    <div className="mb-8 rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-black/5 px-6 py-4">
        <p className="text-sm font-bold text-destiny-grey">
          {title} ({events.length})
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
            progress_activity
          </span>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-rounded mb-3 text-4xl text-destiny-grey/20">
            event
          </span>
          <p className="text-sm font-bold text-destiny-grey/40">No events yet</p>
          <p className="text-xs text-destiny-grey/30">Create your first event above</p>
        </div>
      ) : (
        <div className="divide-y divide-black/5">
          {events.map((event) => {
            const date = new Date(event.start_date);
            const formatted = date.toLocaleDateString("en-GB", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={event.id}
                className={`flex items-center gap-4 px-6 py-4 transition ${
                  !event.active ? "opacity-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-destiny-grey">
                      {formatted}
                    </span>
                    {event.location && (
                      <span className="rounded-full bg-destiny-orange/10 px-2 py-0.5 text-[10px] font-bold text-destiny-orange">
                        {event.location}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-destiny-grey/40">
                    {event.signup_url}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle active */}
                  <button
                    onClick={() => onToggle(event)}
                    title={event.active ? "Deactivate" : "Activate"}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                      event.active ? "bg-destiny-orange" : "bg-black/10"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        event.active ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(event.id)}
                    title="Delete"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/30 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <span className="material-symbols-rounded text-base">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
