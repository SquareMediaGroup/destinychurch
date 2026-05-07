"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PAGE_TYPES = [
  { id: "alpha", label: "Alpha" },
  { id: "about", label: "About" },
  { id: "giving", label: "Giving" },
  { id: "contact", label: "Contact" },
  { id: "events", label: "Events" },
  { id: "ministries", label: "Ministries" },
  { id: "sermons", label: "Sermons" },
];

const AUDIENCES = [
  { id: "students", label: "Students" },
  { id: "young-adults", label: "Young Adults" },
  { id: "families", label: "Families" },
  { id: "general", label: "General Audience" },
];

export default function AIPageCreatorPage() {
  const router = useRouter();
  const [pageType, setPageType] = useState("alpha");
  const [context, setContext] = useState("");
  const [audience, setAudience] = useState("general");
  const [urgency, setUrgency] = useState<"standard" | "immediate">("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/builder/ai/generate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType,
          context,
          audience: audience !== "general" ? audience : undefined,
          urgency,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to generate page");
      }

      const data = (await response.json()) as {
        id: string;
        editUrl: string;
      };
      setSuccess(true);

      // Redirect to editor after 1 second
      setTimeout(() => {
        router.push(data.editUrl);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/builder"
            className="text-sm text-destiny-orange hover:text-destiny-orange/80 mb-4 inline-block"
          >
            ← Back to Pages
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Create Page with AI
          </h1>
          <p className="text-gray-600">
            Describe what you want, and AI will generate a page structure using your approved components.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">✓ Page generated! Redirecting to editor...</p>
            </div>
          )}

          {/* Page Type */}
          <div>
            <label htmlFor="pageType" className="block text-sm font-semibold text-gray-900 mb-2">
              Page Type
            </label>
            <select
              id="pageType"
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destiny-orange focus:border-transparent disabled:bg-gray-100"
            >
              {PAGE_TYPES.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the primary purpose of this page
            </p>
          </div>

          {/* Context */}
          <div>
            <label htmlFor="context" className="block text-sm font-semibold text-gray-900 mb-2">
              What should this page do?
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={loading}
              placeholder="E.g., 'Create a landing page for Alpha starting September 12, targeting students who are asking big questions about life and faith'"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Be specific about your goals, audience, and any important details
            </p>
          </div>

          {/* Audience */}
          <div>
            <label htmlFor="audience" className="block text-sm font-semibold text-gray-900 mb-2">
              Target Audience (optional)
            </label>
            <select
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-destiny-orange focus:border-transparent disabled:bg-gray-100"
            >
              {AUDIENCES.map((aud) => (
                <option key={aud.id} value={aud.id}>
                  {aud.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This helps AI choose the right tone and messaging
            </p>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              How soon do you need this?
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
                <span className="ml-3 text-gray-700">Standard (high quality)</span>
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
                <span className="ml-3 text-gray-700">Immediate (quick draft)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || !context.trim()}
              className="flex-1 px-6 py-3 bg-destiny-orange text-white font-semibold rounded-lg hover:brightness-110 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Generating..." : "Generate Page"}
            </button>
            <Link
              href="/admin/builder"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>

          {/* Info Box */}
          <div className="bg-destiny-orange/5 border border-destiny-orange/20 rounded-lg p-4 mt-8">
            <h3 className="font-semibold text-destiny-orange mb-2">How this works</h3>
            <ul className="text-sm text-destiny-grey space-y-1">
              <li>✓ AI generates a page structure using your approved components</li>
              <li>✓ All design elements match your church's brand system</li>
              <li>✓ You can edit and refine the page after generation</li>
              <li>✓ Save as draft before publishing</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
