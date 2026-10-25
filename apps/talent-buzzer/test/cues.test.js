const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCue, applyCueEdit } = require('../lib/cues');

const seats = ['1', '2', '3', '4'];
const current = { x: { 1: 101, 2: 102, 3: 103, 4: 104 }, golden: 110, allX: null, reset: null, releaseOnReset: true };

test('parseCue accepts whole numbers and treats empty as none', () => {
  assert.equal(parseCue('205'), 205);
  assert.equal(parseCue(' 7 '), 7);
  assert.equal(parseCue(42), 42);
  assert.equal(parseCue(''), null);
  assert.equal(parseCue(null), null);
  assert.equal(parseCue(undefined), null);
});

test('parseCue rejects anything that is not a playback number', () => {
  for (const bad of ['abc', '1.5', '0', '-3', '100000', 'NaN', '1e3x', true]) {
    assert.throws(() => parseCue(bad), /not a playback number/, String(bad));
  }
});

test('applyCueEdit changes only the fields sent', () => {
  const next = applyCueEdit(current, { x: { 2: '220' }, allX: '120' }, seats);
  assert.deepEqual(next, { ...current, x: { 1: 101, 2: 220, 3: 103, 4: 104 }, allX: 120 });
  assert.equal(current.x[2], 102, 'input is not mutated');
});

test('applyCueEdit clears a cue when left empty', () => {
  assert.equal(applyCueEdit(current, { golden: '' }, seats).golden, null);
});

test('applyCueEdit ignores unknown seats and names the bad field', () => {
  assert.deepEqual(applyCueEdit(current, { x: { 9: 999 } }, seats).x, current.x);
  assert.throws(() => applyCueEdit(current, { x: { 3: 'oops' } }, seats), /^Error: Judge 3:/);
  assert.throws(() => applyCueEdit(current, { golden: '1.5' }, seats), /^Error: Golden:/);
});
