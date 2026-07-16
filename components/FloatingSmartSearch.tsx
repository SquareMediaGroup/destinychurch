"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { useCookieConsent } from "@/lib/cookieConsent";
import { cooldownAnswer, parseAnswer } from "@/lib/smartSearch";
import {
  ProductResultCards,
  WeatherResultCard,
  DirectionsResultCard,
  WebResultsCard,
} from "@/components/smartSearch/ResultCards";
import type {
  ProductResult,
  WeatherToolResult,
  DirectionsToolResult,
  SearchWebResult,
} from "@/lib/smartSearch/tools";

// Hide the trailing OPTION:/PAGE:/CTA: lines while text is still streaming in, so
// the visitor only ever sees clean prose. The full reply is parsed once complete.
function visibleProse(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*•]\s*|\d+[.)]\s*)?OPTION:.*$/gim, "")
    .replace(/^\s*PAGE:.*$/gim, "")
    .replace(/^\s*CTA:.*$/gim, "")
    .replace(/^\s*[-=]{3,}\s*$/gm, "")
    .trimEnd();
}

// Run layout effects on the client, but fall back to useEffect during SSR to
// avoid React's "useLayoutEffect does nothing on the server" warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface ToolCards {
  products?: ProductResult[];
  weather?: WeatherToolResult;
  directions?: DirectionsToolResult;
  web?: SearchWebResult;
}

