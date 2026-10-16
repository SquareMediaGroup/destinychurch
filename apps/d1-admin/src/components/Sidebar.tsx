// The sidebar from the design: search, filters, the Admin section (only the
// pages this person's roles open), then each community and its groups.

import { useState } from "react";
import { D1_ROLE_LABELS, topRole, type D1GroupSummary } from "@destiny/shared";
import { Icon, type IconName } from "@/components/Icon";
import { Avatar } from "@/components/ui";
import { usePausedGroups, usePending, useReports } from "@/lib/adminData";
import { sortGroups, useCommunities } from "@/lib/chat";
import { shortTime } from "@/lib/format";
import { nav, useNav, type AdminPage } from "@/lib/nav";
import { useReady } from "@/lib/session";

type Filter = "All" | "Unread" | "Announcements";

const ADMIN_NAV: { page: AdminPage; label: string; icon: IconName; role: "safeguarding" | "d1" }[] = [
  { page: "reports", label: "Reports", icon: "flag", role: "safeguarding" },
  { page: "requests", label: "Access requests", icon: "personAdd", role: "d1" },
  { page: "paused", label: "Paused groups", icon: "pause", role: "safeguarding" },
  { page: "people", label: "People", icon: "people", role: "d1" },
  { page: "invites", label: "Invites", icon: "mail", role: "d1" },
  { page: "communities", label: "Communities", icon: "layers", role: "d1" },
  { page: "feedback", label: "Feedback", icon: "inbox", role: "d1" },
  { page: "audit", label: "Audit log", icon: "clock", role: "safeguarding" },
  { page: "settings", label: "App settings", icon: "sliders", role: "d1" },
];

function GroupRow({ g, current }: { g: D1GroupSummary; current: boolean }) {
  const frozen = g.state === "frozen";
  const unread = g.unreadCount > 0;
  const last = g.lastMessage;
  const line = !last ? "No messages yet" : last.deleted ? "Message deleted" : last.preview ?? (last.hasAttachment ? "File" : "");
  return (
    <button
      className="row"
      onClick={() => nav.openGroup(g.id)}
      aria-current={current ? "page" : undefined}
      style={{ width: "100%", borderRadius: 9, background: current ? "var(--sel)" : "transparent", display: "flex", alignItems: "center", gap: 10, padding: 8 }}
    >
      <Avatar name={g.name} size={36} square ann={g.kind === "announcements"} url={g.iconUrl} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="ellipsis" style={{ flex: 1, fontSize: 13, fontWeight: unread ? 700 : 500 }}>{g.name}</span>
          <span style={{ fontSize: 11, color: unread ? "var(--tint)" : "var(--subtle)", flex: "none" }}>{shortTime(last?.createdAt)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {frozen ? (
            <span className="ellipsis" style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--tint)" }}>Paused · needs another adult</span>
          ) : (
            <span className="ellipsis" style={{ flex: 1, fontSize: 12, color: "var(--muted)", fontStyle: last?.deleted ? "italic" : "normal" }}>
              {last?.senderName ? `${last.senderName.split(" ")[0]}: ` : ""}
              {line}
            </span>
          )}
          {g.muted && <Icon name="bellOff" size={13} stroke={2} label="Muted" color="var(--subtle)" />}
          {unread && <span className="badge">{g.unreadCount}</span>}
        </div>
      </div>
    </button>
  );
}

