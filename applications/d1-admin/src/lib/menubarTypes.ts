// The messages between the main window and the menu bar popover. The popover
// holds no session of its own (two windows refreshing one Supabase session
// would race), so the main window sends it what to show and acts for it.

import type { AdminPage } from "@/lib/nav";

export interface MenubarState {
  signedIn: boolean;
  attention: { key: string; label: string; count: number | null; accent: boolean; action: string | null; target: MenubarTarget }[];
  unread: { groupId: string; name: string; initials: string; announcements: boolean; count: number; line: string }[];
  pausedUntil: number;
}

export type MenubarTarget = { kind: "admin"; page: AdminPage } | { kind: "group"; groupId: string };

export const MENUBAR_STATE = "d1:menubar-state";
export const MENUBAR_HELLO = "d1:menubar-hello";
export const MENUBAR_OPEN = "d1:menubar-open";
export const MENUBAR_REPLY = "d1:menubar-reply";
export const MENUBAR_PAUSE = "d1:menubar-pause";
