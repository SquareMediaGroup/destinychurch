"use client";

// The chat beside the stream.
//
// Mounts only when there is a room to join, and a room only exists while we are
// on air (lib/liveChat.server.ts gates creation on the YouTube live check). That
// is deliberate: an always-present chat box under an offline player is an empty
// room someone eventually wanders into alone, and a moderated space nobody is
// moderating. So it appears with the service and goes when the service does.
//
// Everything the panel knows about who it's talking to comes from
// /api/live-chat/me. The client never decides it is a host.

import { useCallback, useEffect, useState } from "react";
import { useLiveNow } from "@/components/live/useLiveNow";
import { useLiveChat, mergeMessage, type ChatMessage, type ChatState } from "./useLiveChat";
import ChatMessageList from "./ChatMessageList";
import ChatComposer from "./ChatComposer";
import HostLoginModal from "./HostLoginModal";
import PrayerRequestModal from "./PrayerRequestModal";

type Tab = "chat" | "backstage";

interface SessionInfo {
  id: string;
  title: string | null;
  state: ChatState;
}

export default function LiveChatPanel() {
  const { live } = useLiveNow();

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [topics, setTopics] = useState<{ public: string; host: string | null } | null>(null);
  const [guest, setGuest] = useState<{ id: string; name: string } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [hostName, setHostName] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [backstage, setBackstage] = useState<ChatMessage[]>([]);
  const [tab, setTab] = useState<Tab>("chat");
  const [loginOpen, setLoginOpen] = useState(false);
  const [prayerOpen, setPrayerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/live-chat/session", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();

      if (!data.session) {
        setSession(null);
        return;
      }
      setSession(data.session);
      setTopics({ public: data.topics.public, host: data.topics.host });
      setGuest(data.guest);
      setIsHost(Boolean(data.isHost));
    } catch {
      // Offline or a blip — leave whatever we had rather than blanking the room.
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/live-chat/me", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setGuest(data.guest);
      setIsHost(Boolean(data.isHost));
      setHostName(data.host?.name ?? null);
    } catch {
      /* non-fatal */
    }
  }, []);

  const loadHistory = useCallback(
    async (sessionId: string, channel: "public" | "backstage") => {
      try {
        const res = await fetch(
          `/api/live-chat/messages?session=${sessionId}&channel=${channel}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.messages ?? []) as ChatMessage[];
        if (channel === "public") setMessages(list);
        else setBackstage(list);
      } catch {
        /* non-fatal */
      }
    },
    [],
  );

  useEffect(() => {
    if (!live) {
      setLoading(false);
      return;
    }
    void loadSession();
    void loadMe();
  }, [live, loadSession, loadMe]);

  useEffect(() => {
    if (session) void loadHistory(session.id, "public");
  }, [session, loadHistory]);

  useEffect(() => {
    if (session && isHost) void loadHistory(session.id, "backstage");
  }, [session, isHost, loadHistory]);

  // ── Realtime ──────────────────────────────────────────────────────────────

  const handleMessage = useCallback((message: ChatMessage) => {
    if (message.channel === "backstage") {
      setBackstage((prev) => mergeMessage(prev, message));
      return;
    }
    if (message.channel === "public") {
      setMessages((prev) => mergeMessage(prev, message));
    }
  }, []);

  const handleHide = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setBackstage((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleState = useCallback((state: ChatState) => {
    setSession((prev) => (prev ? { ...prev, state } : prev));
  }, []);

  const { viewers } = useLiveChat({
    topic: topics?.public ?? null,
    onMessage: handleMessage,
    onHide: handleHide,
    onState: handleState,
    withPresence: true,
  });

  // Hosts hold a second subscription: the moderation channel carries held
  // messages and backstage traffic that never touch the public topic.
  useLiveChat({
    topic: isHost ? (topics?.host ?? null) : null,
    onMessage: handleMessage,
    onHide: handleHide,
    onState: handleState,
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  const setName = useCallback(async (name: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/live-chat/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) return data.error ?? "Couldn't save that name.";
      setGuest(data.guest);
      return null;
    } catch {
      return "Couldn't save that name.";
    }
  }, []);

  const send = useCallback(
    async (channel: "public" | "backstage", body: string): Promise<string | null> => {
      if (!session) return "The chat isn't open.";
      try {
        const res = await fetch("/api/live-chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: session.id, channel, body }),
        });
        const data = await res.json();
        if (!res.ok) return data.error ?? "Couldn't send that.";
        // Echo our own copy immediately; the channel will send the same id and
        // mergeMessage dedupes it.
        if (data.message) {
          const own = { ...data.message, status: data.held ? "held" : "visible" } as ChatMessage;
          handleMessage(own);
        }
        return null;
      } catch {
        return "Couldn't send that.";
      }
    },
    [session, handleMessage],
  );

  const moderate = useCallback(
    async (message: ChatMessage, action: "hide" | "mute" | "approve") => {
      try {
        const res = await fetch("/api/admin/live-chat/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, message: message.id }),
        });
        if (!res.ok) return;
        if (action === "approve") {
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? { ...m, status: "visible" } : m)),
          );
        } else {
          handleHide(message.id);
        }
      } catch {
        /* the channel will correct us on the next event */
      }
    },
    [handleHide],
  );

  const setChatState = useCallback(
    async (state: ChatState) => {
      if (!session) return;
      try {
        await fetch("/api/admin/live-chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: session.id, state }),
        });
        setSession((prev) => (prev ? { ...prev, state } : prev));
      } catch {
        /* non-fatal */
      }
    },
    [session],
  );

  const submitPrayer = useCallback(
    async (name: string, body: string): Promise<string | null> => {
      if (!session) return "The chat isn't open.";
      try {
        const res = await fetch("/api/live-chat/prayer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: session.id, name, body }),
        });
        const data = await res.json();
        if (!res.ok) return data.error ?? "Couldn't send that just now.";
        return null;
      } catch {
        return "Couldn't send that just now.";
      }
    },
    [session],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  // No stream, no room, no panel. Nothing to moderate and nothing to say.
  if (!live || (!loading && !session)) return null;

  if (loading) {
    return (
      <div className="flex h-[560px] w-full items-center justify-center rounded-3xl border border-black/[0.07] bg-white lg:w-[380px] lg:shrink-0">
        <span className="material-symbols-rounded animate-spin text-2xl text-destiny-grey/30">
          progress_activity
        </span>
      </div>
    );
  }

  const activeMessages = tab === "backstage" ? backstage : messages;

  return (
    <>
      {/* Width lives here rather than on a wrapper in page.tsx: this component
          returns null when there's no room to join, and a wrapper would go on
          holding the space open. */}
      <div className="flex h-[560px] w-full flex-col overflow-hidden rounded-3xl border border-black/[0.07] bg-white lg:h-[620px] lg:w-[380px] lg:shrink-0">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-black/5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-black text-destiny-grey">Live chat</p>
            <p className="text-[11px] text-destiny-grey/45">
              {viewers > 0
                ? `${viewers} here now`
                : "Watching together"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPrayerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            <span className="material-symbols-rounded text-base">favorite</span>
            Prayer
          </button>

          {isHost ? (
            <HostControls state={session!.state} onSetState={setChatState} />
          ) : (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-destiny-grey/60 transition hover:border-destiny-orange hover:text-destiny-orange"
            >
              Log in
            </button>
          )}
        </div>

        {/* Host tabs */}
        {isHost && (
          <div className="flex shrink-0 gap-1 border-b border-black/5 px-3 py-2">
            <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
              Public
            </TabButton>
            <TabButton active={tab === "backstage"} onClick={() => setTab("backstage")}>
              Backstage
            </TabButton>
          </div>
        )}

        <ChatMessageList
          messages={activeMessages}
          isHost={isHost}
          onModerate={isHost ? moderate : undefined}
          emptyHint={
            tab === "backstage"
              ? "Backstage is quiet — only hosts can see this."
              : "No messages yet — say hello."
          }
        />

        <ChatComposer
          guestName={guest?.name ?? null}
          isHost={isHost}
          hostName={hostName}
          state={session!.state}
          onSetName={setName}
          onSend={(body) => send(tab === "backstage" ? "backstage" : "public", body)}
          placeholder={
            tab === "backstage" ? "Message the team…" : "Say something…"
          }
        />
      </div>

      <HostLoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSignedIn={() => {
          void loadMe();
          void loadSession();
        }}
      />

      <PrayerRequestModal
        open={prayerOpen}
        onClose={() => setPrayerOpen(false)}
        defaultName={guest?.name ?? hostName ?? null}
        onSubmit={submitPrayer}
      />
    </>
  );
}

function HostControls({
  state,
  onSetState,
}: {
  state: ChatState;
  onSetState: (state: ChatState) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSetState(state === "paused" ? "open" : "paused")}
        title={state === "paused" ? "Resume the chat" : "Pause the chat"}
        aria-label={state === "paused" ? "Resume the chat" : "Pause the chat"}
        className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-orange"
      >
        <span className="material-symbols-rounded text-lg">
          {state === "paused" ? "play_arrow" : "pause"}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onSetState("closed")}
        title="Close the chat"
        aria-label="Close the chat"
        className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-red"
      >
        <span className="material-symbols-rounded text-lg">block</span>
      </button>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-destiny-orange/10 text-destiny-orange"
          : "text-destiny-grey/50 hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}
