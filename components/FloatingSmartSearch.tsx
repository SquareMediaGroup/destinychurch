"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useSmartSearchChat } from "@/lib/useSmartSearchChat";
import { useFloatingSmartSearchHidden } from "@/lib/smartSearchVisibility";
import { SmartSearchThread, SparkleIcon } from "@/components/smartSearch/SmartSearchThread";

// thinking-orbs and border-beam are decorative-only, so they're code-split out
// of the main bundle rather than shipped to every visitor up front. Each
// Suspense fallback below renders the real interactive content (or a plain
// CSS equivalent) so nothing is ever hidden behind the chunk fetch — only the
// animation itself is deferred.
const ThinkingOrb = lazy(() =>
  import("thinking-orbs").then((mod) => ({ default: mod.ThinkingOrb })),
);
const BorderBeam = lazy(() =>
  import("border-beam").then((mod) => ({ default: mod.BorderBeam })),
);

/** Plain CSS stand-in for <ThinkingOrb>, shown until its chunk loads. */
function OrbFallback() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-destiny-orange" />
  );
}

const PLACEHOLDER_PROMPTS = [
  "When does the service start?",
  "Is there Kids Church?",
  "How do I get baptised?",
  "Where do I park?",
  "What is Alpha?",
  "How can I serve?",
  "Where can I find sermons?",
  "How do I join a Connect Group?",
];

const SMART_SEARCH_SEEN_KEY = "destiny-smart-search-seen";

const SITE_PAGES = [
  { title: "Sermons",      href: "/sermons"       },
  { title: "Give",         href: "/give"           },
  { title: "Visit",        href: "/visit"          },
  { title: "New Here",     href: "/new-here"       },
  { title: "What's On",    href: "/whats-on"       },
  { title: "Alpha",        href: "/alpha"          },
  { title: "Serve",        href: "/serve"          },
  { title: "About",        href: "/about"          },
  { title: "Missions",     href: "/missions"       },
  { title: "Contact",      href: "/contact"        },
  { title: "Youth",        href: "/youth"          },
  { title: "Young Adults", href: "/young-adults"   },
  { title: "Kids",         href: "/kids"           },
  { title: "Safeguarding", href: "/safeguarding"   },
  { title: "Beliefs",      href: "/beliefs"        },
  { title: "Connect",      href: "/connect"        },
];

