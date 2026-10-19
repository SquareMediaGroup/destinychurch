// Keyboard shortcuts for the main window. One listener, so the list in the
// shortcuts sheet (SHORTCUTS) and what actually happens can't drift apart.
//
// Cmd is the Mac's command key. Nothing here fires while a sheet is open
// (the sheet owns the keyboard), and the digit shortcuts work from inside the
// message box because Cmd-digit never types anything.

import { useEffect } from "react";
import { orderedGroups, useCommunities } from "@/lib/chat";
import { nav } from "@/lib/nav";

export const SHORTCUTS: { keys: string; does: string }[] = [
  { keys: "Cmd K", does: "Search messages and groups" },
  { keys: "Cmd N", does: "New group" },
  { keys: "Cmd 1 to 9", does: "Open the 1st to 9th chat in the list" },
  { keys: "Option Up / Down", does: "Previous or next chat" },
  { keys: "Cmd I", does: "Show or hide group info" },
  { keys: "Cmd ,", does: "Settings" },
  { keys: "Cmd /", does: "This list" },
  { keys: "Up (empty message box)", does: "Reply to the latest message" },
  { keys: "Esc", does: "Close a menu or sheet, clear search, cancel a reply" },
  { keys: "Return / Shift Return", does: "Send / new line" },
];

function typingInto(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

export function useShortcuts(canCreateGroup: boolean) {
  const communities = useCommunities();

  useEffect(() => {
    const groups = orderedGroups(communities.data);

    const openAt = (i: number) => {
      const g = groups[i];
      if (g) nav.openGroup(g.id);
    };
    const step = (dir: 1 | -1) => {
      if (groups.length === 0) return;
      const { view } = nav.get();
      const at = view.kind === "chat" ? groups.findIndex((g) => g.id === view.groupId) : -1;
      openAt(at < 0 ? (dir === 1 ? 0 : groups.length - 1) : (at + dir + groups.length) % groups.length);
    };

    const onKey = (e: KeyboardEvent) => {
      if (nav.get().sheet) return; // a sheet is open; it handles Escape itself
      const cmd = e.metaKey && !e.ctrlKey && !e.altKey;

      if (cmd && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const input = document.getElementById("sidebar-search") as HTMLInputElement | null;
        input?.focus();
        input?.select();
      } else if (cmd && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (canCreateGroup) nav.openSheet({ kind: "newGroup" });
      } else if (cmd && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        openAt(Number(e.key) - 1);
      } else if (cmd && e.key.toLowerCase() === "i") {
        e.preventDefault();
        nav.toggleInfo();
      } else if (cmd && e.key === ",") {
        e.preventDefault();
        nav.openSheet({ kind: "settings" });
      } else if (cmd && e.key === "/") {
        e.preventDefault();
        nav.openSheet({ kind: "shortcuts" });
      } else if (e.altKey && !e.metaKey && !e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        step(e.key === "ArrowDown" ? 1 : -1);
      } else if (e.key === "Escape" && !typingInto(e.target) && nav.get().query) {
        nav.setQuery("");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [communities.data, canCreateGroup]);
}
