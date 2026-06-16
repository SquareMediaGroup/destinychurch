"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Shown in place of a sub-group's content until the correct password is entered.
// On success the server sets a signed unlock cookie and we refresh the route,
// which then renders the real content server-side.
export default function PasswordGate({
  subgroupId,
  categoryName,
  subgroupName,
}: {
  subgroupId: string;
  categoryName: string;
  subgroupName: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/training/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subgroupId, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Incorrect password.");
      setPassword("");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 lg:px-8">
      <div className="rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destiny-orange/10 text-destiny-orange">
          <span className="material-symbols-rounded text-[28px]">lock</span>
        </div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">
          {categoryName}
        </p>
        <h1 className="text-2xl font-black text-destiny-grey">{subgroupName}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-destiny-grey/55">
          This training group is password protected. Enter the password your team
          leader gave you to continue.
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-center text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15"
          />
          {error && <p className="text-sm font-bold text-destiny-red">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="rounded-full bg-destiny-orange px-6 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
