"use client";

// Search docked inside the mobile nav menu — same underlying Smart Search
// conversation logic as the floating pill (useSmartSearchChat), but styled to
// sit inline on the menu's own orange overlay rather than as a floating glass
// pill. The floating pill hides itself for as long as the mobile menu is
// open (useHideFloatingSmartSearch), so there's only one Smart Search entry
// point on screen at a time.

import { useEffect, useRef, useState } from "react";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useSmartSearchChat } from "@/lib/useSmartSearchChat";
import { useHideFloatingSmartSearch } from "@/lib/smartSearchVisibility";
import { SmartSearchThread } from "@/components/smartSearch/SmartSearchThread";

export default function MobileMenuSearch({
  open,
  searchEnabled = true,
  onNavigate,
}: {
  /** Whether the mobile menu is currently open — drives hiding the floating pill. */
  open: boolean;
  searchEnabled?: boolean;
  /** Called when a result/CTA is tapped, so the mobile menu can close. */
  onNavigate: () => void;
}) {
  const { decided } = useCookieConsent();
  const { messages, loading, toolStatus, sendMessage, reset } = useSmartSearchChat();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hide = useHideFloatingSmartSearch();

  useEffect(() => {
    if (open) return hide();
  }, [open, hide]);

  // Clear the conversation each time the menu closes, so reopening it starts fresh.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setInput("");
      reset();
    }
  }

  if (!decided || !searchEnabled) return null;

  const hasMessages = messages.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  }

  return (
    <div className="mt-8 w-full max-w-sm">
      <form onSubmit={handleSubmit} className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasMessages ? "Ask a follow-up…" : "Search the site…"}
          disabled={loading}
          maxLength={300}
          className="w-full rounded-full border border-white/20 bg-black/10 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/60 focus:border-white/40 focus:outline-none disabled:opacity-60"
        />
      </form>

      {(hasMessages || loading) && (
        <div className="mt-4 max-h-[40vh] overflow-y-auto rounded-2xl bg-black/10 p-4">
          <SmartSearchThread
            messages={messages}
            loading={loading}
            toolStatus={toolStatus}
            onOptionClick={sendMessage}
            onCtaClick={onNavigate}
          />
        </div>
      )}
    </div>
  );
}
