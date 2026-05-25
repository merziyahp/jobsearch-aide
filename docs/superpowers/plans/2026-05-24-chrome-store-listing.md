# Chrome Web Store Listing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce all assets and copy needed to submit JobSearch Aide to the Chrome Web Store as a Trusted Testers listing.

**Architecture:** No backend, no build step. Assets are static HTML files (rendered to PNG by the user), a plain-text copy file for pasting into the Chrome Web Store dashboard, and an updated manifest. All output lives in `store-listing/` at the project root.

**Tech Stack:** Vanilla HTML/CSS for tile and screenshot scaffold, bash for zipping, Chrome DevTools for screenshotting at exact dimensions.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `Code/manifest.json` | Modify | Update name field |
| `store-listing/copy.txt` | Create | Paste-ready store listing text |
| `store-listing/promo-tile.html` | Create | Standalone 440x280 tile, screenshot to PNG |
| `store-listing/screenshot-3.html` | Create | 1280x800 split-view mockup for screenshot 3 |
| `store-listing/shot-list.md` | Create | Step-by-step instructions for real screenshots 1, 2, 4, 5 |
| `store-listing/JobSearchAide.zip` | Create | Zipped Code/ directory ready for upload |

---

## Task 1: Update extension name in manifest

**Files:**
- Modify: `Code/manifest.json`

- [ ] **Step 1: Update the name field**

  In `Code/manifest.json`, change:
  ```json
  "name": "JDTracker",
  ```
  to:
  ```json
  "name": "JobSearch Aide",
  ```

- [ ] **Step 2: Verify the extension still loads**

  In Chrome, go to `chrome://extensions`, click "Load unpacked", select the `Code/` folder. Confirm the extension appears as "JobSearch Aide" in the toolbar and extensions list with no errors shown.

---

## Task 2: Create paste-ready store copy file

**Files:**
- Create: `store-listing/copy.txt`

Note: Chrome Web Store descriptions do not render markdown. Use plain text with blank lines between sections. Bold and headers are not supported — use ALL CAPS for section labels.

- [ ] **Step 1: Create `store-listing/` directory**

  ```bash
  mkdir -p /Users/merziyahpoonawala/tech_projects/jd_tracker_chrome_extension/store-listing
  ```

- [ ] **Step 2: Write copy file**

  Create `store-listing/copy.txt` with this exact content:

  ```
  EXTENSION NAME
  JobSearch Aide


  CATEGORY
  Productivity


  SHORT DESCRIPTION (98 characters — paste as-is)
  Stop copy-pasting job descriptions. One click saves to your spreadsheet and preps your AI tools.


  KEYWORDS (enter each on its own line in the dashboard)
  job tracker
  job search
  LinkedIn
  Google Sheets
  application tracker


  LONG DESCRIPTION (paste as-is — line breaks are preserved)
  If you're using ChatGPT or Claude to tailor your resume and cover letters, you already know the drill: find the listing, download or copy the job description, switch to your tracker to log the details, switch to your AI tool to paste everything in and tailor your resume. That's four steps before you've written a single word. JobSearch Aide gets it down to one.

  SAVE JOB LISTINGS
  On any job posting, click the extension. It captures the role, company, and link, logs it to your Google Sheet, and downloads a clean copy of the job description as a text file — ready to paste straight into ChatGPT, Claude, or any AI tool without reformatting.

  TRACK OUTREACH
  On a LinkedIn contact page, click the extension to pull up a quick form. Enter the details you want to log — name, role, company — and save. It writes directly to your outreach sheet — and if you're using the free JobSearch Aide Google Sheets template, a follow-up date is filled in automatically so you know exactly when to check back. No more switching between LinkedIn and a spreadsheet to keep track of who you've contacted.

  HOW IT WORKS
  Connect your Google Sheet once during setup. After that, every job you save and every contact you log goes straight to your spreadsheet — organized, timestamped, and ready for follow-up. Your data stays in a sheet you own, not locked in a third-party app.

  BUILT FOR
  Job seekers doing an active, organized search who use AI to customize their applications and want everything in one place without the tab-switching.

  ALSO INCLUDED
  Autofill (beta) — fills personal information fields on job applications from a saved profile.


  SCREENSHOT CAPTIONS (enter below each screenshot in the dashboard)
  Screenshot 1: One click on any job listing. Saved.
  Screenshot 2: Your full job tracker, in a spreadsheet you own.
  Screenshot 3: Job description ready to paste into any AI tool.
  Screenshot 4: Log a contact without leaving LinkedIn.
  Screenshot 5: Pairs with our free template — follow-up dates filled automatically.
  ```

