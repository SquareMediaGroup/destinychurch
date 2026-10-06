const test = require('node:test');
const assert = require('node:assert/strict');
const { ShowState } = require('../lib/state');
const { buildUrl } = require('../lib/titan');

const make = () => new ShowState({ seats: ['1', '2', '3', '4'], debounceMs: 500 });

test('an X latches until reset', () => {
  const s = make();
  assert.equal(s.press('1', 0).accepted, true);
  assert.deepEqual(s.press('1', 1000), { accepted: false, reason: 'already-buzzed' });
  assert.equal(s.snapshot().xs['1'], true);
  s.reset();
  assert.equal(s.snapshot().xs['1'], false);
  assert.equal(s.press('1', 2000).accepted, true);
});

test('judges are independent', () => {
  const s = make();
  assert.equal(s.press('1', 0).accepted, true);
  assert.equal(s.press('2', 10).accepted, true);
  assert.deepEqual(s.snapshot().xs, { 1: true, 2: true, 3: false, 4: false });
});

test('double tap after reset is debounced', () => {
  const s = make();
  s.press('3', 0);
  s.reset();
  assert.deepEqual(s.press('3', 100), { accepted: false, reason: 'debounced' });
  assert.equal(s.press('3', 700).accepted, true);
});

test('golden fires once until reset', () => {
  const s = make();
  assert.equal(s.pressGolden(0).accepted, true);
  assert.deepEqual(s.pressGolden(1000), { accepted: false, reason: 'already-golden' });
  s.reset();
  assert.equal(s.pressGolden(2000).accepted, true);
});

test('lock ignores every press and leaves state alone', () => {
  const s = make();
  s.setLocked(true);
  assert.deepEqual(s.press('1', 0), { accepted: false, reason: 'locked' });
  assert.deepEqual(s.pressGolden(0), { accepted: false, reason: 'locked' });
  assert.equal(s.snapshot().xs['1'], false);
  s.setLocked(false);
  assert.equal(s.press('1', 5000).accepted, true);
});

test('allX is true only once every judge has buzzed', () => {
  const s = make();
  ['1', '2', '3'].forEach((seat, i) => s.press(seat, i));
  assert.equal(s.allX(), false);
  s.press('4', 10);
  assert.equal(s.allX(), true);
  s.reset();
  assert.equal(s.allX(), false);
});

test('unknown seat is rejected', () => {
  assert.deepEqual(make().press('9', 0), { accepted: false, reason: 'unknown-seat' });
});

test('titan fire URL is filled from the template', () => {
  const url = buildUrl(
    { host: 'localhost', port: 4430 },
    '/titan/script/2/Playbacks/FirePlaybackAtLevel?handle_userNumber={userNumber}&level_level=1&alwaysRefire=true',
    { userNumber: 110 },
  );
  assert.equal(url, 'http://localhost:4430/titan/script/2/Playbacks/FirePlaybackAtLevel?handle_userNumber=110&level_level=1&alwaysRefire=true');
});
