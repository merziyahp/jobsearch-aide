# JD Saver Extension — Test Plan

> Last updated: 2026-03-13
> Version tested: 3.1

---

## 1. Security / Privacy

**What the extension has access to:**
- `activeTab` — reads current tab only when icon is clicked, not background tabs
- `downloads` — triggers file downloads
- `storage` — saves folder preference, Google auth token, and profile locally
- `identity` — handles Google OAuth
- `scripting` — injects content.js and autofill.js into pages
- `<all_urls>` — content script runs on all pages

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 1.1 | Open extension on a sensitive page (e.g. bank). Click icon. | Only shows content from that page, no unexpected network calls | | |
| 1.2 | Open DevTools → Network tab, click Save & Log | Only outbound request is to `sheets.googleapis.com` | | |
| 1.3 | Open DevTools → Network tab, click Fill Form | Zero outbound network requests | | |
| 1.4 | Inspect popup via `chrome://extensions` → Inspect views → Console | No errors or unexpected network calls on load | | |
| 1.5 | Browse normally without clicking extension | content.js does not run autonomously or send data | | |
| 1.6 | Review `content.js` source | Only contains `chrome.runtime.onMessage`, no `fetch()` calls | | |
| 1.7 | Review `autofill.js` source | No `fetch()` calls, no external requests, only reads `msg.profile` passed from popup | | |
| 1.8 | Review `sheets.js` source | Only calls `sheets.googleapis.com`, nothing else | | |
| 1.9 | Review `storage.js` source | Only uses `chrome.storage.local`, no external calls | | |
| 1.10 | Review `popup.js` source | No hardcoded credentials, no external calls except via `sheets.js` | | |
| 1.11 | Review `manifest.json` permissions | Exactly: `downloads`, `storage`, `activeTab`, `scripting`, `tabs`, `identity` | | |
| 1.12 | Save profile in Settings, open `chrome://extensions` → JD Saver → Storage | Profile data visible only in extension's local storage, not in cookies or synced storage | | |
| 1.13 | Inspect `msg.profile` sent during autofill (add `console.log` to autofill.js temporarily) | Object contains only whitelisted keys — no `defaultFolder`, no stale settings keys | | |

---

## 2. Content Extraction

### ATS / Job Board Detection

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 2.1 | Greenhouse job posting | Company + role auto-populate correctly (role from `h1`, not page title) | | |
| 2.2 | Lever job posting | Company + role auto-populate correctly | | |
| 2.3 | LinkedIn job posting | Company + role auto-populate correctly | | |
| 2.4 | Indeed job posting | Company + role auto-populate correctly | | |
| 2.5 | Workday job posting | Company + role auto-populate correctly | | |
| 2.6 | Company's own careers page (no ATS) | Falls back gracefully, fields may be blank, no crash | | |

### Edge Cases

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 2.7 | Page with no clear job title | Fields blank, no crash | | |
| 2.8 | Very long job title (80+ chars) | Filename truncates cleanly at 60 chars | | |
| 2.9 | Job title with special characters (`/`, `:`, `?`) | Characters sanitized out of filename | | |
| 2.10 | Job posting in another language | Extracts without errors | | |
| 2.11 | Greenhouse page where title reads "Job Application for [Role]" | Role field shows clean title only (e.g. "Principal Product Manager", not "Job-Application-for-Principal-Product-Manager") | | |

### Content Quality

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 2.12 | Open preview on a real JD | Nav/header/footer stripped from content | | |
| 2.13 | Check frontmatter in preview | Source URL and date appear correctly | | |
| 2.14 | Check markdown formatting in preview | Headings render as `##`, bullets as `-` | | |

---

## 3. File Download

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 3.1 | Save with no folder set | File lands in `~/Downloads/` root | | |
| 3.2 | Save with folder `Jobs` | File lands in `~/Downloads/Jobs/` | | |
| 3.3 | Save with folder `Jobs/2026` | File lands in `~/Downloads/Jobs/2026/` | | |
| 3.4 | Check filename format | `Company-Role-YYYY-MM-DD.txt` with no extra words | | |
| 3.5 | Open saved `.txt` file | Opens in TextEdit/VS Code without issues | | |
| 3.6 | Open saved file in Obsidian | Frontmatter renders correctly | | |
| 3.7 | Save same job twice | Two separate files created, no silent overwrite | | |
| 3.8 | Folder preference | Persists after closing and reopening extension | | |

---

## 4. Google Sheets Logging

