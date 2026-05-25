# CLAUDE.md — JDTracker

## Positioning

"Your AI is only as good as what you feed it. JDTracker makes sure your job search data is clean, structured, and ready to use."

---

## What this is and why it exists

JDTracker is a Chrome extension built to eliminate the tedious manual work that comes with a serious job search. It started as a personal tool built around one person's opinionated workflow — Google Sheets for tracking, markdown files for saving JDs, and a lot of tab-switching that shouldn't be necessary.

The core tasks it handles:
1. Save job listings to a Google Sheet with basic info (company, role, URL, status)
2. Download a copy of the job description as a `.md` file to a local folder
3. Autofill job application form fields from a saved profile
4. Log outreach contacts directly from a LinkedIn page — no copy-pasting into a spreadsheet

It is built around Google Sheets. There are no plans to support other platforms (Notion, Airtable, etc.) in the near term. The extension is opinionated by design — that's what makes it fast to use.

The next phase is making JDTracker publicly available. The main generalization needed is around spreadsheet column mapping — users need to be able to configure which extension fields map to which columns in their own sheet, rather than relying on a fixed layout.

---

## File map

| File | Purpose |
|---|---|
| `manifest.json` | MV3 manifest — permissions, OAuth client ID, entry points |
| `popup.html` | Extension popup UI (380px wide, 4 tabs) |
| `popup.js` | Popup orchestration — tab switching, save flow, form state |
| `content.js` | Page scraper — extracts job data + LinkedIn profiles from any page |
| `background.js` | Service worker — currently unused, reserved for future use |
| `sheets.js` | Google Sheets API calls for job application tracker |
| `outreach.js` | Google Sheets API calls for outreach/contact tracker |
| `storage.js` | All chrome.storage reads/writes — single source of truth for persistence |
| `autofill.js` | Injected into pages to fill form fields from saved profile |

---

## Working style

Always propose the change and get confirmation before editing any code. Describe what you plan to do and wait for a go-ahead.

---

## Architecture rules

**Hard rules — do not change without a conversation:**
- No backend. Everything runs in the extension. No server, proxy, or cloud function.
- No hardcoded IDs or keys. Sheet IDs, tab names, and all user config come from storage via `storage.js`. The OAuth client ID in `manifest.json` is the only intentional constant.
- All storage goes through `storage.js`. Never call `chrome.storage` directly from other files. If a new key is needed, add it to `storage.js` and its schema comment.
- OAuth via `chrome.identity` only. `getAuthToken()` and `revokeToken()` live in `sheets.js` and are shared by `outreach.js`. Do not introduce a second auth flow.

**Open questions — flag before changing:**
- Currently using `chrome.storage.local`. Switching to `chrome.storage.sync` would enable cross-device sync but has a much smaller storage quota and requires careful handling of sensitive fields (EEO data should stay local regardless). Worth discussing before changing.
- Column mapping is currently positional (fixed column order). Dynamic header-based mapping is planned — do not silently reorder columns in `sheets.js` or `outreach.js` in the meantime, as it would break existing user sheets.

---

## What not to do

- Do not write user profile data to any external service
- Do not change `manifest.json` permissions without flagging it — the Chrome Web Store scrutinizes permission changes
- Do not add a build step or bundler without discussing first — this is intentionally vanilla JS
- Do not store EEO fields (gender, race, disability, veteran status) in `chrome.storage.sync` under any circumstance — these must stay in `chrome.storage.local`
- Do not flatten the content extraction logic in `content.js` — the priority chain (JSON-LD → ATS patterns → title parsing) exists because real-world job boards are inconsistent