export function Sidebar() {
  const { me, roles, leader } = useReady();
  const { view, query } = useNav();
  const communities = useCommunities();
  const reports = useReports("open", roles.safeguardingAdmin);
  const pending = usePending(roles.destinyOneAdmin);
  const paused = usePausedGroups(roles.safeguardingAdmin);
  const [filter, setFilter] = useState<Filter>("All");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const counts: Partial<Record<AdminPage, number>> = {
    reports: reports.data?.length ?? 0,
    requests: pending.data?.filter((m) => m.requestSubmittedAt).length ?? 0,
    paused: paused.data?.length ?? 0,
  };
  const adminNav = ADMIN_NAV.filter((n) => (n.role === "safeguarding" ? roles.safeguardingAdmin : roles.destinyOneAdmin));
  const role = topRole(me.roles);
  const roleLine = [
    roles.destinyOneAdmin ? "D1 Admin" : null,
    roles.safeguardingAdmin ? "Safeguarding" : null,
    !roles.destinyOneAdmin && !roles.safeguardingAdmin && role ? D1_ROLE_LABELS[role] : null,
  ].filter(Boolean).join(" · ");

  return (
    <nav aria-label="Groups" style={{ width: 286, flex: "none", display: "flex", flexDirection: "column", background: "var(--side)", borderRight: "0.5px solid var(--sep)", minHeight: 0 }}>
      <div className="drag" data-tauri-drag-region style={{ height: 52, flex: "none", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 12px 0 20px" }}>
        {leader && (
          <button className="ib" onClick={() => nav.openSheet({ kind: "newGroup" })} aria-label="New group">
            <Icon name="compose" size={18} />
          </button>
        )}
      </div>

      <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        <label style={{ height: 32, borderRadius: 8, background: "var(--fill2)", display: "flex", alignItems: "center", gap: 7, padding: "0 10px", color: "var(--subtle)" }}>
          <Icon name="search" size={15} stroke={2} />
          <input
            id="sidebar-search"
            aria-label="Search messages and groups"
            placeholder="Search"
            value={query}
            onChange={(e) => nav.setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") nav.setQuery("");
            }}
            style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontSize: 13, padding: 0 }}
          />
          {query && (
            <button onClick={() => nav.setQuery("")} aria-label="Clear search" style={{ width: 18, height: 18, border: 0, borderRadius: 9, background: "var(--subtle)", color: "var(--side)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              <Icon name="x" size={10} stroke={3.2} />
            </button>
          )}
        </label>
        <div role="group" aria-label="Filter" style={{ display: "flex", gap: 6 }}>
          {(["All", "Unread", "Announcements"] as Filter[]).map((f) => (
            <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, padding: "0 8px 12px" }}>
        {adminNav.length > 0 && (
          <div style={{ paddingTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>
            <div className="label-caps" style={{ height: 28, display: "flex", alignItems: "center", padding: "0 8px" }}>Admin</div>
            {adminNav.map((n) => {
              const current = view.kind === "admin" && view.page === n.page && !query;
              const count = counts[n.page] ?? 0;
              return (
                <button
                  key={n.page}
                  className="row"
                  onClick={() => nav.openAdmin(n.page)}
                  aria-current={current ? "page" : undefined}
                  style={{ height: 32, borderRadius: 8, background: current ? "var(--sel)" : "transparent", display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}
                >
                  <span style={{ color: "var(--text2)", display: "flex" }}><Icon name={n.icon} /></span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{n.label}</span>
                  {count > 0 && <span className={`badge${n.page === "reports" ? "" : " quiet"}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}

        {communities.isLoading && <div className="subtle" style={{ padding: "12px 10px", fontSize: 12 }}>Loading groups…</div>}
        {communities.error && <div className="error" style={{ padding: "12px 10px" }}>Couldn't load your groups.</div>}

        {(communities.data ?? []).map((c) => {
          let groups = c.groups.filter((g) => !g.archived);
          if (filter === "Unread") groups = groups.filter((g) => g.unreadCount > 0);
          if (filter === "Announcements") groups = groups.filter((g) => g.kind === "announcements");
          groups = sortGroups(groups);
          const isCollapsed = !!collapsed[c.id];
          const unreadTotal = c.groups.reduce((n, g) => n + g.unreadCount, 0);
          return (
            <div key={c.id} style={{ paddingTop: 8 }}>
              <button
                onClick={() => setCollapsed((s) => ({ ...s, [c.id]: !s[c.id] }))}
                aria-expanded={!isCollapsed}
                style={{ width: "100%", height: 28, border: 0, background: "transparent", display: "flex", alignItems: "center", gap: 4, padding: "0 8px", color: "var(--subtle)" }}
              >
                <span className="label-caps" style={{ flex: 1, textAlign: "left" }}>{c.name}</span>
                {isCollapsed && unreadTotal > 0 && <span className="badge">{unreadTotal}</span>}
                <span style={{ display: "flex", transform: isCollapsed ? "rotate(-90deg)" : "none" }}><Icon name="chevronDown" size={13} stroke={2.4} /></span>
              </button>
              {!isCollapsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {groups.map((g) => (
                    <GroupRow key={g.id} g={g} current={view.kind === "chat" && view.groupId === g.id && !query} />
                  ))}
                  {groups.length === 0 && <div className="subtle" style={{ padding: "6px 10px 8px", fontSize: 12 }}>Nothing here.</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ flex: "none", borderTop: "0.5px solid var(--sep)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar name={me.displayName} size={32} url={me.avatarUrl} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span className="ellipsis" style={{ fontSize: 13, fontWeight: 600 }}>{me.displayName}</span>
          <span className="subtle ellipsis" style={{ fontSize: 11 }}>{roleLine}</span>
        </div>
        <button className="ib" onClick={() => nav.openSheet({ kind: "settings" })} aria-label="Settings">
          <Icon name="sliders" size={18} />
        </button>
      </div>
    </nav>
  );
}
