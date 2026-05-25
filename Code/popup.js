// popup.js

let extractedData = null;
let previewOpen = false;
let sheetsConnected = false;

const $ = id => document.getElementById(id);

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function buildFilename(company, role) {
  const c = sanitize(company) || 'Unknown-Company';
  const r = sanitize(role) || 'Unknown-Role';
  return `${c}-${r}-${getToday()}.md`;
}

function sanitize(str) {
  return (str || '')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}

function updateFilenamePreview() {
  $('filename-preview').textContent = buildFilename($('company').value, $('role').value);
}

function buildContent(company, role) {
  const { url, markdown } = extractedData;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `---\nsource: ${url}\nsaved: ${date}\ncompany: ${company}\nrole: ${role}\n---\n\n${markdown}\n`;
}

function renderPreview() {
  if (!extractedData) return;
  const content = buildContent(
    $('company').value.trim() || 'Unknown-Company',
    $('role').value.trim() || 'Unknown-Role'
  );
  const highlighted = content.split('\n').map(line => {
    if (line.startsWith('---') || /^(source|saved|company|role):/.test(line))
      return `<span class="md-frontmatter">${esc(line)}</span>`;
    if (/^#{1,3} /.test(line)) return `<span class="md-heading">${esc(line)}</span>`;
    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) return `<span class="md-bullet">${esc(line)}</span>`;
    return esc(line);
  }).join('\n');
  $('preview-text').innerHTML = highlighted;
  const words = content.trim().split(/\s+/).length;
  $('preview-chars').textContent = `${content.length.toLocaleString()} chars · ${words.toLocaleString()} words`;
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setStatus(id, msg, type = '') {
  $(id).textContent = msg;
  $(id).className = 'status ' + type;
}

function setStep(id, state) {
  const el = $(id);
  el.className = 'step ' + state;
}

function updateSheetsUI(connected) {
  sheetsConnected = connected;
  if (connected) {
    $('sheets-sublabel').textContent = 'Connected';
    $('btn-connect').textContent = '✓ Connected';
    $('btn-connect').classList.add('connected');
  } else {
    $('sheets-sublabel').textContent = 'Not connected';
    $('btn-connect').textContent = 'Connect';
    $('btn-connect').classList.remove('connected');
  }
}

function decodeHtmlEntities(str) {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

// ── Page extraction ───────────────────────────────────────────────────────────

async function doExtract(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'extract' }, (response) => {
      // Hide spinner
      $('loading').style.display = 'none';

      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
          if (chrome.runtime.lastError) {
            setStatus('save-status', 'Could not read page. Try refreshing.', 'error');
            resolve(null);
            return;
          }
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'extract' }, (r2) => {
              if (chrome.runtime.lastError || !r2?.success) {
                setStatus('save-status', 'Could not read page. Try refreshing.', 'error');
                resolve(null);
                return;
              }
              populateFields(r2.data);
              resolve(r2.data);
            });
          }, 300);
        });
        return;
      }

      if (!response?.success) {
        setStatus('save-status', 'Could not extract page content.', 'error');
        resolve(null);
        return;
      }

      populateFields(response.data);
      resolve(response.data);
    });
  });
}

function populateFields(data) {
  extractedData = data;
  $('company').value = decodeHtmlEntities(data.company || '');
  $('role').value = decodeHtmlEntities(data.role || '');
  updateFilenamePreview();
  if (previewOpen) renderPreview();
}

// ── Download ──────────────────────────────────────────────────────────────────

function downloadFile(filename, content) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
      URL.revokeObjectURL(url);
      if (chrome.runtime.lastError || downloadId === undefined) {
        reject(new Error(chrome.runtime.lastError?.message || 'Download failed'));
      } else {
        resolve(downloadId);
      }
    });
  });
}

// ── Settings tab ──────────────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  'firstName','lastName','email','phone','phoneCountryCode',
  'address','city','state','zip',
  'linkedin','website','github','workAuth',
  'gender','sexualOrient','race','veteran','disability'
];

const SETTINGS_FIELDS = ['sheetId', 'tabName', 'outreachSheetId', 'outreachTabName'];

