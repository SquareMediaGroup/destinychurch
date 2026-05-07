"use client";

import { useState } from "react";
import type { BuilderElement } from "@/lib/builder/types";

type AIAssistantProps = {
  pageId: string;
  pageType: string;
  currentElements: BuilderElement[];
  onInsertElement: (element: BuilderElement, position: "after" | "end") => void;
};

export default function AIAssistant({
  pageId,
  pageType,
  currentElements,
  onInsertElement,
}: AIAssistantProps) {
  const [suggestion, setSuggestion] = useState<BuilderElement | null>(null);
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function handleSuggestSection(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/builder/ai/suggest-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType,
          currentElements,
          context: context || "What section would work well next?",
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to suggest section");
      }

      const data = (await response.json()) as { suggestedElement: BuilderElement };
      setSuggestion(data.suggestedElement);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleInsert() {
    if (suggestion) {
      onInsertElement(suggestion, "end");
      setSuggestion(null);
      setContext("");
    }
  }

  return (
    <div className="w-full md:w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-destiny-orange/5 to-destiny-orange/10 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          {expanded ? "−" : "+"}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Instructions */}
          <div className="text-xs text-destiny-grey bg-destiny-orange/5 p-3 rounded-lg">
            <p className="font-semibold text-destiny-orange mb-1">Need help?</p>
            <p>Describe what section you'd like to add, and AI will suggest something that works with your current layout.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSuggestSection} className="space-y-3">
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              disabled={loading}
              placeholder="E.g., 'Add a signup button', 'Add team information', 'Add call to action'"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none"
            />
            <button
              type="submit"
              disabled={loading || !context.trim()}
              className="w-full px-3 py-2 bg-destiny-orange text-white text-sm font-semibold rounded-lg hover:brightness-110 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Suggesting..." : "Suggest Section"}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div className="bg-destiny-orange/5 border border-destiny-orange/30 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-destiny-orange uppercase tracking-wide">
                  Suggested Component
                </p>
                <p className="text-lg font-bold text-destiny-orange mt-1">
                  {suggestion.type}
                </p>
              </div>

              {suggestion.props && Object.keys(suggestion.props).length > 0 && (
                <div className="bg-white rounded p-2 space-y-1">
                  <p className="text-xs font-semibold text-gray-700">Props:</p>
                  {Object.entries(suggestion.props).map(([key, value]) => (
                    <div key={key} className="text-xs text-gray-600">
                      <span className="font-mono text-blue-600">{key}:</span>{" "}
                      {typeof value === "string" ? value : JSON.stringify(value).substring(0, 30)}
                      {typeof value === "object" && JSON.stringify(value).length > 30 ? "..." : ""}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleInsert}
                  className="flex-1 px-3 py-2 bg-destiny-orange text-white text-sm font-semibold rounded hover:brightness-110 transition-colors"
                >
                  Insert
                </button>
                <button
                  onClick={() => setSuggestion(null)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Tips */}
          {!suggestion && (
            <div className="bg-destiny-orange/5 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-destiny-orange uppercase tracking-wide">
                Pro Tips
              </p>
              <ul className="text-xs text-destiny-grey space-y-1">
                <li>• Be specific ("call to action button" not just "button")</li>
                <li>• Mention the purpose or audience</li>
                <li>• AI respects your design system</li>
                <li>• Edit props after insertion as needed</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Header Info */}
      {!expanded && currentElements.length > 0 && (
        <div className="p-4 text-xs text-gray-600">
          <p>{currentElements.length} sections in this page</p>
        </div>
      )}
    </div>
  );
}
