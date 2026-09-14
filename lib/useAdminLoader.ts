"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Owns the loading/error lifecycle for an admin page that fetches its data on
 * mount and re-fetches after mutations.
 *
 * Every HR page grew its own copy of this, and the copies disagreed on failure.
 * Half wrapped the fetch in `try { … } finally { setLoading(false) }`, which at
 * least cleared the spinner but left the page silently empty with no clue why.
 * The other half awaited a bare `Promise.all([...])`: one non-OK response (an
 * expired admin session returning an HTML error page, say) made `res.json()`
 * throw, `setLoading(false)` never ran, and the page span forever.
 *
 * Here the fetching function only has to fetch and set its own state. Clearing
 * the spinner and surfacing the failure are this hook's job, and it does both on
 * every path.
 *
 * `fetcher` must be referentially stable — wrap it in useCallback — since it is
 * what re-triggers the load.
 */
export interface AdminLoaderState {
  loading: boolean;
  error: string;
  setError: (message: string) => void;
  /** Re-runs the fetcher; safe to call from event handlers after a mutation. */
  reload: () => void;
}

export function useAdminLoader(fetcher: () => Promise<void>): AdminLoaderState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Guards against a state update after the admin navigates away mid-flight,
    // and against an earlier slow response overwriting a newer one.
    let cancelled = false;

    fetcher()
      .then(() => {
        if (!cancelled) setError("");
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error("Admin page failed to load its data", cause);
        setError("Could not load this page. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { loading, error, setError, reload };
}

/**
 * Fetches JSON and fails loudly on a non-OK response.
 *
 * `res.json()` on an error response either throws something opaque ("Unexpected
 * token '<'") or, worse, parses a `{ error: … }` body into something the caller
 * treats as data. Checking `res.ok` first gives useAdminLoader an error worth
 * logging.
 */
export async function fetchAdminJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** As fetchAdminJson, but guarantees an array so callers can drop the Array.isArray dance. */
export async function fetchAdminArray<T>(url: string): Promise<T[]> {
  const data = await fetchAdminJson<unknown>(url);
  return Array.isArray(data) ? (data as T[]) : [];
}
