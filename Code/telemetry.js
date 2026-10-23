// telemetry.js — Anonymous usage counts + in-popup feedback prompt
//
// What this records: an anonymous random install ID, how many times and on how
// many distinct days each feature was used, whether Settings was opened / setup
// was completed, and the user's answer to at most two feedback prompts.
//
// What this NEVER records: company names, job titles, URLs, page content,
// LinkedIn contacts, sheet IDs, tab names, or anything from the autofill profile.
//
// Loaded by popup.html (window) and background.js (importScripts), and required
// by tests/telemetry.test.js (Node). Pure logic is separated from chrome.* calls
// so it can be tested without a browser.

// ── Config ────────────────────────────────────────────────────────────────────
// Paste the Apps Script web-app URL here (see docs/apps-script/README.md).
// While it's empty, nothing is sent — responses wait in the local outbox.
const TELEMETRY_URL = 'https://script.google.com/macros/s/AKfycbwEd8WCXEym9MuHai8WndmVDRtcK8hGleInPlEm2ZQYPwdBalbPN9kBLN0OEJoLnEtl6g/exec';
// Must match TOKEN in the Apps Script. Not a secret (extension code is readable);
// it only filters casual junk posts.
const TELEMETRY_TOKEN = 'jsa-feedback-v1';

const TELEMETRY_KEY = 'telemetry';
const OUTBOX_KEY = 'telemetryOutbox';
const OUTBOX_MAX = 25;
const MAX_SEND_ATTEMPTS = 10;

// Features that are counted. Only PROMPT_FEATURES can trigger a feedback prompt.
const FEATURES = ['tracker', 'outreach', 'autofill'];
const PROMPT_FEATURES = ['tracker', 'outreach'];

// Prompt rules (see docs/usage-tracking-implementation-plan.md §5)
const FIRST_PROMPT_DAYS = 3;     // distinct days of use of the triggering feature
const SECOND_PROMPT_DAYS = 8;
const SECOND_PROMPT_COOLDOWN = 14; // days after the first prompt was shown

