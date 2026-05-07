"use client";

import { useState } from "react";
import Link from "next/link";
import MediaUploader from "@/components/builder/MediaUploader";
import WorkflowProgress from "@/components/builder/WorkflowProgress";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { MediaItem } from "@/lib/ai/media-types";

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
];

export default function AIPageCreatorPage() {
  const [pageType, setPageType] = useState("");
  const [context, setContext] = useState("");
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
  } | null>(null);

  const charCount = context.length;
  const charLimit = 2000;
  const undescribedMedia = media.filter((m) => !m.description?.trim());
  const canSubmit = context.trim().length >= 20 && !loading && undescribedMedia.length === 0;

  function applyExample(ex: (typeof EXAMPLES)[number]) {
    setContext(ex.text);
    setPageType(ex.pageType);
    setAudience(ex.audience);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setQueued(null);
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
          audience: audience !== "general" ? audience : undefined,
          urgency,
          media,
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

        {/* Workflow progress */}
        {queued && queued.runId && (
          <div className="mb-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-destiny-orange">
              <span className="material-symbols-rounded text-base">bolt</span>
              Generation in progress
            </div>
            <WorkflowProgress
              runId={queued.runId}
              runUrl={queued.runUrl || ""}
              ghToken={authToken}
              onComplete={(success) => {
                if (success) {
                  setTimeout(() => {
                    setQueued(null);
                    setContext("");
                    setPageType("");
                    setAudience("general");
                    setMedia([]);
                  }, 2000);
                }
              }}
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Intent */}
          <Section
            number={1}
            title="What should this page do?"
            description="Be specific about the page's goal, key sections, and tone. The more detail, the better the result."
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
                {EXAMPLES.map((ex) => (
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

          {/* Section: Audience */}
          <Section
            number={3}
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
            number={4}
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
            number={5}
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

function Section({
  number,
  title,
  description,
  optional,
  badge,
  children,
}: {
  number: number;
  title: string;
  description: string;
  optional?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md md:p-8">
      <div className="mb-5 flex items-start gap-4">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10 text-sm font-black text-destiny-orange">
          {number}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-destiny-grey">{title}</h2>
            {optional && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-destiny-grey/40">
                Optional
              </span>
            )}
            {badge}
          </div>
          <p className="mt-1 text-sm text-destiny-grey/60">{description}</p>
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
