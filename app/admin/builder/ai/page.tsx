"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MediaUploader from "@/components/builder/MediaUploader";
import WorkflowProgress, { useCycledLiveLabel } from "@/components/builder/WorkflowProgress";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { MediaItem } from "@/lib/ai/media-types";
import {
  type BlockKind,
  type Skeleton,
  type SkeletonBlock,
  parseLayoutParam,
  BLOCK_AI_GUIDE,
  SKELETON_SESSION_KEY,
  blockHasContent,
} from "@/lib/ai/skeleton-types";

// Top-level routes that already exist — used to warn when entering a slug that would overwrite them.
const EXISTING_ROUTES = [
  "about", "alpha", "baptism", "beliefs", "child-dedication", "connect",
  "connect-card", "contact", "data-gdpr", "destiny-recovery", "give", "help",
  "hire", "kids", "missions", "new-here", "privacy", "safeguarding", "search",
  "sermons", "serve", "terms", "visit", "volunteer", "whats-on", "young-adults",
  "youth",
];

// System routes the user must NEVER overwrite — submission is blocked if matched.
const RESERVED_SLUGS = [
  "admin", "api", "auth", "_next", "favicon.ico", "robots", "sitemap",
  "layout", "page", "globals", "not-found",
];

const AUDIENCES = [
  { id: "general", label: "Everyone", icon: "groups" },
  { id: "students", label: "Students", icon: "school" },
  { id: "young-adults", label: "Young Adults", icon: "diversity_3" },
  { id: "families", label: "Families", icon: "family_restroom" },
  { id: "kids", label: "Kids", icon: "child_care" },
  { id: "seniors", label: "Seniors", icon: "elderly" },
];

