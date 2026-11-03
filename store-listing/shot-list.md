# Screenshot Shot List

All screenshots at **1280x800**. Use Chrome DevTools device toolbar (Cmd+Shift+M, set to 1280x800) then right-click → "Capture screenshot".

Use synthetic personal and tracker data throughout. Blur spreadsheet IDs, private URLs, account names, emails, and identifying browser chrome before publishing. Keep the real tracker column order; screenshots must not imply a schema the extension cannot write.

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
2. Keep template columns A–N in order. Populate A–G with synthetic job entries as below; retain H–N for the reserved/manual fields:

| Company Name | Role Title | URL | Applied | Date Applied | Fit Level | Status |
|---|---|---|---|---|---|---|
| Acme Corp | Senior Product Manager | https://example.com/jobs/1 | y | 2026-11-01 | 8 | Applied |
| Meridian Health | UX Research Lead | https://example.com/jobs/2 | | 2026-11-02 | 7 | Saved |
| Northfield Labs | Product Designer | https://example.com/jobs/3 | y | 2026-11-03 | 9 | Applied |

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
   - How We Connected: "Met at ProductCon, referred by Alex"
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

Keep columns A–N in the template order. Example A–G values:

| Company | Contact Name | Role | LinkedIn URL | How We Connected | Last Follow Up | Status |
|---|---|---|---|---|---|---|
| Acme Corp | Jordan Lee | Engineering Manager | | Product event | 2026-11-01 | Pending 3B |
| Meridian Health | Riley Chen | Head of Product | | Alumni network | 2026-11-02 | Message Sent |
| Northfield Labs | Sam Patel | Recruiter | | Referred by Alex | | Prospect |

Retain H–M for template notes and follow-up formulas, and N for Date of Original Request. If showing a next-action date, label it as the template’s calculated or manually maintained value rather than a date scheduled by the extension.

3. Make the "Last Follow Up" and template "Next Action Date" columns clearly visible and highlighted if possible (light fill color).
4. Widen columns so all data is readable.

**Before screenshotting:**
- No real names or contact info
- Follow-up date column should be prominent — this is the feature differentiator
- Sheet tab name visible (e.g. "Outreach")

**Capture:** DevTools device toolbar → 1280x800 → right-click → Capture screenshot
**Save as:** `store-listing/screenshot-5.png`