async function populateTabDropdown(selectId, fieldId, sheetId, savedTab) {
  const tabs = await fetchSheetTabs(sheetId);
  if (!tabs.length) return;
  const sel = $(selectId);
  sel.innerHTML = tabs.map(t => `<option value="${t}"${t === savedTab ? ' selected' : ''}>${t}</option>`).join('');
  $(fieldId).style.display = '';
}

async function loadProfileIntoSettings() {
  const profile = await loadProfile();
  if (profile) {
    PROFILE_FIELDS.forEach(key => {
      const el = $('s-' + key);
      if (el && profile[key]) el.value = profile[key];
    });
    if (profile.requiresSponsorship) $('s-sponsorship').checked = true;
  }

  const settings = await loadSettings();

  // Restore sheet URL inputs
  if (settings.sheetId) $('s-sheetId').value = settings.sheetId;
  if (settings.outreachSheetId) $('s-outreachSheetId').value = settings.outreachSheetId;

  // Auto-fetch tabs for already-configured sheets
  if (settings.sheetId) {
    populateTabDropdown('s-tabName', 's-tabName-field', settings.sheetId, settings.tabName);
  }
  if (settings.outreachSheetId) {
    populateTabDropdown('s-outreachTabName', 's-outreachTabName-field', settings.outreachSheetId, settings.outreachTabName);
  }
}

function extractSheetId(input) {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input.trim();
}

async function saveProfileFromSettings() {
  // Save profile
  const profile = {};
  PROFILE_FIELDS.forEach(key => {
    const el = $('s-' + key);
    if (el) profile[key] = el.value.trim();
  });
  profile.requiresSponsorship = $('s-sponsorship').checked;
  await saveProfile(profile);

  // Save app settings — extract sheet ID from URL if user pasted a full URL
  const existing = await loadSettings();

  const rawSheetId = $('s-sheetId').value.trim();
  if (rawSheetId) existing.sheetId = extractSheetId(rawSheetId);

  const rawOutreachId = $('s-outreachSheetId').value.trim();
  if (rawOutreachId) existing.outreachSheetId = extractSheetId(rawOutreachId);

  // Only save tab names if the dropdown is visible (i.e. tabs were loaded)
  const tabEl = $('s-tabName');
  if ($('s-tabName-field').style.display !== 'none' && tabEl.value) {
    existing.tabName = tabEl.value;
  }
  const outreachTabEl = $('s-outreachTabName');
  if ($('s-outreachTabName-field').style.display !== 'none' && outreachTabEl.value) {
    existing.outreachTabName = outreachTabEl.value;
  }

  await saveSettings(existing);
}

// ── Autofill tab ──────────────────────────────────────────────────────────────

const AUTOFILL_PROFILE_KEYS = [
  'firstName', 'lastName', 'email', 'phone', 'phoneCountryCode',
  'address', 'city', 'state', 'zip', 'country',
  'linkedin', 'website', 'github',
  'workAuth', 'requiresSponsorship',
  'gender', 'sexualOrient', 'race', 'veteran', 'disability'
];

async function runAutofill(tabId) {
  const rawProfile = await loadProfile();
  if (!rawProfile || !Object.values(rawProfile).some(v => v)) {
    setStatus('autofill-status', 'No profile saved — add your info in Settings first.', 'error');
    return;
  }

  // Whitelist — strip any stale or unexpected keys before sending to the page
  const profile = {};
  AUTOFILL_PROFILE_KEYS.forEach(k => { if (rawProfile[k] !== undefined) profile[k] = rawProfile[k]; });

  // Inject autofill script if needed
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['autofill.js'] });
  } catch (e) {
    // Already injected — that's fine
  }

  chrome.tabs.sendMessage(tabId, { action: 'autofill', profile }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      setStatus('autofill-status', 'Could not fill form on this page.', 'error');
      return;
    }

    const { filled, sensitive } = response.results;
    const result = $('autofill-result');
    result.classList.add('visible');
    result.innerHTML = `
      <strong>${filled}</strong> field${filled !== 1 ? 's' : ''} filled &nbsp;·&nbsp;
      <strong>${sensitive}</strong> sensitive field${sensitive !== 1 ? 's' : ''} highlighted (not filled)
      ${sensitive > 0 ? '<br><span style="font-size:11px;color:#888">EEO fields highlighted in yellow — fill manually</span>' : ''}
    `;
    setStatus('autofill-status', '');
  });
}

