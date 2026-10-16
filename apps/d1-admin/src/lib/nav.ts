// What's on screen: a chat, or an admin page. A tiny store rather than a
// router, because there are no URLs to keep in a desktop app; the menu bar
// popover and notifications drive it through the same functions.

import { useSyncExternalStore } from "react";

export type AdminPage = "reports" | "requests" | "paused" | "people" | "invites" | "communities" | "feedback" | "settings" | "audit";

export type View = { kind: "chat"; groupId: string | null } | { kind: "admin"; page: AdminPage; id?: string | number };

export type Sheet =
  | { kind: "settings" }
  | { kind: "shortcuts" }
  | { kind: "newGroup"; communityId?: string }
  | { kind: "addPeople"; groupId: string }
  | { kind: "report"; messageId: number; sender: string; body: string }
  | { kind: "delete"; messageId: number; groupId: string }
  | { kind: "leave"; groupId: string; name: string };

interface NavState {
  view: View;
  query: string;
  infoOpen: boolean;
  sheet: Sheet | null;
}

let state: NavState = { view: { kind: "chat", groupId: null }, query: "", infoOpen: true, sheet: null };
const listeners = new Set<() => void>();

function set(patch: Partial<NavState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function useNav(): NavState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const nav = {
  openGroup: (groupId: string) => set({ view: { kind: "chat", groupId }, query: "" }),
  openAdmin: (page: AdminPage, id?: string | number) => set({ view: { kind: "admin", page, id }, query: "" }),
  setQuery: (query: string) => set({ query }),
  toggleInfo: () => set({ infoOpen: !state.infoOpen }),
  showInfo: () => set({ infoOpen: true }),
  openSheet: (sheet: Sheet) => set({ sheet }),
  closeSheet: () => set({ sheet: null }),
  get: () => state,
};
