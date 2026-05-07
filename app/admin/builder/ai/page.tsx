"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MediaUploader from "@/components/builder/MediaUploader";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { MediaItem } from "@/lib/ai/media-types";

const AUDIENCES = [
  { id: "general", label: "General Audience" },
  { id: "students", label: "Students" },
  { id: "young-adults", label: "Young Adults" },
  { id: "families", label: "Families" },
  { id: "kids", label: "Kids" },
  { id: "seniors", label: "Seniors" },
];

export default function AIPageCreatorPage() {
  const router = useRouter();
  const [pageType, setPageType] = useState("");
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("general");
  const [urgency, setUrgency] = useState<"standard" | "immediate">("standard");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    title: string;
    route: string;
    commit?: string;
    pushed: boolean;
    files: string[];
    reasoning: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated. Please log in and try again.");
      }

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
          (payload.error as string) || `Failed to generate page (HTTP ${response.status})`
        );
      }

      setResult({
        title: payload.title as string,
        route: payload.route as string,
        commit: payload.commit as string | undefined,
        pushed: Boolean(payload.pushed),
        files: (payload.files as string[]) ?? [],
        reasoning: (payload.reasoning as string) ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // suppress unused warning
  void router;

  const undescribedMedia = media.filter((m) => !m.description?.trim());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/builder"
            className="text-sm text-destiny-orange hover:text-destiny-orange/80 mb-4 inline-block font-semibold"
          >
            ← Back to Pages
          </Link>
          <h1 className="text-4xl font-bold text-destiny-grey mb-2">
            Create Page with AI
          </h1>
          <p className="text-destiny-grey/70">
            Describe what you want and AI will write a real Next.js page,
            type-check it, commit it to <code className="font-mono text-sm">main</code>, and email an audit summary.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-8 space-y-6"
        >
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-700">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="text-green-700 font-semibold">
                ✓ Page generated and committed
              </p>
              <p className="text-sm text-destiny-grey">
                <strong>{result.title}</strong> is live at{" "}
                <a
                  href={result.route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-destiny-orange underline"
                >
                  {result.route}
                </a>
              </p>
              {result.commit && (
                <p className="text-xs font-mono text-destiny-grey/60">
                  Commit {result.commit.slice(0, 12)} {result.pushed ? "· pushed to main" : "· not pushed"}
                </p>
              )}
              <details className="text-xs text-destiny-grey/70 mt-2">
                <summary className="cursor-pointer font-semibold">
                  Files ({result.files.length})
                </summary>
                <ul className="mt-2 ml-4 list-disc font-mono">
                  {result.files.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </details>
              {result.reasoning && (
                <p className="text-xs text-destiny-grey/70 italic border-l-2 border-destiny-orange/30 pl-2 mt-2">
                  {result.reasoning}
                </p>
              )}
            </div>
          )}

          {/* Main Description */}
          <div>
            <label htmlFor="context" className="block text-sm font-semibold text-destiny-grey mb-2">
              What should this page do? <span className="text-red-600">*</span>
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={loading}
              placeholder="E.g., Create a landing page for Alpha starting September 12, targeting students asking about life and faith. Include sign-up CTA."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destiny-orange focus:border-transparent disabled:bg-gray-100 resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Be specific about goals, audience, and important details</p>
          </div>

          {/* Page Type (Optional) */}
          <div>
            <label htmlFor="pageType" className="block text-sm font-semibold text-destiny-grey mb-2">
              Page type <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="pageType"
              type="text"
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
              disabled={loading}
              placeholder="e.g., Alpha launch, About us, Sermon archive..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destiny-orange focus:border-transparent disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank for AI to infer from description</p>
          </div>

          {/* Audience */}
          <div>
            <label htmlFor="audience" className="block text-sm font-semibold text-destiny-grey mb-2">
              Target audience <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destiny-orange focus:border-transparent disabled:bg-gray-100"
            >
              {AUDIENCES.map((aud) => (
                <option key={aud.id} value={aud.id}>
                  {aud.label}
                </option>
              ))}
            </select>
          </div>

          {/* Media Uploader */}
          <div>
            <label className="block text-sm font-semibold text-destiny-grey mb-2">
              Photos & videos <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <MediaUploader
              media={media}
              onMediaChange={setMedia}
              disabled={loading}
            />
            {undescribedMedia.length > 0 && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠ {undescribedMedia.length} item{undescribedMedia.length !== 1 ? "s" : ""} need{undescribedMedia.length === 1 ? "s" : ""} description
              </p>
            )}
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-semibold text-destiny-grey mb-2">
              Timeline
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="urgency"
                  value="standard"
                  checked={urgency === "standard"}
                  onChange={(e) => setUrgency(e.target.value as "standard")}
                  disabled={loading}
                  className="w-4 h-4 text-destiny-orange accent-destiny-orange"
                />
                <span className="ml-2 text-sm text-destiny-grey">Standard (high quality)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="urgency"
                  value="immediate"
                  checked={urgency === "immediate"}
                  onChange={(e) => setUrgency(e.target.value as "immediate")}
                  disabled={loading}
                  className="w-4 h-4 text-destiny-orange accent-destiny-orange"
                />
                <span className="ml-2 text-sm text-destiny-grey">Immediate (quick draft)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || !context.trim()}
              className="flex-1 px-6 py-3 bg-destiny-orange text-white font-semibold rounded-lg hover:brightness-110 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Generating..." : "Generate Page"}
            </button>
            <Link
              href="/admin/builder"
              className="px-6 py-3 border border-gray-300 text-destiny-grey font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>

          {/* Info Box */}
          <div className="bg-destiny-orange/5 border border-destiny-orange/20 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-destiny-orange text-sm">How this works</h3>
            <ul className="text-xs text-destiny-grey space-y-1">
              <li>✓ AI reads existing pages + components for context</li>
              <li>✓ Generates a real <code className="font-mono">app/&lt;slug&gt;/page.tsx</code> file</li>
              <li>✓ Type-checks the generated code with <code className="font-mono">tsc</code></li>
              <li>✓ Commits and pushes to <code className="font-mono">main</code> on success</li>
              <li>✓ Audit summary emailed after every run</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
