// Run from the repo root:  node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../Code/telemetry.js');

const day = (s) => new Date(s + 'T12:00:00'); // local noon avoids TZ edge cases

function useOnDays(state, feature, days) {
  days.forEach(d => T.tlApplyUse(state, feature, day(d)));
  return state;
}

test('new state has an install ID and zeroed counters', () => {
  const s = T.tlNewState(day('2026-11-01'));
  assert.ok(s.installId && s.installId.length > 8);
  assert.equal(s.installedDay, '2026-11-01');
  for (const f of ['tracker', 'outreach', 'autofill']) assert.equal(s.usage[f].count, 0);
});

test('normalize keeps an existing install ID (updates do not regenerate it)', () => {
  const s = T.tlNewState();
  const id = s.installId;
  delete s.usage.autofill; // simulate older stored shape
  const n = T.tlNormalize(s);
  assert.equal(n.installId, id);
  assert.equal(n.usage.autofill.count, 0);
});

test('normalize creates fresh state when nothing is stored', () => {
  assert.ok(T.tlNormalize(undefined).installId);
});

test('multiple uses in one day count as one distinct day', () => {
  const s = T.tlNewState();
  useOnDays(s, 'tracker', ['2026-11-01', '2026-11-01', '2026-11-01']);
  assert.equal(s.usage.tracker.count, 3);
  assert.equal(s.usage.tracker.days, 1);
});

test('first prompt fires on the 3rd distinct day, not the 3rd click', () => {
  const s = T.tlNewState();
  useOnDays(s, 'tracker', ['2026-11-01', '2026-11-01', '2026-11-01', '2026-11-01']);
  assert.equal(T.tlDuePrompt(s, 'tracker'), null);
  useOnDays(s, 'tracker', ['2026-11-03']);
  assert.equal(T.tlDuePrompt(s, 'tracker'), null);
  useOnDays(s, 'tracker', ['2026-11-06']);
  assert.equal(T.tlDuePrompt(s, 'tracker', day('2026-11-06')), 'first');
});

test('whichever feature reaches 3 days first triggers the prompt, for that feature', () => {
  const s = T.tlNewState();
  useOnDays(s, 'outreach', ['2026-11-01', '2026-11-02', '2026-11-03']);
  useOnDays(s, 'tracker', ['2026-11-01']);
  assert.equal(T.tlDuePrompt(s, 'tracker'), null);
  assert.equal(T.tlDuePrompt(s, 'outreach'), 'first');
});

