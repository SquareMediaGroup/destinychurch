"use client";

// Smart Search embedded directly on the 404 page. Same conversation engine
// as the floating pill (components/FloatingSmartSearch.tsx) — same
// streaming, tool cards, clarifying options, and CTA behaviour — just in a
// plain static box instead of a floating morphing pill. The floating pill
// hides itself for as long as this is mounted (useHideFloatingSmartSearch)
// so there's only ever one Smart Search entry point on screen.

import { useEffect, useRef, useState } from "react";
import { useSmartSearchChat } from "@/lib/useSmartSearchChat";
import { useHideFloatingSmartSearch } from "@/lib/smartSearchVisibility";
import { SmartSearchThread, SparkleIcon } from "@/components/smartSearch/SmartSearchThread";

export default function NotFoundSearch({ searchEnabled }: { searchEnabled: boolean }) {
  const hide = useHideFloatingSmartSearch();
  useEffect(() => hide(), [hide]);

  const [input, setInput] = useState("");
  const { messages, loading, toolStatus, sendMessage } = useSmartSearchChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  const lastContent = messages[messages.length - 1]?.content ?? "";
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, lastContent, loading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  }

  if (!searchEnabled) return null;

  return (
    <div className="glass glass-strong glass-refract w-full max-w-md overflow-hidden rounded-2xl text-left">
      {hasMessages && (
        <div className="flex max-h-[50vh] flex-col overflow-y-auto overscroll-contain px-4 py-3">
          <SmartSearchThread
            messages={messages}
            loading={loading}
            toolStatus={toolStatus}
            onOptionClick={sendMessage}
            bottomRef={bottomRef}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 p-3 first:border-t-0">
        <SparkleIcon className="ml-1 h-4 w-4 shrink-0 text-destiny-orange" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasMessages ? "Ask a follow-up…" : "What are you looking for?"}
          disabled={loading}
          maxLength={300}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="shrink-0 rounded-full bg-destiny-orange px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
    </div>
  );
}
