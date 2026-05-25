// outreach.js — Google Sheets integration for outreach/contact tracker
// Sheet ID and tab name are read from storage (set in Settings tab)
// — no personal data hardcoded in this file
//
// Outreach sheet column map:
// A=1  Company
// B=2  Contact Name
// C=3  Role
// D=4  LinkedIn URL          ← primary duplicate key
// E=5  How We Connected
// F=6  Last Follow Up        ← written for Pending 3B, Pending 7B, Message Sent
// G=7  Status
// H=8  Notes/Outcome         ← not written by extension
// I=9  Next Action Date      ← formula-driven, not written by extension
// J=10 Action Needed?        ← formula-driven, not written by extension
// K=11 Action Notes          ← not written by extension
// L=12 (formula col)         ← not written by extension
// M=13 (formula col)         ← not written by extension
// N=14 Date of Original Request ← written only on first Pending save

// Statuses that trigger date writes
const PENDING_STATUSES = ['Pending 3B', 'Pending 7B'];
const MESSAGE_SENT_STATUS = 'Message Sent';
const PROSPECT_STATUS = 'Prospect';

// ── Config ────────────────────────────────────────────────────────────────────

async function getOutreachConfig() {
  const settings = await loadSettings();
  return {
    sheetId: settings.outreachSheetId || '',
    tabName: settings.outreachTabName || 'Sheet1',
  };
}

// ── Date helper ───────────────────────────────────────────────────────────────

function today() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric'
  });
}

// ── Row builders ──────────────────────────────────────────────────────────────

// Build a full new row for appending
// Columns not written by extension are left blank (formulas in sheet handle them)
function buildNewRow(contact, status) {
  const { company, name, role, url, howConnected } = contact;
  const date = today();

  const isPending  = PENDING_STATUSES.includes(status);
  const isMsgSent  = status === MESSAGE_SENT_STATUS;

  return [
    company,                        // A — Company
    name,                           // B — Contact Name
    role,                           // C — Role
    url,                            // D — LinkedIn URL
    howConnected || '',             // E — How We Connected
    isPending || isMsgSent          // F — Last Follow Up
      ? date : '',
    status,                         // G — Status
    '',                             // H — Notes/Outcome (manual)
    '',                             // I — Next Action Date (formula)
    '',                             // J — Action Needed? (formula)
    '',                             // K — Action Notes (manual)
    '',                             // L — (formula col)
    '',                             // M — (formula col)
    isPending ? date : '',          // N — Date of Original Request
  ];
}

// Build a sparse update object — only the cells that need changing
// Returns { range, values } ready for a PATCH call
function buildUpdateFields(existingStatus, newStatus, rowNum, tabName) {
  const date = today();
  const updates = {};

  const isPending = PENDING_STATUSES.includes(newStatus);
  const isMsgSent = newStatus === MESSAGE_SENT_STATUS;

  // Always update status (col G = index 6)
  updates.G = newStatus;

  if (isPending || isMsgSent) {
    // Update Last Follow Up (col F = index 5)
    updates.F = date;
  }

  if (isPending && existingStatus === PROSPECT_STATUS) {
    // Prospect → first outreach: also fill Date of Original Request (col N = index 13)
    updates.N = date;
  }

  return updates;
}

// ── Sheet reads ───────────────────────────────────────────────────────────────

// Fetch columns A–N for all rows (skipping header)
async function getOutreachRows(token, sheetId, tabName) {
  const range = encodeURIComponent(`${tabName}!A:N`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.values || [];
}

// Find a row by LinkedIn URL (col D, index 3) — primary duplicate key
// Returns { rowNum, existingStatus } or null
async function findRowByLinkedInUrl(token, url, sheetId, tabName) {
  const values = await getOutreachRows(token, sheetId, tabName);
  if (!values) return null;

  for (let i = 1; i < values.length; i++) {
    const rowUrl = (values[i][3] || '').trim();
    if (rowUrl && rowUrl === url.trim()) {
      return {
        rowNum: i + 1,                          // 1-indexed
        existingStatus: (values[i][6] || '').trim(), // col G
      };
    }
  }
  return null;
}

// Fallback duplicate check by Name + Company (cols B + A) for manual entries
// Returns { rowNum, existingStatus } or null
async function findRowByNameAndCompany(token, name, company, sheetId, tabName) {
  const values = await getOutreachRows(token, sheetId, tabName);
  if (!values) return null;

  const normName    = name.trim().toLowerCase();
  const normCompany = company.trim().toLowerCase();

  for (let i = 1; i < values.length; i++) {
    const rowName    = (values[i][1] || '').trim().toLowerCase(); // col B
    const rowCompany = (values[i][0] || '').trim().toLowerCase(); // col A
    if (rowName === normName && rowCompany === normCompany) {
      return {
        rowNum: i + 1,
        existingStatus: (values[i][6] || '').trim(), // col G
      };
    }
  }
  return null;
}

// ── Sheet writes ──────────────────────────────────────────────────────────────

async function appendOutreachRow(token, row, sheetId, tabName) {
  const range = encodeURIComponent(`${tabName}!A:N`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Sheets append error ${res.status}`);
  }
}

// Update only specific cells in an existing row using PATCH (batchUpdate)
async function updateOutreachRow(token, rowNum, updates, sheetId, tabName) {
  // Build individual range+value pairs for each cell to update
  const data = Object.entries(updates).map(([col, value]) => ({
    range: `${tabName}!${col}${rowNum}`,
    values: [[value]],
  }));

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Sheets update error ${res.status}`);
  }
}

