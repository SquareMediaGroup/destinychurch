// Every sheet the app opens (nav.openSheet). One host so only one is ever up.

import { useEffect, useState } from "react";
import { MAX_POLL_OPTIONS, MAX_POLL_OPTION_LENGTH, MAX_POLL_QUESTION_LENGTH, MIN_POLL_OPTIONS, checkComposition, validatePoll, type D1DirectoryEntry } from "@destiny/shared";
import { Icon } from "@/components/Icon";
import { Avatar, RuleBox, Seg, Sheet, Switch } from "@/components/ui";
import { api, errorText } from "@/lib/api";
import { invalidateCommunities, keys, orderedGroups, updateMessages, useCommunities, useGroup } from "@/lib/chat";
import { config } from "@/lib/config";
import { isOpenAtLogin, setOpenAtLogin } from "@/lib/native";
import { nav, useNav, type Sheet as SheetT } from "@/lib/nav";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { queryClient } from "@/lib/queryClient";
import { SHORTCUTS } from "@/lib/shortcuts";
import { useReady, useSession } from "@/lib/session";
import { PeoplePicker } from "@/features/sheets/PeoplePicker";

const REASONS = ["Inappropriate", "Bullying or harassment", "Makes me feel unsafe", "Spam", "Something else"];

function Actions({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 4 }}>{children}</div>;
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function ConfirmSheet({ title, text, action, onConfirm }: { title: string; text: string; action: string; onConfirm: () => Promise<void> }) {
  const { busy, error, run } = useAction();
  return (
    <Sheet label={title} onClose={nav.closeSheet}>
      <div style={{ padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h2>
        <p className="muted" style={{ fontSize: 13, lineHeight: "18px" }}>{text}</p>
        {error && <p className="error" role="alert">{error}</p>}
        <Actions>
          <button className="btn" onClick={nav.closeSheet}>Cancel</button>
          <button className="btn danger" disabled={busy} onClick={() => void run(async () => { await onConfirm(); nav.closeSheet(); })}>{action}</button>
        </Actions>
      </div>
    </Sheet>
  );
}

function ReportSheet({ messageId, sender, body }: { messageId: number; sender: string; body: string }) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction();

  if (sent) {
    return (
      <Sheet label="Report sent" onClose={nav.closeSheet}>
        <div style={{ padding: "28px 24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--accent-soft)", color: "var(--tint)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={22} stroke={2.4} /></div>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Report sent</h2>
          <p className="muted" style={{ fontSize: 13, lineHeight: "18px" }}>Thank you for telling us. The safeguarding team will look at it. If someone is in danger right now, call 999.</p>
          <button className="btn dark" style={{ marginTop: 8, padding: "0 22px" }} onClick={nav.closeSheet}>Done</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet label="Report message" width={460} onClose={nav.closeSheet}>
      <div style={{ padding: "20px 22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Report message</h2>
          <div className="note" style={{ color: "var(--text2)" }}><b style={{ fontWeight: 600 }}>{sender}</b>: {body}</div>
        </div>
        <fieldset role="radiogroup" style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <legend className="muted" style={{ fontSize: 12, fontWeight: 600, padding: "0 0 6px" }}>What's wrong with it?</legend>
          {REASONS.map((r) => (
            <button key={r} role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className="row" style={{ height: 32, borderRadius: 7, display: "flex", alignItems: "center", gap: 10, padding: "0 6px", fontSize: 13 }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, border: reason === r ? "5px solid var(--orange)" : "1.5px solid var(--subtle)", background: "var(--card)", flex: "none" }} />
              {r}
            </button>
          ))}
        </fieldset>
        <label className="field">
          <span>Anything else? <span style={{ fontWeight: 400, color: "var(--subtle)" }}>Optional</span></span>
          <textarea className="input" style={{ height: 72 }} value={note} maxLength={900} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="subtle" style={{ fontSize: 12, lineHeight: "17px" }}>Only the safeguarding team sees reports. The sender isn't told who reported them.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <Actions>
          <button className="btn" onClick={nav.closeSheet}>Cancel</button>
          <button className="btn primary" disabled={!reason || busy} onClick={() => void run(async () => { await api.report(messageId, note.trim() ? `${reason}: ${note.trim()}` : reason!); setSent(true); })}>Send report</button>
        </Actions>
      </div>
    </Sheet>
  );
}

function NewGroupSheet({ communityId: initial }: { communityId?: string }) {
  const { me } = useReady();
  const communities = useCommunities();
  const options = (communities.data ?? []).filter((c) => c.canManage || c.myRole === "admin");
  const [communityId, setCommunityId] = useState(initial ?? "");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [people, setPeople] = useState<D1DirectoryEntry[]>([]);
  const { busy, error, run } = useAction();

  useEffect(() => {
    if (!communityId && options[0]) setCommunityId(options[0].id);
  }, [communityId, options]);

  const count = people.length + 1;
  const adults = people.filter((p) => p.isAdult).length + (me.isAdult ? 1 : 0);
  const rule = checkComposition({ members: count, adults });
  const ready = rule.ok && name.trim().length >= 2 && !!communityId;

  return (
    <Sheet label="New group" width={520} onClose={nav.closeSheet}>
      <div style={{ padding: "20px 22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>New group</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <label className="field"><span>Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>Department <span style={{ fontWeight: 400, color: "var(--subtle)" }}>Optional</span></span><input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
        </div>
        <label className="field">
          <span>Community</span>
          <select className="input" value={communityId} onChange={(e) => setCommunityId(e.target.value)}>
            {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {options.length === 0 && <p className="error">You don't lead a community you can add groups to.</p>}
        <PeoplePicker communityId={communityId || undefined} selected={people} onToggle={(p) => setPeople((s) => (s.some((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : [...s, p]))} exclude={[me.id]} />
        <RuleBox members={count} adults={adults} ok={rule.ok} note={rule.ok ? "Meets the safeguarding rules (including you)" : `${rule.reason} (including you)`} />
        {error && <p className="error" role="alert">{error}</p>}
        <Actions>
          <button className="btn" onClick={nav.closeSheet}>Cancel</button>
          <button
            className="btn primary"
            disabled={!ready || busy}
            onClick={() =>
              void run(async () => {
                const g = await api.createGroup(communityId, { name: name.trim(), department: department.trim() || undefined, memberIds: people.map((p) => p.id) });
                invalidateCommunities();
                nav.closeSheet();
                nav.openGroup(g.id);
              })
            }
          >
            Create group
          </button>
        </Actions>
      </div>
    </Sheet>
  );
}

function AddPeopleSheet({ groupId }: { groupId: string }) {
  const group = useGroup(groupId);
  const [people, setPeople] = useState<D1DirectoryEntry[]>([]);
  const { busy, error, run } = useAction();
  const existing = group.data?.members ?? [];
  const count = existing.length + people.length;
  const adults = existing.filter((m) => m.isAdult).length + people.filter((p) => p.isAdult).length;
  const rule = checkComposition({ members: count, adults });

  return (
    <Sheet label="Add people" width={480} onClose={nav.closeSheet}>
      <div style={{ padding: "20px 22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Add people to {group.data?.name ?? "the group"}</h2>
        <PeoplePicker communityId={group.data?.communityId ?? undefined} selected={people} onToggle={(p) => setPeople((s) => (s.some((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : [...s, p]))} exclude={existing.map((m) => m.id)} />
        <RuleBox members={count} adults={adults} ok={rule.ok} note={rule.ok ? "Meets the rules. A paused group reopens by itself." : rule.reason} />
        {error && <p className="error" role="alert">{error}</p>}
        <Actions>
          <button className="btn" onClick={nav.closeSheet}>Cancel</button>
          <button
            className="btn primary"
            disabled={!people.length || busy}
            onClick={() =>
              void run(async () => {
                await api.addGroupMembers(groupId, people.map((p) => p.id));
                void queryClient.invalidateQueries({ queryKey: keys.group(groupId) });
                invalidateCommunities();
                nav.closeSheet();
              })
            }
          >
            Add {people.length || ""}
          </button>
        </Actions>
      </div>
    </Sheet>
  );
}

function SettingsSheet() {
  const { me, roles } = useReady();
  const { signOut } = useSession();
  const prefs = usePrefs();
  const [login, setLogin] = useState(false);
  useEffect(() => {
    void isOpenAtLogin().then(setLogin);
  }, []);

  const toggles: { label: string; note: string; on: boolean; set: (v: boolean) => void }[] = [
    { label: "Notifications", note: "Banners for new messages, reports and access requests while D1 Admin is running.", on: prefs.notifications, set: (v) => setPrefs({ notifications: v }) },
    { label: "Show message previews", note: "Shows the sender and first line in banners.", on: prefs.previews, set: (v) => setPrefs({ previews: v }) },
    { label: "Require Touch ID", note: "Ask for Touch ID or your Mac's password when D1 Admin opens.", on: prefs.touchId, set: (v) => setPrefs({ touchId: v }) },
    { label: "Open at login", note: "Start D1 Admin in the menu bar when you log in to your Mac.", on: login, set: (v) => void setOpenAtLogin(v).then(() => setLogin(v)) },
  ];
  const roleText = [roles.destinyOneAdmin && "Destiny One Admin", roles.safeguardingAdmin && "Safeguarding Admin"].filter(Boolean).join(" · ") || "Leader";

  return (
    <Sheet label="Settings" width={460} onClose={nav.closeSheet}>
      <div style={{ padding: "20px 22px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Settings</h2>
          <button className="ib sm" onClick={nav.closeSheet} aria-label="Close settings" style={{ color: "var(--subtle)" }}><Icon name="x" size={13} stroke={2.4} /></button>
        </div>
        <div className="note" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={me.displayName} size={40} url={me.avatarUrl} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{me.displayName}</span>
            <span className="subtle" style={{ fontSize: 12 }}>{roleText}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>Appearance</span>
          <Seg label="Appearance" value={prefs.theme} options={[["system", "Auto"], ["light", "Light"], ["dark", "Dark"]] as const} onChange={(theme) => setPrefs({ theme })} />
        </div>
        <div style={{ height: 0.5, background: "var(--sep)" }} />
        {toggles.map((t) => (
          <div key={t.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{t.label}</span>
              <span className="subtle" style={{ fontSize: 11, lineHeight: "15px" }}>{t.note}</span>
            </div>
            <Switch on={t.on} label={t.label} onChange={t.set} />
          </div>
        ))}
        <div style={{ height: 0.5, background: "var(--sep)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="subtle" style={{ fontSize: 11 }}>D1 Admin for Mac {config.version}</span>
          <button className="btn danger-text" onClick={() => { nav.closeSheet(); void signOut(); }}>Sign out</button>
        </div>
      </div>
    </Sheet>
  );
}

export function Sheets() {
  const { sheet } = useNav();
  if (!sheet) return null;
  return <SheetFor sheet={sheet} />;
}

function PollSheet({ groupId }: { groupId: string }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const { busy, error, run } = useAction();
  const draft = { question, options, allowMultiple: multiple };
  const check = validatePoll(draft);

  return (
    <Sheet label="New poll" onClose={nav.closeSheet}>
      <div style={{ padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>New poll</h2>
        <label className="field">
          <span>Question</span>
          <input className="input" value={question} maxLength={MAX_POLL_QUESTION_LENGTH} onChange={(e) => setQuestion(e.target.value)} placeholder="What do you want to ask?" />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Options</span>
          {options.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: 6 }}>
              <input
                className="input"
                style={{ flex: 1 }}
                value={o}
                maxLength={MAX_POLL_OPTION_LENGTH}
                placeholder={`Option ${i + 1}`}
                aria-label={`Option ${i + 1}`}
                onChange={(e) => setOptions((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
              />
              {options.length > MIN_POLL_OPTIONS && (
                <button className="ib" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions((cur) => cur.filter((_, j) => j !== i))}><Icon name="x" size={14} stroke={2.4} /></button>
              )}
            </div>
          ))}
          {options.length < MAX_POLL_OPTIONS && (
            <button className="btn" style={{ alignSelf: "flex-start" }} onClick={() => setOptions((cur) => [...cur, ""])}>Add an option</button>
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <Switch on={multiple} onChange={setMultiple} label="Allow more than one answer" />
          <span>Allow more than one answer</span>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <Actions>
          {!check.ok && (question || options.some(Boolean)) && <span className="subtle" style={{ fontSize: 12, marginRight: "auto" }}>{check.reason}</span>}
          <button className="btn" onClick={nav.closeSheet}>Cancel</button>
          <button
            className="btn dark"
            disabled={busy || !check.ok}
            onClick={() =>
              void run(async () => {
                const sent = await api.send(groupId, { poll: { question: question.trim(), options: options.map((o) => o.trim()).filter(Boolean), allowMultiple: multiple } });
                updateMessages(groupId, (list) => (list.some((m) => m.id === sent.id) ? list : [...list, sent]));
                invalidateCommunities();
                nav.closeSheet();
              })
            }
          >
            Send poll
          </button>
        </Actions>
      </div>
    </Sheet>
  );
}

function ForwardSheet({ messageId, groupId }: { messageId: number; groupId: string }) {
  const communities = useCommunities();
  const [picked, setPicked] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const { busy, error, run } = useAction();
  const targets = orderedGroups(communities.data).filter(
    (g) => g.id !== groupId && g.communityId && g.state === "active" && (g.kind !== "announcements" || g.myRole === "admin"),
  );
  const toggle = (id: string) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 5 ? [...cur, id] : cur));

  return (
    <Sheet label="Forward message" onClose={nav.closeSheet}>
      <div style={{ padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Forward to</h2>
        {done ? (
          <p className="muted" style={{ fontSize: 13 }}>Forwarded.</p>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 12 }}>Choose up to 5 chats you can post in. {picked.length > 0 && `${picked.length} selected.`}</p>
            <div className="scroll" style={{ maxHeight: 280, display: "flex", flexDirection: "column", gap: 2 }}>
              {targets.map((g) => (
                <label key={g.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, borderRadius: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={picked.includes(g.id)} onChange={() => toggle(g.id)} disabled={!picked.includes(g.id) && picked.length >= 5} />
                  <Avatar name={g.name} size={28} square ann={g.kind === "announcements"} url={g.iconUrl} />
                  <span className="ellipsis" style={{ fontSize: 13 }}>{g.name}</span>
                </label>
              ))}
              {targets.length === 0 && <div className="subtle" style={{ fontSize: 12, padding: 8 }}>There's nowhere else you can post.</div>}
            </div>
          </>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <Actions>
          <button className="btn" onClick={nav.closeSheet}>{done ? "Done" : "Cancel"}</button>
          {!done && (
            <button
              className="btn dark"
              disabled={busy || picked.length === 0}
              onClick={() =>
                void run(async () => {
                  await api.forward(messageId, picked);
                  invalidateCommunities();
                  setDone(true);
                })
              }
            >
              Forward
            </button>
          )}
        </Actions>
      </div>
    </Sheet>
  );
}

function ShortcutsSheet() {
  return (
    <Sheet label="Keyboard shortcuts" onClose={nav.closeSheet}>
      <div style={{ padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Keyboard shortcuts</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 18px", margin: 0, fontSize: 13 }}>
          {SHORTCUTS.map((s) => (
            <div key={s.keys} style={{ display: "contents" }}>
              <dt style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{s.keys}</dt>
              <dd className="muted" style={{ margin: 0 }}>{s.does}</dd>
            </div>
          ))}
        </dl>
        <Actions>
          <button className="btn" onClick={nav.closeSheet}>Done</button>
        </Actions>
      </div>
    </Sheet>
  );
}

function SheetFor({ sheet }: { sheet: SheetT }) {
  switch (sheet.kind) {
    case "settings":
      return <SettingsSheet />;
    case "shortcuts":
      return <ShortcutsSheet />;
    case "poll":
      return <PollSheet groupId={sheet.groupId} />;
    case "forward":
      return <ForwardSheet messageId={sheet.messageId} groupId={sheet.groupId} />;
    case "newGroup":
      return <NewGroupSheet communityId={sheet.communityId} />;
    case "addPeople":
      return <AddPeopleSheet groupId={sheet.groupId} />;
    case "report":
      return <ReportSheet messageId={sheet.messageId} sender={sheet.sender} body={sheet.body} />;
    case "delete":
      return (
        <ConfirmSheet
          title="Delete this message?"
          text="It will be removed for everyone. A copy is kept for a time in case safeguarding needs it."
          action="Delete"
          onConfirm={async () => {
            await api.deleteMessage(sheet.messageId);
            updateMessages(sheet.groupId, (list) => list.map((m) => (m.id === sheet.messageId ? { ...m, deleted: true, body: null, attachment: null, reactions: [] } : m)));
          }}
        />
      );
    case "leave":
      return (
        <ConfirmSheet
          title={`Leave ${sheet.name}?`}
          text="You won't get new messages from this group. A leader can add you back."
          action="Leave"
          onConfirm={async () => {
            await api.leaveGroup(sheet.groupId);
            invalidateCommunities();
            nav.openGroup("");
          }}
        />
      );
  }
}
