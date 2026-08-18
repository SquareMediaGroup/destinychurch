"use client";

// Asking for prayer.
//
// The copy here matters more than the code. Someone opening this during a
// service may be about to say something difficult, and the two things they need
// to know before typing are: who reads it, and whether it goes on screen. Both
// are said plainly, above the box rather than under it.

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

const MAX_LENGTH = 1000;

export default function PrayerRequestModal({
  open,
  onClose,
  defaultName,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string | null;
  onSubmit: (name: string, body: string) => Promise<string | null>;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (defaultName) setName(defaultName);
  }, [defaultName]);

  // Reset on open, so a second request doesn't start on the last one's thank-you.
  useEffect(() => {
    if (open) {
      setSent(false);
      setError(null);
      setBody("");
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !body.trim()) return;

    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(name.trim(), body.trim());
      if (result) {
        setError(result);
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request prayer"
      description="Only the church prayer team sees this. It never appears in the chat."
      size="sm"
      closeOnBackdrop={false}
    >
      {sent ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
            <span className="material-symbols-rounded text-2xl text-destiny-orange">
              favorite
            </span>
          </div>
          <p className="font-black text-destiny-grey">Thank you</p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-destiny-grey/60">
            Someone from the team is praying for this. If you&apos;d like a person
            to get back to you, fill in a connect card and we will.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-2xl bg-destiny-orange px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
          >
            Back to the service
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="prayer-name"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45"
            >
              Your name
            </label>
            <input
              id="prayer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              placeholder="First name is fine"
              className="w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>

          <div>
            <label
              htmlFor="prayer-body"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45"
            >
              What can we pray for?
            </label>
            <textarea
              id="prayer-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={MAX_LENGTH}
              required
              placeholder="Say as much or as little as you like."
              className="w-full resize-none rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm leading-relaxed text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
            />
            <p className="mt-1 text-right text-[11px] text-destiny-grey/35">
              {body.length}/{MAX_LENGTH}
            </p>
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-xs font-bold text-destiny-red">
              <span className="material-symbols-rounded text-sm">error</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="rounded-2xl bg-destiny-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send to the prayer team"}
          </button>

          <p className="text-center text-xs leading-relaxed text-destiny-grey/40">
            In an emergency, please contact your GP or call 999. If you need to
            talk to someone now, the Samaritans are on 116 123, free, at any hour.
          </p>
        </form>
      )}
    </Modal>
  );
}