### Auth

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 4.1 | Click Connect (first time) | Google OAuth popup appears | | |
| 4.2 | Complete OAuth | Button shows ✓ Connected | | |
| 4.3 | Close and reopen extension | Still shows Connected (token persisted) | | |
| 4.4 | Revoke access at myaccount.google.com/permissions, then Save | Re-prompts for auth gracefully | | |

### Append (overwrite OFF)

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 4.5 | Save a new job | New row at bottom of sheet with correct columns: A=Company, B=Role, C=URL, D=`y`, E=today, F=fit level, G=status | | |
| 4.6 | Save with Status = Bookmarked | Column G = `Bookmarked` | | |
| 4.7 | Save with Fit Level = 7 | Column F = `7` | | |
| 4.8 | Save with Fit Level blank | Column F empty, not `0` or `undefined` | | |
| 4.9 | Save same job twice, overwrite OFF | Two rows appended, no overwrite | | |

### Overwrite (overwrite ON)

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 4.10 | Revisit saved job URL, toggle overwrite ON, change status | Existing row updated, no duplicate | | |
| 4.11 | Toggle overwrite ON on a new URL not in sheet | Appends new row normally | | |

### Failure Handling

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 4.12 | Turn off wifi, click Save & Log | MD file saves, Sheets step shows red error | | |
| 4.13 | Toggle Sheets log OFF | Only MD downloads, no Sheets API call made | | |

---

## 5. UI / State

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 5.1 | Edit company/role fields | Filename preview updates live | | |
| 5.2 | Open content preview | Content matches what gets saved | | |
| 5.3 | Word/char count in preview | Looks reasonable for the page length | | |
| 5.4 | Status dropdown selection | Persists within a session | | |
| 5.5 | Successful save | Both step dots turn green | | |
| 5.6 | Failed save | Red dot + error message, popup doesn't crash | | |
| 5.7 | Switch between tabs | State preserved — company/role fields not reset when switching tabs | | |
| 5.8 | Open Settings tab, save profile, switch to Autofill tab | No data loss between tab switches | | |

---

## 6. Settings / Profile Storage

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 6.1 | Fill in all profile fields and click Save Settings | ✓ Settings saved confirmation fades in | | |
| 6.2 | Close and reopen extension, go to Settings | All fields repopulated from storage | | |
| 6.3 | Save with some fields blank | Blank fields stored as empty string, no crash | | |
| 6.4 | Save with very long values | No crash, values truncated or stored as-is | | |
| 6.5 | Toggle "Requires visa sponsorship" on/off and save | Toggle state persists after reopen | | |
| 6.6 | Save profile, uninstall extension, reinstall | Profile cleared (expected — local storage tied to extension install) | | |
| 6.7 | Save phone country code (e.g. `+1`) | Persists after reopen; visible in Settings | | |
| 6.8 | Save EEO fields with real values | All five fields (gender, orientation, race, veteran, disability) persist after reopen | | |
| 6.9 | Save EEO fields, then clear them and save again | Fields stored as empty string; no stale values returned on reopen | | |

---

## 7. Autofill

### Profile Prerequisite

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.1 | Click Fill Form with no profile saved | Error: "No profile saved — add your info in Settings first" | | |
| 7.2 | Save partial profile (only name + email), then Fill Form | Only matched fields filled, no crash on missing fields | | |

### Field Matching — Standard Forms

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.3 | Greenhouse application form | First name, last name, email, phone filled | | |
| 7.4 | Lever application form | First name, last name, email, phone, LinkedIn filled | | |
| 7.5 | Workday application form | Name, email, phone, address fields filled | | |
| 7.6 | Indeed application form | Standard fields filled | | |
| 7.7 | Generic HTML form with standard field names | name, email, phone, address filled | | |
| 7.8 | React-based form (e.g. Ashby ATS) | Fields filled correctly — React state updates, not just visual fill | | |

### Phone Country Code

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.9 | Greenhouse form with separate country code dropdown | Country code field (`+1`) matched and filled separately from phone number | | |
| 7.10 | Form where phone and country code are a single combined field | Combined phone field receives full number, country code field not double-filled | | |
| 7.11 | Form with no country code field | Phone number fills normally, no crash | | |
| 7.12 | Country code stored as `+1`, form uses `US (+1)` as option text | Fuzzy match selects the correct option | | |