- [ ] **Step 3: Verify**

  Open `store-listing/copy.txt` and confirm all sections are present and character count for the short description is under 132. Count: "Stop copy-pasting job descriptions. One click saves to your spreadsheet and preps your AI tools." = 98 characters. ✓

---

## Task 3: Build promo tile HTML

**Files:**
- Create: `store-listing/promo-tile.html`

- [ ] **Step 1: Create the HTML file**

  Create `store-listing/promo-tile.html`:

  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { width: 440px; height: 280px; overflow: hidden; background: #fff; }
      .tile {
        width: 440px;
        height: 280px;
        background: #1a5c4f;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .chip {
        font-size: 0.55rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #a8d5c8;
        margin-bottom: 0.5rem;
      }
      .title {
        font-size: 1.75rem;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 1.25rem;
        letter-spacing: -0.01em;
      }
      .checklist {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        align-items: flex-start;
        margin-bottom: 1.25rem;
      }
      .item {
        font-size: 0.8rem;
        color: #e8f5f2;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .check {
        color: #e8a020;
        font-weight: 700;
        font-size: 1rem;
        line-height: 1;
      }
      .tagline {
        font-size: 0.7rem;
        font-weight: 600;
        color: #a8d5c8;
        letter-spacing: 0.04em;
      }
    </style>
  </head>
  <body>
    <div class="tile">
      <div class="chip">Chrome Extension</div>
      <div class="title">JobSearch Aide</div>
      <div class="checklist">
        <div class="item"><span class="check">✓</span> Job listing saved to Google Sheets</div>
        <div class="item"><span class="check">✓</span> AI-ready job description downloaded</div>
        <div class="item"><span class="check">✓</span> Outreach contact logged</div>
      </div>
      <div class="tagline">All in one click.</div>
    </div>
  </body>
  </html>
  ```

- [ ] **Step 2: Screenshot to PNG at exact dimensions**

  1. Open `store-listing/promo-tile.html` in Chrome
  2. Open DevTools (Cmd+Option+I)
  3. Click the device toolbar icon (Cmd+Shift+M) to enter responsive mode
  4. Set dimensions to exactly **440 x 280** in the width/height fields at the top
  5. Right-click anywhere on the page → "Capture screenshot"
  6. Save as `store-listing/promo-tile.png`

- [ ] **Step 3: Verify**

  Open `store-listing/promo-tile.png`. Confirm: dark green background, white title, gold checkmarks, all three lines visible, no clipping.

---

## Task 4: Build screenshot 3 HTML scaffold (split view)

**Files:**
- Create: `store-listing/screenshot-3.html`

- [ ] **Step 1: Create the HTML file**

  Create `store-listing/screenshot-3.html`:

  ```html
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        width: 1280px;
        height: 800px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #f5f5f5;
        display: flex;
      }

      /* LEFT PANEL — downloaded .md file */
      .left {
        width: 500px;
        height: 800px;
        background: #1e1e1e;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }
      .file-bar {
        background: #2d2d2d;
        padding: 0.6rem 1rem;
        font-size: 0.7rem;
        color: #999;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border-bottom: 1px solid #3a3a3a;
      }
      .file-dot { width: 10px; height: 10px; border-radius: 50%; }
      .file-content {
        padding: 1.25rem 1.5rem;
        color: #d4d4d4;
        font-size: 0.72rem;
        line-height: 1.7;
        font-family: 'Menlo', 'Monaco', monospace;
        overflow: hidden;
      }
      .file-content .h1 { color: #569cd6; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.5rem; }
      .file-content .h2 { color: #4ec9b0; font-size: 0.75rem; font-weight: 600; margin: 0.75rem 0 0.25rem; }
      .file-content .muted { color: #6a9955; }
      .file-content .bold { color: #ce9178; }

      /* DIVIDER */
      .divider {
        width: 4px;
        height: 800px;
        background: #ddd;
        flex-shrink: 0;
      }

      /* RIGHT PANEL — AI tool with pasted content */
      .right {
        flex: 1;
        height: 800px;
        background: #ffffff;
        display: flex;
        flex-direction: column;
      }
      .ai-bar {
        background: #f9f9f9;
        border-bottom: 1px solid #e5e5e5;
        padding: 0.75rem 1.25rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .ai-logo {
        width: 24px;
        height: 24px;
        background: #10a37f;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 0.7rem;
        font-weight: 700;
      }
      .ai-title { font-size: 0.8rem; font-weight: 600; color: #333; }
      .chat-area {
        flex: 1;
        padding: 1.5rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .user-bubble {
        background: #f4f4f4;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        font-size: 0.72rem;
        color: #333;
        line-height: 1.6;
        max-width: 90%;
        align-self: flex-end;
      }
      .user-bubble .label {
        font-size: 0.6rem;
        color: #999;
        margin-bottom: 0.3rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .ai-bubble {
        background: #fff;
        border: 1px solid #e5e5e5;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        font-size: 0.72rem;
        color: #333;
        line-height: 1.6;
        max-width: 90%;
      }
      .caption-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(26, 92, 79, 0.92);
        color: white;
        text-align: center;
        padding: 0.75rem;
        font-size: 0.9rem;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
    </style>
  </head>
  <body style="position:relative">

    <!-- LEFT: Downloaded .md file in editor -->
    <div class="left">
      <div class="file-bar">
        <div class="file-dot" style="background:#ff5f57"></div>
        <div class="file-dot" style="background:#ffbd2e"></div>
        <div class="file-dot" style="background:#28c840"></div>
        <span style="margin-left:0.5rem">Acme-Corp-Senior-Product-Manager.md</span>
      </div>
      <div class="file-content">
        <div class="h1"># Senior Product Manager — Acme Corp</div>
        <div class="muted"># URL: https://jobs.acmecorp.com/pm-senior</div>
        <div class="muted"># Saved: 2026-05-24</div>
        <br>
        <div class="h2">## About the Role</div>
        We're looking for a Senior Product Manager to lead our core platform team. You'll own the roadmap, work closely with engineering and design, and drive outcomes across a suite of B2B tools used by 10,000+ customers.
        <br><br>
        <div class="h2">## What You'll Do</div>
        <span class="bold">- Define and prioritize</span> the product roadmap in collaboration with stakeholders<br>
        <span class="bold">- Partner with engineering</span> to ship high-quality features on schedule<br>
        <span class="bold">- Analyze user feedback</span> and usage data to inform decisions<br>
        <span class="bold">- Own go-to-market</span> coordination with sales and marketing<br>
        <br>
        <div class="h2">## Requirements</div>
        5+ years of product management experience<br>
        Strong written and verbal communication<br>
        Experience with B2B SaaS products<br>
        Comfort with data — SQL a plus
      </div>
    </div>

    <div class="divider"></div>

    <!-- RIGHT: AI tool with content pasted in -->
    <div class="right">
      <div class="ai-bar">
        <div class="ai-logo">AI</div>
        <div class="ai-title">ChatGPT</div>
      </div>
      <div class="chat-area">
        <div class="user-bubble">
          <div class="label">You</div>
          Here's the job description I saved. Can you help me tailor my resume summary and rewrite my bullet points to match what they're looking for?<br><br>
          <span style="color:#555;font-family:monospace;font-size:0.68rem">[Acme-Corp-Senior-Product-Manager.md pasted]</span>
        </div>
        <div class="ai-bubble">
          <div class="label" style="color:#10a37f">ChatGPT</div>
          Great — based on this role, here's a tailored resume summary:<br><br>
          <strong>Summary:</strong> Results-driven Senior Product Manager with 6+ years leading B2B SaaS roadmaps. Proven track record of cross-functional collaboration with engineering and design to ship customer-facing features. Data-informed decision maker with experience translating user feedback into measurable outcomes.<br><br>
          Want me to rewrite your bullet points next?
        </div>
      </div>
    </div>

    <div class="caption-bar">Job description ready to paste into any AI tool.</div>

  </body>
  </html>
  ```

- [ ] **Step 2: Screenshot to PNG at 1280x800**

  1. Open `store-listing/screenshot-3.html` in Chrome
  2. Open DevTools (Cmd+Option+I)
  3. Click the device toolbar icon (Cmd+Shift+M)
  4. Set dimensions to exactly **1280 x 800**
  5. Right-click → "Capture screenshot"
  6. Save as `store-listing/screenshot-3.png`

- [ ] **Step 3: Verify**

  Open `store-listing/screenshot-3.png`. Confirm: left panel shows the .md file with realistic content, right panel shows a ChatGPT-style conversation with the content pasted in, green caption bar is fully visible at the bottom, nothing is clipped.

---

## Task 5: Shot list for real screenshots (1, 2, 4, 5)

**Files:**
- Create: `store-listing/shot-list.md`

- [ ] **Step 1: Create the shot list file**

  Create `store-listing/shot-list.md`:

  ````markdown
  # Screenshot Shot List

  All screenshots at **1280x800**. Use Chrome DevTools device toolbar (Cmd+Shift+M, set to 1280x800) then right-click → "Capture screenshot".

  Use realistic but fake data throughout — no real names, emails, or company names.

  ---

  ## Screenshot 1 — Popup on a job listing

  **Goal:** Show the extension in its natural context. The user is on a job page, they've clicked the extension.

  **Setup:**
  1. Find a real job listing on any major job board (LinkedIn, Indeed, Greenhouse-hosted). Pick a role that looks realistic — e.g. "Senior Marketing Manager at Acme Corp."
  2. Click the JobSearch Aide extension icon to open the popup.
  3. The popup should have the job title, company, and URL pre-filled. If not, type in realistic fake values.
  4. Make sure the popup is fully visible (not cut off) and the job listing page is clearly visible behind it.
  5. Do NOT have the Google Sheet open in another tab — the job listing page should be the background.

  **Before screenshotting:**
  - Status field should show "Saved" or be on the default "Applied" state — not an error state
  - No personal data visible in the popup
  - Browser address bar can show the job listing URL (this adds authenticity)

  **Capture:** DevTools device toolbar → 1280x800 → right-click → Capture screenshot
  **Save as:** `store-listing/screenshot-1.png`

  ---

  ## Screenshot 2 — Google Sheet with job entries

  **Goal:** Show the organized output. Clean sheet, real-looking data.

  **Setup:**
  1. Open your tracking Google Sheet.
  2. Populate 4–5 rows with fake but realistic job entries:

  | Company | Role | URL | Status | Date Added |
  |---------|------|-----|--------|------------|
  | Acme Corp | Senior Product Manager | https://jobs.acme.com/... | Applied | 2026-05-20 |
  | Meridian Health | UX Research Lead | https://meridian.com/... | Interviewing | 2026-05-18 |
  | Northfield Labs | Product Designer | https://jobs.northfield.io/... | Saved | 2026-05-22 |
  | Cascadia Systems | Growth Marketing Manager | https://cascadia.com/... | Applied | 2026-05-23 |
  | Blue Harbor Co | Operations Analyst | https://blueharbor.com/... | Saved | 2026-05-24 |

  3. Widen columns so all data is readable.
  4. Freeze the header row so it's visible.
  5. The sheet should look organized — no extra empty columns, no formula errors.

  **Before screenshotting:**
  - No real personal data in the sheet
  - Sheet tab name visible (e.g. "Job Applications")
  - URL column can be truncated — that's fine

  **Capture:** DevTools device toolbar → 1280x800 → right-click → Capture screenshot
  **Save as:** `store-listing/screenshot-2.png`

  ---

  ## Screenshot 4 — Popup on a LinkedIn profile page

  **Goal:** Show the outreach logging feature in context. User is on a LinkedIn contact page.

  **Setup:**
  1. Navigate to any LinkedIn profile page (your own, or a public one — we'll use fake data).
  2. Click the JobSearch Aide extension to open the outreach popup.
  3. Fill in fake but realistic values in the form:
     - Name: "Jordan Lee"
     - Role: "Engineering Manager"
     - Company: "Acme Corp"
     - Notes: "Met at ProductCon, referred by Sarah"
  4. The LinkedIn profile page should be clearly visible behind the popup.

  **Before screenshotting:**
  - No real person's name or photo visible in the LinkedIn background (blur or crop if needed after capture)
  - Popup should be centered and fully visible
  - Form should look filled in, not empty

  **Capture:** DevTools device toolbar → 1280x800 → right-click → Capture screenshot
  **Save as:** `store-listing/screenshot-4.png`

  Note: if blurring the LinkedIn background is needed, use macOS Preview → Tools → Adjust Color, or any image editor.

  ---

  ## Screenshot 5 — Outreach sheet with follow-up dates

  **Goal:** Show the organized outreach tracking output, with the follow-up date column visible.

  **Setup:**
  1. Open the JobSearch Aide Google Sheets template (outreach tab).
  2. Populate 4–5 rows with fake contact entries:

  | Name | Company | Role | Date Contacted | Follow-up Date | Notes |
  |------|---------|------|---------------|---------------|-------|
  | Jordan Lee | Acme Corp | Engineering Manager | 2026-05-20 | 2026-05-27 | Met at ProductCon |
  | Riley Chen | Meridian Health | Head of Product | 2026-05-18 | 2026-05-25 | LinkedIn cold outreach |
  | Sam Patel | Northfield Labs | Recruiter | 2026-05-22 | 2026-05-29 | Referred by Alex |
  | Morgan Wu | Cascadia Systems | VP Engineering | 2026-05-23 | 2026-05-30 | Alumni network |

  3. Make the "Follow-up Date" column clearly visible and highlighted if possible (light fill color).
  4. Widen columns so all data is readable.

  **Before screenshotting:**
  - No real names or contact info
  - Follow-up date column should be prominent — this is the feature differentiator
  - Sheet tab name visible (e.g. "Outreach")

  **Capture:** DevTools device toolbar → 1280x800 → right-click → Capture screenshot
  **Save as:** `store-listing/screenshot-5.png`
  ````

- [ ] **Step 2: Verify**

  Open `store-listing/shot-list.md` and confirm all four screenshots (1, 2, 4, 5) have setup steps, fake data provided, and save paths specified.

---

## Task 6: Zip Code/ directory for upload

**Files:**
- Create: `store-listing/JobSearchAide.zip`

- [ ] **Step 1: Create the zip**

  Run from the project root (`/Users/merziyahpoonawala/tech_projects/jd_tracker_chrome_extension`):

  ```bash
  cd /Users/merziyahpoonawala/tech_projects/jd_tracker_chrome_extension
  zip -r store-listing/JobSearchAide.zip Code/ \
    --exclude "Code/CLAUDE.md" \
    --exclude "Code/.DS_Store" \
    --exclude "Code/**/.DS_Store"
  ```

- [ ] **Step 2: Verify the zip contents**

  ```bash
  unzip -l store-listing/JobSearchAide.zip
  ```

  Confirm the output includes:
  - `Code/manifest.json` (with name "JobSearch Aide")
  - `Code/popup.html`
  - `Code/popup.js`
  - `Code/content.js`
  - `Code/background.js`
  - `Code/sheets.js`
  - `Code/outreach.js`
  - `Code/storage.js`
  - `Code/autofill.js`
  - `Code/icons/` directory with icon files

  Confirm it does NOT include `Code/CLAUDE.md`.

---

## After all tasks: Chrome Web Store submission steps

These are manual steps for the user — not automated.

1. Go to [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) and create a developer account ($5 one-time fee)
2. Click "New Item" and upload `store-listing/JobSearchAide.zip`
3. Paste content from `store-listing/copy.txt` into the appropriate fields
4. Upload assets:
   - Promo tile: `store-listing/promo-tile.png` (440x280)
   - Screenshots in order: `screenshot-1.png` through `screenshot-5.png` (1280x800 each)
5. Set Category to **Productivity**
6. Set visibility to **Private** and distribution to **Trusted Testers**
7. Add tester email addresses
8. Submit for review (private listings review faster than public)
9. Share the listing URL with testers once approved