test('autofill is counted but never triggers a prompt', () => {
  const s = T.tlNewState();
  useOnDays(s, 'autofill', ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
  assert.equal(s.usage.autofill.days, 4);
  assert.equal(T.tlDuePrompt(s, 'autofill'), null);
});

test('a shown first prompt does not fire again', () => {
  const s = T.tlNewState();
  useOnDays(s, 'tracker', ['2026-11-01', '2026-11-02', '2026-11-03']);
  T.tlMarkShown(s, 'first', 'tracker', day('2026-11-03'));
  useOnDays(s, 'tracker', ['2026-11-04']);
  assert.equal(T.tlDuePrompt(s, 'tracker', day('2026-11-04')), null);
});

test('second prompt needs 8 days AND 14 days since the first prompt', () => {
  const s = T.tlNewState();
  useOnDays(s, 'tracker', ['2026-11-01', '2026-11-02', '2026-11-03']);
  T.tlMarkShown(s, 'first', 'tracker', day('2026-11-03'));
  // 8 distinct days reached quickly, but cooldown not met
  useOnDays(s, 'tracker', ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  assert.equal(s.usage.tracker.days, 8);
  assert.equal(T.tlDuePrompt(s, 'tracker', day('2026-11-08')), null);
  // cooldown met on day 14 after the first prompt
  useOnDays(s, 'tracker', ['2026-11-17']);
  assert.equal(T.tlDuePrompt(s, 'tracker', day('2026-11-17')), 'second');
  T.tlMarkShown(s, 'second', 'tracker', day('2026-11-17'));
  useOnDays(s, 'tracker', ['2026-12-20']);
  assert.equal(T.tlDuePrompt(s, 'tracker', day('2026-12-20')), null, 'never more than two prompts');
});

test('day math crosses month and year boundaries', () => {
  assert.equal(T.tlDaysBetween('2026-12-25', '2027-01-08'), 14);
  assert.equal(T.tlDaysBetween('2026-02-27', '2026-03-01'), 2);
});

test('payload contains counts only — no content fields', () => {
  const s = T.tlNewState(day('2026-11-01'));
  useOnDays(s, 'tracker', ['2026-11-01', '2026-11-02', '2026-11-03']);
  s.sheetsLogCount = 2;
  T.tlMarkShown(s, 'first', 'tracker', day('2026-11-03'));
  const p = T.tlBuildPayload(s, 'first', { response: 'up' }, '3.1', day('2026-11-10'));
  assert.deepEqual(Object.keys(p).sort(), [
    'autofillCount', 'autofillDays', 'comment', 'daysSinceInstall', 'downReason', 'email',
    'extVersion', 'feature', 'installId', 'outreachCount', 'outreachDays', 'priorTool',
    'prompt', 'response', 'settingsOpened', 'setupCompleted', 'sheetsLogCount', 'token',
    'trackerCount', 'trackerDays',
  ]);
  assert.equal(p.trackerCount, 3);
  assert.equal(p.trackerDays, 3);
  assert.equal(p.sheetsLogCount, 2);
  assert.equal(p.daysSinceInstall, 9);
  assert.equal(p.feature, 'tracker');
  assert.equal(p.token, T.TELEMETRY_TOKEN);
});

test('answer cleaning: enums allowlisted, comment capped, thumbs-up drops down-only fields', () => {
  const a = T.tlCleanAnswer({ response: 'up', priorTool: 'spreadsheet', downReason: 'effort', comment: 'x'.repeat(500) });
  assert.equal(a.priorTool, '');
  assert.equal(a.downReason, '');
  assert.equal(a.comment.length, 280);
  const b = T.tlCleanAnswer({ response: 'down', priorTool: 'spreadsheet', downReason: 'lowVolume' });
  assert.equal(b.priorTool, 'spreadsheet');
  assert.equal(b.downReason, 'lowVolume');
  const c = T.tlCleanAnswer({ response: 'hack', priorTool: '=IMPORTXML()' });
  assert.equal(c.response, 'dismissed');
  assert.equal(c.priorTool, '');
});

test('email is kept only if it looks like an email', () => {
  assert.equal(T.tlCleanAnswer({ response: 'up', email: 'a@b.co' }).email, 'a@b.co');
  assert.equal(T.tlCleanAnswer({ response: 'up', email: 'not an email' }).email, '');
});

test('a prompt shown but never sent is reported once, as dismissed', () => {
  const s = T.tlNewState();
  useOnDays(s, 'tracker', ['2026-11-01', '2026-11-02', '2026-11-03']);
  T.tlMarkShown(s, 'first', 'tracker');
  const out = T.tlCollectUnreported(s, '3.1');
  assert.equal(out.length, 1);
  assert.equal(out[0].response, 'dismissed');
  assert.equal(T.tlCollectUnreported(s, '3.1').length, 0, 'not reported twice');
});

test('a thumb clicked before the popup closed is preserved, not lost', () => {
  const s = T.tlNewState();
  useOnDays(s, 'tracker', ['2026-11-01', '2026-11-02', '2026-11-03']);
  T.tlMarkShown(s, 'first', 'tracker');
  s.prompts.first.draft = T.tlCleanAnswer({ response: 'down', downReason: 'lowVolume' });
  const out = T.tlCollectUnreported(s, '3.1');
  assert.equal(out[0].response, 'down');
  assert.equal(out[0].downReason, 'lowVolume');
});

test('outbox is capped and drops the oldest entries', () => {
  let box = [];
  for (let i = 0; i < T.OUTBOX_MAX + 5; i++) box = T.tlAddToOutbox(box, { n: i });
  assert.equal(box.length, T.OUTBOX_MAX);
  assert.equal(box[0].payload.n, 5);
});