// ── Status transition logic ───────────────────────────────────────────────────

// Returns:
//   { action: 'append' }                         — new contact, write row
//   { action: 'update', rowNum, existingStatus }  — existing contact, update cells
//   { action: 'block',  existingStatus }          — blocked, notify user
function resolveAction(existingMatch, selectedStatus) {
  if (!existingMatch) {
    return { action: 'append' };
  }

  const { rowNum, existingStatus } = existingMatch;
  const isPendingSelected  = PENDING_STATUSES.includes(selectedStatus);
  const isMsgSentSelected  = selectedStatus === MESSAGE_SENT_STATUS;
  const isProspectExisting = existingStatus === PROSPECT_STATUS;
  const isPendingExisting  = PENDING_STATUSES.includes(existingStatus);
  const isMsgSentExisting  = existingStatus === MESSAGE_SENT_STATUS;

  // Prospect → any outreach: force to Pending 3B, fill dates
  if (isProspectExisting && (isPendingSelected || isMsgSentSelected)) {
    return { action: 'update', rowNum, existingStatus, resolvedStatus: 'Pending 3B' };
  }

  // Pending → Message Sent: update Last Follow Up + status
  if (isPendingExisting && isMsgSentSelected) {
    return { action: 'update', rowNum, existingStatus, resolvedStatus: selectedStatus };
  }

  // Message Sent → Message Sent: update Last Follow Up date
  if (isMsgSentExisting && isMsgSentSelected) {
    return { action: 'update', rowNum, existingStatus, resolvedStatus: selectedStatus };
  }

  // All other existing contact cases: block
  // Covers: Pending→Pending, Pending→Prospect, MsgSent→Pending,
  //         MsgSent→Prospect, Prospect→Prospect
  return { action: 'block', existingStatus };
}

// ── Main entry point ──────────────────────────────────────────────────────────

// contact = { company, name, role, url, howConnected }
// selectedStatus = one of the status dropdown values
//
// Returns a result object:
// {
//   outcome: 'saved' | 'updated' | 'blocked' | 'error',
//   status:  the status actually written (may differ from selectedStatus),
//   existingStatus: (if blocked or updated) the status that was already in the sheet,
//   message: human-readable string for display in the popup,
// }
async function logOutreach(contact, selectedStatus) {
  const { sheetId, tabName } = await getOutreachConfig();
  if (!sheetId) {
    return { outcome: 'error', message: 'No Outreach Sheet ID set — add it in Settings.' };
  }

  let token;
  try {
    token = await getAuthToken(true);
  } catch (e) {
    return { outcome: 'error', message: 'Sign-in failed: ' + e.message };
  }

  try {
    // ── Duplicate detection ──
    let existingMatch = null;

    if (contact.url && contact.url.trim()) {
      // Primary key: LinkedIn URL
      existingMatch = await findRowByLinkedInUrl(token, contact.url, sheetId, tabName);
    } else if (contact.name && contact.company) {
      // Fallback key: Name + Company (manual entries)
      existingMatch = await findRowByNameAndCompany(
        token, contact.name, contact.company, sheetId, tabName
      );
    }

    // ── Resolve what action to take ──
    const resolution = resolveAction(existingMatch, selectedStatus);

    if (resolution.action === 'block') {
      return {
        outcome: 'blocked',
        existingStatus: resolution.existingStatus,
        message: `Contact already exists (Status: ${resolution.existingStatus})`,
      };
    }

    if (resolution.action === 'append') {
      const row = buildNewRow(contact, selectedStatus);
      await appendOutreachRow(token, row, sheetId, tabName);
      return {
        outcome: 'saved',
        status: selectedStatus,
        message: `Contact saved (Status: ${selectedStatus})`,
      };
    }

    if (resolution.action === 'update') {
      const { rowNum, existingStatus, resolvedStatus } = resolution;
      const updates = buildUpdateFields(existingStatus, resolvedStatus, rowNum, tabName);
      await updateOutreachRow(token, rowNum, updates, sheetId, tabName);

      // Let the user know if we overrode their status selection
      const overrideNote = resolvedStatus !== selectedStatus
        ? ` (status set to ${resolvedStatus} — first outreach sets to Pending)`
        : '';
      return {
        outcome: 'updated',
        status: resolvedStatus,
        existingStatus,
        message: `Existing contact updated (Status: ${resolvedStatus})${overrideNote}`,
      };
    }

  } catch (e) {
    // Token expired — retry once
    if (e.message.includes('401') || e.message.includes('invalid')) {
      try {
        await revokeToken(token);
        token = await getAuthToken(true);
        // Retry is a simple re-call — uncommon path, acceptable to re-run full logic
        return await logOutreach(contact, selectedStatus);
      } catch (retryErr) {
        return { outcome: 'error', message: 'Auth error: ' + retryErr.message };
      }
    }
    return { outcome: 'error', message: 'Could not save. Check your sheet connection.' };
  }
}
