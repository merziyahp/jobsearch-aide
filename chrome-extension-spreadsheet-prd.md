# Chrome Extension — Spreadsheet Integration PRD

## Overview
The Job Application Tracker Chrome Extension helps job seekers save time and manual tracking effort by seamlessly taking over the job of capturing key information and tracking each job applied for. 

When applying for jobs, job seekers want to track what jobs they applied to and when so that they can follow up and also not reapply to the same job. Additionally there is the need to keep a copy of the job description since job posts are often taken down. If a call back comes, the applicant has a record of what the role descrioption was to prep for interviews.

Networking is a key part of the job application process. For applicants that are tracking their outreach contacts in a spreadsheet this means each time they reach out to someone they must job down their company, name, linkedin url and date they reached out so that they can follow up. This is another tedious manual task, and this chrome extension aims to alleviate that by writing contact information with outreach date and status to a Outreach Tracker spreadsheet.


## Goals
- Remove friction of having to manual capture each job that was applied to and save a copy of the job description
- Remove the fiction of capturing each outreach contact with outreach dates to manage follow up activities
- Autofill job application forms to save two minutes of filling in the same data each time. 


## Next Steps

1. **Google Oauth Suppport** 
Upgrade the existing Chrome extension to support a user-configurable Google Sheets connection, replacing the current hardcoded API key and column mapping with a seamless OAuth-based setup flow. 
- Replace API key with Google OAuth via chrome.identity
- User clicks "Sign in with Google" — standard consent screen, no account creation
- Token managed and refreshed automatically by Chrome
- One-time setup; user stays connected across sessions

2. **Configurable Spreadhsheet Column Mappings**
Allow the user to define the columns of their spreadsheet to which the data maps (instead of forcing them to use the hard-coded structure). This includes mapping for both the Job Application Tracker and Outreach Tracker spreadsheets
- On setup, extension fetches row 1 of the user's sheet and reads header names
- User maps each extension data field to a column via dropdown (populated from actual sheet headers)
- Mapping saved to chrome.storage.sync
= Write logic is header-name-based, not positional — resilient to column reordering

3. **Cloud or Downloadable Storage for Settings**
Currently settings - auto-form-fill field data values, and spreadsheet identifier are stored in local storage With each extnesion update the data is lost and has to be re-entered. Also, by keeping the cloud we can have the data sync between the user's different browsers and machines.

---

## Features - TO BE BUILT

### 1. User-Controlled Spreadsheet Toggle
- A toggle in the extension popup or options page shows/hides the spreadsheet connection feature
- State stored in `chrome.storage.sync` so it persists and syncs across the user's devices

### 2. Google OAuth Authentication
- Replace API key with Google OAuth via `chrome.identity`
- User clicks "Sign in with Google" — standard consent screen, no account creation
- Token managed and refreshed automatically by Chrome
- One-time setup; user stays connected across sessions

### 3. Sheet Connection
- User provides their Google Sheet URL after authenticating
- Extension validates the sheet is accessible

### 4. Dynamic Column Mapping
- On setup, extension fetches row 1 of the user's sheet and reads header names
- User maps each extension data field to a column via dropdown (populated from actual sheet headers)
- Mapping saved to `chrome.storage.sync`
- Write logic is header-name-based, not positional — resilient to column reordering

### 5. Settings / Setup Flow
Step-by-step options page:
1. Toggle spreadsheet connection on
2. Sign in with Google
3. Paste Sheet URL
4. Map columns via dropdowns
5. Save

---

# Feature Deep Dive

## Save JD Tab

## Autofill Tab

## Outreach Tab

## Settings Tab

### Overview
A dedicated tab within the extension popup for logging LinkedIn contacts into a user-configured Google Sheet. The tab is the default view when the extension is opened on a LinkedIn page. On all other pages it is accessible but fields are blank for manual entry.

### 6. Tab Routing
- If the current page is a LinkedIn profile page → popup opens defaulting to the Outreach tab, fields auto-populated from the page
- If the current page is any other URL → popup opens to the main tab as usual; Outreach tab is still accessible but fields are empty for manual entry

