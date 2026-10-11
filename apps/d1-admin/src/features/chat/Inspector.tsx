// Group info, on the right: mute, the safeguarding rule, members, leave.

import { useState } from "react";
import { D1_ROLE_LABELS, MIN_GROUP_ADULTS, MIN_GROUP_MEMBERS } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, RuleBox, Seg } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { findGroup, invalidateCommunities, keys, useCommunities, useGroup } from "@/lib/chat";
import { plural } from "@/lib/format";
import { nav } from "@/lib/nav";
import { queryClient } from "@/lib/queryClient";
import { useReady } from "@/lib/session";

type Mute = "Off" | "8 hours" | "1 week" | "Always";
const MUTE_MS: Record<Exclude<Mute, "Off" | "Always">, number> = { "8 hours": 8 * 3600_000, "1 week": 7 * 86_400_000 };
const remembered: Record<string, Mute> = {};

export function Inspector({ groupId }: { groupId: string }) {
  const { me } = useReady();
  const group = useGroup(groupId);
  const communities = useCommunities();
  const found = findGroup(communities.data, groupId);
  const [error, setError] = useState<string | null>(null);
  const [, force] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const g = group.data;
  if (!g) return null;

  const isAnn = g.kind === "announcements";
  const mute: Mute = g.muted ? remembered[groupId] ?? "Always" : "Off";
  const members = g.members;
  const adults = members.filter((m) => m.isAdult).length;
  const rules = g.rules ?? (g.canManage ? { members: members.length, adults, minMembers: MIN_GROUP_MEMBERS, minAdults: MIN_GROUP_ADULTS } : null);
  const ok = rules ? rules.members >= rules.minMembers && rules.adults >= rules.minAdults : true;

  const setMute = async (m: Mute) => {
    setError(null);
    const until = m === "Off" ? null : m === "Always" ? "9999-12-31T00:00:00.000Z" : new Date(Date.now() + MUTE_MS[m]).toISOString();
    try {
      await api.mute(groupId, until);
      remembered[groupId] = m;
      force((n) => n + 1);
      void queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
      invalidateCommunities();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <aside className="insp scroll" aria-label="Group info" style={{ width: 320, flex: "none", borderLeft: "0.5px solid var(--sep)", background: "var(--side)", display: "flex", flexDirection: "column" }}>
      <div className="drag" data-tauri-drag-region style={{ height: 52, flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 20px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600 }}>Group info</h2>
        <button className="ib" onClick={nav.toggleInfo} aria-label="Close group info" style={{ width: 30, height: 30, color: "var(--subtle)" }}><Icon name="x" size={13} stroke={2.4} /></button>
      </div>
      <div style={{ padding: "4px 20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <Avatar name={g.name} size={64} square ann={isAnn} url={g.iconUrl} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>{isAnn && found ? `${found.community.name} Announcements` : g.name}</span>
            <span className="subtle" style={{ fontSize: 12 }}>{[g.department ?? found?.community.name, plural(members.length, "member")].filter(Boolean).join(" · ")}</span>
          </div>
          {g.description && <p className="muted" style={{ fontSize: 13, lineHeight: "18px" }}>{g.description}</p>}
        </div>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h3 className="label-caps">Mute notifications</h3>
          <Seg label="Mute" value={mute} options={["Off", "8 hours", "1 week", "Always"] as const} onChange={(m) => void setMute(m)} />
        </section>

        {!isAnn && rules && <RuleBox members={rules.members} adults={rules.adults} ok={ok} />}

        <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h3 className="label-caps">{plural(members.length, "member")}</h3>
            {g.canManage && !isAnn && (
              <button className="btn ghost sm" onClick={() => nav.openSheet({ kind: "addPeople", groupId })}>
                <Icon name="personAdd" size={14} stroke={2} /> Add people
              </button>
            )}
          </div>
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <Avatar name={m.displayName} size={30} />
              <span className="ellipsis" style={{ flex: 1, fontSize: 13 }}>{m.id === me.id ? `${m.displayName} (You)` : m.displayName}</span>
              {m.role === "admin" && <span className="tag-admin">Admin</span>}
              {m.tag && m.role !== "admin" && <span className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>{D1_ROLE_LABELS[m.tag]}</span>}
              {g.canManage && m.isAdult !== undefined && (
                <span style={{ fontSize: 11, fontWeight: 600, color: m.isAdult ? "var(--subtle)" : "var(--tint)" }}>{m.isAdult ? "Adult" : "Under 18"}</span>
              )}
              {g.canManage && m.id !== me.id && !isAnn && (
                confirmRemove === m.id ? (
                  <button
                    className="btn sm danger"
                    onClick={() => {
                      setConfirmRemove(null);
                      void api.removeGroupMember(groupId, m.id).then(
                        () => queryClient.invalidateQueries({ queryKey: keys.group(groupId) }),
                        (err) => setError(errorText(err)),
                      );
                    }}
                    onBlur={() => setConfirmRemove(null)}
                    autoFocus
                  >
                    Remove
                  </button>
                ) : (
                  <button className="ib sm" aria-label={`Remove ${m.displayName}`} onClick={() => setConfirmRemove(m.id)} style={{ color: "var(--subtle)" }}>
                    <Icon name="x" size={12} stroke={2.4} />
                  </button>
                )
              )}
            </div>
          ))}
        </section>

        {error && <p className="error" role="alert">{error}</p>}
        <p className="subtle" style={{ fontSize: 12, lineHeight: "17px" }}>Chats in this group aren't end-to-end encrypted. The safeguarding team can review them if a concern is raised.</p>
        {!isAnn && (
          <button onClick={() => nav.openSheet({ kind: "leave", groupId, name: g.name })} style={{ height: 34, border: 0, borderRadius: 9, background: "var(--fill)", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}>
            Leave group
          </button>
        )}
      </div>
    </aside>
  );
}
