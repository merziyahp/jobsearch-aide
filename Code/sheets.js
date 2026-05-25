// sheets.js - Google Sheets integration
// Sheet ID and tab name are read from storage (set in Settings tab)
// — no personal data hardcoded in this file

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getSheetsConfig() {
  const settings = await loadSettings();
  return {
    sheetId: settings.sheetId || '',
    tabName: settings.tabName || 'Sheet1',
  };
}

// Column order (1-indexed for Sheets API):
// A=1  Company Name
// B=2  List Role Title
// C=3  URL
// D=4  Applied  → "y"
// E=5  Date Applied
// F=6  Fit Level (blank)
// G=7  Status
// H=8  Resume Used (blank)
// I=9  CoverLetter? (blank)
// J=10 Referral? (blank)
// K=11 Notes on Job Post (blank)
// L=12 Industry (blank)
// M=13 Size of Organization (blank)
// N=14 Call Notes/Next Steps (blank)

async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive, scopes: SCOPES }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(new Error(chrome.runtime.lastError?.message || 'Auth failed'));
      } else {
        resolve(token);
      }
    });
  });
}

function buildRow(company, role, url, status, fitLevel = '') {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric'
  });
  return [
    company,                    // A
    role,                       // B
    url,                        // C
    status === 'Applied' ? 'y' : '', // D
    date,                       // E
    fitLevel, // F Fit Level
    status,   // G Status
    '',       // H Resume Used
    '',       // I CoverLetter?
    '',       // J Referral?
    '',       // K Notes
    '',       // L Industry
    '',       // M Size
    '',       // N Call Notes
  ];
}

async function getSheetValues(token, sheetId, tabName) {
  const range = encodeURIComponent(`${tabName}!A:C`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.values || [];
}

async function findRowByUrl(token, url, sheetId, tabName) {
  const values = await getSheetValues(token, sheetId, tabName);
  if (!values) return null;
  // Skip header row (row 1), look for URL match in column C (index 2)
  for (let i = 1; i < values.length; i++) {
    if (values[i][2] && values[i][2].trim() === url.trim()) {
      return i + 1; // 1-indexed sheet row number
    }
  }
  return null;
}

async function updateRow(token, rowNum, row, sheetId, tabName) {
  const range = encodeURIComponent(`${tabName}!A${rowNum}:N${rowNum}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Sheets update error ${res.status}`);
  }
  return { updated: true, row: rowNum };
}

async function appendRow(token, row, sheetId, tabName) {
  const range = encodeURIComponent(`${tabName}!A:N`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Sheets append error ${res.status}`);
  }
  return { updated: false };
}

async function logToSheets({ company, role, url, status = 'Applied', fitLevel = '', overwrite = false }) {
  const { sheetId, tabName } = await getSheetsConfig();
  if (!sheetId) throw new Error('No Sheet ID set — add it in Settings');

  let token = await getAuthToken(true);
  const row = buildRow(company, role, url, status, fitLevel);

  try {
    if (overwrite) {
      const existingRow = await findRowByUrl(token, url, sheetId, tabName);
      if (existingRow) {
        return await updateRow(token, existingRow, row, sheetId, tabName);
      }
    }
    return await appendRow(token, row, sheetId, tabName);
  } catch (e) {
    if (e.message.includes('401') || e.message.includes('invalid')) {
      await revokeToken(token);
      token = await getAuthToken(true);
      if (overwrite) {
        const existingRow = await findRowByUrl(token, url, sheetId, tabName);
        if (existingRow) return await updateRow(token, existingRow, row, sheetId, tabName);
      }
      return await appendRow(token, row, sheetId, tabName);
    }
    throw e;
  }
}

async function revokeToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve);
  });
}

async function fetchSheetTabs(sheetId) {
  const token = await getAuthToken(false).catch(() => null);
  if (!token) return [];
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.sheets || []).map(s => s.properties.title);
}

async function isSignedIn() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false, scopes: SCOPES }, (token) => {
      resolve(!!token && !chrome.runtime.lastError);
    });
  });
}