### 7. Data Capture (LinkedIn Pages)
Fields are scraped from the LinkedIn profile page only when the user opens the extension — not on page load. Fields captured:
- **Company** (current company)
- **Contact Name**
- **Role** (current job title)
- **LinkedIn URL**
- **Date** (auto-populated with today's date per status logic below — not scraped)

### 8. Outreach Tab UI
The tab displays:
- The four captured/manual fields (Company, Contact Name, Role, LinkedIn URL)
- A **Status** dropdown defaulting to **Pending**, with options: Pending, Message Sent, Prospect
- A **Save** button
- A confirmation or error message after Save is attempted

On non-LinkedIn pages, all fields are blank and user fills them in manually. The same duplicate check and status logic applies.

### 9. Status & Date Logic

#### New Contact (URL not found in sheet)
| Status Selected | Date Requested | Last Follow/Action | Status Written |
|---|---|---|---|
| Pending | Today | — | Pending |
| Message Sent | — | Today | Message Sent |
| Prospect | — | — | Prospect |

#### Existing Contact (URL already in sheet)
| Existing Status | User Selects | Action |
|---|---|---|
| Pending | Pending | Block. Notify: "Contact already exists (Status: Pending)" |
| Pending | Message Sent | Update Last Follow/Action = today, set status = Message Sent. Confirm to user. |
| Pending | Prospect | Block. Notify: "Contact already exists (Status: Pending)" |
| Message Sent | Message Sent | Update Last Follow/Action = today. Confirm to user. |
| Message Sent | Pending | Block. Notify: "Contact already exists (Status: Message Sent)" |
| Message Sent | Prospect | Block. Notify: "Contact already exists (Status: Message Sent)" |
| Prospect | Pending | Update Date Requested = today, set status = Pending. Confirm to user. |
| Prospect | Message Sent | Update Date Requested = today, set status = **Pending** (override user selection — first outreach means waiting for response). Confirm to user. |

> **Note on Prospect → outreach:** Regardless of whether the user selects Pending or Message Sent, if the existing status is Prospect the status is always written as Pending, since first outreach means you are now waiting for a response.

### 10. Duplicate Detection
- **Primary key:** LinkedIn URL — checked across all rows in the sheet before writing
- **Fallback key (manual entries without a URL):** Name + Company together — if both match an existing row, treat as duplicate and apply existing-contact logic
- Duplicate check is always performed before any write or update

### 11. Confirmation & Error Messages
All outcomes surface a message in the popup after Save is tapped:
- New row written → "Contact saved (Status: [X])"
- Existing row updated → "Existing contact updated (Status: [X])"
- Blocked — contact exists → "Contact already exists (Status: [X])" where X is the status currently in the sheet
- Sheet not reachable / write failed → "Could not save. Check your sheet connection."

---

## Sheet Schema (Outreach Sheet)

Columns currently in use, mapped via the column mapping setup flow:

| Column | Field | Written by Extension | Notes |
|---|---|---|---|
| A | Company | Yes | |
| B | Contact Name | Yes | |
| C | Role | Yes | |
| D | LinkedIn URL | Yes | Primary duplicate key |
| E | How We Connected | Yes | Free text field; defaults blank; user fills in popup |
| F | Last Follow Up | Yes | Written for Pending 3B, Pending 7B, and Message Sent |
| G | Status | Yes | See status list below |
| H | Notes/Outcome | No | Manual only |
| I | Next Action Date (Auto) | No | Formula-driven, extension does not touch |
| J | Action Needed? (Auto) | No | Formula-driven, extension does not touch |
| K | Action Notes | No | Manual only |
| N | Date of Original Request | Yes | Written only on first Pending save (new contact or Prospect→outreach) |

> Columns L, M, and any columns between K and N are formula-driven or manual — extension does not touch them.

### Status Values

| Status | Extension Support | Date Logic |
|---|---|---|
| Prospect | Core | No dates written |
| Pending 3B | Core (default) | Last Follow Up = today, Date of Original Request = today |
| Pending 7B | Core | Last Follow Up = today, Date of Original Request = today |
| Message Sent | Core | Last Follow Up = today |
| Accepted | Nice to have | Status update only |
| Responded | Nice to have | Status update only |
| Follow Up | Nice to have | Status update only |
| In Progress | Nice to have | Status update only |
| Closed (Connected) | Nice to have | Status update only |
| Close (No Response) | Nice to have | Status update only |

---

## Data Fields Captured (Job Search Tab)
- To be filled in from existing codebase

---

## Out of Scope
- Shared/multi-user sheets
- Backend server
- Non-Google spreadsheets (future consideration)
- Editing or deleting existing rows from within the extension
- Columns E (Connection) and F (Conversation) — future consideration

---

## Development Plan

### Step 0 — Repo & Documentation ✓
- Initialize GitHub repository
- Document OAuth client ID approach in README (not a secret, safe to commit)
- Confirm no hardcoded personal data in codebase before first push

### Step 1 — Settings
- Add outreach sheet ID field to Settings tab in `popup.html`
- Wire new field into `storage.js` and `popup.js`
- Outreach sheet config stored separately from job search sheet config

### Step 2 — `outreach.js`
- New file parallel to `sheets.js`
- Handles all outreach sheet read/write/update logic
- Duplicate detection (URL primary key, Name+Company fallback)
- Full status/date write logic per PRD
- Independently testable before any UI work

### Step 3 — LinkedIn Scraper
- Add new message action to `content.js` specifically for LinkedIn profile pages
- Captures: Contact Name, Company, Role, LinkedIn URL
- Triggered only when extension is opened — not on page load
- Separate from existing job description extraction logic

### Step 4 — Outreach Tab UI
- Add Outreach tab to `popup.html`
- Wire up fields, status dropdown, How We Connected text field, Save button
- Connect to `outreach.js` for all sheet operations
- Display confirmation and error messages per PRD

### Step 5 — Tab Routing
- On popup load, detect if current page is a LinkedIn profile URL
- If yes → default active tab to Outreach
- If no → default to main tab as usual
- Outreach tab remains accessible on all pages

---

## Open Questions
- Default behavior if a mapped column header is renamed or deleted in the sheet — silent skip or user alert?
- Should the extension re-fetch headers each time, or cache them?
- If manual entry has no URL and Name+Company match is found, should the user be shown the matched row for confirmation before blocking/updating?
- Future: merge Outreach sheet and Job Search sheet into a single sheet with unified column mapping setup

---

## Session Notes — May 2026

### What was built

- **Applied column fix:** The job application tracker no longer writes "y" to the Applied column when status is Bookmarked (or anything other than Applied). Only Applied writes "y"; all others leave it blank.
- **chrome:// error fix:** Extension no longer throws an unchecked runtime error when opened on a `chrome://` page. Added URL guard before attempting extraction, and added proper `lastError` handling inside the `executeScript` callback.
- **Sheet URL parsing:** Settings now accepts a full Google Sheet URL — the ID is extracted automatically. Users no longer need to find the ID segment in the URL manually.
- **Autofill Beta label:** Autofill tab now shows a BETA badge to signal it's not fully reliable across all sites.
- **JD extraction via JSON-LD:** Content extraction now checks for `JobPosting` JSON-LD structured data first before falling back to DOM scraping. Fixes blank/empty files on JS-rendered ATS sites (confirmed working on Sanofi/Radancy). Also switches to `querySelectorAll` to handle pages with multiple JSON-LD scripts.
- **Form noise removed:** Added `form` to the DOM noise selectors, which strips application form content (country dropdowns, EEO sections, submit buttons) from saved JD files.
- **Tab name dropdown:** Sheet tab name is no longer a free-text input. After a sheet URL is entered, the extension fetches the sheet's tabs from the Sheets API and shows them in a dropdown. On Settings load, if a sheet is already configured, tabs are auto-fetched and the dropdown is pre-selected to the saved tab. Implemented via new `fetchSheetTabs()` in `sheets.js`.

### Decisions made

- **Column mapping:** Staying positional for now. Dynamic header-based mapping is still the plan for public release but not yet built.
- **chrome.storage.local vs sync:** Deferred. Cross-device sync via `chrome.storage.sync` is desirable but EEO fields must stay local regardless, which complicates the split. To revisit.
- **Google Drive Picker:** Evaluated and declined for now. The `drive.readonly` OAuth scope triggers a broad-sounding consent screen ("see all your Google Drive files") that would erode user trust for a public extension. The URL-paste flow with auto-fetched tab dropdown is good enough and requires no additional scope.
- **Autofill EEO fields:** Currently only reliable on Greenhouse. EEO autofill on other ATS platforms is unreliable or broken. To be addressed in a future session focused on the autofill module.
- **Working style:** Always propose code changes and get confirmation before editing any file.

### Open items for next session
- Autofill reliability — EEO fields only work on Greenhouse; general autofill also has gaps across ATS platforms
- chrome.storage.sync decision — evaluate splitting settings between local and sync storage
- Column mapping — needed before public Chrome Web Store release
- Nice-to-have outreach statuses (Accepted, Responded, etc.) have no update logic — they get blocked on existing contacts, which is wrong
