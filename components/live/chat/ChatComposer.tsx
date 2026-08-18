"use client";

// Typing a message, and — for a guest who hasn't yet — picking a name first.
//
// Both live in one component because they are one action from the visitor's
// side. The alternative, a modal that demands a name before showing the chat, is
// exactly the "sign up to watch" friction this feature was asked not to have.
// So the chat is readable immediately, the name field sits inline above the
// message box, and the first send does both in sequence.

import { useEffect, useRef, useState } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/liveChatModeration";

export default function ChatComposer({
  guestName,
  isHost,
  hostName,
  state,
  onSetName,
  onSend,
  placeholder = "Say something…",
}: {
  guestName: string | null;
  isHost: boolean;
  hostName?: string | null;
  state: "closed" | "open" | "paused";
  onSetName: (name: string) => Promise<string | null>;
  onSend: (body: string) => Promise<string | null>;
  placeholder?: string;
}) {
  const [name, setName] = useState(guestName ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (guestName) setName(guestName);
  }, [guestName]);

  const needsName = !isHost && !guestName;
  const paused = state === "paused" && !isHost;
  const closed = state === "closed";

  if (closed) {
    return (
      <p className="border-t border-black/5 px-4 py-4 text-center text-sm text-destiny-grey/45">
        The chat is closed.
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const text = body.trim();
    if (!text) return;

    setBusy(true);
    setError(null);

    try {
      // Claim the name first — a message sent under a rejected name would be
      // attributed to nobody.
      if (needsName) {
        const nameError = await onSetName(name.trim());
        if (nameError) {
          setError(nameError);
          return;
        }
      }

      const sendError = await onSend(text);
      if (sendError) {
        setError(sendError);
        return;
      }

      setBody("");
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-black/5 px-4 py-3">
      {paused && (
        <p className="mb-2.5 flex items-center gap-2 rounded-xl bg-destiny-orange/10 px-3 py-2 text-xs font-bold text-destiny-orange">
          <span className="material-symbols-rounded text-base">pause_circle</span>
          A host has paused the chat
        </p>
      )}

      {needsName && (
        <div className="mb-2">
          <label htmlFor="chat-name" className="sr-only">
            Your name
          </label>
          <input
            id="chat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            required
            placeholder="Your name"
            autoComplete="nickname"
            className="w-full rounded-xl border border-black/10 bg-[#f5f7fa] px-3 py-2 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/35 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/15"
          />
        </div>
      )}

      {isHost && hostName && (
        <p className="mb-1.5 text-[11px] text-destiny-grey/40">
          Posting as <span className="font-bold text-destiny-orange">{hostName}</span> (Host)
        </p>
      )}

      <div className="flex items-end gap-2">
        <label htmlFor="chat-body" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-body"
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line — chat convention, and on
            // a phone the on-screen return key still inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(e);
            }
          }}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={paused || busy}
          placeholder={paused ? "Chat paused" : placeholder}
          className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-black/10 bg-[#f5f7fa] px-3 py-2.5 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/35 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={paused || busy || !body.trim()}
          aria-label="Send message"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-destiny-orange text-white transition hover:brightness-110 disabled:opacity-40"
        >
          <span className="material-symbols-rounded text-xl">
            {busy ? "progress_activity" : "send"}
          </span>
        </button>
      </div>

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-bold text-destiny-red">
          <span className="material-symbols-rounded text-sm">error</span>
          {error}
        </p>
      )}

      {needsName && !error && (
        <p className="mt-2 text-[11px] text-destiny-grey/40">
          No account needed — your name is only used to label your messages.
        </p>
      )}
    </form>
  );
}
