const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise popup flows with no preloaded content script, as in activeTab mode.
function loadPopup({ denyInjection = false } = {}) {
  const injections = [];
  const messages = [];
  const loaded = new Set();
  const data = { company: 'Example', role: 'Engineer', markdown: '# Job' };
  const elements = new Map();
  const runtime = { lastError: null };
  const context = {
    document: {
      querySelectorAll: () => [],
      addEventListener() {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {
          style: {}, classList: { add() {}, remove() {} },
        });
        return elements.get(id);
      },
    },
    setTimeout: callback => callback(),
    loadProfile: async () => ({ firstName: 'Test', email: 'test@example.com' }),
    Telemetry: { recordUse() {} },
    chrome: {
      runtime,
      scripting: {
        executeScript(request, callback) {
          injections.push(request);
          if (!denyInjection) loaded.add(request.files[0]);
          runtime.lastError = denyInjection ? { message: 'Cannot access page' } : null;
          callback?.();
          runtime.lastError = null;
          return Promise.resolve();
        },
      },
      tabs: {
        sendMessage(tabId, message, callback) {
          messages.push({ tabId, ...message });
          const script = message.action === 'autofill' ? 'autofill.js' : 'content.js';
          runtime.lastError = loaded.has(script) ? null : { message: 'No receiver' };
          callback(loaded.has(script)
            ? { success: true, data, results: { filled: 2, sensitive: 0 } }
            : undefined);
          runtime.lastError = null;
        },
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../Code/popup.js'), 'utf8'), context);
  context.populateFields = () => {};
  return { context, injections, messages, data, elements };
}

for (const method of ['doExtract', 'doExtractOutreach']) {
  test(`${method} injects on first use and reuses the receiver on reopening`, async () => {
    const { context, injections, data } = loadPopup();
    const result = await context[method](42);
    assert.deepEqual(method === 'doExtract' ? result : result.data, data);
    await context[method](42);
    assert.equal(injections.length, 1);
    assert.equal(injections[0].target.tabId, 42);
    assert.equal(injections[0].files[0], 'content.js');
  });
}

test('job extraction reports inaccessible pages without hanging', async () => {
  const { context, elements } = loadPopup({ denyInjection: true });
  assert.equal(await context.doExtract(42), null);
  assert.match(elements.get('save-status').textContent, /Could not read page/);
});

test('autofill injects on demand and sends the saved profile to the active tab', async () => {
  const { context, injections, messages, elements } = loadPopup();
  await context.runAutofill(42);
  assert.equal(injections[0].files[0], 'autofill.js');
  assert.equal(injections[0].target.tabId, 42);
  assert.equal(messages[0].tabId, 42);
  assert.equal(messages[0].profile.firstName, 'Test');
  assert.match(elements.get('autofill-result').innerHTML, /2/);
});
