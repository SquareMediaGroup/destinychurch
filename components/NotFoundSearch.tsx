"use client";

import Link from "next/link";
import { useState } from "react";
import { cooldownAnswer, parseAnswer } from "@/lib/smartSearch";

interface Answer {
  text: string;
  page: string | null;
  ctaLabel: string | null;
}

export default function NotFoundSearch({ searchEnabled }: { searchEnabled: boolean }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading || trimmed.length > 300) return;

    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: trimmed }] }),
      });

      if (res.status === 429) {
        const fallback = cooldownAnswer();
        setAnswer({ text: fallback.answer, page: fallback.page, ctaLabel: fallback.ctaLabel });
        return;
      }

      if (!res.body) {
        const parsed = parseAnswer(await res.text());
        setAnswer({ text: parsed.answer, page: parsed.page, ctaLabel: parsed.ctaLabel });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let raw = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "text" && typeof evt.value === "string") raw += evt.value;
          } catch {
            // ignore malformed lines
          }
        }
      }

      const parsed = parseAnswer(raw);
      setAnswer({ text: parsed.answer, page: parsed.page, ctaLabel: parsed.ctaLabel });
    } catch {
      setAnswer({
        text: "I can't reach the assistant right now — please try again in a moment.",
        page: null,
        ctaLabel: null,
      });
    } finally {
      setLoading(false);
    }
  }

  if (!searchEnabled) return null;

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
          disabled={loading}
          maxLength={300}
          className="flex-1 rounded-lg border border-destiny-grey/20 px-4 py-2.5 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-lg bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {answer && (
        <div className="mt-4 rounded-lg border border-destiny-grey/10 bg-destiny-grey/5 p-4 text-left text-sm text-destiny-grey/80">
          <p>{answer.text}</p>
          {answer.page && answer.ctaLabel && (
            <Link
              href={answer.page}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-destiny-orange hover:underline"
            >
              {answer.ctaLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