const EXAMPLES = [
  {
    label: "Alpha course launch",
    text: "Landing page for our Alpha course starting September 12. Aimed at students and young adults exploring faith. Include intro video slot, a sign-up CTA, what-to-expect section, and FAQ.",
    pageType: "Alpha launch",
    audience: "students",
  },
  {
    label: "Sunday service info",
    text: "Page for Sunday service times, location, what to expect for first-time visitors, parking info, and kids ministry overview. Welcoming tone.",
    pageType: "Sunday service",
    audience: "general",
  },
  {
    label: "Volunteer team page",
    text: "Page introducing our serve teams (worship, kids, hospitality, tech). Each team gets a short blurb and a clear way to apply or get more info.",
    pageType: "Get involved",
    audience: "general",
  },
  {
    label: "Christmas services",
    text: "Christmas services page covering Christmas Eve carols, Christmas Day family service, and a New Year's gathering. Include times, what to bring, kids info, and a 'invite a friend' CTA. Warm and inviting tone.",
    pageType: "Seasonal event",
    audience: "families",
  },
  {
    label: "Easter weekend",
    text: "Easter weekend page covering Good Friday reflection, Saturday prayer night, and Sunday celebration services. Mention egg hunts for kids after Sunday morning. Hopeful, joyful tone.",
    pageType: "Seasonal event",
    audience: "families",
  },
  {
    label: "Marriage course",
    text: "Page for our 7-week Marriage Course. Aimed at couples at any stage. Include what each session covers, dates, cost, childcare available, and a sign-up CTA. Sincere, no-pressure tone.",
    pageType: "Course",
    audience: "young-adults",
  },
  {
    label: "Parenting course",
    text: "Page for the Parenting Children Course (5-11 year olds). Cover what's included, dates, childcare, and a sign-up form. Reassuring tone — no perfect parents needed.",
    pageType: "Course",
    audience: "families",
  },
  {
    label: "Baptism Sunday",
    text: "Page explaining baptism — what it means, what to expect on the day, who can be baptised, FAQ, and a form to sign up for the next baptism Sunday. Include a few short testimonies if possible.",
    pageType: "Sacrament",
    audience: "general",
  },
  {
    label: "Membership pathway",
    text: "Page describing our 4-week membership journey. Cover what membership means, the steps involved, when classes meet, and a CTA to register. Clear and motivating.",
    pageType: "Membership",
    audience: "general",
  },
  {
    label: "Prayer ministry",
    text: "Page for our prayer ministry. Cover the weekly prayer night, the prayer wall, how to submit a prayer request, and how to join the prayer team. Calm, trustworthy tone.",
    pageType: "Ministry",
    audience: "general",
  },
  {
    label: "Youth weekend away",
    text: "Page for the youth weekend away (ages 11-18) at a retreat centre. Include dates, cost, what to pack, transport details, leader contacts, and a sign-up form with parental consent.",
    pageType: "Event",
    audience: "students",
  },
  {
    label: "Kids summer holiday club",
    text: "Page for our 5-day kids summer holiday club for ages 5-11. Include theme, daily timings, cost, what to bring, lunch info, and a sign-up CTA. Playful, fun tone.",
    pageType: "Event",
    audience: "kids",
  },
  {
    label: "Small groups directory",
    text: "Page listing our small groups by location, day of the week, and life stage (students, young adults, families, seniors). Include a CTA to find a group near me. Welcoming tone.",
    pageType: "Connect",
    audience: "general",
  },
  {
    label: "Senior's tea & community",
    text: "Page for our weekly senior's tea & community gathering. Cover what happens, who's welcome, transport help available, and a contact for questions. Warm, friendly tone.",
    pageType: "Community",
    audience: "seniors",
  },
  {
    label: "Mission trip — Uganda",
    text: "Page for the upcoming Uganda mission trip. Cover the partner ministry, what the team will do, the dates, the fundraising target, and how to apply or support a team member. Hopeful, mission-focused tone.",
    pageType: "Missions",
    audience: "young-adults",
  },
  {
    label: "Foodbank partnership",
    text: "Page for our local foodbank partnership. Cover what we collect, drop-off times, how to volunteer, and how to refer someone in need. Compassionate, practical tone.",
    pageType: "Outreach",
    audience: "general",
  },
  {
    label: "Annual report",
    text: "Page summarising last year at Destiny Church — key milestones, baptisms, new members, ministries launched, and finances overview. Include a thank-you note from the lead pastor.",
    pageType: "Report",
    audience: "general",
  },
  {
    label: "Pastoral care",
    text: "Page explaining how to access pastoral support — listening prayer, life crisis help, hospital visits, bereavement support. Include a confidential contact form. Gentle, trustworthy tone.",
    pageType: "Care",
    audience: "general",
  },
];

