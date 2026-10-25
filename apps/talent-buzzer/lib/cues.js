// Lighting cues chosen on the control page. Pure logic (no I/O) so it can be
// unit tested.
//
// A cue says which Titan playback to use and what to do with it:
//   { userNumber, action, level, times, seconds }
//   action  fire  - go: fire the playback at full (Kill turns it off)
//           flash - flash button (needs flash enabled on that playback in Titan)
//           swop  - swop button
//           level - move the fader to `level` percent
//   times   how many times to do it within `seconds` (1 = once, and fire /
//           swop / level then stay on until Reset)
// null means "fire nothing". Old configs that hold a bare number mean
// { action: 'fire', times: 1 }.

const MAX_USER_NUMBER = 99999;
const ACTIONS = ['fire', 'flash', 'swop', 'level'];
const MAX_TIMES = 20;
const MAX_SECONDS = 30;
const DEFAULTS = { action: 'fire', level: 100, times: 1, seconds: 5 };

function whole(value, label, min, max) {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${label} must be a whole number from ${min} to ${max}`);
  return n;
}

// Returns a whole-number user number, or null for empty / "none". Throws on
// anything else so a typo is reported instead of silently firing nothing.
function parseCue(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 1 || n > MAX_USER_NUMBER) {
    throw new Error(`"${value}" is not a playback number (use a whole number from 1 to ${MAX_USER_NUMBER}, or leave it empty)`);
  }
  return n;
}

// Turns whatever the page or an old config holds into a full cue, or null.
function normaliseCue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'object') return { userNumber: parseCue(value), ...DEFAULTS };
  const userNumber = parseCue(value.userNumber);
  if (userNumber == null) return null;
  const action = value.action ?? DEFAULTS.action;
  if (!ACTIONS.includes(action)) throw new Error(`"${action}" is not an action (use ${ACTIONS.join(', ')})`);
  const cue = {
    userNumber,
    action,
    level: whole(value.level ?? DEFAULTS.level, 'Level', 0, 100),
    times: whole(value.times ?? DEFAULTS.times, 'Times', 1, MAX_TIMES),
    seconds: whole(value.seconds ?? DEFAULTS.seconds, 'Seconds', 1, MAX_SECONDS),
  };
  return cue;
}

// Applies an edit from the control page to the current cues and returns the
// new cues object. Only the known keys are taken; unknown seats are ignored.
// Throws (naming the field) if any value is invalid, leaving nothing changed.
function applyCueEdit(current, edit, seats) {
  const next = { ...current, x: { ...(current.x ?? {}) } };
  const field = (label, value) => {
    try {
      return normaliseCue(value);
    } catch (err) {
      throw new Error(`${label}: ${err.message}`);
    }
  };
  if (edit.x && typeof edit.x === 'object') {
    for (const seat of seats) {
      if (seat in edit.x) next.x[seat] = field(`Judge ${seat}`, edit.x[seat]);
    }
  }
  for (const [key, label] of [['allX', 'All four'], ['golden', 'Golden'], ['reset', 'Reset']]) {
    if (key in edit) next[key] = field(label, edit[key]);
  }
  if ('releaseOnReset' in edit) next.releaseOnReset = Boolean(edit.releaseOnReset);
  return next;
}

// The Titan step that undoes an action.
function offStep(action) {
  return { fire: { action: 'release' }, flash: { action: 'flash-off' }, swop: { action: 'swop-off' }, level: { action: 'level', level: 0 } }[action];
}

// When to switch the cue on and off, in ms from the press.
// Once: flash is a 0.5 s bump; fire, swop and level stay on (Reset turns them off).
// Several times: evenly spaced on/off pulses across `seconds`, ending off.
function planCue(cue) {
  const on = { action: cue.action, level: cue.level };
  if (cue.times <= 1) {
    return cue.action === 'flash' ? [{ at: 0, ...on }, { at: 500, ...offStep('flash') }] : [{ at: 0, ...on }];
  }
  const interval = (cue.seconds * 1000) / cue.times;
  const steps = [];
  for (let i = 0; i < cue.times; i++) {
    steps.push({ at: Math.round(i * interval), ...on });
    steps.push({ at: Math.round(i * interval + interval / 2), ...offStep(cue.action) });
  }
  return steps;
}

module.exports = { MAX_USER_NUMBER, ACTIONS, MAX_TIMES, MAX_SECONDS, DEFAULTS, parseCue, normaliseCue, applyCueEdit, offStep, planCue };
