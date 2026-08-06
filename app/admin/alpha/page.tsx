"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useDialog } from "@/components/DialogProvider";
import ChurchSuiteEventFill from "@/components/admin/ChurchSuiteEventFill";
import {
  type AlphaFrequency,
  FREQUENCY_LABEL,
  getNextAlphaSession,
} from "@/lib/alphaSession";

type EventType = "alpha" | "youth_alpha";
type EventFormat = "in_person" | "online";
type MeetingPlatform = "zoom" | "google_meet";

interface AlphaEvent {
  id: string;
  type: EventType;
  start_date: string;
  signup_url: string;
  location: string | null;
  format: EventFormat;
  meeting_platform: MeetingPlatform | null;
  meeting_url: string | null;
  meeting_id: string | null;
  meeting_passcode: string | null;
  frequency: AlphaFrequency;
  custom_interval_days: number | null;
  active: boolean;
  created_at: string;
}

const PLATFORM_LABEL: Record<MeetingPlatform, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
};

const FREQUENCY_OPTIONS: AlphaFrequency[] = [
  "weekly",
  "fortnightly",
  "monthly",
  "custom",
  "one_off",
];

export default function AlphaPage() {
  const { confirm } = useDialog();
  const [events, setEvents] = useState<AlphaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [type, setType] = useState<EventType>("alpha");
  const [startDate, setStartDate] = useState("");
  const [signupUrl, setSignupUrl] = useState("");
  const [format, setFormat] = useState<EventFormat>("in_person");
  const [location, setLocation] = useState("");
  const [meetingPlatform, setMeetingPlatform] = useState<MeetingPlatform>("zoom");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [meetingPasscode, setMeetingPasscode] = useState("");
  const [frequency, setFrequency] = useState<AlphaFrequency>("weekly");
  const [customIntervalDays, setCustomIntervalDays] = useState<string>("21");

  // Alpha + Youth Alpha banners — independent rows in site_banner, can run together
  const [alphaBannerActive, setAlphaBannerActive] = useState(false);
  const [youthBannerActive, setYouthBannerActive] = useState(false);
  const [alphaBannerSaving, setAlphaBannerSaving] = useState(false);
  const [youthBannerSaving, setYouthBannerSaving] = useState(false);

  const fetchBanner = useCallback(async () => {
    try {
      const [alphaRes, youthRes] = await Promise.all([
        fetch("/api/admin/banner?type=alpha").then((r) => r.json()),
        fetch("/api/admin/banner?type=youth_alpha").then((r) => r.json()),
      ]);
      setAlphaBannerActive(!!alphaRes?.active && alphaRes?.type === "alpha");
      setYouthBannerActive(
        !!youthRes?.active && youthRes?.type === "youth_alpha"
      );
    } catch {
      // ignore
    }
  }, []);

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
    fetchBanner();
  }, [fetchEvents, fetchBanner]);

  function resetForm() {
    setType("alpha");
    setStartDate("");
    setSignupUrl("");
    setFormat("in_person");
    setLocation("");
    setMeetingPlatform("zoom");
    setMeetingUrl("");
    setMeetingId("");
    setMeetingPasscode("");
    setFrequency("weekly");
    setCustomIntervalDays("21");
  }

  async function toggleAlphaBanner(next: boolean) {
    setAlphaBannerSaving(true);
    try {
      const res = await fetch("/api/admin/banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: next,
          type: "alpha",
          message: "",
          link: "/alpha",
          link_text: "Sign up",
        }),
      });
      if (res.ok) setAlphaBannerActive(next);
    } finally {
      setAlphaBannerSaving(false);
    }
  }

  async function toggleYouthBanner(next: boolean) {
    setYouthBannerSaving(true);
    try {
      const res = await fetch("/api/admin/banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: next,
          type: "youth_alpha",
          message: "Youth Alpha",
          link: "/youth-alpha",
          link_text: "Sign up",
        }),
      });
      if (res.ok) setYouthBannerActive(next);
    } finally {
      setYouthBannerSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const parsedCustom = parseInt(customIntervalDays, 10);
    const payload = {
      type,
      start_date: startDate,
      signup_url: signupUrl,
      format,
      location: format === "in_person" ? location || null : null,
      meeting_platform: format === "online" ? meetingPlatform : null,
      meeting_url: format === "online" ? meetingUrl || null : null,
      meeting_id: format === "online" ? meetingId || null : null,
      meeting_passcode: format === "online" ? meetingPasscode || null : null,
      frequency,
      custom_interval_days:
        frequency === "custom" && Number.isFinite(parsedCustom) && parsedCustom > 0
          ? parsedCustom
          : null,
      active: true,
    };

    const res = await fetch("/api/admin/alpha-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      resetForm();
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
    if (
      !(await confirm({
        title: "Delete event",
        message: "Delete this event?",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
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

        {/* Alpha + Youth Alpha banner toggles — promote both courses */}
        <div className="mb-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.32em] text-destiny-grey/50">
              Site banner
            </p>
            <h2 className="text-lg font-black text-destiny-grey">
              Promote courses
            </h2>
          </div>

          <p className="mb-5 text-xs leading-relaxed text-destiny-grey/60">
            Toggle on to show each course&apos;s banner at the top of the site.
            Both can run at once — they stack when both are enabled.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <BannerCard
              label="Alpha"
              hint="18+ course"
              active={alphaBannerActive}
              saving={alphaBannerSaving}
              onToggle={() => toggleAlphaBanner(!alphaBannerActive)}
              swatch="#e51b1b"
            />
            <BannerCard
              label="Youth Alpha"
              hint="11–18 course"
              active={youthBannerActive}
              saving={youthBannerSaving}
              onToggle={() => toggleYouthBanner(!youthBannerActive)}
              swatch="#b81313"
            />
          </div>
        </div>

        {/* Create form */}
        <div className="mb-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            Add Event
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <ChurchSuiteEventFill
              onFill={(d) => {
                setStartDate(d.startDate);
                if (d.location) setLocation(d.location);
                if (d.signupUrl) setSignupUrl(d.signupUrl);
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EventType)}
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

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Format toggle */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Format <span className="text-red-400">*</span>
                </label>
                <div className="inline-flex rounded-xl border border-black/10 bg-black/[0.02] p-1">
                  <FormatPill
                    active={format === "in_person"}
                    onClick={() => setFormat("in_person")}
                    icon="storefront"
                    label="In-person"
                  />
                  <FormatPill
                    active={format === "online"}
                    onClick={() => setFormat("online")}
                    icon="videocam"
                    label="Online"
                  />
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                  Frequency <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as AlphaFrequency)
                    }
                    className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABEL[f]}
                      </option>
                    ))}
                  </select>
                  {frequency === "custom" && (
                    <div className="flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm text-destiny-grey">
                      <span className="text-xs text-destiny-grey/50">every</span>
                      <input
                        type="number"
                        min={1}
                        value={customIntervalDays}
                        onChange={(e) =>
                          setCustomIntervalDays(e.target.value)
                        }
                        className="w-14 bg-transparent text-center font-bold focus:outline-none"
                      />
                      <span className="text-xs text-destiny-grey/50">days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {format === "in_person" ? (
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
            ) : (
              <div className="rounded-xl border border-dashed border-destiny-orange/30 bg-destiny-orange/[0.04] p-5">
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                      Platform <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={meetingPlatform}
                      onChange={(e) =>
                        setMeetingPlatform(e.target.value as MeetingPlatform)
                      }
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                    >
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                      Meeting ID
                    </label>
                    <input
                      type="text"
                      value={meetingId}
                      onChange={(e) => setMeetingId(e.target.value)}
                      placeholder={
                        meetingPlatform === "zoom"
                          ? "e.g. 123 4567 8901"
                          : "e.g. abc-defg-hij"
                      }
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                    Direct join link
                  </label>
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder={
                      meetingPlatform === "zoom"
                        ? "https://us02web.zoom.us/j/..."
                        : "https://meet.google.com/abc-defg-hij"
                    }
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                    Passcode <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={meetingPasscode}
                    onChange={(e) => setMeetingPasscode(e.target.value)}
                    placeholder={
                      meetingPlatform === "zoom"
                        ? "Zoom meeting passcode"
                        : "Not usually needed for Meet"
                    }
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>
              </div>
            )}

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

interface FormatPillProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

interface BannerCardProps {
  label: string;
  hint: string;
  active: boolean;
  saving: boolean;
  onToggle: () => void;
  swatch: string;
}

function BannerCard({
  label,
  hint,
  active,
  saving,
  onToggle,
  swatch,
}: BannerCardProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        active
          ? "border-destiny-orange/30 bg-destiny-orange/5"
          : "border-black/8 bg-black/[0.02]"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-destiny-grey">{label}</p>
          <p className="text-[10px] text-destiny-grey/50">{hint}</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            active ? "bg-destiny-orange" : "bg-black/10"
          } ${saving ? "opacity-60" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function FormatPill({ active, onClick, icon, label }: FormatPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-white text-destiny-grey shadow-sm"
          : "text-destiny-grey/50 hover:text-destiny-grey"
      }`}
    >
      <span className="material-symbols-rounded text-base">{icon}</span>
      {label}
    </button>
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
            const isOnline = event.format === "online";
            const platformLabel = event.meeting_platform
              ? PLATFORM_LABEL[event.meeting_platform]
              : "Online";
            const freq = (event.frequency || "weekly") as AlphaFrequency;
            const next = getNextAlphaSession(
              event.start_date,
              freq,
              event.custom_interval_days
            );
            const showsNext = !next.isFirst && !next.isPast;
            const nextLabel = next.date.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            const freqLabel =
              freq === "custom" && event.custom_interval_days
                ? `Every ${event.custom_interval_days}d`
                : FREQUENCY_LABEL[freq];

            return (
              <div
                key={event.id}
                className={`flex items-center gap-4 px-6 py-4 transition ${
                  !event.active ? "opacity-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-destiny-grey">
                      {formatted}
                    </span>
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/60">
                      {freqLabel}
                    </span>
                    {showsNext && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <span className="material-symbols-rounded text-[12px] leading-none">
                          schedule
                        </span>
                        Next {nextLabel}
                      </span>
                    )}
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                        <span className="material-symbols-rounded text-[12px] leading-none">
                          videocam
                        </span>
                        {platformLabel}
                      </span>
                    ) : (
                      event.location && (
                        <span className="rounded-full bg-destiny-orange/10 px-2 py-0.5 text-[10px] font-bold text-destiny-orange">
                          {event.location}
                        </span>
                      )
                    )}
                  </div>
                  {isOnline ? (
                    <p className="truncate text-xs text-destiny-grey/40">
                      {event.meeting_url ||
                        (event.meeting_id
                          ? `ID: ${event.meeting_id}`
                          : "No join details")}
                    </p>
                  ) : (
                    <p className="truncate text-xs text-destiny-grey/40">
                      {event.signup_url}
                    </p>
                  )}
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
