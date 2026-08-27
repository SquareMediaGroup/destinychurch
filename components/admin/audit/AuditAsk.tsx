"use client";

// The ask box: "Who added the Faith Hoodie to the store?"
//
// The point of it is that nobody should have to know which section a thing
// lived in, what we call that kind of thing, or when it happened, in order to
// find out who did it. You type the question you actually have.
//
// The answer never appears on its own. Every claim comes back with the entries
// the model read to make it, listed underneath and openable — so the AI is a
// way *into* the record rather than a replacement for reading it. When the
// answer looks wrong, the rows that produced it are right there.

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  actionLabel,
  actionTone,
  relativeTime,
  sectionLabel,
  type AuditEntry,
} from "@/lib/audit";
import { Badge, ErrorNote, cardClass, primaryBtn } from "@/components/admin/AdminUI";

/** Shown before anyone has asked anything — the box needs to teach its own range. */
const EXAMPLES = [
  "Who added the last product to the store?",
  "What changed on the site this week?",
  "Has anyone been given Super Admin?",
  "What did we delete in the last month?",
];

export function AuditAsk({
  onOpenEntry,
}: {
  onOpenEntry: (entry: AuditEntry) => void;
}) {
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  const reduceMotion = useReducedMotion();

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || asking) return;

    setQuestion(trimmed);
    setAsking(true);
    setError("");
    setAnswer(null);
    setEntries([]);

    try {
      const res = await fetch("/api/admin/audit/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't answer that one.");
        return;
      }
      setAnswer(data.answer ?? "");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setError("Couldn't reach the assistant. Try the search below instead.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className={`${cardClass} mb-6 p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="material-symbols-rounded text-lg text-destiny-orange">
          auto_awesome
        </span>
        <h2 className="text-sm font-black uppercase tracking-wider text-destiny-grey/60 dark:text-white/60">
          Ask the log
        </h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Who added the Faith Hoodie to the store?"
          aria-label="Ask a question about admin activity"
          className="w-full flex-1 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15 dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white dark:placeholder:text-white/25"
        />
        <button type="submit" disabled={asking || !question.trim()} className={primaryBtn}>
          {asking ? (
            <>
              <span className="material-symbols-rounded animate-spin text-lg">
                progress_activity
              </span>
              Looking
            </>
          ) : (
            "Ask"
          )}
        </button>
      </form>

      {!answer && !asking && !error && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => ask(example)}
              className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-destiny-grey/55 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white/55 dark:hover:bg-white/5 dark:hover:text-white"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <AnimatePresence initial={false}>
        {answer && (
          <motion.div
            key="answer"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-4">
              {/*
                Deliberately the same fixed dark "glass" slab regardless of the
                page's own light/dark theme (glass admin-glass — the same
                onboarding-tour treatment in app/globals.css), not a surface
                that flips with dark mode: an answer from the assistant reads
                the same recognisable way every time, the one place in the
                admin where content is being told to you rather than listed
                for you to scan.
              */}
              <div className="glass admin-glass rounded-2xl p-4">
                {answer.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="mb-2 text-sm leading-relaxed text-white/90 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>

              {entries.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                    {entries.length} entr{entries.length === 1 ? "y" : "ies"} behind this answer
                  </p>
                  <div className="flex flex-col gap-1">
                    {entries.map((entry, i) => (
                      <motion.button
                        key={entry.id}
                        type="button"
                        onClick={() => onOpenEntry(entry)}
                        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.15,
                          delay: reduceMotion ? 0 : 0.1 + i * 0.03,
                        }}
                        className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-black/5 px-3 py-2 text-left transition hover:bg-[#f5f7fa] dark:border-white/8 dark:hover:bg-white/5"
                      >
                        <Badge tone={actionTone(entry.action)}>
                          {actionLabel(entry.action)}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-sm text-destiny-grey dark:text-white">
                          {entry.summary}
                        </span>
                        <span className="shrink-0 text-xs text-destiny-grey/40 dark:text-white/40">
                          {entry.actor_email ?? "System"} · {relativeTime(entry.created_at)}
                        </span>
                        <span className="shrink-0 text-xs text-destiny-grey/30 dark:text-white/30">
                          {sectionLabel(entry.section)}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setAnswer(null);
                  setEntries([]);
                  setQuestion("");
                }}
                className="mt-3 text-xs font-bold text-destiny-grey/45 transition hover:text-destiny-grey dark:text-white/45 dark:hover:text-white"
              >
                Ask something else
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
