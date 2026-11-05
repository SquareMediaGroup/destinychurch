"use client";

// DestinyAI in Destiny Admin. Built phone-first: the conversation scrolls, the
// composer stays pinned above the tab bar, and every answer that would change
// the site arrives as a plan card to confirm rather than as something done.
//
// The conversation is kept in this browser only (localStorage), as a
// convenience for coming back to it. Plans live on the server; a pending one is
// re-read on load so its card never shows a stale state.

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantQuestion, AssistantReply, ChatMessage, Plan } from "@/lib/adminAgent/types";
import PlanCard from "./PlanCard";

interface Entry {
  id: string;
  role: "user" | "assistant";
  text: string;
  question?: AssistantQuestion | null;
  plan?: Plan | null;
  error?: boolean;
}

const STORAGE_KEY = "destinyai-admin-chat-v1";
const KEPT = 40;

const SUGGESTIONS = [
  "Put up a maintenance notice for 12–3pm tomorrow, live in 2 hours",
  "What's on the site banner right now?",
  "Feature our next event on the homepage until it starts",
  "Draft a post about our Christmas service times",
];

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function readStored(): Entry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Entry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function store(entries: Entry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-KEPT)));
  } catch {
    // Private mode or storage full: the chat still works, it just isn't kept.
  }
}

/**
 * What the model is told about its own earlier turns. Plan outcomes are added
 * so a follow-up like "actually make it 1pm" knows what already happened.
 */
function toMessage(entry: Entry): ChatMessage {
  if (entry.role === "user") return { role: "user", content: entry.text };
  const parts = [entry.text];
  if (entry.question) {
    parts.push(`[You asked: ${entry.question.question} Options: ${entry.question.options.join(" / ")}]`);
  }
  if (entry.plan) {
    const steps = entry.plan.actions.map((a) => `${a.label} (${a.status})`).join("; ");
    parts.push(`[Plan ${entry.plan.status}: ${steps}]`);
  }
  return { role: "assistant", content: parts.filter(Boolean).join("\n") };
}

