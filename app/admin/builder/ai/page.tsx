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
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      // Get auth token from Supabase session
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      
      if (!token) {
        throw new Error("Not authenticated. Please log in and try again.");
      }

      // Call generate-page API
      const response = await fetch("/api/admin/builder/ai/generate-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageType: pageType.trim() || undefined,
          context: context.trim(),
          audience: audience !== "general" ? audience : undefined,
          urgency,
          media,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Failed to generate page");
      }

      const result = (await response.json()) as {
        id: string;
        editUrl: string;
      };
      
      setSuccess(true);
      setTimeout(() => {
        router.push(result.editUrl);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

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
            Describe what you want, add any photos or videos, and AI will
            generate a page using your approved components.
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
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-semibold">
                ✓ Page generated! Redirecting...
              </p>
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
              <li>✓ AI assembles your approved components</li>
              <li>✓ Photos auto-convert to WebP with optimal sizing</li>
              <li>✓ Media descriptions guide smart placement</li>
              <li>✓ Design matches your church's brand</li>
              <li>✓ Fully editable before publishing</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
