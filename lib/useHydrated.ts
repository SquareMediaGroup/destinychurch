"use client";

// True once React has hydrated on the client, false during the server render.
//
// Anything that reaches for document.body — createPortal, in our case — has to
// wait for that. The usual `useState(false)` + `useEffect(() => setMounted(true))`
// does the job but is a setState inside an effect body, which is exactly what
// the lint rule (and React's own guidance) asks us not to write.
//
// useSyncExternalStore has the answer built in: the server snapshot is false,
// the client snapshot is true, and React swaps them at hydration without a
// cascading render. Nothing ever changes afterwards, so the subscribe function
// has nothing to subscribe to.

import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(NEVER_CHANGES, onClient, onServer);
}
