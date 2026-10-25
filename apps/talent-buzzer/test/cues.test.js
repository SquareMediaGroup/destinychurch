const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCue, normaliseCue, applyCueEdit, planCue } = require('../lib/cues');
const { buildUrl, DEFAULT_URLS } = require('../lib/titan');

const seats = ['1', '2', '3', '4'];
const fire = (n) => ({ userNumber: n, action: 'fire', level: 100, times: 1, seconds: 5 });
const current = { x: { 1: fire(101), 2: fire(102), 3: fire(103), 4: fire(104) }, golden: fire(110), allX: null, reset: null, releaseOnReset: true };

test('parseCue accepts whole numbers and treats empty as none', () => {
  assert.equal(parseCue('205'), 205);
  assert.equal(parseCue(' 7 '), 7);
  assert.equal(parseCue(42), 42);
  assert.equal(parseCue(''), null);
  assert.equal(parseCue(null), null);
});

test('parseCue rejects anything that is not a playback number', () => {
  for (const bad of ['abc', '1.5', '0', '-3', '100000', 'NaN', '1e3x', true]) {
    assert.throws(() => parseCue(bad), /not a playback number/, String(bad));
  }
});

test('normaliseCue upgrades old bare numbers to a plain go', () => {
  assert.deepEqual(normaliseCue(101), fire(101));
  assert.deepEqual(normaliseCue('101'), fire(101));
  assert.equal(normaliseCue(null), null);
  assert.equal(normaliseCue({ userNumber: '' }), null);
});

test('normaliseCue validates action, level, times and seconds', () => {
  assert.deepEqual(normaliseCue({ userNumber: '5', action: 'level', level: '60', times: '3', seconds: '5' }),
    { userNumber: 5, action: 'level', level: 60, times: 3, seconds: 5 });
  assert.throws(() => normaliseCue({ userNumber: 5, action: 'explode' }), /not an action/);
  assert.throws(() => normaliseCue({ userNumber: 5, level: 101 }), /Level/);
  assert.throws(() => normaliseCue({ userNumber: 5, times: 0 }), /Times/);
  assert.throws(() => normaliseCue({ userNumber: 5, times: 21 }), /Times/);
  assert.throws(() => normaliseCue({ userNumber: 5, seconds: 1.5 }), /Seconds/);
});

test('applyCueEdit changes only the fields sent', () => {
  const next = applyCueEdit(current, { x: { 2: { userNumber: '220', action: 'flash', times: 5 } }, allX: '120' }, seats);
  assert.deepEqual(next.x[2], { userNumber: 220, action: 'flash', level: 100, times: 5, seconds: 5 });
  assert.deepEqual(next.allX, fire(120));
  assert.deepEqual(next.x[1], current.x[1]);
  assert.equal(current.x[2].userNumber, 102, 'input is not mutated');
});

test('applyCueEdit clears a cue when left empty, ignores unknown seats and names the bad field', () => {
  assert.equal(applyCueEdit(current, { golden: '' }, seats).golden, null);
  assert.deepEqual(applyCueEdit(current, { x: { 9: 999 } }, seats).x, current.x);
  assert.throws(() => applyCueEdit(current, { x: { 3: 'oops' } }, seats), /^Error: Judge 3:/);
  assert.throws(() => applyCueEdit(current, { golden: { userNumber: 1, times: 99 } }, seats), /^Error: Golden:/);
});

test('planCue: once means go and stay on, or a short flash bump', () => {
  assert.deepEqual(planCue(fire(1)), [{ at: 0, action: 'fire', level: 100 }]);
  assert.deepEqual(planCue({ ...fire(1), action: 'flash' }), [{ at: 0, action: 'flash', level: 100 }, { at: 500, action: 'flash-off' }]);
});

test('planCue: several times are even on/off pulses across the window, ending off', () => {
  const steps = planCue({ ...fire(7), action: 'swop', times: 5, seconds: 5 });
  assert.equal(steps.length, 10);
  assert.deepEqual(steps.slice(0, 4), [
    { at: 0, action: 'swop', level: 100 }, { at: 500, action: 'swop-off' },
    { at: 1000, action: 'swop', level: 100 }, { at: 1500, action: 'swop-off' },
  ]);
  assert.equal(steps.at(-1).at, 4500);
  assert.deepEqual(planCue({ ...fire(7), action: 'level', level: 40, times: 2, seconds: 1 })[1], { at: 250, action: 'level', level: 0 });
});

test('Titan URLs for each action', () => {
  const titan = { host: 'localhost', port: 4430, ...DEFAULT_URLS };
  assert.equal(buildUrl(titan, titan.flashUrl, { userNumber: 9 }), 'http://localhost:4430/titan/script/2/Playbacks/FlashPlayback?handle_userNumber=9');
  assert.equal(buildUrl(titan, titan.levelUrl, { userNumber: 9, level: '0.6' }),
    'http://localhost:4430/titan/script/2/Playbacks/SetPlaybackLevel?srcHandle_userNumber=9&level_level=0.6');
});
