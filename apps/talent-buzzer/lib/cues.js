// Lighting cue numbers chosen on the control page. Pure logic (no I/O) so it
// can be unit tested.
//
// A cue is a Titan playback user number (a whole number from 1 to 99999), or
// null for "fire nothing".

const MAX_USER_NUMBER = 99999;

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

// Applies an edit from the control page to the current cues and returns the
// new cues object. Only the known keys are taken; unknown seats are ignored.
// Throws (naming the field) if any value is invalid, leaving nothing changed.
function applyCueEdit(current, edit, seats) {
  const next = { ...current, x: { ...(current.x ?? {}) } };
  const field = (label, value) => {
    try {
      return parseCue(value);
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

module.exports = { MAX_USER_NUMBER, parseCue, applyCueEdit };
