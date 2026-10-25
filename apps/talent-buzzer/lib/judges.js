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

const MAX_NAME = 40;

function cleanName(value, label) {
  const name = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!name) throw new Error(`${label}: type a name`);
  if (name.length > MAX_NAME) throw new Error(`${label}: keep the name to ${MAX_NAME} letters or fewer`);
  return name;
}

// Applies names typed on the control page: { judges: { seat: name }, golden }.
// Returns { judges, golden } as new objects; throws naming the field if any is
// empty or too long, leaving nothing changed. Unknown seats are ignored.
function applyNameEdit(judges, golden, edit) {
  const next = judges.map((j) => (edit.judges && j.seat in edit.judges ? { ...j, name: cleanName(edit.judges[j.seat], `Judge ${j.seat}`) } : j));
  const nextGolden = 'golden' in edit ? { ...golden, name: cleanName(edit.golden, 'Golden buzzer') } : golden;
  return { judges: next, golden: nextGolden };
}

function activeJudges(config) {
  return config.judges.slice(0, config.judgeCount);
}

module.exports = { MIN_JUDGES, MAX_JUDGES, MAX_NAME, parseJudgeCount, normaliseJudges, applyNameEdit, activeJudges };