export default function AIPageCreatorPage() {
  const searchParams = useSearchParams();
  const [layout, setLayout] = useState<BlockKind[]>([]);
  const [skeleton, setSkeleton] = useState<Skeleton | null>(null);
  const [pageType, setPageType] = useState("");
  const [context, setContext] = useState("");
  const [slug, setSlug] = useState("");
  const [audience, setAudience] = useState("general");
  const [urgency, setUrgency] = useState<"standard" | "immediate">("standard");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authToken, setAuthToken] = useState<string>("");
  const [queued, setQueued] = useState<{
    runId?: number;
    runUrl?: string;
    message: string;
    slug?: string;
  } | null>(null);
  const [completed, setCompleted] = useState<{
    success: boolean;
    runUrl?: string;
    slug?: string;
  } | null>(null);
  const [showAllExamples, setShowAllExamples] = useState(false);

  // Pick up the skeleton from sessionStorage (full block-config payload from
  // the Skeleton sketcher) and the simpler ?layout= URL param fallback.
  useEffect(() => {
    const raw = searchParams.get("layout");
    const urlLayout = parseLayoutParam(raw);
    setLayout(urlLayout);

    // sessionStorage may contain a richer Skeleton object that matches the URL layout
    try {
      const json = sessionStorage.getItem(SKELETON_SESSION_KEY);
      if (!json) {
        setSkeleton(null);
        return;
      }
      const parsed = JSON.parse(json) as Skeleton;
      const kinds = parsed?.blocks?.map((b) => b.kind).join(",");
      // Only honor if it matches the URL layout (prevents stale data from a previous session)
      if (kinds === urlLayout.join(",") && urlLayout.length > 0) {
        setSkeleton(parsed);
      } else {
        setSkeleton(null);
      }
    } catch {
      setSkeleton(null);
    }
  }, [searchParams]);

  const charCount = context.length;
  const charLimit = 2000;
  const undescribedMedia = media.filter((m) => !m.description?.trim());
  const slugIsReserved = RESERVED_SLUGS.includes(slug.trim().toLowerCase());
  const canSubmit =
    context.trim().length >= 20 &&
    !loading &&
    undescribedMedia.length === 0 &&
    !slugIsReserved;

  function applyExample(ex: (typeof EXAMPLES)[number]) {
    setContext(ex.text);
    setPageType(ex.pageType);
    setAudience(ex.audience);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setQueued(null);
    setCompleted(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated. Please log in and try again.");
      }

      setAuthToken(token);

      const response = await fetch("/api/admin/builder/ai/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageType: pageType.trim() || undefined,
          context: context.trim(),
          slug: slug.trim() || undefined,
          audience: audience !== "general" ? audience : undefined,
          urgency,
          media,
          layout: layout.length > 0 ? layout : undefined,
          skeleton: skeleton ?? undefined,
        }),
      });

      const payload = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          (payload.error as string) ||
            `Failed to queue page generation (HTTP ${response.status})`
        );
      }

      setQueued({
        runId: payload.runId as number | undefined,
        runUrl: payload.runUrl as string | undefined,
        message: (payload.message as string) ?? "Page generation queued",
        slug: slug.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-black/5 bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(245,128,33,0.08), transparent 50%), radial-gradient(circle at 100% 100%, rgba(245,128,33,0.06), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 py-10 md:py-14">
          <Link
            href="/admin/builder"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-destiny-grey/50 hover:text-destiny-orange transition"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            Back to pages
          </Link>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-destiny-orange">
            <span className="h-1.5 w-1.5 rounded-full bg-destiny-orange" />
            New page
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-destiny-grey md:text-4xl">
            Describe what you want.{" "}
            <span className="bg-gradient-to-r from-destiny-orange to-amber-500 bg-clip-text text-transparent">
              AI builds it.
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-destiny-grey/60">
            Be specific about goals, audience, and key sections. AI generates a real Next.js
            page, type-checks it, commits to <code className="rounded bg-destiny-grey/5 px-1.5 py-0.5 font-mono text-xs">main</code>, and emails an audit.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Locked layout from the skeleton sketcher */}
        {layout.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white shadow-sm">
            <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
                    <span className="material-symbols-rounded text-base">widgets</span>
                    Layout from skeleton sketcher
                  </div>
                  <p className="mt-1 text-sm text-destiny-grey/70">
                    AI will follow this section order exactly when it generates the page.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/builder/skeleton?layout=${encodeURIComponent(layout.join(","))}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    <span className="material-symbols-rounded text-sm">edit</span>
                    Edit layout
                  </Link>
                  <button
                    type="button"
                    onClick={() => setLayout([])}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
                  >
                    <span className="material-symbols-rounded text-sm">close</span>
                    Clear layout
                  </button>
                </div>
              </div>
              <ol className="mt-4 space-y-2">
                {layout.map((kind, i) => {
                  const block = skeleton?.blocks[i];
                  const configured = block ? blockHasContent(block.data) : false;
                  const summary = block ? summarizeBlock(block) : null;
                  return (
                    <li
                      key={`${kind}-${i}`}
                      className="flex items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-xs"
                    >
                      <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-indigo-200 font-mono text-[10px] font-bold text-indigo-900">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-900">
                            {BLOCK_AI_GUIDE[kind].label}
                          </span>
                          {configured ? (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                              <span className="material-symbols-rounded text-[10px]">
                                check
                              </span>
                              Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">
                              AI writes
                            </span>
                          )}
                        </div>
                        {summary && (
                          <p className="mt-0.5 truncate text-[11px] text-indigo-900/70">
                            {summary}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}

        {/* Error alert */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <span className="material-symbols-rounded mt-0.5 text-red-600">error</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700">Something went wrong</p>
              <p className="mt-0.5 text-sm text-red-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700"
            >
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        )}

        {/* Completed state — persists until user starts another generation or dismisses */}
        {completed && (
          <div
            className={`mb-6 overflow-hidden rounded-2xl border shadow-sm ${
              completed.success
                ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50"
                : "border-red-200 bg-gradient-to-br from-red-50 to-rose-50"
            }`}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <span
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${
                    completed.success
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  <span className="material-symbols-rounded text-2xl">
                    {completed.success ? "check_circle" : "error"}
                  </span>
                </span>
                <div className="flex-1">
                  <h3
                    className={`text-lg font-bold ${
                      completed.success ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {completed.success
                      ? "Page generated and committed to main"
                      : "Page generation failed"}
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      completed.success ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {completed.success
                      ? "Your audit email is on its way. Refresh the pages list to see it."
                      : "Check the workflow logs for the failure reason."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {completed.success && completed.slug && (
                      <a
                        href={`/${completed.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-green-700"
                      >
                        <span className="material-symbols-rounded text-base">
                          open_in_new
                        </span>
                        View page
                      </a>
                    )}
                    {completed.success && (
                      <Link
                        href="/admin/builder"
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold shadow-sm transition ${
                          completed.slug
                            ? "border border-green-200 bg-white text-green-700 hover:bg-[#f5f7fa]"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        <span className="material-symbols-rounded text-base">
                          list
                        </span>
                        View pages
                      </Link>
                    )}
                    {completed.runUrl && (
                      <a
                        href={completed.runUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-4 py-2 text-sm font-bold transition hover:bg-[#f5f7fa] ${
                          completed.success
                            ? "border-green-200 text-green-700"
                            : "border-red-200 text-red-700"
                        }`}
                      >
                        <span className="material-symbols-rounded text-base">
                          open_in_new
                        </span>
                        View workflow run
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCompleted(null);
                        setQueued(null);
                        setContext("");
                        setPageType("");
                        setSlug("");
                        setAudience("general");
                        setMedia([]);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
                    >
                      <span className="material-symbols-rounded text-base">
                        auto_awesome
                      </span>
                      Generate another
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompleted(null)}
                  className={`flex-shrink-0 rounded-lg p-1 transition ${
                    completed.success
                      ? "text-green-700 hover:bg-green-100"
                      : "text-red-700 hover:bg-red-100"
                  }`}
                  aria-label="Dismiss"
                >
                  <span className="material-symbols-rounded text-base">close</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workflow progress — sticky so it stays visible while user scrolls.
            Distinct indigo→violet→fuchsia gradient avoids confusion with the
            destiny-orange Generate button. */}
        {queued && queued.runId && !completed && (
          <div className="sticky top-4 z-20 mb-6">
            <div className="overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-100">
              {/* Top accent strip */}
              <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-600">
                    <span className="material-symbols-rounded text-base">bolt</span>
                    Generation in progress
                  </div>
                  <LivePill />
                </div>
                <WorkflowProgress
                  runId={queued.runId}
                  runUrl={queued.runUrl || ""}
                  ghToken={authToken}
                  onComplete={(success) => {
                    setCompleted({ success, runUrl: queued.runUrl, slug: queued.slug });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Intent */}
          <Section
            number={1}
            title="What should this page do?"
            description="Be specific about the page's goal, key sections, and tone. The more detail, the better the result."
            required
          >
            <div className="relative">
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, charLimit))}
                disabled={loading}
                placeholder="e.g. Landing page for Alpha starting September 12. Targeting students asking life and faith questions. Include hero with intro video, sign-up CTA, what to expect section, FAQ, and a call to invite a friend."
                rows={6}
                className="w-full resize-none rounded-2xl border border-black/10 bg-white px-5 py-4 text-sm text-destiny-grey placeholder:text-destiny-grey/30 transition focus:border-destiny-orange/50 focus:outline-none focus:ring-4 focus:ring-destiny-orange/10 disabled:bg-[#fafafa] disabled:opacity-60"
                required
              />
              <div className="absolute bottom-3 right-4 text-[11px] font-mono text-destiny-grey/40">
                {charCount} / {charLimit}
              </div>
            </div>

            {/* Examples */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/50">
                Or start from an example
              </p>
              <div className="flex flex-wrap gap-2">
                {(showAllExamples ? EXAMPLES : EXAMPLES.slice(0, 4)).map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => applyExample(ex)}
                    disabled={loading}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:-translate-y-0.5 hover:border-destiny-orange/30 hover:bg-destiny-orange/5 hover:text-destiny-orange disabled:opacity-50"
                  >
                    <span className="material-symbols-rounded text-sm transition group-hover:scale-110">
                      auto_fix
                    </span>
                    {ex.label}
                  </button>
                ))}
                {EXAMPLES.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllExamples((v) => !v)}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-dashed border-destiny-orange/40 bg-destiny-orange/5 px-3.5 py-1.5 text-xs font-bold text-destiny-orange transition hover:-translate-y-0.5 hover:bg-destiny-orange/10"
                  >
                    <span className="material-symbols-rounded text-sm transition group-hover:scale-110">
                      {showAllExamples ? "expand_less" : "expand_more"}
                    </span>
                    {showAllExamples
                      ? "Show fewer"
                      : `Show ${EXAMPLES.length - 4} more`}
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* Section: Page type */}
          <Section
            number={2}
            title="Page type"
            description="A short label that hints at the page's purpose. Optional — AI can infer."
            optional
          >
            <input
              id="pageType"
              type="text"
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
              disabled={loading}
              placeholder="e.g. Alpha launch, Sunday service, About us"
              className="w-full rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm text-destiny-grey placeholder:text-destiny-grey/30 transition focus:border-destiny-orange/50 focus:outline-none focus:ring-4 focus:ring-destiny-orange/10 disabled:bg-[#fafafa] disabled:opacity-60"
            />
          </Section>

          {/* Section: URL slug */}
          <Section
            number={3}
            title="URL slug"
            description="The path where this page lives, e.g. /alpha or /visit. Lowercase letters, numbers, hyphens."
            optional
            badge={
              slugIsReserved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Reserved — cannot use
                </span>
              ) : slug.trim() && EXISTING_ROUTES.includes(slug.trim().toLowerCase()) ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                  Will overwrite /{slug.trim().toLowerCase()}
                </span>
              ) : null
            }
          >
            <div className="flex items-stretch overflow-hidden rounded-2xl border border-black/10 bg-white transition focus-within:border-destiny-orange/50 focus-within:ring-4 focus-within:ring-destiny-orange/10">
              <span className="flex items-center bg-[#fafafa] px-4 font-mono text-sm text-destiny-grey/40">
                /
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-+/, "")
                      .slice(0, 60)
                  )
                }
                disabled={loading}
                placeholder="leave blank to let AI choose"
                className="flex-1 bg-white px-4 py-3.5 font-mono text-sm text-destiny-grey placeholder:font-sans placeholder:text-destiny-grey/30 focus:outline-none disabled:bg-[#fafafa] disabled:opacity-60"
              />
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <span className="material-symbols-rounded mt-0.5 flex-shrink-0 text-base text-amber-600">
                warning
              </span>
              <p>
                <strong>Warning:</strong> If you enter a slug that matches an
                existing page (e.g. <code className="font-mono">visit</code>,{" "}
                <code className="font-mono">about</code>,{" "}
                <code className="font-mono">alpha</code>),{" "}
                <strong>the existing page will be replaced</strong>. Leave blank
                and AI will pick a safe new slug.
              </p>
            </div>
          </Section>

          {/* Section: Audience */}
          <Section
            number={4}
            title="Target audience"
            description="Who is this page for? AI will tailor tone and content."
            optional
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AUDIENCES.map((aud) => {
                const selected = audience === aud.id;
                return (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setAudience(aud.id)}
                    disabled={loading}
                    className={`group flex items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-50 ${
                      selected
                        ? "border-destiny-orange bg-destiny-orange/5 ring-2 ring-destiny-orange/20"
                        : "border-black/10 bg-white hover:border-destiny-orange/30 hover:bg-destiny-orange/5"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        selected
                          ? "bg-destiny-orange text-white"
                          : "bg-destiny-grey/5 text-destiny-grey/60 group-hover:bg-destiny-orange/10 group-hover:text-destiny-orange"
                      }`}
                    >
                      <span className="material-symbols-rounded text-lg">{aud.icon}</span>
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        selected ? "text-destiny-grey" : "text-destiny-grey/80"
                      }`}
                    >
                      {aud.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Section: Media */}
          <Section
            number={5}
            title="Photos & videos"
            description="Upload images or paste video URLs. Add a description for each so AI knows where to use it."
            optional
            badge={
              undescribedMedia.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  {undescribedMedia.length} need
                  {undescribedMedia.length === 1 ? "s" : ""} description
                </span>
              ) : null
            }
          >
            <MediaUploader
              media={media}
              onMediaChange={setMedia}
              disabled={loading}
            />
          </Section>

          {/* Section: Timeline */}
          <Section
            number={6}
            title="Timeline"
            description="Standard takes longer but produces higher quality output."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <UrgencyOption
                value="standard"
                checked={urgency === "standard"}
                onChange={() => setUrgency("standard")}
                disabled={loading}
                title="Standard"
                description="High quality (~3 min)"
                icon="auto_awesome"
              />
              <UrgencyOption
                value="immediate"
                checked={urgency === "immediate"}
                onChange={() => setUrgency("immediate")}
                disabled={loading}
                title="Immediate"
                description="Quick draft (~1 min)"
                icon="bolt"
              />
            </div>
          </Section>
        </form>
      </div>

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-4">
          <div className="text-xs text-destiny-grey/60">
            {context.trim().length < 20 ? (
              <span>Write at least 20 characters to enable generation</span>
            ) : slugIsReserved ? (
              <span className="font-bold text-red-600">
                &quot;{slug.trim().toLowerCase()}&quot; is a reserved system route — pick a different slug
              </span>
            ) : undescribedMedia.length > 0 ? (
              <span className="text-amber-600">
                Add descriptions to {undescribedMedia.length} media item
                {undescribedMedia.length === 1 ? "" : "s"}
              </span>
            ) : (
              <span className="font-bold text-destiny-grey">
                Ready to generate
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/builder"
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="group inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-destiny-orange/40 disabled:cursor-not-allowed disabled:bg-destiny-grey/30 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <span className="material-symbols-rounded animate-spin text-base">
                    progress_activity
                  </span>
                  Queueing…
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-base">
                    auto_awesome
                  </span>
                  Generate page
                  <span className="material-symbols-rounded text-base transition group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LivePill() {
  const label = useCycledLiveLabel(true);
  return (
    <span className="ai-live-pulse inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-600" />
      </span>
      {label}
    </span>
  );
}

function Section({
  number,
  title,
  description,
  optional,
  required,
  badge,
  children,
}: {
  number: number;
  title: string;
  description: string;
  optional?: boolean;
  required?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border bg-white p-6 shadow-sm transition hover:shadow-md md:p-8 ${
        required ? "border-destiny-orange/40 ring-1 ring-destiny-orange/10" : "border-black/5"
      }`}
    >
      <div className="mb-5 flex items-start gap-4">
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-sm font-black ${
            required
              ? "bg-destiny-orange text-white"
              : "bg-destiny-orange/10 text-destiny-orange"
          }`}
        >
          {number}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-destiny-grey">{title}</h2>
            {required && (
              <span
                role="status"
                className="inline-flex items-center gap-1 rounded-full bg-destiny-orange px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white"
              >
                <span aria-hidden="true">*</span>
                Required
              </span>
            )}
            {optional && (
              <span
                role="status"
                className="inline-flex items-center rounded-full border border-destiny-grey/15 bg-destiny-grey/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-destiny-grey/70"
              >
                Optional
              </span>
            )}
            {badge}
          </div>
          <p className="mt-1 text-sm text-destiny-grey/70">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function UrgencyOption({
  value,
  checked,
  onChange,
  disabled,
  title,
  description,
  icon,
}: {
  value: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <label
      className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
        checked
          ? "border-destiny-orange bg-destiny-orange/5 ring-2 ring-destiny-orange/20"
          : "border-black/10 bg-white hover:border-destiny-orange/30 hover:bg-destiny-orange/5"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <input
        type="radio"
        name="urgency"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
          checked
            ? "bg-destiny-orange text-white"
            : "bg-destiny-grey/5 text-destiny-grey/60"
        }`}
      >
        <span className="material-symbols-rounded">{icon}</span>
      </span>
      <div className="flex-1">
        <div className="text-sm font-bold text-destiny-grey">{title}</div>
        <div className="text-xs text-destiny-grey/60">{description}</div>
      </div>
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
          checked
            ? "border-destiny-orange bg-destiny-orange"
            : "border-destiny-grey/20"
        }`}
      >
        {checked && (
          <span className="material-symbols-rounded text-xs text-white">
            check
          </span>
        )}
      </span>
    </label>
  );
}

function summarizeBlock(block: SkeletonBlock): string | null {
  const d = block.data;
  const parts: string[] = [];
  switch (block.kind) {
    case "hero":
      if (d.heroTitle) parts.push(`"${d.heroTitle}"`);
      if (d.heroCtaLabel) parts.push(`CTA: ${d.heroCtaLabel}`);
      break;
    case "heading":
      if (d.headingText) parts.push(`"${d.headingText}"`);
      break;
    case "content":
      if (d.contentBody) {
        parts.push(
          d.contentBody.length > 90
            ? d.contentBody.slice(0, 90) + "…"
            : d.contentBody
        );
      }
      break;
    case "image":
      if (d.imageUrl) parts.push("custom image");
      if (d.imageAlt) parts.push(`alt: ${d.imageAlt}`);
      break;
    case "video":
      if (d.videoUrl) parts.push(d.videoUrl);
      break;
    case "churchsuite-form":
      if (d.formUrl) parts.push(d.formUrl);
      else if (d.formTitle) parts.push(d.formTitle);
      break;
    case "cta":
      if (d.ctaHeading) parts.push(`"${d.ctaHeading}"`);
      if (d.ctaButtonLabel)
        parts.push(`Button: ${d.ctaButtonLabel}${d.ctaButtonHref ? ` → ${d.ctaButtonHref}` : ""}`);
      break;
    case "gallery":
      if (d.galleryUrls) {
        const count = d.galleryUrls
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean).length;
        if (count) parts.push(`${count} image${count === 1 ? "" : "s"}`);
      }
      break;
    case "testimonial":
      if (d.testimonialQuote) parts.push(`"${d.testimonialQuote.slice(0, 70)}…"`);
      if (d.testimonialName) parts.push(`— ${d.testimonialName}`);
      break;
    case "faq":
      if (d.faqList) {
        const count = (d.faqList.match(/^Q[:\s]/gim) || []).length;
        if (count) parts.push(`${count} question${count === 1 ? "" : "s"}`);
      }
      break;
    case "team":
      if (d.teamList) {
        const count = d.teamList
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean).length;
        if (count) parts.push(`${count} ${count === 1 ? "person" : "people"}`);
      }
      break;
    default:
      break;
  }
  if (d.notes) parts.push(`Notes: ${d.notes.slice(0, 50)}${d.notes.length > 50 ? "…" : ""}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
