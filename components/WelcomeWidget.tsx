"use client";

// "New here? Start here" — the guided front door.
//
// This replaced an overlay that opened itself on the homepage. Interrupting
// everyone to ask what they wanted turned out to be the wrong shape: it had to
// be suppressed for deep links, held off until the cookie banner was answered,
// and gated so the promo popups couldn't stack under it. A widget that sits in
// the corner and waits to be clicked needs none of that, and is available on
// every page rather than only the one.
//
// It is Smart Search's twin, deliberately: same corner-widget idiom, same glass
// panel, same chat bubbles (see components/FloatingSmartSearch.tsx). The
// difference is what's behind it — Smart Search asks a model, this one walks a
// hand-written script in lib/welcomeChat.ts. No network, no API key, no
// hallucinated service times. Someone who knows what to ask gets Smart Search;
// someone who doesn't know what to ask gets this.
//
// Bottom-left on purpose. Smart Search is a centred pill and the podcast dock is
// full-width, so the left corner is the one that's free at every breakpoint.
//
// Not a modal. It doesn't cover the page, so it takes no focus trap and no
// scroll lock — Escape and click-outside close it, and the thread is an
// aria-live region so new replies are announced without stealing focus.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCookieConsent } from "@/lib/cookieConsent";
import {
  ROOT_NODE_ID,
  getChatNode,
  isLinkChoice,
  type ChatChoice,
} from "@/lib/welcomeChat";

/** Beat before a reply lands, so the conversation reads as a reply, not a jump. */
const REPLY_DELAY_MS = 450;

type Turn =
  | { role: "user"; text: string }
  | { role: "church"; text: string; nodeId: string };

/** Chrome-free surfaces where a floating widget would be in the way. */
function isSuppressed(pathname: string): boolean {
  return pathname.startsWith("/nfc") || pathname.startsWith("/admin");
}