export default function AssistantChat() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Load the kept conversation, then refresh any plan still waiting.
  useEffect(() => {
    const kept = readStored();
    setEntries(kept);
    setLoaded(true);
    for (const entry of kept) {
      if (entry.plan?.status !== "pending") continue;
      fetch(`/api/admin/assistant/plans/${entry.plan.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { plan?: Plan } | null) => {
          if (!data?.plan) return;
          setEntries((current) =>
            current.map((e) => (e.plan?.id === data.plan!.id ? { ...e, plan: data.plan } : e)),
          );
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (loaded) store(entries);
  }, [entries, loaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length, sending]);

  // Grow the composer with its text, up to a few lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      const user: Entry = { id: newId(), role: "user", text: content };
      const history = [...entries.filter((e) => !e.error), user];
      setEntries((current) => [...current, user]);
      setDraft("");
      setSending(true);
      try {
        const res = await fetch("/api/admin/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.map(toMessage) }),
        });
        const data = (await res.json().catch(() => ({}))) as Partial<AssistantReply> & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "DestinyAI couldn't answer that.");
        setEntries((current) => [
          // A new plan supersedes any older one still waiting (the server has
          // already cancelled it).
          ...current.map((e) =>
            data.plan && e.plan?.status === "pending" ? { ...e, plan: { ...e.plan, status: "cancelled" as const } } : e,
          ),
          {
            id: newId(),
            role: "assistant",
            text: data.reply ?? "",
            question: data.question ?? null,
            plan: data.plan ?? null,
          },
        ]);
      } catch (err) {
        setEntries((current) => [
          ...current,
          { id: newId(), role: "assistant", text: (err as Error).message, error: true },
        ]);
      } finally {
        setSending(false);
      }
    },
    [entries, sending],
  );

  function updatePlan(plan: Plan) {
    setEntries((current) => current.map((e) => (e.plan?.id === plan.id ? { ...e, plan } : e)));
  }

  function editPlan(plan: Plan) {
    updatePlan({ ...plan, status: "cancelled" });
    void fetch(`/api/admin/assistant/plans/${plan.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: "cancel" }),
    });
    inputRef.current?.focus();
  }

  function clearChat() {
    setEntries([]);
    inputRef.current?.focus();
  }

  const lastId = entries[entries.length - 1]?.id;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pt-6 md:px-6 md:pt-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-admin-heading)] text-2xl font-black tracking-tight text-destiny-grey md:text-3xl dark:text-white">
            DestinyAI
          </h1>
          <p className="mt-1 text-sm text-destiny-grey/55 dark:text-white/55">
            Ask for admin jobs in plain English. Nothing changes until you confirm.
          </p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
          >
            New chat
          </button>
        )}
      </div>

      {loaded && entries.length === 0 && (
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
          <p className="text-sm font-bold text-destiny-grey dark:text-white">What I can do</p>
          <p className="mt-1 text-sm leading-relaxed text-destiny-grey/60 dark:text-white/60">
            The site banner and popup (including scheduling them on and off), the featured event, and posts: drafting,
            publishing, scheduling and taking them down. Several steps at once is fine. I&apos;ll ask if something is
            unclear, and anything that removes or replaces what&apos;s live needs a second confirm.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-2xl border border-black/8 px-3.5 py-2.5 text-left text-sm text-destiny-grey/80 transition hover:border-destiny-orange/40 hover:bg-destiny-orange/[0.04] dark:border-white/10 dark:text-white/80"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4" aria-live="polite">
        {entries.map((entry) =>
          entry.role === "user" ? (
            <div key={entry.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-destiny-orange px-4 py-2.5 text-sm text-white">
                {entry.text}
              </p>
            </div>
          ) : (
            <div key={entry.id} className="flex flex-col gap-2.5">
              {entry.text && (
                <p
                  className={`max-w-[92%] whitespace-pre-wrap text-sm leading-relaxed ${
                    entry.error ? "text-danger" : "text-destiny-grey dark:text-white"
                  }`}
                >
                  {entry.text}
                </p>
              )}
              {entry.question && (
                <div className="rounded-2xl border border-black/8 bg-white p-3.5 dark:border-white/10 dark:bg-destiny-grey-800">
                  <p className="text-sm font-bold text-destiny-grey dark:text-white">{entry.question.question}</p>
                  {entry.question.options.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.question.options.map((option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={sending || entry.id !== lastId}
                          onClick={() => send(option)}
                          className="rounded-full border border-destiny-orange/40 px-3.5 py-1.5 text-sm font-medium text-destiny-orange transition hover:bg-destiny-orange/10 disabled:opacity-40"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  {entry.question.allow_free_text && entry.id === lastId && (
                    <p className="mt-2.5 text-xs text-destiny-grey/45 dark:text-white/45">Or type your own answer below.</p>
                  )}
                </div>
              )}
              {entry.plan && <PlanCard plan={entry.plan} onPlan={updatePlan} onEdit={() => editPlan(entry.plan!)} />}
            </div>
          ),
        )}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-destiny-grey/50 dark:text-white/50" role="status">
            <span className="material-symbols-rounded animate-spin text-base" aria-hidden="true">
              progress_activity
            </span>
            DestinyAI is working on it
          </div>
        )}
        {/* Room for the fixed composer (and the tab bar on phones). It's the
            scroll target too, so the newest message lands just above them. */}
        <div ref={endRef} aria-hidden="true" className="h-36 md:h-28" />
      </div>

      {/* Fixed rather than sticky: the admin's <main> is overflow-auto without a
          height, so sticky has nothing to stick to. Same offsets as the Links
          editor's toolbar: above the tab bar on phones, beside the sidebar on
          desktop. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 px-3 md:bottom-0 md:left-56 md:px-6 md:pb-5"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-3xl border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-destiny-grey-800">
          <label htmlFor="destinyai-input" className="sr-only">
            Ask DestinyAI
          </label>
          <textarea
            id="destinyai-input"
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(draft);
              }
            }}
            placeholder="Ask DestinyAI to do something"
            className="max-h-[140px] min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[16px] text-destiny-grey outline-none placeholder:text-destiny-grey/35 md:text-sm dark:text-white dark:placeholder:text-white/30"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destiny-orange text-white transition hover:brightness-110 disabled:opacity-40"
          >
            <span className="material-symbols-rounded text-xl" aria-hidden="true">
              arrow_upward
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
