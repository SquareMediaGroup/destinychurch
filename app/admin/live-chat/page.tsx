"use client";

// The Host console.
//
// This is the desk you work from when you're rostered on: the room's state, the
// held queue, the prayer requests and the direct threads, in one place. The chat
// itself is still on /live — a Host talks to the room from the same panel
// everyone else sees, because moderating a conversation you're reading in a
// different tab from the one you're in is how you fall behind it.
//
// So what lives here is the work that doesn't fit beside a video player:
// approving a backlog, reviewing what was said last Sunday, working the prayer
// queue, lifting a mute.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Tab = "console" | "prayer" | "threads" | "history";

interface Session {
  id: string;
  video_id: string | null;
  title: string | null;
  state: "closed" | "open" | "paused";
  opened_at: string | null;
  closed_at: string | null;
  created_at?: string;
}

interface HeldMessage {
  id: string;
  displayName: string;
  body: string;
  createdAt: string;
  heldReason: string | null;
  authorKind: "guest" | "host";
}

interface Block {
  id: string;
  guest_id: string;
  scope: "session" | "global";
  reason: string | null;
  created_at: string;
  expires_at: string | null;
}

interface PrayerRequest {
  id: string;
  display_name: string;
  body: string;
  status: "new" | "praying" | "done";
  claimed_at: string | null;
  created_at: string;
}

interface Thread {
  threadKey: string;
  displayName: string;
  lastAt: string;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "console", label: "Live console", icon: "forum" },
  { id: "prayer", label: "Prayer queue", icon: "favorite" },
  { id: "threads", label: "Direct messages", icon: "chat" },
  { id: "history", label: "History", icon: "history" },
];

