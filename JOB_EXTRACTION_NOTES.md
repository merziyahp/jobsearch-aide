# Job extraction architecture and change notes

Last updated: October 30, 2026

## Goal

Capture the correct company, role, job details, and complete job description
without maintaining a separate scraper for every employer. The extractor uses
structured data when it is trustworthy, compares it with the rendered page,
and keeps site-specific handling narrow and isolated.

## Extraction pipeline

1. Recursively collect every `JobPosting` object from JSON-LD, including
   postings nested in arrays, `@graph`, `mainEntity`, or publisher-specific
   wrappers.
2. Resolve the active posting by comparing structured titles with visible page
   headings and the current URL. This prevents a search page or multi-posting
   page from pairing one job's title with another job's description.
3. Build company/title candidates from structured data, semantic page metadata,
   visible headings, and known ATS formats. Prefer complete, human-readable
   candidates and reject generic headings such as "Job Details."
4. Compare the structured description with rendered DOM candidates. DOM
   candidates are scored by meaningful length, headings, lists, and job-section
   language, while navigation, recommendations, and similar-job panels are
   penalized.
5. Independently extract compact visible job-detail groups such as salary,
   location, requisition ID, employment type, category, travel, and benefits.
   Generated CSS labels are supported because some sites do not include those
   labels in text nodes or JSON-LD.
6. Convert the selected HTML into Markdown while preserving headings, links,
   tables, definition lists, and valid or malformed nested lists.

The implementation is deterministic; it does not use AI to rewrite or infer job
content.

## Why the changes were made

### Deloitte

Deloitte exposed multiple/nested `JobPosting` records and list markup that was
browser-tolerated but not structurally valid. The old extractor could take the
first posting and flatten or omit nested bullets. The fix generalized JSON-LD
discovery, active-posting selection, completeness comparison, and nested-list
conversion. There is no Deloitte hostname rule.

### Google Careers and LinkedIn

Both pages could expose generic headings or multiple job-related panels.
Candidate-based company/title selection replaced the old "first heading" and
ambiguous dash-title guesses. LinkedIn retains a narrow description-container
adapter because its active job shares a page with search results, statistics,
recommendations, and other listings. Google Careers has a small metadata adapter
for its detail-page route; description selection remains generic.

### Microsoft

Microsoft's structured description was flatter and less complete than the
rendered job description. The extractor now compares structured and visible
content quality and can prepend a compact adjacent requisition-details block.
This behavior is generic rather than Microsoft-specific.

### Slalom

Slalom separated "General Information" from "Description and Requirements."
The old first-match DOM fallback selected the short information panel, amplified
by whitespace in a detached DOM clone. The extractor now normalizes whitespace,
scores all plausible content sections, selects the full JD, and retains nearby
job metadata. This behavior is generic rather than Slalom-specific.

### ZS

ZS supplied a complete JSON-LD description but an incorrect zero salary in
structured data. The correct salary, locations, benefits, and requisition ID
were visible in a header whose labels were rendered with CSS pseudo-elements.
The extractor now reads compact visible metadata groups—including generated
labels—and prepends them to whichever description source wins. It excludes the
intervening job-alert login/register widget. There is no ZS hostname rule.

### Sanofi

Sanofi has no dedicated adapter. Its earlier captures used the generic visible
DOM fallback, which copied a broad job container containing job details, action
controls, and the description. The newer candidate scoring and metadata stages
are intended to keep the same useful content while reducing broad-container
noise when the page exposes sufficiently semantic sections.

### Dates and filenames

Saved filenames now use the browser's local calendar date rather than UTC. This
prevents an evening capture in the Americas from receiving the following day's
date.

## Guardrails

- Visible metadata must form a compact group with at least two recognized job
  labels before it is added.
- Metadata in navigation and footers is ignored.
- A `Job details` block is never prepended twice.
- Broad DOM containers lose points for recommendation and similar-job markers.
- Existing Markdown files are not rewritten; improvements apply when a page is
  captured again.
- Site-specific adapters should be added only when the page architecture cannot
  be represented safely by the generic pipeline.

## Validation

Automated tests cover LinkedIn title formats, generic-heading rejection,
structured-posting matching, human-readable metadata, structured-vs-DOM content
selection, noisy-wrapper rejection, adjacent requisition details, Slalom-style
split panels, ZS-style salary/benefits headers, and duplicate prevention.

The Google Careers, LinkedIn, Microsoft, Slalom, and ZS page structures were also
validated against their live rendered DOM during development.
