const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadSheets({ fetchImpl, token = 'test-token' }) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'Code', 'sheets.js'), 'utf8');
  const context = {
    fetch: fetchImpl,
    chrome: {
      runtime: { lastError: null },
      identity: {
        getAuthToken(_options, callback) {
          callback(token);
        },
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test('fetchSheetMetadata returns spreadsheet title and tab names', async () => {
  let request;
  const sheets = loadSheets({
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        async json() {
          return {
            properties: { title: 'JobSearch Aide Tracker' },
            sheets: [
              { properties: { title: 'Applications' } },
              { properties: { title: 'Archive' } },
            ],
          };
        },
      };
    },
  });

  const metadata = await sheets.fetchSheetMetadata('sheet-123');

  assert.deepEqual(JSON.parse(JSON.stringify(metadata)), {
    title: 'JobSearch Aide Tracker',
    tabs: ['Applications', 'Archive'],
  });
  assert.match(request.url, /spreadsheets\/sheet-123/);
  assert.match(request.url, /properties\.title/);
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
});
