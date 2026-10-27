"use client";

// Talent show audience voting: the acts, the open/close and reveal switches,
// live totals and the QR code. Separate from the judges' buzzers
// (apps/talent-buzzer), which run on the LAN and never touch the website.

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  PageHeader,
  Modal,
  ErrorNote,
  PageLoading,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
  dangerBtn,
  iconBtn,
  cardClass,
} from "@/components/admin/AdminUI";

interface Act {
  id: string;
  name: string;
  performers: string;
  description: string;
  sort_order: number;
  hidden: boolean;
  votes: number;
}

interface AdminState {
  settings: { show_name: string; voting_open: boolean; results_revealed: boolean; round: number };
  acts: Act[];
  total: number;
}

type Draft = { name: string; performers: string; description: string };
const EMPTY: Draft = { name: "", performers: "", description: "" };

// Printed codes always point at the live site, whichever address the admin is on.
const VOTE_URL = "https://destinytees.uk/talent-show?s=qr";
const PNG_SIZE = 1024;

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export default function AdminTalentShowPage() {
  const [data, setData] = useState<AdminState | null>(null);
  const [showName, setShowName] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<Act | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [confirm, setConfirm] = useState<{ kind: "delete"; act: Act } | { kind: "round" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const qrRef = useRef<SVGSVGElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/talent-show", { cache: "no-store" });
    if (!res.ok) return null;
    const d: AdminState = await res.json();
    setData(d);
    return d;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch seeds the show name field
    load().then((d) => d && setShowName(d.settings.show_name));
    // Live totals while the page is open.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 5_000);
    return () => clearInterval(t);
  }, [load]);

  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      if (done) setMessage(done);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const saveSettings = (patch: Record<string, unknown>, done?: string) =>
    run(() => send("/api/admin/talent-show", "PUT", patch), done);

  async function addAct(e: React.FormEvent) {
    e.preventDefault();
    if (await run(() => send("/api/admin/talent-show/acts", "POST", draft), "Act added.")) setDraft(EMPTY);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (await run(() => send(`/api/admin/talent-show/acts/${editing.id}`, "PATCH", editDraft), "Act saved."))
      setEditing(null);
  }

  function move(index: number, by: -1 | 1) {
    if (!data) return;
    const ids = data.acts.map((a) => a.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    // Reorder on screen straight away; the poll corrects it if the save fails.
    setData({ ...data, acts: ids.map((id) => data.acts.find((a) => a.id === id)!) });
    run(() => send("/api/admin/talent-show/reorder", "POST", { ids }));
  }

  function downloadQr() {
    const svg = qrRef.current;
    if (!svg) return;
    const markup = new XMLSerializer().serializeToString(svg);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = PNG_SIZE;
      canvas.height = PNG_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // White first: a transparent PNG prints badly.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, PNG_SIZE, PNG_SIZE);
      ctx.drawImage(image, 0, 0, PNG_SIZE, PNG_SIZE);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "talent-show-vote-qr.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    // A data URL rather than a blob URL: Safari won't draw a blob: SVG onto a canvas.
    image.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(markup)))}`;
  }

  if (!data) return <PageLoading label="Loading talent show voting" />;
  const { settings, acts, total } = data;
  const top = Math.max(0, ...acts.map((a) => a.votes));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <PageHeader
        title="Talent Show Voting"
        subtitle="The audience scans a QR code to vote for their favourite act. One vote per phone, which they can change until voting closes."
      />

      <div role="status" aria-live="polite" className="mb-4 text-sm">
        {message && <p className="text-green-600 dark:text-green-400">{message}</p>}
        {error && <ErrorNote>{error}</ErrorNote>}
      </div>

      <section className={`${cardClass} p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-destiny-grey dark:text-white">
              Voting is {settings.voting_open ? "open" : "closed"}
            </h2>
            <p className="text-sm text-destiny-grey/50 dark:text-white/50">
              {total} {total === 1 ? "vote" : "votes"} so far.
              {settings.results_revealed ? " Results are showing on the screen." : " The screen shows the vote count only."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={settings.voting_open ? ghostBtn : primaryBtn}
              disabled={busy || (!settings.voting_open && acts.every((a) => a.hidden))}
              onClick={() =>
                saveSettings({ votingOpen: !settings.voting_open }, settings.voting_open ? "Voting closed." : "Voting open.")
              }
            >
              {settings.voting_open ? "Close voting" : "Open voting"}
            </button>
            <button
              type="button"
              className={settings.results_revealed ? ghostBtn : primaryBtn}
              disabled={busy}
              onClick={() =>
                saveSettings(
                  { resultsRevealed: !settings.results_revealed },
                  settings.results_revealed ? "Results hidden from the screen." : "Results are on the screen.",
                )
              }
            >
              {settings.results_revealed ? "Hide results" : "Reveal results"}
            </button>
          </div>
        </div>

        <form
          className="mt-6 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            saveSettings({ showName }, "Saved.");
          }}
        >
          <label className="min-w-0 flex-1">
            <span className={labelClass}>Show name</span>
            <input className={inputClass} value={showName} maxLength={80} onChange={(e) => setShowName(e.target.value)} />
          </label>
          <button type="submit" className={ghostBtn} disabled={busy || showName.trim() === settings.show_name}>
            Save
          </button>
        </form>

        <div className="mt-6 border-t border-black/5 pt-4 dark:border-white/8">
          <button type="button" className="text-sm font-bold text-destiny-red" onClick={() => setConfirm({ kind: "round" })}>
            Clear votes and start again
          </button>
          <p className="text-xs text-destiny-grey/45 dark:text-white/45">
            For after a rehearsal. Every phone can vote again; voting closes and the results are hidden.
          </p>
        </div>
      </section>

      <section className={`${cardClass} mt-6 grid gap-6 p-6 sm:grid-cols-[auto_1fr]`}>
        <div className="flex justify-center rounded-2xl border border-black/10 bg-white p-3">
          <QRCodeSVG ref={qrRef} value={VOTE_URL} size={160} level="M" marginSize={2} />
        </div>
        <div>
          <h2 className="text-lg font-black text-destiny-grey dark:text-white">QR code and screen</h2>
          <p className="mt-1 text-sm text-destiny-grey/60 dark:text-white/60">
            Print the code or put it on a slide. The results screen shows it too while voting is open. Open the screen on
            the computer driving the projector or LED wall and press Full screen.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} onClick={downloadQr}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">download</span>
              Download QR code
            </button>
            <a href="/talent-show/screen" target="_blank" rel="noopener" className={ghostBtn}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">tv</span>
              Open results screen
            </a>
            <a href="/talent-show" target="_blank" rel="noopener" className={ghostBtn}>
              <span className="material-symbols-rounded text-lg" aria-hidden="true">open_in_new</span>
              Open voting page
            </a>
          </div>
        </div>
      </section>

      <section className={`${cardClass} mt-6 p-6`}>
        <h2 className="text-lg font-black text-destiny-grey dark:text-white">Acts</h2>
        <p className="text-sm text-destiny-grey/50 dark:text-white/50">
          In running order. Hidden acts are off the voting page and the screen but keep their votes.
        </p>

        {acts.length === 0 ? (
          <p className="mt-4 text-sm text-destiny-grey/50 dark:text-white/50">No acts yet. Add the first one below.</p>
        ) : (
          <ol className="mt-4 divide-y divide-black/5 dark:divide-white/8">
            {acts.map((act, i) => (
              <li key={act.id} className="flex items-center gap-3 py-3">
                <span className="w-6 text-right text-sm font-black text-destiny-grey/40 dark:text-white/40">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-bold ${act.hidden ? "text-destiny-grey/40 line-through dark:text-white/40" : "text-destiny-grey dark:text-white"}`}>
                    {act.name}
                    {act.hidden && <span className="ml-2 text-xs font-bold uppercase no-underline">Hidden</span>}
                  </p>
                  {(act.performers || act.description) && (
                    <p className="truncate text-sm text-destiny-grey/50 dark:text-white/50">
                      {[act.performers, act.description].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div className="h-full rounded-full bg-destiny-orange" style={{ width: `${top ? (act.votes / top) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-black text-destiny-grey dark:text-white">
                  {act.votes} <span className="font-normal text-destiny-grey/45 dark:text-white/45">{act.votes === 1 ? "vote" : "votes"}</span>
                </span>
                <div className="flex shrink-0">
                  <button type="button" className={iconBtn} aria-label={`Move ${act.name} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)}>
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">arrow_upward</span>
                  </button>
                  <button type="button" className={iconBtn} aria-label={`Move ${act.name} down`} disabled={i === acts.length - 1 || busy} onClick={() => move(i, 1)}>
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">arrow_downward</span>
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label={`Edit ${act.name}`}
                    onClick={() => {
                      setEditing(act);
                      setEditDraft({ name: act.name, performers: act.performers, description: act.description });
                    }}
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">edit</span>
                  </button>
                  <button
                    type="button"
                    className={iconBtn}
                    aria-label={act.hidden ? `Show ${act.name}` : `Hide ${act.name}`}
                    disabled={busy}
                    onClick={() => run(() => send(`/api/admin/talent-show/acts/${act.id}`, "PATCH", { hidden: !act.hidden }))}
                  >
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">{act.hidden ? "visibility" : "visibility_off"}</span>
                  </button>
                  <button type="button" className={iconBtn} aria-label={`Delete ${act.name}`} onClick={() => setConfirm({ kind: "delete", act })}>
                    <span className="material-symbols-rounded text-lg" aria-hidden="true">delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <form onSubmit={addAct} className="mt-6 grid gap-3 border-t border-black/5 pt-5 sm:grid-cols-2 dark:border-white/8">
          <h3 className="font-black text-destiny-grey sm:col-span-2 dark:text-white">Add an act</h3>
          <ActFields draft={draft} onChange={setDraft} />
          <div className="sm:col-span-2">
            <button type="submit" className={primaryBtn} disabled={busy || !draft.name.trim()}>
              Add act
            </button>
          </div>
        </form>
      </section>

      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="grid gap-3">
            <ActFields draft={editDraft} onChange={setEditDraft} />
            <div className="flex justify-end gap-2">
              <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className={primaryBtn} disabled={busy || !editDraft.name.trim()}>
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirm && (
        <Modal title={confirm.kind === "delete" ? `Delete ${confirm.act.name}?` : "Clear all votes?"} onClose={() => setConfirm(null)}>
          <p className="text-sm text-destiny-grey/70 dark:text-white/70">
            {confirm.kind === "delete"
              ? `This removes the act and its ${confirm.act.votes} ${confirm.act.votes === 1 ? "vote" : "votes"}. To take it off the voting page but keep its votes, hide it instead.`
              : `The count goes back to zero and every phone can vote again. Voting closes and the results are hidden from the screen. The ${total} current ${total === 1 ? "vote" : "votes"} stop counting.`}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={ghostBtn} onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              className={dangerBtn}
              disabled={busy}
              onClick={async () => {
                const c = confirm;
                setConfirm(null);
                if (c.kind === "delete") await run(() => send(`/api/admin/talent-show/acts/${c.act.id}`, "DELETE"), "Act deleted.");
                else await run(() => send("/api/admin/talent-show/new-round", "POST"), "Votes cleared.");
              }}
            >
              {confirm.kind === "delete" ? "Delete act" : "Clear votes"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ActFields({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  return (
    <>
      <label>
        <span className={labelClass}>Act name</span>
        <input
          className={inputClass}
          required
          maxLength={80}
          placeholder="The Harmony Sisters"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </label>
      <label>
        <span className={labelClass}>Performers</span>
        <input
          className={inputClass}
          maxLength={200}
          placeholder="Grace and Ruth Okafor"
          value={draft.performers}
          onChange={(e) => onChange({ ...draft, performers: e.target.value })}
        />
      </label>
      <label className="sm:col-span-2">
        <span className={labelClass}>What they&apos;re doing (optional)</span>
        <input
          className={inputClass}
          maxLength={300}
          placeholder="Singing “Oceans”"
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </label>
    </>
  );
}