export default function WelcomeWidget() {
  const pathname = usePathname();
  // On mobile the cookie banner is `bottom-4 left-4 right-4` — the exact corner
  // this sits in. Waiting for consent keeps the two off each other rather than
  // stacking a widget on the one thing a first-time visitor has to answer.
  const { decided } = useCookieConsent();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const replyTimer = useRef<number | undefined>(undefined);
  // Which page the current thread was started on — see expand().
  const threadPathRef = useRef<string | null>(null);
  const panelId = useId();

  // The node whose choices are live: the last thing the church said.
  const currentNodeId =
    [...turns].reverse().find((t): t is Extract<Turn, { role: "church" }> =>
      t.role === "church",
    )?.nodeId ?? ROOT_NODE_ID;
  const currentNode = getChatNode(currentNodeId);
  const choices = pending ? [] : (currentNode?.choices ?? []);

  const clearTimer = useCallback(() => {
    if (replyTimer.current !== undefined) {
      window.clearTimeout(replyTimer.current);
      replyTimer.current = undefined;
    }
  }, []);

  const start = useCallback(() => {
    const root = getChatNode(ROOT_NODE_ID);
    setTurns(root ? [{ role: "church", text: root.message, nodeId: root.id }] : []);
    setPending(false);
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setOpen(false);
    setPending(false);
  }, [clearTimer]);

  function expand() {
    // Fresh conversation whenever this is a different page from the one the
    // current thread belongs to. Done lazily here rather than in an effect on
    // `pathname`: resetting from an effect is a synchronous setState on every
    // navigation, for a thread nobody is looking at.
    if (turns.length === 0 || threadPathRef.current !== pathname) {
      start();
      threadPathRef.current = pathname;
    }
    setOpen(true);
  }

  function pick(choice: ChatChoice) {
    // Link choices navigate; next/link handles it, we just tidy up behind.
    if (isLinkChoice(choice)) {
      close();
      return;
    }
    const next = choice.next ? getChatNode(choice.next) : undefined;
    if (!next) return;

    setTurns((prev) => [...prev, { role: "user", text: choice.label }]);
    setPending(true);
    clearTimer();
    replyTimer.current = window.setTimeout(() => {
      setTurns((prev) => [
        ...prev,
        { role: "church", text: next.message, nodeId: next.id },
      ]);
      setPending(false);
      replyTimer.current = undefined;
    }, REPLY_DELAY_MS);
  }

  // Escape and click-outside. Not a focus trap: the page underneath stays usable
  // on purpose, which is the whole difference between this and the old overlay.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) close();
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  // Keep the newest reply in view.
  useEffect(() => {
    if (!open || !threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [turns, pending, open]);

  useEffect(() => clearTimer, [clearTimer]);

  if (isSuppressed(pathname) || !decided) return null;

  return (
    <div
      ref={rootRef}
      data-nosnippet
      className="welcome-widget pointer-events-none fixed bottom-0 left-0 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-start p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ bottom: "var(--podcast-dock-height, 0px)" }}
    >
      {open && (
        <div
          id={panelId}
          // glass-opaque, not the usual glass-strong alone: this is a popover
          // that floats over whatever page you happen to be on, and the system
          // reserves the near-opaque fill for exactly that (see globals.css).
          // Over the homepage hero the translucent version put body copy on top
          // of 9rem display type.
          className="welcome-panel glass glass-strong glass-opaque glass-refract pointer-events-auto mb-2 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">
                New to Destiny?
              </p>
              <p className="truncate text-[11px] text-white/50">
                A few questions to point you the right way
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                close();
                triggerRef.current?.focus();
              }}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <span aria-hidden className="material-symbols-rounded text-lg">
                close
              </span>
            </button>
          </div>

          <div
            ref={threadRef}
            className="flex max-h-[min(26rem,50vh)] flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
            aria-live="polite"
          >
            {turns.map((turn, i) =>
              turn.role === "church" ? (
                <div key={i} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15 text-destiny-orange"
                  >
                    <span className="material-symbols-rounded text-sm">
                      waving_hand
                    </span>
                  </span>
                  <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-2.5 text-sm leading-relaxed text-white/85">
                    {turn.text}
                  </p>
                </div>
              ) : (
                <p
                  key={i}
                  className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-destiny-orange px-3.5 py-2.5 text-sm leading-relaxed text-white"
                >
                  {turn.text}
                </p>
              ),
            )}

            {pending && (
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15 text-destiny-orange"
                >
                  <span className="material-symbols-rounded text-sm">
                    waving_hand
                  </span>
                </span>
                <span className="welcome-typing rounded-2xl rounded-tl-sm bg-white/10 px-3.5 py-3">
                  <i /> <i /> <i />
                  <span className="sr-only">Typing</span>
                </span>
              </div>
            )}
          </div>

          {choices.length > 0 && (
            <div className="flex shrink-0 flex-wrap gap-2 border-t border-white/10 bg-white/5 px-4 py-3">
              {choices.map((choice) =>
                isLinkChoice(choice) ? (
                  <Link
                    key={choice.label}
                    href={choice.href}
                    onClick={() => pick(choice)}
                    className="welcome-choice inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-3.5 py-2 text-xs font-bold text-white outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {choice.label}
                    <span aria-hidden className="material-symbols-rounded text-sm">
                      arrow_forward
                    </span>
                  </Link>
                ) : (
                  <button
                    key={choice.label}
                    type="button"
                    onClick={() => pick(choice)}
                    className="welcome-choice rounded-full border border-white/15 px-3.5 py-2 text-xs font-bold text-white/80 outline-none transition hover:border-destiny-orange hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-destiny-orange"
                  >
                    {choice.label}
                  </button>
                ),
              )}

              {currentNodeId !== ROOT_NODE_ID && (
                <button
                  type="button"
                  onClick={start}
                  className="rounded-full px-3 py-2 text-xs font-semibold text-white/40 outline-none transition hover:text-white/80 focus-visible:ring-2 focus-visible:ring-destiny-orange"
                >
                  Start over
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : expand())}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className="welcome-trigger glass glass-strong glass-refract glass-pill pointer-events-auto inline-flex items-center gap-2 py-2.5 pl-3.5 pr-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange"
      >
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange text-white"
        >
          <span className="material-symbols-rounded text-sm">waving_hand</span>
        </span>
        <span className="text-xs font-bold text-white">
          New here?{" "}
          <span className="font-semibold text-white/60">Start here</span>
        </span>
      </button>
    </div>
  );
}
