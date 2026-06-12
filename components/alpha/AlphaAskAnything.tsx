"use client";

import { useState, useRef } from "react";
import AnimateIn from "@/components/AnimateIn";
import Link from "next/link";

interface Response {
  answer: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaExternal?: boolean;
}

export default function AlphaAskAnything() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/alpha-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (res.ok) {
        setResponse(data);
        setQuestion("");
      } else {
        setError(data.error || "Failed to get response");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-8 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Got a question?
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              Ask anything about Alpha
            </h2>
            <p className="text-base text-destiny-grey/60">
              Curious about a specific topic, whether Alpha is running, or just want to know more? Ask away.
            </p>
          </div>

          {/* Ask form */}
          <form onSubmit={handleAsk} className="mb-8">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What would you like to know about Alpha?"
                disabled={loading}
                className="flex-1 rounded-2xl border border-black/10 px-6 py-4 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded-2xl bg-destiny-orange px-8 py-4 font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60 whitespace-nowrap"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-rounded animate-spin text-lg">progress_activity</span>
                  </span>
                ) : (
                  "Ask"
                )}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </form>

          {/* Response */}
          {response && (
            <div className="rounded-2xl border border-destiny-orange/20 bg-white p-8 shadow-sm">
              {response.answer ? (
                <>
                  <p className="mb-6 text-base leading-relaxed text-destiny-grey">
                    {response.answer}
                  </p>
                  {response.ctaLabel && response.ctaUrl && (
                    <div>
                      {response.ctaExternal ? (
                        <a
                          href={response.ctaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                        >
                          {response.ctaLabel}
                          <span className="material-symbols-rounded text-lg">
                            open_in_new
                          </span>
                        </a>
                      ) : (
                        <Link
                          href={response.ctaUrl}
                          className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                        >
                          {response.ctaLabel}
                          <span className="material-symbols-rounded text-lg">
                            arrow_forward
                          </span>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-destiny-grey/60">
                  I&apos;m not able to help with that question. Feel free to ask about Alpha, our topics, or anything else about the course!
                </p>
              )}
            </div>
          )}
        </AnimateIn>
      </div>
    </section>
  );
}
