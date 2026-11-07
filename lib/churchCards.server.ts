// The church cards that need the database or a live lookup: giving (editable
// in admin), the live service, upcoming course dates, and open jobs. The pure
// ones (people, visit, summaries, absolute URLs) are in lib/churchCards.ts.

import "server-only";
import type { CardAction, InfoCardData } from "@destiny/shared";
import { MAX_CARDS } from "@destiny/shared";
import { SCHEDULE } from "@/lib/churchInfo";
import { courseSummary, courseTypesFor, COURSE_KEYWORDS, londonLong } from "@/lib/churchCards";
import { COURSE_EVENT_META, type CourseEventType } from "@/lib/courseEvents";
import { FREQUENCY_LABEL, getNextAlphaSession, type AlphaFrequency } from "@/lib/alphaSession";
import { EMPLOYMENT_LABELS, isClosed } from "@/lib/jobs";
import { getPublishedJobs } from "@/lib/jobs.server";
import { buildGivingCard, resolveGiveContent } from "@/lib/giving";
import { getLiveStatus } from "@/lib/liveStatus.server";
import { getPageContent } from "@/lib/pageContent";
import { createServiceClient } from "@/utils/supabase/service";

const YOUTUBE_CHANNEL = "https://www.youtube.com/destinychurchteesvalley";

// ── Giving ──────────────────────────────────────────────────────────────────

export async function givingCard(): Promise<InfoCardData> {
  return buildGivingCard(resolveGiveContent(await getPageContent("give")));
}

// ── Live ────────────────────────────────────────────────────────────────────

export async function liveCard(): Promise<InfoCardData> {
  const status = await getLiveStatus();
  if (status.live) {
    return {
      id: "live",
      variant: "live",
      title: status.title || "Sunday service",
      eyebrow: "Live now",
      summary: "We are live on YouTube right now.",
      facts: [],
      actions: [{ label: "Watch live", href: status.videoId ? `https://www.youtube.com/watch?v=${status.videoId}` : YOUTUBE_CHANNEL }],
      image: null,
    };
  }
  const scheduled = status.scheduledFor ? new Date(status.scheduledFor) : null;
  return {
    id: "live",
    variant: "live",
    title: "Sunday service",
    eyebrow: "Not live right now",
    summary: `We stream every Sunday at ${SCHEDULE.mainServiceStart} on YouTube.`,
    facts: scheduled
      ? [
          {
            label: "Next stream",
            value: scheduled.toLocaleString("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }),
          },
        ]
      : [],
    actions: [
      { label: "Watch on YouTube", href: YOUTUBE_CHANNEL },
      { label: "Past sermons", href: "/sermons" },
    ],
    image: null,
  };
}

// ── Courses (Alpha and the rest) ────────────────────────────────────────────

interface CourseRow {
  type: CourseEventType;
  start_date: string;
  signup_url: string;
  location: string | null;
  format: string | null;
  frequency: string | null;
  custom_interval_days: number | null;
}

export async function courseCards(query: string): Promise<InfoCardData[]> {
  const wanted = courseTypesFor(query);
  const types = (wanted.length ? wanted : (Object.keys(COURSE_KEYWORDS) as CourseEventType[])).slice(0, MAX_CARDS);

  let rows: CourseRow[] = [];
  try {
    const { data } = await createServiceClient()
      .from("alpha_events")
      .select("type, start_date, signup_url, location, format, frequency, custom_interval_days")
      .eq("active", true)
      .in("type", types)
      .order("start_date", { ascending: true });
    rows = (data ?? []) as CourseRow[];
  } catch {
    rows = [];
  }

  const cards: InfoCardData[] = [];
  for (const type of types) {
    const meta = COURSE_EVENT_META[type];
    const row = rows
      .map((r) => ({ r, next: getNextAlphaSession(r.start_date, r.frequency, r.custom_interval_days) }))
      .filter((x) => x.r.type === type && !x.next.isPast)
      .sort((a, b) => a.next.date.getTime() - b.next.date.getTime())[0];
    // With no date announced, only show the course when it was asked for by name.
    if (!row && !wanted.length) continue;

    const actions: CardAction[] = [];
    if (row?.r.signup_url) actions.push({ label: "Sign up", href: row.r.signup_url });
    actions.push({ label: "Find out more", href: meta.href });

    cards.push({
      id: `course-${type}`,
      variant: "course",
      title: meta.label,
      eyebrow: meta.hint,
      summary: courseSummary(type),
      facts: row
        ? [
            { label: row.next.isFirst ? "Starts" : "Next session", value: londonLong(row.next.date) },
            { label: "Where", value: row.r.format === "online" ? "Online" : row.r.location || "Destiny Centre" },
            { label: "How often", value: FREQUENCY_LABEL[(row.r.frequency as AlphaFrequency) || "weekly"] ?? "Weekly" },
          ]
        : [{ label: "Dates", value: "No dates announced yet. Contact the church to register interest." }],
      actions,
      image: null,
    });
  }
  return cards;
}

// ── Jobs ────────────────────────────────────────────────────────────────────

export async function jobCards(): Promise<InfoCardData[]> {
  const jobs = (await getPublishedJobs()).filter((j) => !isClosed(j)).slice(0, MAX_CARDS);
  return jobs.map((j) => ({
    id: `job-${j.id}`,
    variant: "job" as const,
    title: j.title,
    eyebrow: j.department || EMPLOYMENT_LABELS[j.employment_type],
    summary: j.summary,
    facts: [
      { label: "Type", value: EMPLOYMENT_LABELS[j.employment_type] },
      ...(j.location ? [{ label: "Location", value: j.location }] : []),
      ...(j.hours ? [{ label: "Hours", value: j.hours }] : []),
      ...(j.salary ? [{ label: "Salary", value: j.salary }] : []),
      ...(j.closing_date ? [{ label: "Closes", value: londonLong(new Date(j.closing_date)) }] : []),
    ],
    actions: [{ label: "View role", href: `/jobs/${j.slug}` }],
    image: null,
  }));
}
