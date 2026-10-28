const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJudgeCount, parseStyle, normaliseJudges, applyNameEdit, activeJudges } = require('../lib/judges');
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

test('applyNameEdit renames judges and the golden buzzer, tidying spaces', () => {
  const { judges, golden } = applyNameEdit(four, { name: 'Golden Buzzer' }, { judges: { 1: '  Pastor   Dave ', 9: 'Nobody' }, golden: 'Gold!' });
  assert.equal(judges[0].name, 'Pastor Dave');
  assert.equal(judges[1].name, 'J2');
  assert.equal(golden.name, 'Gold!');
  assert.equal(four[0].name, 'J1');
});

test('applyNameEdit rejects empty and over-long names', () => {
  assert.throws(() => applyNameEdit(four, { name: 'G' }, { judges: { 2: '   ' } }), /Judge 2: type a name/);
  assert.throws(() => applyNameEdit(four, { name: 'G' }, { golden: 'x'.repeat(41) }), /Golden buzzer: keep the name/);
});

test('applyNameEdit sets and clears what each judge looks for', () => {
  const { judges } = applyNameEdit(four, { name: 'G' }, { categories: { 1: ' Courage ', 2: '' } });
  assert.equal(judges[0].category, 'Courage');
  assert.equal(judges[1].category, '');
  assert.equal(judges[2].category, undefined);
  assert.throws(() => applyNameEdit(four, { name: 'G' }, { categories: { 3: 'x'.repeat(31) } }), /Judge 3 looks for: keep it/);
});

test('parseStyle accepts celebrate and buzzer only', () => {
  assert.equal(parseStyle('celebrate'), 'celebrate');
  assert.equal(parseStyle('buzzer'), 'buzzer');
  assert.throws(() => parseStyle('party'), /must be celebrate or buzzer/);
});
