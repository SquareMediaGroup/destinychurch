"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  initialAnswer: string;
  initialPage: string | null;
  initialCtaLabel: string | null;
  aiSermons: { id: string; title: string }[];
  query: string;
}

export default function SearchChat({
  initialAnswer,
  initialPage,
  initialCtaLabel,
  aiSermons,
  query,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "user", content: query },
    { role: "assistant", content: initialAnswer },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const extraMessages = messages.slice(2); // everything after the initial pair

  useEffect(() => {
    if (extraMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [extraMessages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-5 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      {/* Accent strip */}
      <div className="h-[3px] bg-gradient-to-r from-destiny-orange via-destiny-orange/70 to-destiny-orange/10" />

      <div className="p-6">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-sm font-semibold text-destiny-orange">AI Overview</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs text-gray-400">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            destinytees.uk
          </div>
        </div>

        {/* Initial answer */}
        <p className="text-[15px] leading-[1.7] text-gray-700">{initialAnswer}</p>

        {/* AI-suggested sermons */}
        {aiSermons.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-gray-400">Related sermons</p>
            <div className="space-y-0.5">
              {aiSermons.map((s) => (
                <Link
                  key={s.id}
                  href={`/sermons/${s.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-orange-50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10 text-destiny-orange transition group-hover:bg-destiny-orange group-hover:text-white">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <span className="truncate text-sm text-gray-600 group-hover:text-gray-900">{s.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA button */}
        {initialPage && initialCtaLabel && aiSermons.length === 0 && (
          <div className="mt-5">
            <Link
              href={initialPage}
              className="inline-flex items-center gap-2 rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 active:brightness-95"
            >
              {initialCtaLabel}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        )}

        {/* Conversation thread (follow-up messages) */}
        {extraMessages.length > 0 && (
          <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
            {extraMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10">
                    <svg className="h-3 w-3 text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-tr-sm bg-destiny-orange text-white"
                      : "rounded-tl-sm bg-gray-100 text-gray-700"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Loading bubble */}
            {loading && (
              <div className="flex justify-start">
                <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10">
                  <svg className="h-3 w-3 text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Follow-up input */}
        <form
          onSubmit={sendMessage}
          className={`flex items-center gap-2 ${extraMessages.length > 0 ? "mt-4" : "mt-5 border-t border-gray-100 pt-4"}`}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question…"
            disabled={loading}
            maxLength={300}
            className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-destiny-orange/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-destiny-orange/15 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destiny-orange text-white shadow-sm transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Send"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
