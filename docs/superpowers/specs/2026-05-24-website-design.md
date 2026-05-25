# JobSearch Aide — Static Website Design

## Overview

A two-page static website hosted on GitHub Pages. Primary purpose: credibility signal for the Chrome extension once it's live in the store. Secondary purposes: host the privacy policy (required for Chrome Web Store OAuth verification) and collect waitlist emails before launch.

No backend, no CMS, no build step. Vanilla HTML/CSS pushed to a `gh-pages` branch.

---

## File Structure

```
website/
  index.html        — landing page
  privacy.html      — privacy policy
  style.css         — shared styles for both pages
  assets/
    icon128.png     — copied from Code/icons/icon128.png
```

---

## Brand

| Token | Value | Usage |
|-------|-------|-------|
| Primary green | `#1a5c4f` | Hero background, nav, buttons, footer |
| Gold | `#e8a020` | Checkmarks, accents, button hover |
| Light green | `#a8d5c8` | Subtext on dark backgrounds |
| Off-white | `#f8faf9` | Alternating section backgrounds |
| Dark text | `#1a1a1a` | Body copy on light backgrounds |
| Font | System stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) | All text |

---

## index.html — Landing Page

### Section 1: Nav

- Left: icon128.png (24px) + "JobSearch Aide" wordmark
- Right: "Privacy Policy" text link → `privacy.html`
- Background: `#1a5c4f`, white text
- No other nav items

### Section 2: Hero

- Background: `#1a5c4f`
- Headline: **"Stop copy-pasting job descriptions."**
- Subheadline: "One click saves any job listing to your Google Sheet and downloads an AI-ready copy — ready to paste into ChatGPT or Claude."
- Form: email input + "Get early access" button
  - Form action: Formspree endpoint (user supplies their endpoint URL)
  - Method: POST
  - On success: Formspree default thank-you redirect (no custom page needed)
- Below form: small text — "Chrome extension · Free · No account required"

**CTA update after launch:** When the Chrome Web Store listing is live, replace the form with an "Add to Chrome" button linking to the store listing URL. The subheadline and headline stay the same.

### Section 3: Problem Strip

- Background: white
- Heading: "Every application, the same four steps."
- Four steps shown horizontally (stacked on mobile):
  1. Find the job listing
  2. Copy the job description
  3. Log it in your tracker
  4. Paste it into your AI tool
- Arrow or visual connector between steps
- Below: **"JobSearch Aide gets it down to one."** in `#1a5c4f`, bold

### Section 4: Features

- Background: `#f8faf9`
- Three cards in a row (stacked on mobile):
  1. **Save to Google Sheets** — "Company, role, link, and status logged automatically in a spreadsheet you own."
  2. **AI-ready job description** — "Downloads a clean text file of the job listing. Paste it straight into ChatGPT or Claude — no reformatting."
  3. **Track outreach** — "Log contacts from LinkedIn and get follow-up dates filled in automatically with the free template."
- Each card: gold checkmark icon, bold heading, one-sentence description

### Section 5: Footer

- Background: `#1a5c4f`, white text
- Left: "JobSearch Aide · A Chrome extension for organized job seekers"
- Right: "Privacy Policy" link + support email (user supplies)
- No social links, no copyright line

---

## privacy.html — Privacy Policy

Plain-language privacy policy. Not legalese — written at the same register as the landing page copy.

### Sections

**What this extension does**
Plain description: saves job listing data to a user-specified Google Sheet, downloads job descriptions to the user's local downloads folder, and logs outreach contacts to a second user-specified sheet.

**What data we access**
- Google Sheets (via Google Sheets API): read/write access to sheets the user explicitly configures. No other Google account data is accessed.
- The active browser tab: used to extract job listing content from the current page. No browsing history is stored or transmitted.
- Downloads: used to save the job description file to the user's local machine.

**What we don't do**
- We do not collect, store, or transmit any personal data to external servers.
- We do not track usage or analytics.
- All data written by this extension goes to the user's own Google Sheet or local machine — nowhere else.

**EEO fields**
Any equal opportunity information entered in the autofill profile is stored locally on your device only (`chrome.storage.local`) and is never synced or transmitted.

**Contact**
Questions? Email: [user supplies support email]

**Last updated:** 2026-05-24

---

## Responsive Behavior

- Nav: collapses to icon + name only on mobile (privacy link moves to footer)
- Hero: single column, form stacks vertically
- Problem strip: steps stack vertically with downward arrows
- Features: cards stack vertically
- Footer: stacks vertically, centered

Breakpoint: 768px

---

## Deployment

1. Create a `website/` directory at the project root
2. Push to GitHub (initialize repo if not already done)
3. In GitHub repo Settings → Pages → Source: `gh-pages` branch, root folder
4. Push `website/` contents to `gh-pages` branch

The site will be available at `https://<username>.github.io/<repo-name>/`.

To use a custom domain later: add a `CNAME` file to the branch with the domain, then configure DNS.

---

## Open Items (not blocking build)

- **Formspree endpoint URL** — user needs to supply this before the form works. Placeholder in HTML until then.
- **Support email** — user needs to supply for footer and privacy policy.
- **Store listing URL** — once live, replace the waitlist form with "Add to Chrome" button.
- **Custom domain** — deferred, GitHub Pages URL is fine for now.