### Sponsorship Inference

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.13 | Work auth = `US Citizen`, form has "Do you require sponsorship?" | Field auto-filled as `No` | | |
| 7.14 | Work auth = `US Citizen`, form has "Will you require sponsorship in the future?" | Field auto-filled as `No` | | |
| 7.15 | Work auth = `Green Card`, both sponsorship fields present | Both filled as `No` | | |
| 7.16 | Work auth = `H1B`, sponsorship field present | Field NOT auto-filled (H1B may require sponsorship — left for user) | | |
| 7.17 | Work auth = `US Citizen`, "authorized to work in the US?" field | Field filled as `Yes` | | |

### Field Matching — Edge Cases

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.18 | Form uses `aria-label` instead of `name`/`id` | Fields still matched and filled | | |
| 7.19 | Form with a single "Full Name" field | Fills with "First Last" combined | | |
| 7.20 | Form with pre-filled fields | Pre-filled fields skipped, not overwritten | | |
| 7.21 | Hidden fields (`type="hidden"`) | Not touched | | |
| 7.22 | Disabled or readonly fields | Not touched | | |
| 7.23 | File upload fields | Not touched | | |
| 7.24 | Password fields | Not touched | | |
| 7.25 | Profile has stale extra keys in storage (e.g. `defaultFolder`) | Stale keys stripped by whitelist — never filled into page fields | | |

### EEO / Demographic Fields

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.26 | EEO fields blank in Settings, form has gender/race/veteran/disability dropdowns | All EEO fields skipped silently — no highlight, no fill | | |
| 7.27 | Gender set to `Male` in Settings, form has gender dropdown with option "Male" | Exact match — field filled green | | |
| 7.28 | Race set to `White` in Settings, form has option "White (Not Hispanic or Latino)" | Partial match — "White" found within option text, filled green | | |
| 7.29 | Veteran set to `I am not a protected veteran`, form has matching option | Match found, filled green | | |
| 7.30 | Disability set to `No, I don't have a disability`, form has option "No, I do not have a disability" | Fuzzy keyword match — filled green | | |
| 7.31 | Gender set to `Male`, form has custom React dropdown (not a real `<select>`) | Field not filled (unsupported element type), no crash, no raw text dumped | | |
| 7.32 | EEO field set to `Prefer not to answer` in Settings, form has "I prefer not to answer" option | Partial/fuzzy match selects the option — filled green | | |
| 7.33 | EEO field set to `Prefer not to answer`, form has "Decline to self-identify" but no "prefer" option | No confident match — skipped silently, not highlighted | | |
| 7.34 | Sexual orientation set in Settings, form has no sexual orientation field | Skipped silently, no crash | | |
| 7.35 | Sexual orientation blank in Settings, form has orientation field | Field skipped silently — no highlight, no fill | | |
| 7.36 | Race set in Settings, race dropdown has 10+ options with long descriptive text | Correct option selected using partial/keyword match, not a random option | | |

### Highlighting

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.37 | After Fill Form | Filled fields have green outline | | |
| 7.38 | EEO field filled with confident match | Green outline (not yellow) | | |
| 7.39 | Click Clear | All highlights removed, fields retain their values | | |
| 7.40 | Fill Form twice on same page | No duplicate fills, already-filled fields skipped | | |

### Result Summary

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.41 | Successful autofill | Summary shows filled count | | |
| 7.42 | Page with no matching fields | Summary shows "0 fields filled" gracefully | | |
| 7.43 | Fill Form on a non-application page (e.g. Google) | Runs without crash, likely 0 fields filled | | |

---

## 8. Cross-Feature Integration

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 8.1 | On a Greenhouse JD page: Save JD → switch to Autofill tab → click Fill Form on the same page | Both features work independently on same page | | |
| 8.2 | Full end-to-end: land on job page → Save JD + log to Sheets → navigate to application → Fill Form → review → submit | Entire workflow completes without errors | | |
| 8.3 | Save JD with Sheets off, then turn Sheets on and save again | Second save logs to Sheets, first did not | | |
| 8.4 | Fill Form on Greenhouse application, check all three areas: standard fields, phone country code, EEO fields | Each category fills/skips correctly and independently | | |

---

## 9. Future Tests (Phase 4 — Multi-user / Encryption)

> To be added when storage encryption or multi-user support is built.

| # | Test | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 9.1 | Profile data encrypted at rest | `chrome.storage.local` value is not plain-text readable | | |
| 9.2 | Wrong password / key | Decrypt fails gracefully, user prompted | | |
| 9.3 | Multi-user: User A profile does not bleed into User B | Profiles fully isolated | | |
