# JobSearch Aide — Chrome Extension

Save job listings to Google Sheets, download AI-ready job descriptions, and log outreach contacts from your browser.

**Website:** https://merziyahp.github.io/jobsearch-aide/

---

## What it does

- **Save job listings** — on supported job pages, captures company, role, and link, logs it to your Google Sheet, and downloads a clean copy of the job description ready to paste into ChatGPT or Claude
- **Track outreach** — on any LinkedIn profile page, opens a quick form to log contact details directly to your outreach sheet
- **Autofill (beta)** — fills personal information fields on job applications from a saved profile

Job and outreach records go directly to the Google spreadsheets you configure. Your optional autofill profile is stored locally and shared with the active page when you run autofill. No subscription or third-party analytics library.

---

## Setup

Follow the [setup guide](https://merziyahp.github.io/jobsearch-aide/setup.html):

1. Get the extension through the beta distribution channel. Installation details on the setup page are still pending.
2. Make a copy of the Google Sheets template. Keep the header row and columns A–N in their original order in both tracker tabs.
3. In extension Settings, connect each tracker to its spreadsheet URL and select the worksheet tab by its name at the bottom of Google Sheets. Both trackers can use one spreadsheet or separate spreadsheets; tab names can differ from the examples.
4. Optionally save a profile for beta form filling. Review filled information before submitting an application.

The website setup guide uses Google Sheets; Excel import is not part of the documented setup flow. Job tracker overwrite currently replaces A–N, including any manual values in H–N, so leave overwrite off if those cells contain information you want to retain.

## Tech

Vanilla JS, no build step, no dependencies. Uses Google OAuth via Chrome's built-in `chrome.identity` API. Job and outreach data goes directly to the user's own Google Sheets. After a usage-feedback prompt appears, feature-use counts and the user's response are sent through Google Apps Script to a developer-owned analytics Sheet; job, contact, browsing, spreadsheet, and autofill-profile contents are not included automatically. Reports use a random installation ID and can identify you if you include an email address or identifying details in a comment. See the [privacy policy](https://merziyahp.github.io/jobsearch-aide/privacy.html) for details.

The current Google authorization uses the `spreadsheets` scope, which grants account-wide spreadsheet access. Tracker requests use the spreadsheet IDs configured by the user. A migration to per-file authorization is planned; the existing scope remains in place until the replacement setup flow is implemented.

The OAuth client ID in `Code/manifest.json` is not a secret — it is visible to anyone who installs a Chrome extension and is standard practice.

---

## Development checks

Page access uses `activeTab`: opening the extension grants temporary access to the active page, and extraction/autofill scripts are injected on demand. No content script runs automatically across websites. Persistent host permissions are limited to the Sheets API and the Apps Script feedback endpoint (including its response redirect). Packaged scripts injected through `chrome.scripting` do not need web-accessible resource declarations.

There is no build step. Run the automated suite from the repository root with `node --test tests/*.test.js`. Extraction design and regression coverage are described in [JOB_EXTRACTION_NOTES.md](JOB_EXTRACTION_NOTES.md).

## Local testing and store releases

### Where the manifests and OAuth clients live

**There is only one manifest file to maintain: [`Code/manifest.json`](Code/manifest.json).** It is the local testing manifest. There is no separate store manifest saved alongside it.

| What | Where to look | How it is used |
|---|---|---|
| Local manifest | [`Code/manifest.json`](Code/manifest.json) | Chrome reads this when you load or reload the unpacked `Code` folder. It uses the original local OAuth client. |
| OAuth client settings for packaging | [`scripts/package_store.py`](scripts/package_store.py) | `LOCAL_CLIENT` identifies the expected local client; `STORE_CLIENT` is the client inserted into the store package. `STORE_ID` records the store extension ID. |
| Generated store manifest | `manifest.json` **inside** `releases/jobsearch-aide-<version>.zip` | Created in memory from the local manifest, changing only `oauth2.client_id`, then written directly into the ZIP. |

The local OAuth client is `507144567625-q5n7osjjf23noonbkgfh38fgbsrm53ur.apps.googleusercontent.com`. The store OAuth client is `507144567625-j9jksj66rlojenggufeh32htefhidf6m.apps.googleusercontent.com`.

These OAuth client IDs are different from Chrome's extension ID. The store extension ID is `adenkikljhpdapfnoflcdenodikgckob`; the local extension keeps its existing ID when loaded from the same folder and profile. No manifest `key` is added by this workflow. You do not need to switch IDs manually between local testing and packaging.

### Test changes locally

Keep editing and loading the same `Code` folder in Chrome. Its manifest uses the original **local OAuth client**. In `chrome://extensions`, reload the existing unpacked extension after changes, then refresh the page being tested. Keeping the same folder and Chrome profile preserves the existing local setup. Do not replace its OAuth client with the store client. Google sign-in still requires the account to be allowed in the Google Cloud OAuth test-user list while the project is in Testing.

Before each release, test a job Markdown download with Sheets logging off, job logging with Sheets on, LinkedIn outreach extraction and saving, and autofill with fictional details (without submitting an application). Close/reopen the popup and repeat extraction on a different website to check on-demand page access. Use a test spreadsheet/tab with the required tracker headers to avoid altering real records; leave overwrite off.

### Package a version for the store

1. Finish local testing using the checklist above.
2. For a new release, increase `"version"` in `Code/manifest.json` to a version newer than the one already uploaded to the store (for example, `3.0.2` to `3.0.3`). Leave the local OAuth client unchanged.
3. Open Terminal and run the following commands. Python 3 and Node.js must be installed; no additional packages are needed.

```sh
cd /Users/merziyahpoonawala/tech_projects/jd_tracker_chrome_extension
node --test tests/*.test.js
python3 -B -m unittest discover -s tests -p 'test_*.py'
python3 -B scripts/package_store.py
```

Run each command only if the preceding command succeeds. The packaging command prints the resulting ZIP path. It creates `releases/jobsearch-aide-<version>.zip` from an explicit list of runtime files, switches **only the ZIP's OAuth client** to the store client, and leaves `Code` unchanged. It verifies the archive contents. Running it again for the same version replaces that version's ZIP; regenerate it after any further code changes. ZIP files are ignored by Git.

**Do not ZIP `Code` manually for a store upload:** that would include the local OAuth client. If packaging reports an unexpected OAuth client or manifest key, check the local manifest against the settings above rather than bypassing the check. If you add a new runtime file, also add it to `RUNTIME_FILES` in the packaging script.

### Upload and test the store version

Upload the generated ZIP in the Chrome Web Store Developer Dashboard. Keep distribution Private and confirm trusted testers. After review and private publication, install using the trusted tester account from the store listing for extension ID `adenkikljhpdapfnoflcdenodikgckob`. Disable the unpacked copy while testing the store copy so the identical names do not cause confusion. The store account used for Sheets sign-in must also be on the Google Cloud OAuth test-user list. Repeat the same functional checks, confirm the installed version, and specifically verify Google authorization. Local testing checks the functionality; the published installation checks the store extension ID/OAuth pairing.

## Status

Currently in private beta. [Join the waitlist](https://merziyahp.github.io/jobsearch-aide/) to get early access.

---

## License

MIT
