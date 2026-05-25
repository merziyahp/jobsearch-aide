# JDTracker

**Your job search data, structured and ready for AI.**

Most job search tools try to do everything. JDTracker does one thing: it keeps your job search data clean, organized, and in a format you can actually use — especially when working with AI tools like Claude or ChatGPT to write cover letters, prep for interviews, or analyze your pipeline.

---

## What it does

**Save Job Descriptions**
One click saves the full job description as a clean `.md` file to your local machine. Feed it straight to your AI of choice — no copying, no reformatting.

**Log Applications to Google Sheets**
Automatically logs company, role, URL, date, fit level, and status to your tracking spreadsheet. No tab switching, no manual entry.

**Track Outreach Contacts**
On any LinkedIn profile page, capture a contact's details and log them to your outreach sheet in one click. Detects duplicates and manages status transitions automatically.

**Autofill Application Forms**
Saves your profile (name, contact info, work authorization, EEO fields) and fills standard job application form fields for you.

---

## How people use it

> *"I open a job posting, save it with JDTracker, then drop the markdown file into Claude and ask it to help me tailor my resume summary and write a cover letter. Having the full JD as a clean file makes a real difference."*

The typical workflow:
1. Find a role → save it with JDTracker (logs to sheet + saves `.md` file)
2. Open your AI tool of choice → attach the `.md` file
3. Ask for help with resume tailoring, cover letter, interview prep
4. Track both your job applications and related outreach in your spreadsheets

---

## Requirements

- Google Chrome
- A Google account
- Two Google Sheets set up with the column structure below (templates provided)

---

## Installation

JDTracker is not yet on the Chrome Web Store. Install it manually:

1. [Download the latest release](../../releases) and unzip it
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked** and select the unzipped folder
5. The JDTracker icon will appear in your Chrome toolbar

---

## Google Sheets Setup

JDTracker writes to two separate sheets — one for job applications, one for outreach contacts. You can use the same Google Sheet with two tabs, or two separate files.

### Job Applications Sheet

Row 1 must have these headers in this exact order:

| Col | Header |
|-----|--------|
| A | Company Name |
| B | List Role Title |
| C | URL |
| D | Applied |
| E | Date Applied |
| F | Fit Level (1-10) |
| G | Status of Application |

> ⚠️ Column order matters in the current version. Dynamic column mapping is planned for a future release.

### Outreach Sheet

Row 1 must have these headers in this exact order:

| Col | Header |
|-----|--------|
| A | Company |
| B | Contact Name |
| C | Role |
| D | LinkedIn URL |
| E | How We Connected |
| F | Last Follow Up |
| G | Status |

---

## First-time Setup

1. Open the extension and go to the **Settings** tab
2. Click **Connect** and sign in with Google (you'll see a consent screen — this gives JDTracker access to your own Sheets only)
3. Paste your Job Applications Sheet ID (the long string in your Sheet URL: `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`)
4. Enter the tab name at the bottom of your sheet (e.g. `Open Applications`)
5. Repeat for your Outreach Sheet ID and tab name
6. Fill in your profile details for autofill
7. Hit **Save Settings**

---

## Privacy

- All your data stays on your device or in your own Google Sheets
- No backend server, no analytics, no data collection
- OAuth tokens are managed by Chrome and never leave your browser
- EEO fields (race, gender, disability, veteran status) are stored locally only and never synced

---

## Current limitations

- Google Sheets only (Notion, Airtable not supported)
- Column order in your sheet must match the structure above
- Unpacked installs generate a random extension ID — Google OAuth will not work until the extension is published to the Chrome Web Store (coming soon)

---

## Roadmap

- [ ] Chrome Web Store listing
- [ ] Dynamic column mapping — bring your own sheet structure
- [ ] Cleaner JD extraction

---

## Feedback

Found a bug or have a suggestion? [Open an issue](../../issues).
