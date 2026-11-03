# How JobSearch Aide supports your job search {#jobsearch-aide}

JobSearch Aide turns the page already open in Chrome into one of four useful actions: save a job, log a contact, fill an application, or update your settings.

- Save JD downloads a clean Markdown copy and can add the job to your Application Tracker.[](source:popup-save)
- Outreach can add or update a contact in a separate Outreach Tracker.[](source:outreach-write)
- Autofill uses your locally saved profile and does not write to a spreadsheet.[](source:autofill)
- Your spreadsheet IDs, tab choices, and profile stay in Chrome's local extension storage.[](source:storage)

@answer scope="Committed core behavior at b812bf8; current feedback and telemetry edits are not included"
@meta locale=en quality_profile=showcase style=product repo_url=https://github.com/merziyahp/jobsearch-aide.git repo_revision=b812bf8bedd75fa38e44e90cd93cf19681d3d3a7
@source overview title="Project overview" path=README.md lines=9:21
@source popup-routing title="Popup routing and tool selection" path=Code/popup.js lines=337:381
@source popup-save title="Save JD workflow" path=Code/popup.js lines=413:470
@source extraction title="Job page extraction" path=Code/content.js lines=21:95
@source sheets-write title="Application Tracker write logic" path=Code/sheets.js lines=31:155
@source outreach-write title="Outreach duplicate and update logic" path=Code/outreach.js lines=202:330
@source autofill title="Application form autofill" path=Code/autofill.js lines=426:525
@source storage title="Local profile and settings storage" path=Code/storage.js lines=13:70

## Which path should I take? {#paths}

@workflow id=tool-paths title="Choose the action that matches the page"
| lane choose | Start here |
| lane act | Available actions |
| lane result | Result |
| open | Open extension | external | choose | source:popup-routing |
| choose | Choose a tool | frontend | choose | source:overview |
| save | Save JD | frontend | act | source:popup-save |
| outreach | Log outreach | frontend | act | source:outreach-write |
| fill | Autofill form | frontend | act | source:autofill |
| settings | Update settings | database | act | source:storage |
| job-output | Markdown + job row | database | result | source:popup-save |
| contact-output | Outreach row | database | result | source:outreach-write |
| form-output | Fields filled for review | backend | result | source:autofill |
| local-output | Profile + sheet choices | database | result | source:storage |
| open > choose | |
| choose > save | job page | emphasis |
| choose > outreach | contact |
| choose > fill | application |
| choose > settings | setup |
| save > job-output | save |
| outreach > contact-output | save |
| fill > form-output | review |
| settings > local-output | store |

@steps id=path-steps
| job | Save JD | Use this on a job listing. Review the company, role, status, and fit before saving. | tool-paths | save |
| contact | Log outreach | Use this on a LinkedIn profile or enter the contact manually. | tool-paths | outreach |
| application | Autofill form | Use your saved profile to fill supported fields, then review before submitting. | tool-paths | fill |
| settings-step | Update settings | Add your profile plus the Sheet URL and tab for each tracker. | tool-paths | settings |

## How does a job reach the Application Tracker? {#job-sheet-flow}

The Markdown file is saved first. If spreadsheet logging fails later, the downloaded job description is still kept.[](source:popup-save)

@workflow id=job-write-flow title="Save JD and write to Google Sheets"
| lane capture | Capture |
| lane local | Save locally |
| lane decide | Spreadsheet decisions |
| lane sheets | Application Tracker |
| extract | Read job page | backend | capture | source:extraction |
| review | Review details | frontend | capture | source:popup-save |
| download | Download Markdown | database | local | source:popup-save |
| log | Log to Sheets? | security | decide | source:popup-save |
| auth | Connect Google | security | decide | source:sheets-write |
| overwrite | Overwrite enabled? | security | decide | source:sheets-write |
| lookup | Find URL | backend | decide | source:sheets-write |
| found | URL found? | security | decide | source:sheets-write |
| update | Update existing row | database | sheets | source:sheets-write |
| append | Append new row | database | sheets | source:sheets-write |
| local-done | Markdown only | database | local | source:popup-save |
| extract > review | extracted |
| review > download | save | emphasis |
| download > log | next |
| log > local-done | no |
| log > auth | yes | emphasis |
| auth > overwrite | connected |
| overwrite > lookup | yes |
| overwrite > append | no |
| lookup > found | URL check |
| found > update | yes | emphasis |
| found > append | no | emphasis |

@steps id=job-write-steps
| capture | Read job page | The extension extracts the URL, company, role, and job description from the active page. | job-write-flow | extract |
| download | Download Markdown | A dated file is saved in Downloads or the chosen subfolder. | job-write-flow | download |
| sheet-choice | Log to Sheets? | Turn this off when you only want the Markdown file. | job-write-flow | log |
| duplicate-choice | Overwrite enabled? | Turn this on to search by URL and replace an existing row. Leave it off to append. | job-write-flow | overwrite |

## What can happen when a spreadsheet row already exists? {#existing-rows}

| Path | How it detects an existing row | Existing row behavior |
| --- | --- | --- |
| Application Tracker | Exact job URL in column C | Update only when Overwrite is on; otherwise append a new row.[](source:sheets-write) |
| Outreach Tracker | LinkedIn URL, or name plus company when no URL is present | Update allowed status changes, or block a conflicting duplicate.[](source:outreach-write) |

@callout id=auth-retry level=note title="If Google sign-in expires"
| The Application Tracker clears the cached token, asks for a fresh token, and retries the write once. The Outreach path also retries after an authentication error.[](source:sheets-write)[](source:outreach-write) |

## What should I set up first? {#setup}

- [ ] In Settings, save your Application Tracker Sheet URL and select its tab.
- [ ] If you use outreach, save the separate Outreach Tracker URL and tab.
- [ ] Add profile fields only if you want Autofill.
- [ ] Connect Google Sheets when prompted.
- [ ] Before each save, review the extracted company, role, status, and fit.
- [ ] Keep Overwrite off when every click should create a new application row.