export default function AdminLiveChatPage() {
  const [tab, setTab] = useState<Tab>("console");
  const [current, setCurrent] = useState<Session | null>(null);
  const [recent, setRecent] = useState<Session[]>([]);
  const [held, setHeld] = useState<HeldMessage[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/live-chat/session");
      if (!res.ok) throw new Error("Couldn't load the chat.");
      const data = await res.json();
      setCurrent(data.current ?? null);
      setRecent(data.recent ?? []);
      return data.current as Session | null;
    } catch {
      setError("Couldn't load the chat.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModeration = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/live-chat/moderate?session=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setHeld(data.held ?? []);
      setBlocks(data.blocks ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadPrayers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/live-chat/prayer");
      if (!res.ok) return;
      const data = await res.json();
      setPrayers(data.requests ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadThreads = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/live-chat/threads?session=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      setThreads(data.threads ?? []);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const session = await loadSession();
      if (session) {
        void loadModeration(session.id);
        void loadThreads(session.id);
      }
      void loadPrayers();
    })();
  }, [loadSession, loadModeration, loadThreads, loadPrayers]);

  // A held message that nobody looks at is a message its author thinks vanished,
  // so the queue refreshes on its own while the console is open. Fifteen seconds
  // matches the pace a Host can actually work at.
  useEffect(() => {
    if (!current) return;
    const id = setInterval(() => {
      void loadModeration(current.id);
      void loadPrayers();
    }, 15_000);
    return () => clearInterval(id);
  }, [current, loadModeration, loadPrayers]);

  const setState = async (state: Session["state"]) => {
    if (!current) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/live-chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: current.id, state }),
      });
      if (res.ok) setCurrent((prev) => (prev ? { ...prev, state } : prev));
    } finally {
      setBusy(false);
    }
  };

  const moderate = async (messageId: string, action: "approve" | "hide") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/live-chat/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message: messageId }),
      });
      if (res.ok) setHeld((prev) => prev.filter((m) => m.id !== messageId));
    } finally {
      setBusy(false);
    }
  };

  const unmute = async (blockId: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/live-chat/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unmute", blockId }),
      });
      if (res.ok) setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } finally {
      setBusy(false);
    }
  };

  const setPrayerStatus = async (id: string, status: PrayerRequest["status"]) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/live-chat/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrayers((prev) => prev.map((p) => (p.id === id ? data.request : p)));
      }
    } finally {
      setBusy(false);
    }
  };

  const openPrayers = prayers.filter((p) => p.status !== "done").length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-destiny-grey">Live Chat</h1>
        <p className="mt-1 text-sm text-destiny-grey/50">
          Moderate the chat on{" "}
          <Link href="/live" className="font-bold text-destiny-orange hover:underline">
            /live
          </Link>
          , work the prayer queue and review what was said.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-destiny-red/5 px-4 py-3 text-sm font-bold text-destiny-red">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t.id
                ? "bg-destiny-orange text-white"
                : "bg-white text-destiny-grey/60 hover:text-destiny-grey dark:bg-destiny-grey-800 dark:text-white/50 dark:hover:text-white"
            }`}
          >
            <span className="material-symbols-rounded text-base">{t.icon}</span>
            {t.label}
            {t.id === "prayer" && openPrayers > 0 && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  tab === t.id ? "bg-white/25" : "bg-destiny-orange/15 text-destiny-orange"
                }`}
              >
                {openPrayers}
              </span>
            )}
            {t.id === "console" && held.length > 0 && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  tab === t.id ? "bg-white/25" : "bg-destiny-orange/15 text-destiny-orange"
                }`}
              >
                {held.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
            progress_activity
          </span>
        </div>
      ) : (
        <>
          {tab === "console" && (
            <ConsoleTab
              current={current}
              held={held}
              blocks={blocks}
              busy={busy}
              onSetState={setState}
              onModerate={moderate}
              onUnmute={unmute}
            />
          )}
          {tab === "prayer" && (
            <PrayerTab requests={prayers} busy={busy} onSetStatus={setPrayerStatus} />
          )}
          {tab === "threads" && <ThreadsTab threads={threads} />}
          {tab === "history" && <HistoryTab sessions={recent} />}
        </>
      )}
    </div>
  );
}

/* ── Console ──────────────────────────────────────────────────────────────── */

function ConsoleTab({
  current,
  held,
  blocks,
  busy,
  onSetState,
  onModerate,
  onUnmute,
}: {
  current: Session | null;
  held: HeldMessage[];
  blocks: Block[];
  busy: boolean;
  onSetState: (state: Session["state"]) => void;
  onModerate: (id: string, action: "approve" | "hide") => void;
  onUnmute: (id: string) => void;
}) {
  if (!current) {
    return (
      <Card>
        <div className="py-8 text-center">
          <span className="material-symbols-rounded mb-3 block text-4xl text-destiny-grey/20">
            videocam_off
          </span>
          <p className="font-black text-destiny-grey">No chat running</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-destiny-grey/55">
            A room opens by itself when the stream goes live. Nothing to moderate
            until then.
          </p>
        </div>
      </Card>
    );
  }

  const stateLabel = {
    open: { text: "Open", tone: "text-destiny-green", dot: "bg-destiny-green" },
    paused: { text: "Paused", tone: "text-destiny-orange", dot: "bg-destiny-orange" },
    closed: { text: "Closed", tone: "text-destiny-grey/50", dot: "bg-destiny-grey/30" },
  }[current.state];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              <span className={`h-2 w-2 rounded-full ${stateLabel.dot}`} />
              <span className={stateLabel.tone}>{stateLabel.text}</span>
            </p>
            <p className="mt-2 truncate text-lg font-black text-destiny-grey">
              {current.title || "Sunday Service"}
            </p>
            <p className="mt-0.5 text-xs text-destiny-grey/45">
              Opened {formatWhen(current.opened_at)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetState(current.state === "paused" ? "open" : "paused")}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 disabled:opacity-60"
            >
              <span className="material-symbols-rounded text-base">
                {current.state === "paused" ? "play_arrow" : "pause"}
              </span>
              {current.state === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              disabled={busy || current.state === "closed"}
              onClick={() => onSetState("closed")}
              className="inline-flex items-center gap-2 rounded-xl bg-destiny-red px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
            >
              <span className="material-symbols-rounded text-base">block</span>
              Close chat
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading
          title="Held for review"
          hint="Messages the filter caught. Only the sender can see these until you approve one."
          count={held.length}
        />
        {held.length === 0 ? (
          <p className="py-6 text-center text-sm text-destiny-grey/40">
            Nothing waiting.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {held.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-start gap-3 rounded-2xl bg-destiny-orange/[0.06] p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-destiny-grey">
                    {m.displayName}
                    <span className="ml-2 text-xs font-medium text-destiny-grey/40">
                      {formatWhen(m.createdAt)}
                    </span>
                  </p>
                  <p className="mt-1 break-words text-sm text-destiny-grey/80">{m.body}</p>
                  {m.heldReason && (
                    <p className="mt-1 text-xs font-bold text-destiny-orange">
                      {m.heldReason}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onModerate(m.id, "approve")}
                    className="rounded-xl bg-destiny-green px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onModerate(m.id, "hide")}
                    className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3 py-2 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 disabled:opacity-60"
                  >
                    Bin it
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeading
          title="Muted"
          hint="Muted people can still watch and read — their messages just don't send."
          count={blocks.length}
        />
        {blocks.length === 0 ? (
          <p className="py-6 text-center text-sm text-destiny-grey/40">Nobody is muted.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f5f7fa] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-destiny-grey/70">
                    {b.guest_id.slice(0, 8)}…
                  </p>
                  <p className="mt-0.5 text-xs text-destiny-grey/45">
                    {b.scope === "global" ? "Every service" : "This service"} ·{" "}
                    {formatWhen(b.created_at)}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUnmute(b.id)}
                  className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3 py-2 text-xs font-bold text-destiny-grey/70 transition hover:bg-white dark:hover:bg-destiny-grey-700 disabled:opacity-60"
                >
                  Unmute
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ── Prayer ───────────────────────────────────────────────────────────────── */

function PrayerTab({
  requests,
  busy,
  onSetStatus,
}: {
  requests: PrayerRequest[];
  busy: boolean;
  onSetStatus: (id: string, status: PrayerRequest["status"]) => void;
}) {
  return (
    <Card>
      <SectionHeading
        title="Prayer requests"
        hint="These are never shown in the chat. Pick one up so the rest of the team knows it's covered."
        count={requests.filter((r) => r.status !== "done").length}
      />
      {requests.length === 0 ? (
        <p className="py-8 text-center text-sm text-destiny-grey/40">
          No requests yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className={`rounded-2xl p-4 ${
                r.status === "done" ? "bg-[#f5f7fa] opacity-60" : "bg-[#f5f7fa]"
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-destiny-grey">
                    {r.display_name}
                    <span className="ml-2 text-xs font-medium text-destiny-grey/40">
                      {formatWhen(r.created_at)}
                    </span>
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-destiny-grey/80">
                    {r.body}
                  </p>
                </div>
                <div className="flex gap-2">
                  {r.status === "new" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onSetStatus(r.id, "praying")}
                      className="rounded-xl bg-destiny-orange px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                    >
                      I&apos;m praying
                    </button>
                  )}
                  {r.status === "praying" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSetStatus(r.id, "done")}
                        className="rounded-xl bg-destiny-green px-3 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSetStatus(r.id, "new")}
                        className="rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3 py-2 text-xs font-bold text-destiny-grey/60 transition disabled:opacity-60"
                      >
                        Put back
                      </button>
                    </>
                  )}
                  {r.status === "done" && (
                    <span className="rounded-xl bg-destiny-green/10 px-3 py-2 text-xs font-bold text-destiny-green">
                      Prayed for
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── Threads ──────────────────────────────────────────────────────────────── */

function ThreadsTab({ threads }: { threads: Thread[] }) {
  return (
    <Card>
      <SectionHeading
        title="Direct messages"
        hint="Private threads between a host and one person watching. Open them from the chat panel on /live."
        count={threads.length}
      />
      {threads.length === 0 ? (
        <p className="py-8 text-center text-sm text-destiny-grey/40">
          No direct conversations in this service.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {threads.map((t) => (
            <li
              key={t.threadKey}
              className="flex items-center gap-3 rounded-2xl bg-[#f5f7fa] px-4 py-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
                <span className="material-symbols-rounded text-lg text-destiny-orange">
                  person
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-destiny-grey">
                  {t.displayName}
                </p>
                <p className="text-xs text-destiny-grey/45">
                  Last message {formatWhen(t.lastAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── History ──────────────────────────────────────────────────────────────── */

function HistoryTab({ sessions }: { sessions: Session[] }) {
  return (
    <Card>
      <SectionHeading
        title="Recent services"
        hint="Messages are kept for 7 days and then deleted automatically."
        count={sessions.length}
      />
      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-destiny-grey/40">
          No services yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#f5f7fa] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-destiny-grey">
                  {s.title || "Sunday Service"}
                </p>
                <p className="text-xs text-destiny-grey/45">
                  {formatWhen(s.opened_at ?? s.created_at ?? null)} · {s.state}
                </p>
              </div>
              {s.video_id && (
                <a
                  href={`https://www.youtube.com/watch?v=${s.video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-destiny-orange hover:underline"
                >
                  Watch
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── Shared bits ──────────────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-6 shadow-sm">
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  hint,
  count,
}: {
  title: string;
  hint: string;
  count: number;
}) {
  return (
    <div className="mb-4">
      <p className="flex items-center gap-2 font-black text-destiny-grey">
        {title}
        {count > 0 && (
          <span className="rounded-full bg-destiny-orange/15 px-2 py-0.5 text-xs text-destiny-orange">
            {count}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-sm text-destiny-grey/50">{hint}</p>
    </div>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}
