# JD Saver — Chrome Extension

Save job descriptions as clean markdown files, log applications to Google Sheets, autofill job applications, and track outreach contacts — all from your browser.

## Features
- Extracts main page content, strips nav/headers/footers/ads
- Auto-detects company + role from page title (works on Greenhouse, Lever, LinkedIn, Indeed, Workday, and most sites)
- Adds source URL + date scraped as frontmatter
- Saves as `Company_Role_YYYY-MM-DD.md` into your Downloads (or a subfolder)
- Logs job applications to a personal Google Sheet
- Autofills job application forms from a saved profile
- **Outreach tracker** — on any LinkedIn profile page, captures contact details and logs them to a separate outreach Google Sheet with status tracking

## Install

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this folder
5. The icon will appear in your toolbar
6. Click **Connect** in the extension to sign in with Google (one-time setup)

## Usage

### Saving a job description
1. Navigate to any job description page
2. Click the extension icon
3. Edit company/role if needed (auto-detected)
4. Set a save folder (e.g. `Jobs/2026`) — remembered for next time
5. Click **Save & Log**

### Logging outreach contacts
1. Navigate to a LinkedIn profile page
2. Click the extension icon — it opens to the **Outreach tab** automatically
3. Review the auto-captured fields (name, company, role, LinkedIn URL)
4. Fill in **How We Connected** (optional)
5. Set status (defaults to **Pending 3B**)
6. Click **Save** — logs the contact to your outreach Google Sheet

On non-LinkedIn pages, the Outreach tab is still available as a manual entry form.

## Google Sheets setup
1. Create a Google Sheet for job applications and one for outreach (or use one sheet for both — future feature)
2. Open the extension **Settings tab**
3. Click **Sign in with Google**
4. Paste your Sheet ID(s) and configure column mapping
5. Save

Each user connects their **own** Google account and their **own** sheets. No data is shared or routed through any server.

## File naming

```
Stripe_Senior-Engineer_2026-03-12.md
```

## Markdown output format

```markdown
---
source: https://boards.greenhouse.io/stripe/jobs/...
saved: March 12, 2026
company: Stripe
role: Senior-Engineer
---

## About the role
...
```

## Security & privacy

- **No backend server** — all data stays between your browser and your own Google Sheets
- **No API keys** — the extension uses Google OAuth via Chrome's built-in `chrome.identity` API
- **OAuth client ID** — the `manifest.json` contains a Google OAuth client ID. This is not a secret — it is visible to anyone who installs a Chrome extension and is standard practice. It does not grant access to any data. Tokens are issued to each user individually and never leave their browser.
- **No shared sheets** — each user's Google account and sheets are entirely their own

## Notes

- If company/role detection is wrong, just edit before saving
- Works best on Greenhouse, Lever, LinkedIn, Indeed, Workday
- For any site, it will still grab the main content
