// How many judges are on the panel (2 to 4), chosen on the control page.
// Pure logic (no I/O) so it can be unit tested.
//
// config.judges always holds four judges (missing ones are added as
// "Judge N"); config.judgeCount says how many of them, from the top, are in
// use. Judges out of use keep their name and lighting cue for later.

const MIN_JUDGES = 2;
const MAX_JUDGES = 4;

function parseJudgeCount(value) {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < MIN_JUDGES || n > MAX_JUDGES) {
    throw new Error(`The number of judges must be ${MIN_JUDGES}, 3 or ${MAX_JUDGES}`);
  }
  return n;
}

// Returns { judges, judgeCount } for a config read from disk.
function normaliseJudges(judges = [], judgeCount) {
  const list = judges.slice(0, MAX_JUDGES).map((j) => ({ ...j, seat: String(j.seat) }));
  const count = judgeCount ?? Math.min(Math.max(list.length, MIN_JUDGES), MAX_JUDGES);
  for (let n = 1; list.length < MAX_JUDGES; n++) {
    if (!list.some((j) => j.seat === String(n))) list.push({ seat: String(n), name: `Judge ${n}` });
  }
  return { judges: list, judgeCount: parseJudgeCount(count) };
}

function activeJudges(config) {
  return config.judges.slice(0, config.judgeCount);
}

module.exports = { MIN_JUDGES, MAX_JUDGES, parseJudgeCount, normaliseJudges, activeJudges };
