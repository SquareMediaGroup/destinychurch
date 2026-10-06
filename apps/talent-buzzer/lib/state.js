// Show state for the buzzer hub. Pure logic (no I/O) so it can be unit tested.
//
// Rules:
// - Each judge's X latches: once buzzed it stays on until the operator resets.
// - Golden buzzer fires once until reset.
// - Presses within `debounceMs` of the same buzzer's previous press are ignored
//   (protects against double taps and flaky touchscreens).
// - While `locked`, every press is ignored (between acts).

class ShowState {
  constructor({ seats, debounceMs = 500 }) {
    this.seats = seats.map(String);
    this.debounceMs = debounceMs;
    this.lastPressAt = {};
    this.locked = false;
    this.reset();
  }

  reset() {
    this.xs = Object.fromEntries(this.seats.map((s) => [s, false]));
    this.golden = false;
  }

  setLocked(locked) {
    this.locked = Boolean(locked);
  }

  // Returns { accepted: true } or { accepted: false, reason }.
  press(seat, now = Date.now()) {
    seat = String(seat);
    if (!this.seats.includes(seat)) return { accepted: false, reason: 'unknown-seat' };
    const gate = this.#gate(seat, now);
    if (gate) return gate;
    if (this.xs[seat]) return { accepted: false, reason: 'already-buzzed' };
    this.xs[seat] = true;
    return { accepted: true };
  }

  pressGolden(now = Date.now()) {
    const gate = this.#gate('golden', now);
    if (gate) return gate;
    if (this.golden) return { accepted: false, reason: 'already-golden' };
    this.golden = true;
    return { accepted: true };
  }

  #gate(key, now) {
    if (this.locked) return { accepted: false, reason: 'locked' };
    const last = this.lastPressAt[key];
    this.lastPressAt[key] = now;
    if (last !== undefined && now - last < this.debounceMs) return { accepted: false, reason: 'debounced' };
    return null;
  }

  snapshot() {
    return { xs: { ...this.xs }, golden: this.golden, locked: this.locked };
  }
}

module.exports = { ShowState };
