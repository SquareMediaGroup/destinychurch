"use client";

// The transcript.
//
// Two behaviours carry most of the weight here:
//
//   Sticky-bottom scrolling that isn't rude. A chat that always jumps to the
//   newest message yanks the page out from under anyone reading back through it.
//   So it follows the bottom only while you're already at the bottom, and shows
//   a "jump to latest" button otherwise.
//
//   Held messages are visible to their author alone. The server only ever sends
//   a held message to the person who wrote it (lib/liveChat.server.ts), and here
//   it's marked as waiting rather than hidden — so they don't retype it, which
//   is the whole reason for holding rather than rejecting.

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./useLiveChat";

const BOTTOM_SLACK_PX = 60;

export default function ChatMessageList({
  messages,
  isHost,
  onModerate,
  emptyHint,
}: {
  messages: ChatMessage[];
  isHost: boolean;
  onModerate?: (message: ChatMessage, action: "hide" | "mute" | "approve") => void;
  emptyHint?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stuckToBottom, setStuckToBottom] = useState(true);

  useEffect(() => {
    if (!stuckToBottom) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, stuckToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStuckToBottom(distance <= BOTTOM_SLACK_PX);
  };

  const jumpToLatest = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setStuckToBottom(true);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
        aria-label="Live chat messages"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-destiny-grey/40">
            {emptyHint ?? "No messages yet — say hello."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                isHost={isHost}
                onModerate={onModerate}
              />
            ))}
          </ul>
        )}
      </div>

      {!stuckToBottom && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-destiny-grey px-4 py-1.5 text-xs font-bold text-white shadow-lg transition hover:brightness-125"
        >
          Jump to latest
        </button>
      )}
    </div>
  );
}

function MessageRow({
  message,
  isHost,
  onModerate,
}: {
  message: ChatMessage;
  isHost: boolean;
  onModerate?: (message: ChatMessage, action: "hide" | "mute" | "approve") => void;
}) {
  const held = message.status === "held";
  const fromHost = message.authorKind === "host";

  return (
    <li
      className={`group rounded-2xl px-3 py-2 transition ${
        held ? "bg-destiny-orange/[0.07]" : "hover:bg-black/[0.03]"
      }`}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={`text-sm font-black ${
            fromHost ? "text-destiny-orange" : "text-destiny-grey"
          }`}
        >
          {message.displayName}
        </span>

        {fromHost && (
          <span className="rounded-full bg-destiny-orange px-1.5 py-px text-[10px] font-black uppercase tracking-wide text-white">
            Host
          </span>
        )}

        <span className="text-[11px] text-destiny-grey/35">
          {formatTime(message.createdAt)}
        </span>

        {isHost && onModerate && (
          <span className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            {held && (
              <ModButton
                label="Approve"
                icon="check"
                onClick={() => onModerate(message, "approve")}
              />
            )}
            <ModButton
              label="Delete"
              icon="delete"
              onClick={() => onModerate(message, "hide")}
            />
            {message.authorKind === "guest" && (
              <ModButton
                label="Mute"
                icon="voice_over_off"
                onClick={() => onModerate(message, "mute")}
              />
            )}
          </span>
        )}
      </div>

      <p className="mt-0.5 break-words text-sm leading-relaxed text-destiny-grey/85">
        {message.body}
      </p>

      {held && (
        <p className="mt-1 text-[11px] font-bold text-destiny-orange">
          {isHost
            ? `Waiting for approval${message.heldReason ? ` — ${message.heldReason}` : ""}`
            : "Waiting to be approved by a host"}
        </p>
      )}
    </li>
  );
}

function ModButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange/40"
    >
      <span className="material-symbols-rounded text-base">{icon}</span>
    </button>
  );
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date(iso))
      .replace(/\s/g, "")
      .toLowerCase();
  } catch {
    return "";
  }
}
