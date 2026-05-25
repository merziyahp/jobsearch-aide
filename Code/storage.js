// storage.js — Profile storage abstraction layer
//
// Architecture note: All profile reads/writes go through this module.
// To add encryption later: wrap get/set with crypto.subtle AES inside this file only.
// To add multi-user/cloud sync: swap chrome.storage.local for an API call here.
// No other file needs to change.

const PROFILE_KEY = 'userProfile';
const SETTINGS_KEY = 'appSettings';

// ── Profile ──────────────────────────────────────────────────────────────────

async function saveProfile(profile) {
  // Future: encrypt(profile) before storing
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [PROFILE_KEY]: profile }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(profile);
    });
  });
}

async function loadProfile() {
  // Future: decrypt after loading
  return new Promise((resolve) => {
    chrome.storage.local.get([PROFILE_KEY], (result) => {
      resolve(result[PROFILE_KEY] || null);
    });
  });
}

async function clearProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([PROFILE_KEY], resolve);
  });
}

// ── App Settings (folder, toggles, sheet config etc) ─────────────────────────

async function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(settings);
    });
  });
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
      resolve(result[SETTINGS_KEY] || {});
    });
  });
}

// ── Settings schema (for reference) ──────────────────────────────────────────
//
// {
//   // Job search sheet (existing)
//   sheetId: '',          // Google Sheet ID for job application tracker
//   tabName: '',          // Tab name within that sheet
//
//   // Outreach sheet (new)
//   outreachSheetId: '',  // Google Sheet ID for outreach/contact tracker
//   outreachTabName: '',  // Tab name within that sheet
//
//   // General
//   defaultFolder: '',    // Default download folder for markdown files
// }

// ── Profile schema (for reference + future validation) ───────────────────────
//
// {
//   // Personal
//   firstName: '',
//   lastName: '',
//   email: '',
//   phone: '',
//   phoneCountryCode: '',
//
//   // Address
//   address: '',
//   city: '',
//   state: '',
//   zip: '',
//
//   // Professional
//   linkedin: '',
//   website: '',
//   github: '',
//
//   // Work auth
//   workAuth: '',        // e.g. "US Citizen", "Green Card", "H1B"
//   requiresSponsorship: false,
//
//   // EEO (sensitive — user opts in to store)
//   gender: '',
//   sexualOrient: '',
//   race: '',
//   veteran: '',
//   disability: '',
// }