const ALLOWED = {
  response: ['up', 'down', 'dismissed'],
  priorTool: ['', 'nothing', 'spreadsheet', 'app', 'other'],
  downReason: ['', 'lowVolume', 'effort', 'missing', 'other'],
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

function tlLocalDay(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function tlDaysBetween(dayA, dayB) {
  if (!dayA || !dayB) return 0;
  const a = Date.UTC(...dayA.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  const b = Date.UTC(...dayB.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  return Math.round((b - a) / 86400000);
}

function tlRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function tlNewState(now = new Date()) {
  const usage = {};
  FEATURES.forEach(f => { usage[f] = { count: 0, days: 0, firstDay: null, lastDay: null }; });
  return {
    installId: tlRandomId(),
    installedDay: tlLocalDay(now),
    usage,
    sheetsLogCount: 0,
    setup: { settingsOpened: false, setupCompleted: false },
    prompts: {
      first: { shown: false, shownDay: null, feature: null, reported: false, draft: null },
      second: { shown: false, shownDay: null, feature: null, reported: false, draft: null },
    },
  };
}

// Fill in anything missing (older stored state, new features added later).
function tlNormalize(state, now = new Date()) {
  const fresh = tlNewState(now);
  if (!state || !state.installId) return fresh;
  state.usage = state.usage || {};
  FEATURES.forEach(f => { if (!state.usage[f]) state.usage[f] = fresh.usage[f]; });
  state.setup = { ...fresh.setup, ...(state.setup || {}) };
  state.prompts = state.prompts || {};
  ['first', 'second'].forEach(p => { state.prompts[p] = { ...fresh.prompts[p], ...(state.prompts[p] || {}) }; });
  if (typeof state.sheetsLogCount !== 'number') state.sheetsLogCount = 0;
  if (!state.installedDay) state.installedDay = fresh.installedDay;
  return state;
}

// Record one successful use. Distinct days are counted by comparing to lastDay,
// so storage stays bounded (no growing list of dates).
function tlApplyUse(state, feature, now = new Date()) {
  if (!FEATURES.includes(feature)) return state;
  const today = tlLocalDay(now);
  const u = state.usage[feature];
  u.count += 1;
  if (u.lastDay !== today) u.days += 1;
  if (!u.firstDay) u.firstDay = today;
  u.lastDay = today;
  return state;
}

// Which prompt (if any) should be shown right after a use of `feature`.
function tlDuePrompt(state, feature, now = new Date()) {
  if (!PROMPT_FEATURES.includes(feature)) return null;
  const days = state.usage[feature].days;
  const { first, second } = state.prompts;
  if (!first.shown) return days >= FIRST_PROMPT_DAYS ? 'first' : null;
  if (!second.shown && days >= SECOND_PROMPT_DAYS &&
      tlDaysBetween(first.shownDay, tlLocalDay(now)) >= SECOND_PROMPT_COOLDOWN) {
    return 'second';
  }
  return null;
}

function tlMarkShown(state, prompt, feature, now = new Date()) {
  const p = state.prompts[prompt];
  p.shown = true;
  p.shownDay = tlLocalDay(now);
  p.feature = feature;
  p.reported = false;
  p.draft = { response: 'dismissed', comment: '', priorTool: '', downReason: '', email: '' };
  return state;
}

function tlCleanAnswer(answer = {}) {
  const pick = (k, v) => (ALLOWED[k].includes(v) ? v : '');
  const email = String(answer.email || '').trim().slice(0, 120);
  return {
    response: pick('response', answer.response) || 'dismissed',
    comment: String(answer.comment || '').trim().slice(0, 280),
    priorTool: answer.response === 'down' ? pick('priorTool', answer.priorTool) : '',
    downReason: answer.response === 'down' ? pick('downReason', answer.downReason) : '',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
  };
}

// The ONLY thing that ever leaves the browser.
function tlBuildPayload(state, prompt, answer, version, now = new Date()) {
  const a = tlCleanAnswer(answer);
  const u = state.usage;
  return {
    token: TELEMETRY_TOKEN,
    installId: state.installId,
    prompt,
    feature: state.prompts[prompt].feature || '',
    response: a.response,
    comment: a.comment,
    priorTool: a.priorTool,
    downReason: a.downReason,
    email: a.email,
    trackerCount: u.tracker.count,
    trackerDays: u.tracker.days,
    sheetsLogCount: state.sheetsLogCount,
    outreachCount: u.outreach.count,
    outreachDays: u.outreach.days,
    autofillCount: u.autofill.count,
    autofillDays: u.autofill.days,
    settingsOpened: !!state.setup.settingsOpened,
    setupCompleted: !!state.setup.setupCompleted,
    daysSinceInstall: Math.max(0, tlDaysBetween(state.installedDay, tlLocalDay(now))),
    extVersion: version || '',
  };
}

// Prompts that were shown but never reported (popup closed, or thumb clicked
// without pressing Send). Returns payloads to send; marks them reported.
function tlCollectUnreported(state, version, now = new Date()) {
  const out = [];
  ['first', 'second'].forEach(p => {
    const pr = state.prompts[p];
    if (pr.shown && !pr.reported) {
      out.push(tlBuildPayload(state, p, pr.draft || {}, version, now));
      pr.reported = true;
      pr.draft = null;
    }
  });
  return out;
}

function tlAddToOutbox(outbox, payload) {
  const list = Array.isArray(outbox) ? outbox.slice() : [];
  list.push({ payload, attempts: 0 });
  while (list.length > OUTBOX_MAX) list.shift();
  return list;
}

// ── chrome.storage wrappers (browser only) ────────────────────────────────────

function tlStorageGet(key) {
  return new Promise(resolve => chrome.storage.local.get([key], r => resolve(r[key])));
}
function tlStorageSet(key, value) {
  return new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve));
}

async function tlLoad() {
  const raw = await tlStorageGet(TELEMETRY_KEY);
  const state = tlNormalize(raw);
  if (!raw || !raw.installId) await tlStorageSet(TELEMETRY_KEY, state);
  return state;
}

function tlVersion() {
  try { return chrome.runtime.getManifest().version; } catch (e) { return ''; }
}

// Popup → service worker. The worker owns the outbox and the network call, so a
// closing popup can't kill a send.
function tlSend(msg) {
  try {
    const p = chrome.runtime.sendMessage(msg);
    if (p && p.catch) p.catch(() => {});
  } catch (e) {}
}

function tlQueue(payloads) {
  if (payloads.length) tlSend({ type: 'telemetry:queue', payloads });
}

// Public API used by popup.js. Every function swallows its own errors:
// telemetry must never break saving a job or logging a contact.
const Telemetry = {
  // Call once when the popup opens.
  async init() {
    try {
      const state = await tlLoad();
      const pending = tlCollectUnreported(state, tlVersion());
      await tlStorageSet(TELEMETRY_KEY, state);
      tlQueue(pending);
      tlSend({ type: 'telemetry:flush' });
    } catch (e) {}
  },

  // Record a successful use. Returns 'first' | 'second' | null.
  async recordUse(feature) {
    try {
      const state = await tlLoad();
      tlApplyUse(state, feature);
      await tlStorageSet(TELEMETRY_KEY, state);
      return tlDuePrompt(state, feature);
    } catch (e) { return null; }
  },

  async recordSheetsLog() {
    try {
      const state = await tlLoad();
      state.sheetsLogCount += 1;
      await tlStorageSet(TELEMETRY_KEY, state);
    } catch (e) {}
  },

  async markSettingsOpened() {
    try {
      const state = await tlLoad();
      if (state.setup.settingsOpened) return;
      state.setup.settingsOpened = true;
      await tlStorageSet(TELEMETRY_KEY, state);
    } catch (e) {}
  },

  async markSetupCompleted() {
    try {
      const state = await tlLoad();
      if (state.setup.setupCompleted) return;
      state.setup.setupCompleted = true;
      await tlStorageSet(TELEMETRY_KEY, state);
    } catch (e) {}
  },

  async markPromptShown(prompt, feature) {
    try {
      const state = await tlLoad();
      tlMarkShown(state, prompt, feature);
      await tlStorageSet(TELEMETRY_KEY, state);
    } catch (e) {}
  },

  // Save the in-progress answer, so a thumb click survives the popup closing.
  async saveDraft(prompt, answer) {
    try {
      const state = await tlLoad();
      if (!state.prompts[prompt].shown || state.prompts[prompt].reported) return;
      state.prompts[prompt].draft = tlCleanAnswer(answer);
      await tlStorageSet(TELEMETRY_KEY, state);
    } catch (e) {}
  },

  // Send / Skip. Pass { response: 'dismissed' } for Skip.
  async submit(prompt, answer) {
    try {
      const state = await tlLoad();
      const pr = state.prompts[prompt];
      if (!pr.shown || pr.reported) return;
      const payload = tlBuildPayload(state, prompt, answer, tlVersion());
      pr.reported = true;
      pr.draft = null;
      await tlStorageSet(TELEMETRY_KEY, state);
      tlQueue([payload]);
    } catch (e) {}
  },
};

// ── Node export for tests ─────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tlLocalDay, tlDaysBetween, tlNewState, tlNormalize, tlApplyUse, tlDuePrompt,
    tlMarkShown, tlCleanAnswer, tlBuildPayload, tlCollectUnreported, tlAddToOutbox,
    OUTBOX_MAX, MAX_SEND_ATTEMPTS, TELEMETRY_TOKEN,
  };
}
