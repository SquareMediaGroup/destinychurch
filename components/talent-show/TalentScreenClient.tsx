"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Result {
  id: string;
  name: string;
  performers: string;
  votes: number;
  judgeXs: number;
  score: number;
}

interface ScreenState {
  showName: string;
  open: boolean;
  revealed: boolean;
  total: number;
  actCount: number;
  results: Result[];
}

// Big-screen view for the room. Polls every few seconds; until an admin
// reveals the results it shows the QR code and the running vote count only.
export default function TalentScreenClient() {
  const [state, setState] = useState<ScreenState | null>(null);
  const [voteUrl, setVoteUrl] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/talent-show/screen", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      /* keep showing the last good state */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the QR code needs this site's own address
    setVoteUrl(`${window.location.origin}/talent-show`);
    refresh();
    const t = setInterval(refresh, 3_000);
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearInterval(t);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [refresh]);

  if (!state) return <p className="p-10 text-2xl text-white/60">Loading…</p>;

  const top = state.results[0]?.score ?? 0;
  const anyJudgeXs = state.results.some((r) => r.judgeXs > 0);
  const display = voteUrl.replace(/^https?:\/\//, "");

  return (
    <div className="flex min-h-screen flex-col px-[4vw] py-[4vh]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-[1.6vw] font-bold uppercase tracking-[0.3em] text-destiny-orange">
            {state.revealed ? "Results" : "Audience vote"}
          </p>
          <h1 className="text-[4.5vw] font-black leading-none text-white">{state.showName}</h1>
        </div>
        {!fullscreen && (
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white/70 hover:text-white"
          >
            Full screen
          </button>
        )}
      </header>

      {state.revealed ? (
        <ol className="mt-[4vh] flex flex-1 flex-col justify-center gap-[2.2vh]">
          {state.results.map((r, i) => {
            const width = top ? Math.max(2, (r.score / top) * 100) : 2;
            const winner = i === 0 && r.score > 0;
            return (
              <li key={r.id} className="flex items-center gap-[2vw]">
                <span className={`w-[4vw] text-right text-[2.6vw] font-black ${winner ? "text-destiny-orange" : "text-white/50"}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="truncate text-[2.2vw] font-black text-white">
                      {r.name}
                      {r.performers && <span className="ml-3 text-[1.4vw] font-bold text-white/50">{r.performers}</span>}
                    </p>
                    <p className="shrink-0 text-[1.8vw] font-black text-white">
                      {r.score}{" "}
                      <span className="text-[1.2vw] font-bold text-white/50">
                        {anyJudgeXs
                          ? `(${r.votes} ${r.votes === 1 ? "vote" : "votes"} + ${r.judgeXs} ${r.judgeXs === 1 ? "X" : "X's"})`
                          : `(${state.total ? Math.round((r.votes / state.total) * 100) : 0}%)`}
                      </span>
                    </p>
                  </div>
                  <div className="mt-[0.8vh] h-[2.2vh] overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-[width] duration-1000 ease-out ${winner ? "bg-destiny-orange" : "bg-white/60"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
          <p className="mt-[2vh] text-center text-[1.4vw] text-white/50">
            {state.total} audience {state.total === 1 ? "vote" : "votes"}
            {anyJudgeXs && " · each judge's X counts as 2 votes"}
          </p>
        </ol>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-[6vw]">
          {state.open && voteUrl && (
            <div className="rounded-[2vw] bg-white p-[1.6vw]">
              <QRCodeSVG value={voteUrl} size={512} level="M" className="h-[42vh] w-[42vh]" />
            </div>
          )}
          <div className="text-center">
            {state.open ? (
              <>
                <p className="text-[2.6vw] font-black text-white">Scan to vote</p>
                <p className="mt-2 text-[1.6vw] text-white/60">or go to {display}</p>
              </>
            ) : (
              <p className="text-[2.6vw] font-black text-white">
                {state.total > 0 ? "Voting has closed" : "Voting opens soon"}
              </p>
            )}
            <p className="mt-[5vh] text-[9vw] font-black leading-none text-destiny-orange tabular-nums">{state.total}</p>
            <p className="text-[1.8vw] font-bold uppercase tracking-[0.2em] text-white/60">
              {state.total === 1 ? "vote" : "votes"} so far
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
