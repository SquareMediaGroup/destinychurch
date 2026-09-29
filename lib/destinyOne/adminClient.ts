// Destiny One admin pages — one way to call /api/admin/destiny-one/* for a
// mutation and get back either data or the server's own error sentence (the
// SQL rules phrase theirs for people: "A group needs at least 2 verified
// adults."), so pages show that instead of a generic failure.

import { ADMIN_API } from "@/lib/destinyOne/adminTypes";

export type SendResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function adminSend<T = unknown>(
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<SendResult<T>> {
  try {
    const res = await fetch(`${ADMIN_API}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok) return { ok: false, error: json?.error ?? `Something went wrong (${res.status}).` };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
