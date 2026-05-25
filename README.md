# JobSearch Aide — Chrome Extension

Save job listings to Google Sheets, download AI-ready job descriptions, and log outreach contacts — all in one click.

**Website:** https://merziyahp.github.io/jobsearch-aide/

---

## What it does

- **Save job listings** — on any job posting, captures company, role, and link, logs it to your Google Sheet, and downloads a clean copy of the job description ready to paste into ChatGPT or Claude
- **Track outreach** — on any LinkedIn profile page, opens a quick form to log contact details directly to your outreach sheet
- **Autofill (beta)** — fills personal information fields on job applications from a saved profile

Your data stays in a Google Sheet you own. No backend, no subscription, no third-party app.

---

## Tech

Vanilla JS, no build step, no dependencies. Uses Google OAuth via Chrome's built-in `chrome.identity` API. All data goes to the user's own Google Sheet — nothing is routed through any server.

The OAuth client ID in `manifest.json` is not a secret — it is visible to anyone who installs a Chrome extension and is standard practice.

---

## Status

Currently in private beta. [Join the waitlist](https://merziyahp.github.io/jobsearch-aide/) to get early access.

---

## License

MIT
