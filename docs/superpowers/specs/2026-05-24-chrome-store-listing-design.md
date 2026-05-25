# Chrome Web Store Listing — JobSearch Aide

## Overview

Design spec for the Chrome Web Store listing. Covers name, copy, screenshots, promo tile, category, and keywords. Privacy policy and OAuth verification are deferred — required before public release but not blocking a Trusted Testers launch.

---

## Name

**JobSearch Aide**

Flexible — if a better name surfaces before submission, swap it. Rationale: plain language, no jargon, signals the product is a helper for active job seekers. "JDTracker" (internal name) is too insider. "JobSaver" and "Shortlist" have existing name conflicts.

---

## Category & Keywords

**Category:** Productivity

**Keywords (5 max):**
- job tracker
- job search
- LinkedIn
- Google Sheets
- application tracker

Note: tags should match how people search, not how the product differentiates. "AI resume" and "AI-ready" get no search traffic yet — use conventional terms and let the description copy carry the differentiation.

---

## Short Description

> Stop copy-pasting job descriptions. One click saves to your spreadsheet and preps your AI tools.

98 characters. Leads with the pain, lands on the two outcomes. Shown in store search results before the user clicks through.

---

## Long Description

> If you're using ChatGPT or Claude to tailor your resume and cover letters, you already know the drill: find the listing, download or copy the job description, switch to your tracker to log the details, switch to your AI tool to paste everything in and tailor your resume. That's four steps before you've written a single word. JobSearch Aide gets it down to one.
>
> **Save job listings:**
> On any job posting, click the extension. It captures the role, company, and link, logs it to your Google Sheet, and downloads a clean copy of the job description as a text file — ready to paste straight into ChatGPT, Claude, or any AI tool without reformatting.
>
> **Track outreach:**
> On a LinkedIn contact page, click the extension to pull up a quick form. Enter the details you want to log — name, role, company — and save. It writes directly to your outreach sheet — and if you're using the free JobSearch Aide Google Sheets template, a follow-up date is filled in automatically so you know exactly when to check back. No more switching between LinkedIn and a spreadsheet to keep track of who you've contacted.
>
> **How it works:**
> Connect your Google Sheet once during setup. After that, every job you save and every contact you log goes straight to your spreadsheet — organized, timestamped, and ready for follow-up. Your data stays in a sheet you own, not locked in a third-party app.
>
> **Built for:**
> Job seekers doing an active, organized search who use AI to customize their applications and want everything in one place without the tab-switching.
>
> **Also included:**
> **Autofill (beta)** — fills personal information fields on job applications from a saved profile.

### Notes on copy

- "Follow-up date automatically filled in" refers to the free Google Sheets template, not a built-in extension feature. If the user brings their own sheet, follow-up dates won't auto-fill. Consider adding "when using our free template" qualifier before final submission.
- Markdown (.md) file format is not called out explicitly in the long description — it's in the short description area. Non-tech users will focus on "paste into ChatGPT"; power users will notice .md in the details.
- PDF download is not yet implemented. If added before launch, revise copy to: "saves a copy of the job listing you can paste into AI tools or share as a PDF."

---

## Screenshots (5)

All at 1280x800. Captions shown below each screenshot in the store.

| # | Scene | Caption |
|---|-------|---------|
| 1 | Extension popup open on a real job listing page (job description visible behind it) | "One click on any job listing. Saved." |
| 2 | Google Sheet with 4–5 rows of job entries — company, role, link, status, date | "Your full job tracker, in a spreadsheet you own." |
| 3 | Split view: downloaded job description file on left, ChatGPT or Claude open on right with it pasted in | "Job description ready to paste into any AI tool." |
| 4 | Extension popup open on a LinkedIn profile page, form visible with name and contact fields | "Log a contact without leaving LinkedIn." |
| 5 | Outreach tab of Google Sheet with contact name, company, role, date contacted, follow-up date | "Pairs with our free template — follow-up dates filled automatically." |

### Screenshot production notes

- Use realistic but anonymized data (fake company names, real-looking roles)
- Screenshot 1: job listing page in the background, not the spreadsheet — avoids implying the spreadsheet needs to be open
- Screenshot 5: make clear in the caption or a callout that the auto follow-up date is a template feature
- Popup should be centered and clearly visible in screenshots 1 and 4

---

## Promotional Tile

**Dimensions:** 440x280px

**Design:**
- Background: `#1a5c4f` (logo dark green)
- Title: "JobSearch Aide" in white, bold, centered
- Three checkmark lines in `#e8f5f2`, gold (`#e8a020`) checkmark icons:
  - Job listing saved to Google Sheets
  - AI-ready job description downloaded
  - Outreach contact logged
- Tagline: "All in one click." in `#a8d5c8`
- Subtitle chip: "Chrome Extension" in small uppercase, `#a8d5c8`

Mockup saved in `.superpowers/brainstorm/` session directory.

---

## Competitive Context

**Closest competitor:** CareerSuite.AI — Sheets-connected, data ownership angle, some AI framing. Most direct overlap. Study their store copy before finalizing ours to ensure differentiation is explicit.

**Not real competitors:** Teal, Huntr, Simplify — they own "managed dashboard + autofill" and actively position against spreadsheets. Users who want that will go there; they're not shopping for this.

**The unoccupied gap:** JD download as a text file framed explicitly for AI workflows. No other extension in the store is doing this. It's the core differentiator and should stay prominent in the description.

**Risk:** The LinkedIn outreach + follow-up tracking workflow is what separates this from CareerSuite.AI, but it's not visible from the store listing without reading the full description. Screenshots 4 and 5 carry that weight — they need to be sharp and tell a clear story.

---

## Pre-submission Checklist

These are required before public release and are not part of this listing design:

- [ ] Privacy policy — hosted at a public URL, linked in the listing
- [ ] Google OAuth verification — submit for review; expect 4–6 weeks; the `spreadsheets` scope is classified as sensitive
- [ ] Column mapping — header-based mapping must be implemented before public release so users with different sheet layouts don't have a broken experience on first save
- [ ] PDF download — consider adding before launch; would broaden appeal for non-technical users

## Trusted Testers Launch (no privacy policy required)

Before going public, publish as a private listing with Trusted Testers:

1. Create Chrome Web Store developer account ($5 one-time fee)
2. Zip the `Code/` directory and upload as a new item
3. Set visibility to Private, add tester emails
4. Share the store link directly — testers install like a normal extension, no developer mode required
5. Note: the OAuth "unverified app" warning will still appear for testers; brief them to expect it

Use the Trusted Testers period to validate copy resonance and surface column mapping issues before public release.
