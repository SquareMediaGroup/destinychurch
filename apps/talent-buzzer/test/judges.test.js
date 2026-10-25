const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJudgeCount, normaliseJudges, activeJudges } = require('../lib/judges');
const { ShowState } = require('../lib/state');

const four = [1, 2, 3, 4].map((n) => ({ seat: String(n), name: `J${n}` }));

test('parseJudgeCount accepts 2 to 4 only', () => {
  assert.equal(parseJudgeCount(2), 2);
  assert.equal(parseJudgeCount('4'), 4);
  for (const bad of [1, 5, 0, '3.5', 'three', null]) assert.throws(() => parseJudgeCount(bad), /must be 2, 3 or 4/, String(bad));
});

test('normaliseJudges keeps a four-judge config as it is', () => {
  assert.deepEqual(normaliseJudges(four), { judges: four, judgeCount: 4 });
  assert.deepEqual(normaliseJudges(four, 3).judgeCount, 3);
});

test('normaliseJudges fills a short list up to four and uses its length as the count', () => {
  const { judges, judgeCount } = normaliseJudges([{ seat: 2, name: 'Amy' }, { seat: '1', name: 'Bob' }]);
  assert.equal(judgeCount, 2);
  assert.deepEqual(judges, [{ seat: '2', name: 'Amy' }, { seat: '1', name: 'Bob' }, { seat: '3', name: 'Judge 3' }, { seat: '4', name: 'Judge 4' }]);
  assert.equal(normaliseJudges([{ seat: '1', name: 'Solo' }]).judgeCount, 2);
});

test('normaliseJudges rejects a bad saved count', () => {
  assert.throws(() => normaliseJudges(four, 6), /must be 2, 3 or 4/);
});

test('activeJudges takes the first judgeCount judges', () => {
  assert.deepEqual(activeJudges({ judges: four, judgeCount: 2 }).map((j) => j.seat), ['1', '2']);
});

test('all X follows the number of judges in use', () => {
  const s = new ShowState({ seats: ['1', '2', '3', '4'], debounceMs: 0 });
  s.setSeats(['1', '2']);
  assert.deepEqual(s.snapshot().xs, { 1: false, 2: false });
  assert.equal(s.press('3').accepted, false);
  s.press('1');
  assert.equal(s.allX(), false);
  s.press('2');
  assert.equal(s.allX(), true);
});
