"use client";

// Pick the ChurchSuite event to promote, and override its copy.
//
// Events live in ChurchSuite, not this database, so the picker lists the live
// feed and we store a pointer plus overrides. Every override field placeholders
// with the value it would fall back to, so "leave blank to use ChurchSuite's
// wording" is visible rather than documented.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PickerEvent = {
  slug: string;
  identifier: string | null;
  sequence: number | null;
  id: number;
  name: string;
  start: string;
  end: string;
  endsAt: string;
  image: string | null;
  category: string | null;
  location: string | null;
  sessionCount: number;
};

/** ISO → the value a <input type="datetime-local"> expects (local time). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatStart(value: string): string {
  return new Date(value.replace(" ", "T")).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FeaturedEventPage() {
  const [events, setEvents] = useState<PickerEvent[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const [active, setActive] = useState(false);
  const [promoteFrom, setPromoteFrom] = useState("");
  const [promoteUntil, setPromoteUntil] = useState("");
  const [headline, setHeadline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [eventsRes, rowRes] = await Promise.all([
          fetch("/api/admin/events"),
          fetch("/api/admin/featured-event"),
        ]);
        const eventsData = await eventsRes.json();
        const row = await rowRes.json();

        setEvents(eventsData.events ?? []);
        setSelected(row.event_identifier ?? null);
        setActive(Boolean(row.active));
        setPromoteFrom(toLocalInput(row.promote_from));
        setPromoteUntil(toLocalInput(row.promote_until));
        setHeadline(row.headline ?? "");
        setBlurb(row.blurb ?? "");
        setImageUrl(row.image_url ?? null);
        setImagePath(row.image_path ?? null);
        setCtaText(row.cta_text ?? "");
        setCtaLink(row.cta_link ?? "");
      } catch {
        setError("Couldn't load the featured event.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chosen = useMemo(
    () => events.find((e) => e.identifier === selected) ?? null,
    [events, selected],
  );

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return query
      ? events.filter((e) => e.name.toLowerCase().includes(query))
      : events;
  }, [events, filter]);

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("prefix", "featured-event");
      const res = await fetch("/api/admin/popup/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
      setImagePath(data.path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/featured-event", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_identifier: chosen?.identifier ?? null,
          event_sequence: chosen?.sequence ?? null,
          event_id: chosen?.id ?? null,
          event_name: chosen?.name ?? null,
          event_slug: chosen?.slug ?? null,
          event_ends_at: chosen?.endsAt ?? null,
          active,
          promote_from: promoteFrom || null,
          promote_until: promoteUntil || null,
          headline,
          blurb,
          image_url: imageUrl,
          image_path: imagePath,
          cta_text: ctaText,
          cta_link: ctaLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20 dark:text-white/20">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-destiny-grey dark:text-white">Featured event</h1>
        <p className="mt-1 max-w-2xl text-sm text-destiny-grey/50 dark:text-white/50">
          Promote one event across the site: a wide banner above the What&apos;s
          On grid and the first card on the homepage. Events come from
          ChurchSuite, so add or edit the event there first. Leave any field
          below blank to use ChurchSuite&apos;s own wording.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Picker */}
        <div>
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 px-4 py-2.5">
            <span className="material-symbols-rounded text-lg text-destiny-grey/30 dark:text-white/30">
              search
            </span>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter events…"
              aria-label="Filter events"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl bg-[#f5f7fa] px-4 py-6 text-center text-sm text-destiny-grey/50 dark:text-white/50">
              {events.length === 0
                ? "No upcoming events in the ChurchSuite feed."
                : "No events match that filter."}
            </p>
          ) : (
            <div className="space-y-2">
              {visible.map((event) => {
                const isSelected = event.identifier === selected;
                return (
                  <button
                    key={event.identifier ?? event.id}
                    type="button"
                    onClick={() => setSelected(event.identifier)}
                    className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left transition dark:bg-destiny-grey-800 ${
                      isSelected
                        ? "border-destiny-orange ring-2 ring-destiny-orange/30"
                        : "border-black/8 hover:border-black/20 dark:border-white/8 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f5f7fa]">
                      {event.image && (
                        // Admin preview only — unoptimized keeps the ChurchSuite
                        // CDN out of the image pipeline, as elsewhere in admin.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={event.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-destiny-grey dark:text-white">
                          {event.name}
                        </p>
                        {event.sessionCount > 1 && (
                          <span className="shrink-0 rounded-full bg-destiny-grey/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/60 dark:text-white/60">
                            {event.sessionCount} sessions
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-destiny-grey/50 dark:text-white/50">
                        {formatStart(event.start)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                      {/* Surfaced because the slug is derived from the name:
                          renaming in ChurchSuite changes the event's URL. */}
                      <p className="mt-0.5 truncate font-mono text-[10px] text-destiny-grey/30 dark:text-white/30">
                        /whats-on/{event.slug}
                      </p>
                    </div>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        isSelected
                          ? "border-destiny-orange bg-destiny-orange text-white"
                          : "border-black/15 text-transparent"
                      }`}
                    >
                      <span className="material-symbols-rounded text-base leading-none">
                        check
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-5 rounded-2xl border border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#f58021]"
            />
            <span>
              <span className="block text-sm font-bold text-destiny-grey dark:text-white">
                Promote this event
              </span>
              <span className="block text-xs text-destiny-grey/50 dark:text-white/50">
                Stops automatically once the event has finished.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="promote-from"
                className="block text-xs font-bold text-destiny-grey/60 dark:text-white/60"
              >
                Promote from
              </label>
              <input
                id="promote-from"
                type="datetime-local"
                value={promoteFrom}
                onChange={(e) => setPromoteFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-2.5 py-2 text-sm text-destiny-grey outline-none focus:border-destiny-orange dark:border-white/10 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label
                htmlFor="promote-until"
                className="block text-xs font-bold text-destiny-grey/60 dark:text-white/60"
              >
                Promote until
              </label>
              <input
                id="promote-until"
                type="datetime-local"
                value={promoteUntil}
                onChange={(e) => setPromoteUntil(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-2.5 py-2 text-sm text-destiny-grey outline-none focus:border-destiny-orange dark:border-white/10 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-destiny-grey/40 dark:text-white/40">
            Both optional. Leave blank to promote as soon as it&apos;s switched
            on, until the event ends.
          </p>

          <div>
            <label
              htmlFor="headline"
              className="block text-xs font-bold text-destiny-grey/60 dark:text-white/60"
            >
              Headline
            </label>
            <input
              id="headline"
              value={headline}
              maxLength={120}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={chosen?.name ?? "Event name from ChurchSuite"}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-destiny-grey outline-none focus:border-destiny-orange dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="blurb"
              className="block text-xs font-bold text-destiny-grey/60 dark:text-white/60"
            >
              Blurb
            </label>
            <textarea
              id="blurb"
              value={blurb}
              maxLength={600}
              rows={4}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="Event description from ChurchSuite"
              className="mt-1 w-full resize-y rounded-lg border border-black/10 px-3 py-2 text-sm text-destiny-grey outline-none focus:border-destiny-orange dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <span className="block text-xs font-bold text-destiny-grey/60 dark:text-white/60">
              Banner image
            </span>
            {imageUrl ? (
              <div className="mt-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  className="aspect-[16/9] w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl(null);
                    setImagePath(null);
                  }}
                  className="mt-2 text-xs font-bold text-red-600 dark:text-red-400"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-destiny-grey/40 dark:text-white/40">
                Using the ChurchSuite artwork.
              </p>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
              className="mt-2 block w-full text-xs text-destiny-grey/60 dark:text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5f7fa] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-destiny-grey dark:file:bg-white/10 dark:file:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="cta-text"
              className="block text-xs font-bold text-destiny-grey/60 dark:text-white/60"
            >
              Button text
            </label>
            <input
              id="cta-text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Sign up"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-destiny-grey outline-none focus:border-destiny-orange dark:border-white/10 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="cta-link"
              className="block text-xs font-bold text-destiny-grey/60 dark:text-white/60"
            >
              Button link
            </label>
            <input
              id="cta-link"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              placeholder={chosen ? `/whats-on/${chosen.slug}` : "/whats-on"}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-destiny-grey outline-none focus:border-destiny-orange dark:border-white/10 dark:text-white"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (active && !chosen)}
            className="w-full rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
          {active && !chosen && (
            <p className="text-xs text-destiny-grey/50 dark:text-white/50">
              Choose an event on the left before promoting.
            </p>
          )}

          <p className="border-t border-black/8 pt-4 text-xs text-destiny-grey/50 dark:text-white/50">
            Want a popup as well?{" "}
            <Link
              href="/admin/event-popup"
              className="font-bold text-destiny-orange"
            >
              Set up the event popup
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
