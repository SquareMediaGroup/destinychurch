"use client";

import { useEffect, useState, useCallback } from "react";
import { useDialog } from "@/components/DialogProvider";
import ChurchSuiteEventFill from "@/components/admin/ChurchSuiteEventFill";
import {
  type AlphaFrequency,
  FREQUENCY_LABEL,
  getNextAlphaSession,
} from "@/lib/alphaSession";

type EventFormat = "in_person" | "online";
type MeetingPlatform = "zoom" | "google_meet";

interface CapEvent {
  id: string;
  type: "cap";
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

const ACCENT = "#4e7d14";
const ACCENT_RGB = "78,125,20";

export default function CapMoneyAdminPage() {
  const { confirm } = useDialog();
  const [events, setEvents] = useState<CapEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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

  const [bannerActive, setBannerActive] = useState(false);
  const [bannerSaving, setBannerSaving] = useState(false);

  const fetchBanner = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/banner?type=cap").then((r) =>
        r.json()
      );
      setBannerActive(!!res?.active && res?.type === "cap");
    } catch {
      // ignore
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/alpha-events");
      const data = await res.json();
      const capEvents = Array.isArray(data)
        ? data.filter((e: CapEvent) => e.type === "cap")
        : [];
      setEvents(capEvents);
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

  async function toggleBanner(next: boolean) {
    setBannerSaving(true);
    try {
      const res = await fetch("/api/admin/banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: next,
          type: "cap",
          message: "CAP Money Course",
          link: "/cap-money",
          link_text: "Find out more",
        }),
      });
      if (res.ok) setBannerActive(next);
    } finally {
      setBannerSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    const parsedCustom = parseInt(customIntervalDays, 10);
    const payload = {
      type: "cap",
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

  async function handleToggle(event: CapEvent) {
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-destiny-grey">
            CAP Money Course
          </h1>
          <p className="mt-1 text-sm text-destiny-grey/50">
            Manage CAP Money Course dates, signup links, and the site banner.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.32em] text-destiny-grey/50">
              Site banner
            </p>
            <h2 className="text-lg font-black text-destiny-grey">
              Promote the CAP Money Course
            </h2>
          </div>
          <p className="mb-5 text-xs leading-relaxed text-destiny-grey/60">
            Toggle on to show the CAP Money Course banner at the top of the site.
          </p>
          <div
            className={`rounded-xl border px-4 py-3 transition ${
              bannerActive ? "" : "border-black/8 bg-black/[0.02]"
            }`}
            style={
              bannerActive
                ? {
                    borderColor: `rgba(${ACCENT_RGB},0.3)`,
                    backgroundColor: `rgba(${ACCENT_RGB},0.05)`,
                  }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-destiny-grey">
                  CAP Money Course
                </p>
                <p className="text-[10px] text-destiny-grey/50">
                  Free 3-session budgeting course
                </p>
              </div>
              <button
                type="button"
                disabled={bannerSaving}
                onClick={() => toggleBanner(!bannerActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  bannerActive ? "" : "bg-black/10"
                } ${bannerSaving ? "opacity-60" : ""}`}
                style={
                  bannerActive ? { backgroundColor: ACCENT } : undefined
                }
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    bannerActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
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
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:outline-none focus:ring-2"
                />
              </div>
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
                    className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey focus:outline-none focus:ring-2"
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
                        onChange={(e) => setCustomIntervalDays(e.target.value)}
                        className="w-14 bg-transparent text-center font-bold focus:outline-none"
                      />
                      <span className="text-xs text-destiny-grey/50">days</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-destiny-grey/60">
                Signup URL (ChurchSuite) <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={signupUrl}
                onChange={(e) => setSignupUrl(e.target.value)}
                required
                placeholder="https://destinytees.churchsuite.com/forms/..."
                className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:outline-none focus:ring-2"
              />
            </div>

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
                  className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 focus:outline-none focus:ring-2"
                />
              </div>
            ) : (
              <div
                className="rounded-xl border border-dashed p-5"
                style={{
                  borderColor: `rgba(${ACCENT_RGB},0.3)`,
                  backgroundColor: `rgba(${ACCENT_RGB},0.04)`,
                }}
              >
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
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey focus:outline-none"
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
                      className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey focus:outline-none"
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
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey focus:outline-none"
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
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-destiny-grey focus:outline-none"
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
                className="rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
                style={{ backgroundColor: ACCENT }}
              >
                {creating ? "Creating…" : "Create event"}
              </button>
            </div>
          </form>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="border-b border-black/5 px-6 py-4">
            <p className="text-sm font-bold text-destiny-grey">
              CAP Money Events ({events.length})
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
              <p className="text-sm font-bold text-destiny-grey/40">
                No events yet
              </p>
              <p className="text-xs text-destiny-grey/30">
                Create your first event above
              </p>
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
                    <div className="min-w-0 flex-1">
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
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor: `rgba(${ACCENT_RGB},0.1)`,
                                color: ACCENT,
                              }}
                            >
                              {event.location}
                            </span>
                          )
                        )}
                      </div>
                      <p className="truncate text-xs text-destiny-grey/40">
                        {isOnline
                          ? event.meeting_url ||
                            (event.meeting_id
                              ? `ID: ${event.meeting_id}`
                              : "No join details")
                          : event.signup_url}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleToggle(event)}
                        title={event.active ? "Deactivate" : "Activate"}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                          event.active ? "" : "bg-black/10"
                        }`}
                        style={
                          event.active
                            ? { backgroundColor: ACCENT }
                            : undefined
                        }
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                            event.active ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
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
      </div>
    </div>
  );
}

function FormatPill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
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
