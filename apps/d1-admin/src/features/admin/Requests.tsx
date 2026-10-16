// Access requests: people who signed in without an invite and asked to join.
// Destiny One Admins confirm their age, choose communities, and approve.

import { useState } from "react";
import type { AdminChurchSuiteMatch, AdminMember } from "@destiny/shared";
import { Avatar, Empty, Loading, PageHeader, Seg } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { invalidateAdmin, useAdminCommunities, usePending } from "@/lib/adminData";
import { invalidateCommunities } from "@/lib/chat";
import { plural, shortTime } from "@/lib/format";

function RequestCard({ m }: { m: AdminMember }) {
  const communities = useAdminCommunities();
  const [age, setAge] = useState<"adult" | "child" | null>(m.declaredAdult == null ? null : m.declaredAdult ? "adult" : "child");
  const [dob, setDob] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [matches, setMatches] = useState<AdminChurchSuiteMatch[] | null>(null);

  const lookUp = async () => {
    setError(null);
    try {
      setMatches(await admin.churchSuite(m.email ?? m.displayName));
    } catch (err) {
      setError(errorText(err));
    }
  };

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (approve) {
        await admin.approve(m.id, { adult: age === "adult", dateOfBirth: dob || null, communityIds: picked });
        const names = (communities.data ?? []).filter((c) => picked.includes(c.id)).map((c) => c.name).join(", ");
        setResult({ ok: true, text: `Approved as ${age === "adult" ? "an adult" : "under 18"}${names ? ` · added to ${names}` : ""}` });
        invalidateCommunities();
      } else {
        await admin.decline(m.id);
        setResult({ ok: false, text: "Declined" });
      }
      setTimeout(() => invalidateAdmin("members"), 2500);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={m.displayName} size={40} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{m.displayName}</span>
          <span className="subtle ellipsis selectable" style={{ fontSize: 12 }}>{m.email ?? "No email"} · asked {shortTime(m.requestSubmittedAt)}</span>
        </div>
        {m.churchsuiteLinked ? (
          <span className="pill ok">Matched in ChurchSuite</span>
        ) : (
          <button className="btn sm" onClick={() => void lookUp()}>Check ChurchSuite</button>
        )}
      </div>
      {m.requestNote && <div className="note selectable" style={{ color: "var(--text2)" }}>“{m.requestNote}”</div>}
      {matches && (
        <div className="note" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {matches.length === 0 && <span className="subtle">No ChurchSuite record found.</span>}
          {matches.map((p) => (
            <span key={`${p.kind}-${p.id}`}>{p.displayName} · {p.isAdult ? "Adult" : "Under 18"}{p.emailMatches ? " · email matches" : ""}</span>
          ))}
        </div>
      )}
      {result ? (
        <div style={{ fontSize: 13, fontWeight: 600, color: result.ok ? "var(--ok)" : "var(--subtle)" }}>{result.text}</div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>
                Confirm age{m.declaredAdult != null ? ` · they said ${m.declaredAdult ? "adult" : "under 18"}` : " · no date of birth given"}
              </span>
              <Seg label="Age" value={age ?? ("" as "adult")} options={[["adult", "Adult"], ["child", "Under 18"]] as const} onChange={setAge} />
              {age === "child" && (
                <label className="field" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 11 }}>Date of birth, if known</span>
                  <input className="input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ width: 170 }} />
                </label>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 240 }}>
              <span className="subtle" style={{ fontSize: 11, fontWeight: 600 }}>Add to communities</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(communities.data ?? []).filter((c) => !c.archived).map((c) => {
                  const on = picked.includes(c.id);
                  return (
                    <button key={c.id} role="checkbox" aria-checked={on} className="chip outline" onClick={() => setPicked((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))}>{c.name}</button>
                  );
                })}
              </div>
            </div>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="subtle" style={{ flex: 1, fontSize: 11 }}>Only the date they turn 18 is kept after approval.</span>
            <button className="btn" disabled={busy} onClick={() => void decide(false)}>Decline</button>
            <button className="btn primary" disabled={busy || !age} onClick={() => void decide(true)}>Approve</button>
          </div>
        </>
      )}
    </article>
  );
}

export function Requests() {
  const pending = usePending();
  const submitted = (pending.data ?? []).filter((m) => m.requestSubmittedAt).sort((a, b) => (a.requestSubmittedAt! < b.requestSubmittedAt! ? 1 : -1));
  const unsubmitted = (pending.data?.length ?? 0) - submitted.length;
  return (
    <>
      <PageHeader title="Access requests" sub={`${submitted.length} waiting · people without an invite${unsubmitted ? ` · ${plural(unsubmitted, "person has", "people have")} signed in but not asked yet` : ""}`} />
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div className="page-body">
          {pending.isLoading && <Loading />}
          {pending.error && <p className="error">{errorText(pending.error)}</p>}
          {submitted.map((m) => <RequestCard key={m.id} m={m} />)}
          {!pending.isLoading && submitted.length === 0 && <Empty title="No requests" sub="Everyone who asked has been answered." />}
        </div>
      </div>
    </>
  );
}