interface ChatMessage extends ToolCards {
  role: "user" | "assistant";
  content: string;
  options?: string[];    // assistant: tappable clarifying chips
  page?: string | null;  // assistant: CTA target
  ctaLabel?: string | null;
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

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function hasVerifiedCookie(): boolean {
  return typeof document !== "undefined" && document.cookie.includes("ts_verified=");
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

export default function FloatingSmartSearch() {
  const pathname = usePathname();
  const { decided } = useCookieConsent();
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showFirstUse, setShowFirstUse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const focusOnOpenRef = useRef(false);
  // Transient class that drives the keyframed width morph on each state change.
  const [morph, setMorph] = useState<"" | "morph-expanding" | "morph-collapsing">("");
  const firstMorphRef = useRef(true);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | undefined>(undefined);
  const visibleTurnstileRef = useRef<HTMLDivElement>(null);
  const visibleWidgetId = useRef<string | undefined>(undefined);
  // Set when the invisible challenge couldn't silently verify the visitor;
  // holds the message to resend once they complete the visible widget below.
  const [turnstileChallengeText, setTurnstileChallengeText] = useState<string | null>(null);

  // Runs the invisible Turnstile challenge and resolves the resulting token.
  const getTurnstileToken = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!TURNSTILE_SITE_KEY || !window.turnstile || !turnstileRef.current) {
        resolve(null);
        return;
      }
      if (turnstileWidgetId.current === undefined) {
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          size: "invisible",
          execution: "execute",
          callback: (token) => resolve(token),
          "error-callback": () => resolve(null),
        });
      }
      window.turnstile.execute(turnstileWidgetId.current);
    });
  }, []);

  const submitTurnstileToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/turnstile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // Ensures Smart Search has a verified session cookie, running the invisible
  // Turnstile challenge (once per session) only when it's missing.
  const ensureTurnstileVerified = useCallback(async (): Promise<boolean> => {
    if (hasVerifiedCookie()) return true;

    const token = await getTurnstileToken();
    if (!token) return false;

    return submitTurnstileToken(token);
  }, [getTurnstileToken, submitTurnstileToken]);

  const hasMessages = messages.length > 0;

  // Keyframe the circle <-> pill morph whenever `expanded` flips. Skip the first
  // render so the bar doesn't morph on mount; set the class in a layout effect so
  // the keyframe starts from the correct width with no one-frame flash.
  useIsoLayoutEffect(() => {
    if (firstMorphRef.current) {
      firstMorphRef.current = false;
      return;
    }
    setMorph(expanded ? "morph-expanding" : "morph-collapsing");
  }, [expanded]);

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
    setMessages([]);
    setLoading(false);
  }, []);

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
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading || trimmed.length > 300) return;
      if (showFirstUse) dismissFirstUse();

      setLoading(true);
      const verified = await ensureTurnstileVerified();
      if (!verified) {
        // The invisible challenge couldn't silently confirm the visitor —
        // surface the visible widget so they can complete it manually, then
        // resend this same message once they do.
        setLoading(false);
        setInput(trimmed);
        setTurnstileChallengeText(trimmed);
        return;
      }

      const history: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(history);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (res.status === 429) {
          setMessages((prev) => [...prev, { role: "assistant", content: cooldownAnswer().answer }]);
          return;
        }

        if (!res.body) {
          // No stream (shouldn't happen) — fall back to reading the whole body.
          const text = await res.text();
          const parsed = parseAnswer(text);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: parsed.answer, options: parsed.options, page: parsed.page, ctaLabel: parsed.ctaLabel },
          ]);
          return;
        }

        // The route streams newline-delimited JSON events: `text` tokens build the
        // prose bubble (still parsed for OPTION/PAGE/CTA), `tool_result` events
        // attach a card. We append the assistant message once there's something to
        // show (visible prose or a card), then keep rewriting it until `done`.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let raw = "";
        const cards: ToolCards = {};
        let appended = false;

        const hasCards = () =>
          Boolean(cards.products || cards.weather || cards.directions || cards.web);

        // Build the live (streaming) assistant message from prose + cards so far.
        const liveMessage = (): ChatMessage => ({
          role: "assistant",
          content: visibleProse(raw),
          ...cards,
        });

        const sync = () => {
          const hasContent = visibleProse(raw).length > 0 || hasCards();
          if (!appended && !hasContent) return; // nothing to show yet
          const msg = liveMessage();
          if (!appended) {
            appended = true;
            setLoading(false);
            setMessages((prev) => [...prev, msg]);
          } else {
            setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? msg : m)));
          }
        };

        const handleEvent = (evt: { type: string; value?: string; name?: string; data?: unknown }) => {
          if (evt.type === "text" && typeof evt.value === "string") {
            raw += evt.value;
            sync();
          } else if (evt.type === "tool_result") {
            switch (evt.name) {
              case "find_products":
                cards.products = (evt.data as { products?: ProductResult[] }).products;
                break;
              case "get_weather":
                cards.weather = evt.data as WeatherToolResult;
                break;
              case "get_directions":
                cards.directions = evt.data as DirectionsToolResult;
                break;
              case "search_web":
                cards.web = evt.data as SearchWebResult;
                break;
            }
            sync();
          }
        };

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
              handleEvent(JSON.parse(line));
            } catch {
              // ignore malformed lines
            }
          }
        }

        // Finalise: parse the completed prose for clarifying chips / CTA, and keep
        // the collected cards. Fall back to the parsed answer only when there's no
        // prose and no cards (so a tool-only reply doesn't show a "no results" line).
        const parsed = parseAnswer(raw);
        const proseFinal = visibleProse(raw);
        const finalMsg: ChatMessage = {
          role: "assistant",
          content: proseFinal || (hasCards() ? "" : parsed.answer),
          options: parsed.options,
          page: parsed.page,
          ctaLabel: parsed.ctaLabel,
          ...cards,
        };
        if (!appended) {
          setLoading(false);
          setMessages((prev) => [...prev, finalMsg]);
        } else {
          setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? finalMsg : m)));
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I can't reach the assistant right now — please try again in a moment.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, showFirstUse, dismissFirstUse, ensureTurnstileVerified]
  );

  // Fires when the visitor completes the visible fallback widget: confirm the
  // token with the server, then automatically resend the message that was
  // waiting on verification.
  const handleTurnstileSolved = useCallback(
    async (token: string) => {
      const ok = await submitTurnstileToken(token);
      const pending = turnstileChallengeText;
      setTurnstileChallengeText(null);
      if (ok && pending) {
        sendMessage(pending);
      } else if (!ok && window.turnstile) {
        window.turnstile.reset(visibleWidgetId.current);
      }
    },
    [submitTurnstileToken, turnstileChallengeText, sendMessage]
  );

  // Mount the visible widget into its container once the challenge is needed
  // and the Turnstile script has loaded.
  useEffect(() => {
    if (!turnstileChallengeText || !TURNSTILE_SITE_KEY) return;
    if (!window.turnstile || !visibleTurnstileRef.current) return;
    if (visibleWidgetId.current !== undefined) return;

    visibleWidgetId.current = window.turnstile.render(visibleTurnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token) => handleTurnstileSolved(token),
      "error-callback": () => {
        if (window.turnstile) window.turnstile.reset(visibleWidgetId.current);
      },
    });
  }, [turnstileChallengeText, handleTurnstileSolved]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/training")) return null;

  // Don't surface Smart Search at all until the visitor has made a cookie
  // decision — the search icon only appears once cookies have been accepted.
  if (!decided) return null;

  // Page-name quick matches — only offered before a conversation has started.
  const pageMatches = !hasMessages && input.trim().length >= 1
    ? SITE_PAGES.filter((p) =>
        p.title.toLowerCase().includes(input.trim().toLowerCase())
      ).slice(0, 3)
    : [];

  const hasPages    = pageMatches.length > 0;
  const showPanel   = expanded && (hasMessages || loading || hasPages || Boolean(turnstileChallengeText));
  const showWelcome = expanded && showFirstUse && !hasMessages && !loading && !input;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[bottom] duration-300 ease-out"
      style={{ bottom: "var(--podcast-dock-height, 0px)" }}
    >
      {TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div ref={turnstileRef} className="hidden" aria-hidden="true" />
        </>
      )}
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

                {/* Turnstile fallback — shown when the invisible check couldn't
                    silently confirm the visitor. */}
                {turnstileChallengeText && (
                  <div className="flex flex-col items-center gap-3 px-4 py-5 text-center">
                    <p className="text-sm text-white/70">
                      Please complete the verification below to continue.
                    </p>
                    <div ref={visibleTurnstileRef} />
                  </div>
                )}

                {/* Page matches (only before the conversation starts) */}
                {!turnstileChallengeText && hasPages && pageMatches.map((page) => (
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

                    <div className="space-y-3 px-4 py-3">
                      {messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15">
                              <SparkleIcon className="h-3 w-3 text-destiny-orange" />
                            </div>
                          )}
                          <div className="max-w-[85%] min-w-0">
                            {msg.content && (
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                  msg.role === "user"
                                    ? "rounded-tr-sm bg-destiny-orange text-white"
                                    : "rounded-tl-sm bg-white/10 text-white/85"
                                }`}
                              >
                                {msg.content}
                              </div>
                            )}

                            {/* Tool result cards (products, weather, directions, web) */}
                            {msg.role === "assistant" && (
                              <>
                                {msg.products && msg.products.length > 0 && (
                                  <ProductResultCards products={msg.products} />
                                )}
                                {msg.weather && <WeatherResultCard data={msg.weather} />}
                                {msg.directions && <DirectionsResultCard data={msg.directions} />}
                                {msg.web && <WebResultsCard data={msg.web} />}
                              </>
                            )}

                            {/* Options + CTA on the latest assistant message only */}
                            {msg.role === "assistant" && i === messages.length - 1 && (
                              <>
                                {msg.options && msg.options.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {msg.options.map((option) => (
                                      <button
                                        key={option}
                                        type="button"
                                        onClick={() => sendMessage(option)}
                                        disabled={loading}
                                        className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 transition hover:border-destiny-orange hover:bg-destiny-orange/15 hover:text-white disabled:opacity-40"
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                {!msg.options?.length && msg.page && msg.ctaLabel && (
                                  <Link
                                    href={msg.page}
                                    onClick={collapse}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                                  >
                                    {msg.ctaLabel}
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                  </Link>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Typing indicator */}
                      {loading && (
                        <div className="flex justify-start">
                          <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15">
                            <SparkleIcon className="h-3 w-3 text-destiny-orange" />
                          </div>
                          <div className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3">
                            <div className="flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "0ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "150ms" }} />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={bottomRef} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Morphing bar: circle (collapsed) <-> pill (expanded) */}
        <div
          className={`search-glow floating-search-morph relative h-14 rounded-full ${
            expanded ? "is-expanded" : ""
          } ${morph} ${expanded && loading ? "is-loading" : ""}`}
          onAnimationEnd={(e) => {
            // Only clear for the morph element's own width animation, not the
            // loading-glow spin or child spinners that bubble up.
            if (e.target === e.currentTarget && e.animationName.startsWith("fs-morph")) {
              setMorph("");
            }
          }}
        >
          {/* Glass material lives on an inner layer: .search-glow owns this
              element's ::before/::after for the loading glow, so .glass (which
              also uses both pseudos for rim + cursor bloom) must sit one level
              down. It fills the pill exactly and contains the interactive
              children so the bloom tracker's closest('.glass') resolves. */}
          <div className="glass glass-strong glass-refract absolute inset-0 rounded-full">
          {/* Collapsed: circular trigger */}
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
            <span className="relative">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <SparkleIcon className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 text-destiny-orange" />
            </span>
          </button>

          {/* Expanded: input form */}
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
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-destiny-orange" />
                </div>
              ) : input ? (
                <button
                  type="button"
                  onClick={() => {
                    setInput("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-12 top-1/2 z-20 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                  aria-label="Clear input"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
          </div>{/* end .glass layer */}
        </div>
      </div>
    </div>
  );
}
