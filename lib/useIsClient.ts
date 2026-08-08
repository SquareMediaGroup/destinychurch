"use client";

import { useSyncExternalStore } from "react";

/** Never fires — "are we on the client" is not a value that changes. */
const subscribe = () => () => {};

/**
 * False during server rendering and the hydrating render, true afterwards.
 *
 * Guards `createPortal(…, document.body)`, which needs a DOM that does not exist
 * on the server. `useState(false)` plus an effect would do the same job, but it
 * is a synchronous setState in an effect — a cascading render, and one the React
 * lint rules reject. `useSyncExternalStore` expresses the same idea as what it
 * actually is: a value read from outside React that differs between the server
 * and client snapshots.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