async function clearAutofill(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['autofill.js'] });
  } catch (e) {}
  chrome.tabs.sendMessage(tabId, { action: 'clearFill' }, () => {
    $('autofill-result').classList.remove('visible');
    setStatus('autofill-status', '');
  });
}

// ── Outreach tab ──────────────────────────────────────────────────────────────

async function doExtractOutreach(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'extractOutreach' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not yet injected — inject and retry
        chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'extractOutreach' }, (r2) => {
              if (chrome.runtime.lastError || !r2?.success) { resolve(null); return; }
              resolve(r2);
            });
          }, 300);
        });
        return;
      }
      if (!response?.success) { resolve(null); return; }
      resolve(response);
    });
  });
}

function populateOutreachFields(data) {
  $('o-name').value    = data.name    || '';
  $('o-company').value = data.company || '';
  $('o-role').value    = data.role    || '';
  $('o-url').value     = data.url     || '';
}

// ── Tab routing ───────────────────────────────────────────────────────────────

function isLinkedInProfile(url) {
  return /linkedin\.com\/in\//.test(url);
}

function switchToTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`panel-${tabName}`).classList.add('active');
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // ── Tab routing — default to Outreach on LinkedIn profile pages ──
  if (isLinkedInProfile(tab.url)) {
    switchToTab('outreach');
    // Auto-extract immediately so fields are populated when user sees the tab
    $('outreach-loading').style.display = 'flex';
    const result = await doExtractOutreach(tab.id);
    $('outreach-loading').style.display = 'none';
    if (result?.data) populateOutreachFields(result.data);
  }

  // Load saved settings
  const settings = await loadSettings();
  if (settings.defaultFolder) $('folder').value = settings.defaultFolder;

  // Check Sheets auth
  isSignedIn().then(updateSheetsUI).catch(() => updateSheetsUI(false));

  // Extract page content (blocked on chrome:// and extension pages)
  if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    doExtract(tab.id);
  } else {
    $('loading').style.display = 'none';
    setStatus('save-status', 'Cannot extract content on this page.', 'error');
  }

  // Load profile into settings tab
  loadProfileIntoSettings();

  // ── Save JD tab listeners ──

  $('company').addEventListener('input', () => { updateFilenamePreview(); if (previewOpen) renderPreview(); });
  $('role').addEventListener('input', () => { updateFilenamePreview(); if (previewOpen) renderPreview(); });

  $('folder').addEventListener('change', async () => {
    const s = await loadSettings();
    s.defaultFolder = $('folder').value.trim();
    saveSettings(s);
  });

  $('preview-toggle').addEventListener('click', () => {
    previewOpen = !previewOpen;
    $('preview-box').classList.toggle('open', previewOpen);
    $('preview-toggle').textContent = previewOpen ? 'Hide' : 'Show';
    if (previewOpen) renderPreview();
  });

  $('btn-connect').addEventListener('click', async () => {
    if (sheetsConnected) return;
    $('btn-connect').textContent = 'Connecting...';
    try {
      await getAuthToken(true);
      updateSheetsUI(true);
    } catch (e) {
      setStatus('save-status', 'Auth failed: ' + e.message, 'error');
      $('btn-connect').textContent = 'Connect';
    }
  });

  $('btn-save').addEventListener('click', async () => {
    const btn = $('btn-save');
    if (!extractedData) { setStatus('save-status', 'Page not extracted yet.', 'error'); return; }

    const company = $('company').value.trim() || 'Unknown-Company';
    const role = $('role').value.trim() || 'Unknown-Role';
    const folder = $('folder').value.trim();
    const logSheets = $('toggle-sheets').checked;
    const overwrite = $('toggle-overwrite').checked;
    const status = $('status-select').value;
    const fitLevel = $('fit-level').value.trim();

    if (folder) {
      const s = await loadSettings();
      s.defaultFolder = folder;
      saveSettings(s);
    }

    const filename = buildFilename(company, role);
    const downloadPath = folder ? folder.replace(/^\/|\/$/g, '') + '/' + filename : filename;
    const content = buildContent(company, role);

    btn.disabled = true;
    btn.textContent = 'Working...';
    $('steps').style.display = 'flex';
    setStatus('save-status', '');

    // Step 1 — MD download
    setStep('step-md', 'active');
    try {
      await downloadFile(downloadPath, content);
      setStep('step-md', 'done');
    } catch (e) {
      setStep('step-md', 'error-step');
      setStatus('save-status', 'Download failed: ' + e.message, 'error');
      btn.disabled = false; btn.textContent = '↓ Save & Log';
      return;
    }

    // Step 2 — Sheets
    if (logSheets) {
      setStep('step-sheets', 'active');
      try {
        if (!sheetsConnected) await getAuthToken(true);
        await logToSheets({ company, role, url: extractedData.url, status, fitLevel, overwrite });
        setStep('step-sheets', 'done');
        updateSheetsUI(true);
      } catch (e) {
        setStep('step-sheets', 'error-step');
        setStatus('save-status', 'Saved MD ✓ — Sheets failed: ' + e.message, 'error');
        btn.disabled = false; btn.textContent = '↓ Save & Log';
        return;
      }
    }

    btn.disabled = false;
    btn.textContent = '↓ Save & Log';
    setStatus('save-status', '✓ Done — ' + filename, 'success');
  });

  // ── Outreach tab listeners ──

  // Extract when user clicks the Outreach tab (on-demand, not on page load)
  // Skip if fields already populated — either by tab routing (LinkedIn) or prior user edits
  document.querySelector('[data-tab="outreach"]').addEventListener('click', async () => {
    if ($('o-name').value || $('o-url').value) return;

    $('outreach-loading').style.display = 'flex';
    const result = await doExtractOutreach(tab.id);
    $('outreach-loading').style.display = 'none';

    if (result?.data) {
      populateOutreachFields(result.data);
    }
  });

  $('btn-save-outreach').addEventListener('click', async () => {
    const btn = $('btn-save-outreach');

    const contact = {
      name:         $('o-name').value.trim(),
      company:      $('o-company').value.trim(),
      role:         $('o-role').value.trim(),
      url:          $('o-url').value.trim(),
      howConnected: $('o-howConnected').value.trim(),
    };
    const selectedStatus = $('o-status').value;

    if (!contact.name && !contact.url) {
      setStatus('outreach-status', 'Please enter at least a name or LinkedIn URL.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving...';
    setStatus('outreach-status', '');

    const result = await logOutreach(contact, selectedStatus);

    btn.disabled = false;
    btn.textContent = 'Save Contact';

    if (result.outcome === 'blocked') {
      setStatus('outreach-status', result.message, 'error');
    } else if (result.outcome === 'error') {
      setStatus('outreach-status', result.message, 'error');
    } else {
      setStatus('outreach-status', '✓ ' + result.message, 'success');
    }
  });

  // ── Autofill tab listeners ──

  $('btn-autofill').addEventListener('click', () => runAutofill(tab.id));
  $('btn-clear-fill').addEventListener('click', () => clearAutofill(tab.id));

  // ── Settings tab listeners ──

  $('s-sheetId').addEventListener('change', async () => {
    const sheetId = extractSheetId($('s-sheetId').value);
    if (sheetId) populateTabDropdown('s-tabName', 's-tabName-field', sheetId, '');
  });

  $('s-outreachSheetId').addEventListener('change', async () => {
    const sheetId = extractSheetId($('s-outreachSheetId').value);
    if (sheetId) populateTabDropdown('s-outreachTabName', 's-outreachTabName-field', sheetId, '');
  });

  $('btn-save-profile').addEventListener('click', async () => {
    await saveProfileFromSettings();
    const indicator = $('save-indicator');
    indicator.classList.add('visible');
    setTimeout(() => indicator.classList.remove('visible'), 2000);
  });
});