export default function FloatingSmartSearch({
  searchEnabled = true,
}: {
  /** Whether the AI service is up. False hides the widget entirely — there's
   *  nothing else for it to do. */
  searchEnabled?: boolean;
}) {
  const pathname = usePathname();
  const { decided } = useCookieConsent();
  const hiddenByPage = useFloatingSmartSearchHidden();
  const { messages, loading, toolStatus, sendMessage: sendChatMessage, reset } = useSmartSearchChat();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showFirstUse, setShowFirstUse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const focusOnOpenRef = useRef(false);

  const hasMessages = messages.length > 0;

  // The bar should not minimise while the user is mid-search: focused, typing, or
  // with a conversation open. The scroll handler reads this via a ref.
  const interacting = focused || input.trim().length > 0 || hasMessages || loading;
  const interactingRef = useRef(interacting);
  interactingRef.current = interacting;

  // Open the pill. Pass focus=true for explicit user intent (tapping the icon)
  // so the input is focused; scroll-driven opens pass false to avoid stealing
  // focus / popping the mobile keyboard.
  const openBar = useCallback((focus: boolean) => {
    focusOnOpenRef.current = focus;
    setExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setExpanded(false);
    setFocused(false);
    setInput("");
    reset();
  }, [reset]);

  // First-use banner + initial placeholder, read once on mount.
  useEffect(() => {
    setPlaceholderIndex(Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length));
    try {
      setShowFirstUse(!localStorage.getItem(SMART_SEARCH_SEEN_KEY));
    } catch {
      setShowFirstUse(false);
    }
  }, []);

  // Focus the input only when the bar was opened by explicit user intent.
  useEffect(() => {
    if (expanded && focusOnOpenRef.current) {
      focusOnOpenRef.current = false;
      // Wait for the width morph before focusing so the caret lands on the
      // fully-grown pill rather than the collapsing circle.
      const t = setTimeout(() => inputRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  // Auto-minimise to the circle on scroll. The pill only ever expands by an
  // explicit tap on the trigger (openBar) — it does NOT reopen on scroll-stop,
  // so the resting state is always the compact circle. Skipped while actively
  // searching so an open conversation isn't yanked shut mid-scroll.
  useEffect(() => {
    const onScroll = () => {
      if (interactingRef.current) return;
      setExpanded(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Rotate the placeholder prompt while expanded, empty, and not yet chatting.
  useEffect(() => {
    if (!expanded || input || hasMessages) return;
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_PROMPTS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [expanded, input, hasMessages]);

  // Keep the latest message in view as the thread grows and as text streams in.
  const lastContent = messages[messages.length - 1]?.content ?? "";
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, lastContent, loading]);

  const dismissFirstUse = useCallback(() => {
    setShowFirstUse(false);
    try {
      localStorage.setItem(SMART_SEARCH_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  // Collapse on navigation.
  useEffect(() => {
    collapse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape closes; click-outside collapses.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [expanded, collapse]);

  // Send a message (typed reply or tapped chip) and append the AI's response.
  const sendMessage = useCallback(
    (text: string) => {
      if (showFirstUse) dismissFirstUse();
      setInput("");
      sendChatMessage(text);
    },
    [showFirstUse, dismissFirstUse, sendChatMessage]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  // /nfc is the chrome-free in-service page: the tiles are the whole interface.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/training") ||
    pathname.startsWith("/nfc")
  )
    return null;

  // Don't surface Smart Search at all until the visitor has made a cookie
  // decision — the search icon only appears once cookies have been accepted.
  if (!decided) return null;

  // Nothing to fall back to without the AI half — no guided script anymore.
  if (!searchEnabled) return null;

  // Some pages (e.g. the 404 page) embed their own Smart Search box and hide
  // this floating pill for as long as they're mounted, so there's only ever
  // one Smart Search entry point on screen at once.
  if (hiddenByPage) return null;

  // Page-name quick matches — only offered before a conversation has started.
  const pageMatches = !hasMessages && input.trim().length >= 1
    ? SITE_PAGES.filter((p) =>
        p.title.toLowerCase().includes(input.trim().toLowerCase())
      ).slice(0, 3)
    : [];

  const hasPages    = pageMatches.length > 0;
  const showPanel   = expanded && (hasMessages || loading || hasPages);
  const showWelcome = expanded && showFirstUse && !hasMessages && !loading && !input;

  // Rendered both inside <BorderBeam> and in its Suspense fallback (see below)
  // so the interactive pill is always present — only the rotating glow around
  // it waits on the border-beam chunk.
  const pillClassName = `floating-search-morph relative h-14 rounded-full ${
    expanded ? "is-expanded" : ""
  }`;
  const pillGlass = (
    <div className="glass glass-strong glass-refract absolute inset-0 rounded-full">
      {/* Collapsed: the resting trigger — a plain search circle. */}
      <button
        type="button"
        onClick={() => openBar(true)}
        aria-label="Open Smart Search"
        aria-hidden={expanded}
        tabIndex={expanded ? -1 : 0}
        className={`floating-search-trigger absolute inset-0 flex items-center justify-center text-white transition-opacity ${
          expanded ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </button>

      {/* Expanded: input form. */}
      <form
        onSubmit={handleSubmit}
        aria-hidden={!expanded}
        className={`floating-search-form absolute inset-0 flex items-center transition-opacity ${
          expanded ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="relative h-full w-full">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (e.target.value && showFirstUse) dismissFirstUse();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={hasMessages ? "Ask a follow-up…" : PLACEHOLDER_PROMPTS[placeholderIndex]}
            disabled={loading}
            maxLength={300}
            tabIndex={expanded ? 0 : -1}
            className="relative z-10 h-full w-full rounded-full bg-transparent py-3.5 pl-5 pr-20 text-sm text-white placeholder:text-white/50 focus:outline-none disabled:opacity-60"
          />
          {/* Clear / loading indicator */}
          {loading ? (
            <div className="absolute right-12 top-1/2 z-20 -translate-y-1/2">
              <Suspense fallback={<OrbFallback />}>
                <ThinkingOrb state="searching" size={20} />
              </Suspense>
            </div>
          ) : input ? (
            <button
              type="button"
              onClick={() => {
                setInput("");
                inputRef.current?.focus();
              }}
              className="absolute right-12 top-1/2 z-20 -translate-y-1/2 text-xs font-medium text-white/40 transition hover:text-white/70"
              aria-label="Clear input"
            >
              Clear
            </button>
          ) : null}
          {/* Collapse button */}
          <button
            type="button"
            onClick={collapse}
            tabIndex={expanded ? 0 : -1}
            className="absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Close Smart Search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[bottom] duration-300 ease-out"
      style={{ bottom: "var(--podcast-dock-height, 0px)" }}
    >
      <div
        ref={containerRef}
        className="pointer-events-auto relative flex w-full flex-col items-center"
        style={{ maxWidth: "min(calc(100vw - 2rem), 28rem)" }}
      >
        {/* Panels stack above the bar and expand upward */}
        {(showWelcome || showPanel) && (
          <div className="floating-search-panels absolute bottom-full left-0 right-0 mb-2">
            {/* First-use explanation */}
            {showWelcome && (
              <div className="glass glass-strong glass-refract rounded-2xl p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <SparkleIcon className="h-3.5 w-3.5 text-destiny-orange" />
                  <span className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
                    Welcome to Smart Search
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/75">
                  Ask Destiny anything &mdash; service times, kids&rsquo; ministry, how to get involved, sermon topics. Smart Search uses AI to point you to the right page or sermon in seconds.
                </p>
                <button
                  type="button"
                  onClick={dismissFirstUse}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                >
                  Got it
                </button>
              </div>
            )}

            {/* Results / conversation panel */}
            {showPanel && (
              <div className="glass glass-strong glass-refract overflow-hidden rounded-2xl">

                {/* Page matches (only before the conversation starts) */}
                {hasPages && pageMatches.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={collapse}
                    className="group flex items-center gap-3 px-4 py-3 text-sm text-white/60 transition hover:bg-white/8 hover:text-white"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/30 transition group-hover:bg-destiny-orange/20 group-hover:text-destiny-orange">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="block">{page.title}</span>
                      <span className="block text-[11px] text-white/25">destinytees.uk{page.href}</span>
                    </div>
                  </Link>
                ))}

                {/* Conversation thread */}
                {(hasMessages || loading) && (
                  <div className="flex max-h-[60vh] flex-col overflow-y-auto overscroll-contain">
                    {/* Disclaimer */}
                    <div className="flex items-center justify-end px-4 pt-3">
                      <span className="text-[10px] text-white/25">AI can sometimes make mistakes.</span>
                    </div>

                    <div className="px-4 py-3">
                      <SmartSearchThread
                        messages={messages}
                        loading={loading}
                        toolStatus={toolStatus}
                        onOptionClick={sendMessage}
                        onCtaClick={collapse}
                        bottomRef={bottomRef}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Morphing bar: circle -> full pill. BorderBeam owns the
            loading glow on the wrapper it renders, so .glass (which uses both
            pseudos for rim + cursor bloom) must sit one level down inside it.
            The Suspense fallback renders the identical pill in a plain div —
            fully interactive — so nothing waits on the border-beam chunk
            except the glow itself. */}
        <Suspense fallback={<div className={pillClassName}>{pillGlass}</div>}>
          <BorderBeam
            size="md"
            borderRadius={9999}
            active={expanded && loading}
            strength={1}
            className={pillClassName}
          >
            {pillGlass}
          </BorderBeam>
        </Suspense>
      </div>
    </div>
  );
}
