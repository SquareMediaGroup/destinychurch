"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

/**
 * Shown by both board detail pages (app/media/b/[slug], app/media/s/[token])
 * in place of the gallery when the board has a password and this visitor
 * hasn't unlocked it yet. On success, router.refresh() re-runs the server
 * component now that the unlock cookie is set, revealing the real page.
 */
export default function BoardPasswordGate({ boardId, boardTitle }: { boardId: string; boardTitle: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/media/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong — please try again.");
      setSubmitting(false);
      return;
    }
    router.refresh();
  }

  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-white px-4 pt-20">
      <div className="w-full max-w-sm text-center">
        <span className="material-symbols-rounded mb-3 text-4xl text-destiny-orange">lock</span>
        <h1 className="mb-2 text-2xl font-black text-destiny-grey">{boardTitle}</h1>
        <p className="mb-6 text-sm text-destiny-grey/60">
          This board needs a password to view.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            placeholder="Password"
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-center text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15"
          />
          {error && <p className="text-sm font-medium text-destiny-red">{error}</p>}
          <Button type="submit" variant="primary" disabled={submitting} fullWidth>
            {submitting ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </div>
    </section>
  );
}
