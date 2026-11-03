# TODO

## Latest status — November 3, 2026

- User reported submitting version **3.0.2** to Chrome Web Store review. Await approval and private publication, then test the installed store copy with trusted testers. No live dashboard status check was performed after submission.
- Local download testing was reported working. LinkedIn contact extraction now strips a leading numeric notification count such as `(3)` from the name; reload the extension and refresh LinkedIn to test the fix.
- Current automated checks: 39 JavaScript tests and 2 store-packaging tests pass.
- The older session notes below record the preparation history; references to an unpublished draft or unfinished reviewer instructions are superseded by this submission update.

## Permission reduction — November 3, 2026

- Local/store testing setup: `Code/manifest.json` now uses the original local OAuth client. Reload the existing unpacked extension from the same folder for local testing. `python3 -B scripts/package_store.py` creates the store ZIP with the store OAuth client without changing local files. Do not manually ZIP Code for store upload. See README for the full local/release/store test sequence.
- Prepared version **3.0.2** at `releases/jobsearch-aide-3.0.2.zip`; supersedes the 3.0.1 package below. Store OAuth client is retained.
- Removed `<all_urls>`, automatic content-script injection, and the unnecessary web-accessible autofill resource. Page scripts now rely on the existing popup-triggered `activeTab` injection flows.
- Host permissions are limited to `sheets.googleapis.com`, `script.google.com`, and `script.googleusercontent.com` (Apps Script response redirect).
- All 38 automated tests pass, including new on-demand job/outreach extraction and autofill checks. These mock Chrome APIs; live Chrome permission grants, Google authorization, and network redirects still need manual testing.
- User confirmed store status is **Draft is unpublished**. Private dropdown **None** is the optional Google Group; individual trusted testers are configured separately in publisher Settings.
- Reviewer instructions were finalized in chat (456 characters). Confirm saved in dashboard. Upload 3.0.2 and review the dashboard permission justifications before submitting; no upload or submission performed by the agent.

## Resume Chrome Web Store private-beta testing and submission

Session notes: November 3, 2026. User paused this work to resume next session.

### Current setup

- Chrome Store listing exists as a draft for JobSearch Aide. Store extension ID: `adenkikljhpdapfnoflcdenodikgckob`.
- Publishing account: `mfpbuilds@gmail.com`. Publisher contact email has been added and verified; Submit for review became available.
- Distribution was changed to **Private**. User added trusted testers through the publisher Settings link under Distribution.
- Google Cloud OAuth audience remains **Testing**. The Google Cloud test-user list is separate from Chrome Store trusted testers; confirm intended testers are on both lists.
- A new Chrome Extension OAuth client was created in the existing Google Cloud project for the store ID. Existing development client was retained.
- New store client: `507144567625-j9jksj66rlojenggufeh32htefhidf6m.apps.googleusercontent.com`.
- Local `Code/manifest.json` now uses that client and version `3.0.1`; these code changes are not committed yet.
- Replacement package prepared at `releases/jobsearch-aide-3.0.1.zip` (may be ignored by Git). Confirm it still exists and that the draft actually contains version 3.0.1; user has not explicitly confirmed the upload.
- Package contains the same 13 runtime files: 8 JavaScript files, popup.html, manifest.json, and 3 PNG icons. Excludes CLAUDE.md, .DS_Store, and icon.svg.
- Listing assets and privacy fields were filled in with assistance. No submission was confirmed in this chat; check dashboard status before assuming it is still a draft.

### Unresolved testing/review work

- **Google Sheets is optional.** User clarified this after discussion of OAuth reviewer access. Do not assume Google sign-in is mandatory for the extension.
- Verify download-only behavior in the exact 3.0.1 package: open a real job posting, disable "Log to application tracker", click "Save & Log", and confirm a useful Markdown file downloads without Google authorization.
- Verify beta autofill works without Google sign-in using fictional profile details. Check outreach behavior separately; do not imply it works without Sheets unless verified.
- Test Google Sheets authorization with the **store extension ID**, not merely the old unpacked development ID. The store public key from Package > View public key can be used in a local manifest to preserve the store ID for unpacked testing; do not confuse a public key with a private signing key.
- Google Cloud Testing restricts Sheets authorization to named test users. Reviewers may therefore be unable to exercise optional Sheets/outreach functionality with their own accounts. Private store distribution does not bypass OAuth restrictions.
- Decide a practical reviewer-access approach if required. Do not claim optional Sheets guarantees approval, and do not share personal Google account credentials. Consider an appropriate dedicated test setup, guidance from Chrome developer support, or OAuth production verification if needed.
- A general public launch would require evaluating Google OAuth production/verification requirements for the sensitive `spreadsheets` scope, including scope minimization, branding, domain ownership, policy links, and demo evidence. Do not change scope or architecture silently.
- Confirm two-step verification on the publishing account; user initially deferred it, and completion was not explicitly confirmed.

### Test instructions: unfinished

- Dashboard test-instructions field has a **500-character maximum**.
- The earlier long instructions were too long. The shortened draft was explicitly described by the user as **incomplete**; it is not approved final copy.
- Next session, write complete and accurate instructions within 500 characters, count characters, and prioritize the independent download flow, optional Sheets setup/restriction, and beta autofill. Reference the setup page for full steps if useful.
- Full setup guide: https://merziyahp.github.io/jobsearch-aide/setup.html
- Support: https://merziyahp.github.io/jobsearch-aide/support.html
- Privacy: https://merziyahp.github.io/jobsearch-aide/privacy.html
- Do not submit automatically. Resume with verification and the revised instructions, then let the user make the final submission decision.

### Published website state

- Website changes were committed to main (`fcca19d`) and deployed to the separate `gh-pages` branch (`84e7d1d`); GitHub Pages build completed successfully.
- Homepage keeps the existing Formspree **Get early access** email form at the user's request, to collect beta tester emails.
- Contact email is mfpbuilds@gmail.com; dedicated support page was added.
- GitHub Pages serves `gh-pages`, not main. Future website changes need deployment to that branch too.
- Other pre-existing local edits and untracked artifacts remain; preserve them and avoid committing unrelated files.
