// The menu bar popover (MenuBar.dc.html in the design): what needs
// attention, unread chats with a quick reply, and the app's controls.
//
// It has no session of its own; the main window sends it what to show
// (src/lib/live.ts) and does what it asks.

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { MENUBAR_HELLO, MENUBAR_OPEN, MENUBAR_PAUSE, MENUBAR_REPLY, MENUBAR_STATE, type MenubarState, type MenubarTarget } from "@/lib/menubarTypes";
import { emitTo, hideMenubar, listenTo, quitApp, showMain } from "@/lib/native";

const EMPTY: MenubarState = { signedIn: false, attention: [], unread: [], pausedUntil: 0 };

function iconFor(key: string): IconName {
  if (key === "reports") return "flag";
  if (key === "requests") return "personAdd";
  return "pause";
}

export function MenuBar() {
  const [state, setState] = useState<MenubarState>(EMPTY);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const off = listenTo<MenubarState>(MENUBAR_STATE, setState);
    void emitTo(MENUBAR_HELLO, null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void hideMenubar();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      void off.then((f) => f());
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const open = (t: MenubarTarget) => {
    void emitTo(MENUBAR_OPEN, t);
    void hideMenubar();
  };
  const paused = state.pausedUntil > Date.now();

  return (
    <div style={{ margin: 6, borderRadius: 14, background: "var(--sheet)", boxShadow: "0 18px 50px rgba(0,0,0,0.3), 0 0 0 0.5px var(--sep)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 12px)" }}>
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>D1 Admin</span>
        {paused && <span className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Notifications paused</span>}
      </div>
      <div className="scroll" style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 2, minHeight: 0 }}>
        {!state.signedIn && <p className="subtle" style={{ padding: "4px 8px 8px" }}>Open D1 Admin to sign in.</p>}
        {state.signedIn && state.attention.length > 0 && (
          <>
            <div className="label-caps" style={{ padding: "4px 8px" }}>Needs attention</div>
            {state.attention.map((a) => (
              <button key={a.key} className="row" onClick={() => open(a.target)} style={{ borderRadius: 8, display: "flex", alignItems: "center", gap: 10, padding: 8 }}>
                <Icon name={iconFor(a.key)} />
                <span className="ellipsis" style={{ flex: 1, fontSize: 13 }}>{a.label}</span>
                {a.count !== null && <span className={`badge${a.accent ? "" : " quiet"}`}>{a.count}</span>}
                {a.action && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tint)" }}>{a.action}</span>}
              </button>
            ))}
            <div style={{ height: 0.5, background: "var(--sep)", margin: "6px 8px" }} />
          </>
        )}
        {state.signedIn && (
          <>
            <div className="label-caps" style={{ padding: "4px 8px" }}>Unread</div>
            {state.unread.length === 0 && <p className="subtle" style={{ padding: "4px 8px 8px", fontSize: 12 }}>You're all caught up.</p>}
            {state.unread.map((u) => (
              <div key={u.groupId} style={{ display: "flex", flexDirection: "column" }}>
                <button className="row" onClick={() => open({ kind: "group", groupId: u.groupId })} style={{ borderRadius: 8, display: "flex", alignItems: "center", gap: 10, padding: 8 }}>
                  <Avatar name={u.name} size={30} square ann={u.announcements} />
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name} <span className="subtle" style={{ fontWeight: 400 }}>· {u.count}</span></span>
                    <span className="muted ellipsis" style={{ fontSize: 12 }}>{u.line}</span>
                  </div>
                </button>
                {!u.announcements && (replyTo === u.groupId ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!draft.trim()) return;
                      void emitTo(MENUBAR_REPLY, { groupId: u.groupId, body: draft.trim() });
                      setDraft("");
                      setReplyTo(null);
                    }}
                    style={{ margin: "0 8px 4px" }}
                  >
                    <input className="input" autoFocus placeholder={`Reply to ${u.name}`} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => !draft && setReplyTo(null)} style={{ height: 32, borderRadius: 8, background: "var(--fill)" }} />
                  </form>
                ) : (
                  <button onClick={() => setReplyTo(u.groupId)} style={{ margin: "0 8px 4px", height: 32, borderRadius: 8, border: 0, background: "var(--fill)", textAlign: "left", padding: "0 10px", fontSize: 13, color: "var(--subtle)" }}>Reply to {u.name}</button>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
      <div style={{ borderTop: "0.5px solid var(--sep)", padding: "6px 8px", display: "flex", flexDirection: "column" }}>
        <button className="row" onClick={() => { void showMain(); }} style={{ height: 30, borderRadius: 6, fontSize: 13, padding: "0 8px" }}>Open D1 Admin</button>
        {state.signedIn && (
          <button className="row" onClick={() => void emitTo(MENUBAR_PAUSE, null)} style={{ height: 30, borderRadius: 6, fontSize: 13, padding: "0 8px" }}>
            {paused ? "Resume notifications" : "Pause notifications for 1 hour"}
          </button>
        )}
        <button className="row" onClick={() => void quitApp()} style={{ height: 30, borderRadius: 6, fontSize: 13, padding: "0 8px" }}>Quit D1 Admin</button>
      </div>
    </div>
  );
}
