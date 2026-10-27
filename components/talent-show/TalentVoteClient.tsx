"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Act {
  id: string;
  name: string;
  performers: string;
  description: string;
}

interface VoteState {
  voter: string;
  showName: string;
  open: boolean;
  myVote: string | null;
  acts: Act[];
}

const VOTER_KEY = "destiny-talent-voter";

function readStoredVoter() {
  try {
    return localStorage.getItem(VOTER_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeVoter(id: string) {
  try {
    localStorage.setItem(VOTER_KEY, id);
  } catch {
    /* storage blocked: the cookie still holds it */
  }
}

export default function TalentVoteClient() {
  const [state, setState] = useState<VoteState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const voter = useRef("");

  const refresh = useCallback(async () => {
    try {
      const stored = voter.current || readStoredVoter();
      const res = await fetch(`/api/talent-show?voter=${encodeURIComponent(stored)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: VoteState = await res.json();
      voter.current = data.voter;
      storeVoter(data.voter);
      setState(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Picks up voting opening or closing, and acts being added.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  async function vote(act: Act) {
    if (!state || pending) return;
    setPending(act.id);
    setNotice(null);
    try {
      const res = await fetch("/api/talent-show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actId: act.id, voter: voter.current, website: "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save your vote. Please try again.");
      setState({ ...state, myVote: act.id });
      setNotice({
        kind: "ok",
        text: data.changed ? `Vote changed to ${act.name}.` : `Thanks! Your vote for ${act.name} is in.`,
      });
    } catch (e) {
      setNotice({ kind: "error", text: (e as Error).message });
      refresh();
    } finally {
      setPending(null);
    }
  }

  if (!state) {
    return (
      <p className="mt-24 text-center text-white/70" role="status">
        {loadError ? "We couldn't load the voting. Check your connection and refresh." : "Loading…"}
      </p>
    );
  }

  const myAct = state.acts.find((a) => a.id === state.myVote);

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-destiny-orange">Audience vote</p>
      <h1 className="mt-2 text-center text-4xl font-black leading-tight text-white">{state.showName}</h1>

      {state.open ? (
        <p className="mt-3 text-center text-white/70">
          {myAct
            ? "You can change your vote until voting closes."
            : "Tap your favourite act to vote. One vote per phone."}
        </p>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-5 text-center">
          <p className="text-lg font-bold text-white">Voting isn&apos;t open right now</p>
          <p className="mt-1 text-sm text-white/60">
            Keep this page open. It will update as soon as voting opens.
          </p>
          {myAct && <p className="mt-3 text-sm text-white/80">Your vote: <strong>{myAct.name}</strong></p>}
        </div>
      )}

      <div role="status" aria-live="polite" className="mt-4 min-h-6 text-center text-sm font-bold">
        {notice && <p className={notice.kind === "ok" ? "text-green-400" : "text-red-400"}>{notice.text}</p>}
      </div>

      {state.acts.length === 0 ? (
        <p className="mt-4 text-center text-white/60">The acts will appear here soon.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {state.acts.map((act, i) => {
            const chosen = act.id === state.myVote;
            return (
              <li key={act.id}>
                <button
                  type="button"
                  disabled={!state.open || pending !== null}
                  onClick={() => vote(act)}
                  aria-pressed={chosen}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                    chosen
                      ? "border-destiny-orange bg-destiny-orange/15"
                      : "border-white/15 bg-white/5 enabled:hover:border-white/40"
                  } disabled:cursor-default ${!state.open && !chosen ? "opacity-60" : ""}`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      chosen ? "bg-destiny-orange text-white" : "bg-white/10 text-white/80"
                    }`}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black leading-snug text-white">{act.name}</span>
                    {act.performers && <span className="block text-sm text-white/70">{act.performers}</span>}
                    {act.description && <span className="mt-0.5 block text-xs text-white/50">{act.description}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-destiny-orange">
                    {pending === act.id ? "Saving…" : chosen ? "Your vote" : state.open ? "Vote" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 text-center text-xs text-white/40">
        Votes are anonymous. We only keep a scrambled code for this phone so it can&apos;t vote twice.
      </p>
    </div>
  );
}
