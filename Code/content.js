// content.js - Extracts page content and converts to clean markdown

function extractJobPostings() {
  const jobs = [];

  function collect(value) {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (!value || typeof value !== 'object') return;

    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    if (types.includes('JobPosting')) jobs.push(value);

    // JobPosting records may be wrapped in @graph, mainEntity, itemListElement,
    // or another publisher-specific object. Traverse every nested object rather
    // than teaching the extractor each wrapper name.
    Object.values(value).forEach(nested => {
      if (nested && typeof nested === 'object') collect(nested);
    });
  }

  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collect(JSON.parse(script.textContent));
    } catch (e) {}
  }

  return jobs;
}

function metadataText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeMetadata(value) {
  return metadataText(value)
    .replace(/\s+[|\-–—]\s+(LinkedIn|Indeed|Glassdoor)$/i, '')
    .trim();
}

function normalizeTitleForMatch(value) {
  return metadataText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isGenericRole(value) {
  const normalized = normalizeTitleForMatch(value);
  return !normalized || [
    'job details', 'job detail', 'jobs search results', 'search jobs',
    'job search', 'careers', 'open positions', 'available positions',
    'similar jobs', 'people also viewed', 'related jobs'
  ].includes(normalized);
}

function isGenericCompany(value) {
  const normalized = normalizeTitleForMatch(value);
  return !normalized || [
    'linkedin', 'indeed', 'glassdoor', 'greenhouse', 'lever', 'workday',
    'google careers', 'careers', 'jobs'
  ].includes(normalized);
}

function titlesMatch(left, right) {
  const a = normalizeTitleForMatch(left);
  const b = normalizeTitleForMatch(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  return shorter.length >= 12 && shorter.length / longer.length >= 0.6 && longer.includes(shorter);
}

function companyNameFromJob(job) {
  const organization = job?.hiringOrganization;
  if (typeof organization === 'string') return metadataText(organization);
  if (Array.isArray(organization)) {
    const named = organization.find(item => item?.name || typeof item === 'string');
    return metadataText(typeof named === 'string' ? named : named?.name);
  }
  return metadataText(organization?.name);
}

function chooseStructuredJob(jobs, headings = [], href = '') {
  let best = null;
  let bestScore = -1;
  let bestHeading = '';
  let bestMatched = false;
  const pathText = normalizeTitleForMatch(href);

  for (const job of jobs) {
    const title = metadataText(job?.title);
    if (!title) continue;

    let score = companyNameFromJob(job) ? 15 : 0;
    if (job.description) score += Math.min(10, metadataText(job.description).length / 1000);

    let matchingHeading = '';
    for (const heading of headings) {
      if (!titlesMatch(title, heading)) continue;
      const exact = normalizeTitleForMatch(title) === normalizeTitleForMatch(heading);
      const headingScore = exact ? 60 : 35;
      if (headingScore > score) {
        score = headingScore + (companyNameFromJob(job) ? 15 : 0);
        matchingHeading = heading;
      }
    }

    const normalizedTitle = normalizeTitleForMatch(title);
    const matchedPath = Boolean(normalizedTitle && pathText.includes(normalizedTitle));
    if (matchedPath) score += 10;

    if (score > bestScore) {
      best = job;
      bestScore = score;
      bestHeading = matchingHeading;
      bestMatched = Boolean(matchingHeading || matchedPath);
    }
  }

  return best ? { job: best, score: bestScore, heading: bestHeading, matched: bestMatched } : null;
}

function extractJsonLdContent(jobs = extractJobPostings(), preferredJob = null, role = '') {
  const roleMatch = jobs.find(job => titlesMatch(job?.title, role));
  const matchingJob = preferredJob || roleMatch || (jobs.length === 1 ? jobs[0] : null);
  if (matchingJob?.description) {
    const tmp = document.createElement('div');
    tmp.innerHTML = matchingJob.description;
    return htmlToMarkdown(tmp).trim() || null;
  }

  // On search pages, an unmatched structured record may belong to a different
  // listing. Prefer the visible DOM over silently pairing the wrong JD with the
  // selected title and company.
  if (role && jobs.length > 1) return null;

  let bestMarkdown = '';
  let bestScore = 0;

  for (const job of jobs) {
    if (!job?.description) continue;

    const tmp = document.createElement('div');
    tmp.innerHTML = job.description;
    const markdown = htmlToMarkdown(tmp).trim();
    const score = markdown.replace(/\s/g, '').length;

    // Some sites publish multiple JobPosting blocks. Keep the most complete
    // description instead of accepting whichever block happens to come first.
    if (score > bestScore) {
      bestMarkdown = markdown;
      bestScore = score;
    }
  }

  return bestMarkdown || null;
}

function extractPageContent() {
  const url = window.location.href;
  const title = document.title;

  // --- Extract company + role from page ---
  const extracted = extractCompanyAndRole();

  // Compare the structured description with the visible job container. Some
  // boards publish a clean, complete JSON-LD description; others (including
  // Microsoft/Eightfold) publish a shortened flat summary while rendering the
  // complete, sectioned JD in the page.
  const visibleMetadataMarkdown = extractVisibleJobMetadata();
  const jsonLdMarkdown = extractJsonLdContent(extracted.jobs, extracted.job, extracted.role);
  const domContent = extractDomContent();
  const descriptionMarkdown = chooseBestDescription(jsonLdMarkdown, domContent);
  const markdown = prependJobMetadata(descriptionMarkdown, visibleMetadataMarkdown);

  return {
    url,
    title,
    company: extracted.company,
    role: extracted.role,
    markdown: markdown.trim()
  };
}

function extractDomContent() {
  const cloned = document.body.cloneNode(true);

  // Remove noisy elements
  const noiseSelectors = [
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.nav', '.navbar', '.header', '.footer', '.sidebar',
    '.cookie', '.cookies', '.gdpr', '.consent',
    '.ad', '.ads', '.advertisement', '.promo',
    '.modal', '.overlay', '.popup', '.banner',
    'script', 'style', 'noscript', 'iframe',
    '[aria-hidden="true"]',
    '.social-share', '.share-buttons',
    '.related-jobs', '.recommended', '.similar-jobs',
    'form'
  ];

  noiseSelectors.forEach(sel => {
    cloned.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Rank every plausible content area instead of accepting the first selector
  // match. Job boards often split requisition metadata and the actual JD into
  // sibling panels, and generic elements such as <article> may describe either
  // one. Ranking also avoids detached-DOM whitespace making a short panel look
  // substantial.
  const mainSelectors = mainContentSelectors(window.location.hostname);
  const candidates = [];
  const seen = new Set();
  for (const sel of mainSelectors) {
    for (const el of cloned.querySelectorAll(sel)) {
      if (seen.has(el)) continue;
      seen.add(el);

      // Use normalized textContent here. innerText on a detached clone can
      // include thousands of characters of source indentation even when the
      // visible panel contains only a few metadata fields.
      const compactText = metadataText(el.textContent);
      if (compactText.length < 200) continue;

      candidates.push({
        element: el,
        selector: sel,
        label: descriptionCandidateLabel(el, cloned),
        markdown: htmlToMarkdown(el).trim()
      });
    }
  }

  const selected = chooseBestDomCandidate(candidates);
  let mainEl = selected?.element || cloned;
  let matchedSelector = selected?.selector || 'body';

  // Some boards place useful requisition metadata in a compact definition
  // list immediately before the JD. Compose those two siblings without moving
  // up to a broader panel that may also contain insights or similar jobs.
  const metadataEl = findAdjacentMetadataElement(mainEl);
  if (metadataEl) {
    const wrapper = document.createElement('div');
    const metadataHeading = document.createElement('h2');
    metadataHeading.textContent = 'Job details';
    wrapper.append(metadataHeading, metadataEl.cloneNode(true), mainEl.cloneNode(true));
    mainEl = wrapper;
    matchedSelector += '+job-metadata';
  }

  return { markdown: htmlToMarkdown(mainEl).trim(), selector: matchedSelector };
}

function mainContentSelectors(hostname = '') {
  const linkedInSelectors = hostname.includes('linkedin.com') ? [
    '.jobs-description-content__text',
    '.jobs-box__html-content',
    '.jobs-description__content',
    '#job-details',
    '.show-more-less-html__markup',
    '.description__text'
  ] : [];

  return [
    ...linkedInSelectors,
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[class*="job_description"]',
    '[id*="job-description"]',
    '[id*="jobDescription"]',
    '[class*="posting-description"]',
    '[class*="job-details"]',
    '[class*="jobDetails"]',
    '[class*="job-content"]',
    '[class*="position-description"]',
    '[aria-labelledby]',
    'details',
    'article',
    'main',
    '[role="main"]',
    '.content',
    '#content',
    '.container'
  ];
}

function descriptionCandidateLabel(element, root = document) {
  const labelledElement = id => Array.from(root.querySelectorAll?.('[id]') || [])
    .find(candidate => candidate.id === id);
  const labelledBy = (element.getAttribute?.('aria-labelledby') || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => metadataText(labelledElement(id)?.textContent))
    .filter(Boolean)
    .join(' ');

  const ownLabel = metadataText(element.getAttribute?.('aria-label'));
  const nearbyHeading = metadataText(
    element.previousElementSibling?.matches?.('h1, h2, h3, h4, h5, h6, summary')
      ? element.previousElementSibling.textContent
      : ''
  );
  const parentHeading = metadataText(
    element.parentElement?.matches?.('details')
      ? element.parentElement.querySelector('summary, h1, h2, h3, h4, h5, h6')?.textContent
      : ''
  );

  return metadataText([
    labelledBy,
    ownLabel,
    nearbyHeading,
    parentHeading,
    element.id,
    typeof element.className === 'string' ? element.className : element.className?.baseVal
  ].filter(Boolean).join(' '));
}

function scoreDomCandidate(candidate = {}) {
  const signals = descriptionSignals(candidate.markdown);
  const label = normalizeTitleForMatch(candidate.label || candidate.selector);
  const genericSelectors = [
    'article', 'details', 'main', '[role="main"]', '.content', '#content',
    '.container', 'body'
  ];
  const specificContainer = candidate.selector && !genericSelectors.includes(candidate.selector);
  const descriptionLabel = /\b(job description|description|requirements|responsibilities|qualifications|what you ll do|what you ll bring)\b/.test(label);
  const metadataLabel = /\b(general information|job information|job details|requisition details)\b/.test(label);

  let score = Math.min(60, Math.log2(signals.length + 1) * 5);
  score += Math.min(40, signals.bullets * 3);
  score += Math.min(30, signals.sections * 8);
  if (descriptionLabel) score += 40;
  if (specificContainer) score += 10;
  if (metadataLabel && signals.length < 800) score -= 45;
  score -= signals.noise * 55;

  return score;
}

function chooseBestDomCandidate(candidates = []) {
  return candidates
    .filter(candidate => candidate?.markdown)
    .map(candidate => ({ ...candidate, score: scoreDomCandidate(candidate) }))
    .sort((left, right) => right.score - left.score)[0] || null;
}

function findAdjacentMetadataElement(element) {
  let current = element;
  for (let depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
    const sibling = current.previousElementSibling;
    if (sibling && hasJobMetadata(sibling.textContent)) return sibling;
  }
  return null;
}

function generatedLabel(element) {
  if (!element || typeof window === 'undefined' || !window.getComputedStyle) return '';
  const content = window.getComputedStyle(element, '::before')?.content || '';
  if (!content || content === 'none' || content === 'normal') return '';
  return metadataText(content.replace(/^['"]|['"]$/g, '')).replace(/:$/, '');
}

function metadataRowsFromElement(element) {
  if (!element) return [];

  if (element.matches?.('dl')) {
    const rows = [];
    const terms = Array.from(element.querySelectorAll('dt'));
    for (const term of terms) {
      const detail = term.nextElementSibling?.matches?.('dd')
        ? term.nextElementSibling
        : null;
      const label = metadataText(term.innerText || term.textContent).replace(/:$/, '');
      const value = metadataText(detail?.innerText || detail?.textContent);
      if (label && value) rows.push({ label, value });
    }
    return rows;
  }

  const itemSelectors = [
    ':scope > li', ':scope > div', ':scope > p',
    ':scope > [class*="option"]', ':scope > [class*="item"]'
  ];
  const items = Array.from(element.querySelectorAll(itemSelectors.join(',')));
  const rows = [];

  for (const item of items) {
    const value = metadataText(item.innerText || item.textContent);
    if (!value || value.length > 1000) continue;

    let label = generatedLabel(item);
    if (!label) {
      const textLabel = item.querySelector?.('strong, b, dt, [class*="label"], [class*="title"]');
      label = metadataText(textLabel?.innerText || textLabel?.textContent).replace(/:$/, '');
    }

    if (!label) {
      const match = value.match(/^([^:]{2,50}):\s*(.+)$/);
      if (match) {
        label = metadataText(match[1]);
        rows.push({ label, value: metadataText(match[2]) });
        continue;
      }
    }

    if (label && normalizeTitleForMatch(label) !== normalizeTitleForMatch(value)) {
      rows.push({ label, value });
    }
  }

  return rows;
}

function metadataRowsText(rows = []) {
  return rows.map(row => `${row.label}: ${row.value}`).join('\n');
}

function renderJobMetadata(rows = []) {
  if (!rows.length) return '';
  const lines = rows.map(row => `- **${row.label}:** ${row.value}`);
  return `## Job details\n\n${lines.join('\n')}`;
}

function selectBestMetadataRows(candidates = []) {
  return candidates
    .filter(rows => rows.length >= 2 && hasJobMetadata(metadataRowsText(rows)))
    .sort((left, right) => {
      const leftLabels = jobMetadataLabelCount(metadataRowsText(left));
      const rightLabels = jobMetadataLabelCount(metadataRowsText(right));
      return (rightLabels * 10 + right.length) - (leftLabels * 10 + left.length);
    })[0] || [];
}

function extractVisibleJobMetadata() {
  const groupSelectors = [
    'dl',
    '[class*="metadata"]',
    '[class*="meta-data"]',
    '[class*="job-information"]',
    '[class*="jobInformation"]',
    '[class*="job-info"]',
    '[class*="jobInfo"]',
    '[id*="job-meta"]'
  ];
  const candidates = [];
  const seen = new Set();

  for (const selector of groupSelectors) {
    for (const element of document.querySelectorAll(selector)) {
      if (seen.has(element) || element.closest('nav, footer, [role="navigation"], [role="contentinfo"]')) continue;
      seen.add(element);
      const text = metadataText(element.innerText || element.textContent);
      if (!text || text.length > 3000) continue;
      const rows = metadataRowsFromElement(element);
      if (rows.length >= 2) candidates.push(rows);
    }
  }

  return renderJobMetadata(selectBestMetadataRows(candidates));
}

function prependJobMetadata(markdown = '', metadataMarkdown = '') {
  const description = markdown.trim();
  const metadata = metadataMarkdown.trim();
  if (!metadata || /^## Job details\s*$/m.test(description)) return description;
  return `${metadata}\n\n${description}`.trim();
}

function jobMetadataLabelCount(value = '') {
  const text = metadataText(value).toLowerCase();
  const labels = [
    'job number', 'job id', 'requisition', 'req number', 'req id', 'date posted',
    'work site', 'employment type', 'role type', 'profession', 'discipline',
    'travel', 'ref #', 'reference number', 'business function', 'location',
    'region', 'category', 'subcategory', 'salary', 'compensation', 'benefits'
  ];
  return labels.filter(label => text.includes(label)).length;
}

function hasJobMetadata(value = '') {
  const text = metadataText(value).toLowerCase();
  return jobMetadataLabelCount(text) >= 2 && text.length <= 2000;
}

function descriptionSignals(markdown = '') {
  const text = markdown.trim();
  const normalized = text.toLowerCase();
  const sectionMatches = normalized.match(/(?:^|\n)(?:#{1,6}\s+|\*\*)?(overview|job description|about (?:the )?job|who you.ll work with|what you.ll do|what you.ll bring|responsibilities|qualifications|requirements|preferred qualifications|benefits|compensation)(?::|\*\*|\s*$)/g) || [];
  const bullets = text.match(/(?:^|\n)\s*(?:[-*]|\d+\.)\s+/g) || [];
  const noiseMarkers = [
    'similar jobs', 'people also viewed', 'powered by', 'join talent network',
    'view all jobs', 'sign in to create job alert'
  ].filter(marker => normalized.includes(marker));

  return {
    length: text.replace(/\s/g, '').length,
    sections: sectionMatches.length,
    bullets: bullets.length,
    noise: noiseMarkers.length,
  };
}

function chooseBestDescription(jsonLdMarkdown, domContent) {
  const json = (jsonLdMarkdown || '').trim();
  const dom = (domContent?.markdown || '').trim();
  if (!json) return dom;
  if (!dom) return json;

  const jsonSignals = descriptionSignals(json);
  const domSignals = descriptionSignals(dom);
  const genericSelectors = ['article', 'main', '[role="main"]', '.content', '#content', '.container', 'body'];
  const specificContainer = Boolean(domContent.selector && !genericSelectors.includes(domContent.selector));
  const substantiallyLonger = domSignals.length >= jsonSignals.length * 1.3;
  const structurallyRicher = domSignals.sections >= 2 || domSignals.bullets >= 3;

  if (specificContainer && substantiallyLonger && structurallyRicher && domSignals.noise <= 1) {
    return dom;
  }

  if (domSignals.noise === 0 && domSignals.length >= jsonSignals.length * 1.8 && structurallyRicher) {
    return dom;
  }

  return json;
}

function metaContent(selector) {
  return metadataText(document.querySelector(selector)?.content);
}

function isElementVisible(element) {
  if (!element || element.closest('[hidden], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle?.(element);
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
  return element.getClientRects().length > 0;
}

function visibleHeadings() {
  return Array.from(document.querySelectorAll('h1, h2, h3'))
    .filter(isElementVisible)
    .map(element => ({ element, text: metadataText(element.innerText) }))
    .filter(item => item.text && !isGenericRole(item.text));
}

function currentJobId() {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get('currentJobId') ||
      url.pathname.match(/\/jobs\/(?:view\/)?(?:[^/]*-at-[^-]+-)?(\d+)(?:\/|$)/)?.[1] ||
      url.pathname.match(/\/results\/(\d+)(?:-|\/|$)/)?.[1] || '';
  } catch (e) {
    return '';
  }
}

function findBestRoleHeading(roleHint = '') {
  const hint = normalizeTitleForMatch(roleHint);
  const jobId = currentJobId();
  let best = null;
  let bestScore = -Infinity;

  for (const item of visibleHeadings()) {
    const normalized = normalizeTitleForMatch(item.text);
    let score = item.element.tagName === 'H1' ? 35 : item.element.tagName === 'H2' ? 25 : 10;

    if (hint) {
      if (normalized === hint) score += 100;
      else if (titlesMatch(normalized, hint)) score += 55;
    }
    if (normalizeTitleForMatch(document.title).includes(normalized)) score += 15;
    if (item.element.closest('main, article, [role="main"], [class*="job-detail"], [class*="jobDetail"]')) score += 15;
    if (/job|position|title|topcard|top-card/i.test(item.element.className || '')) score += 10;
    if (item.element.closest('a[href*="/jobs/"]')) score -= 15;
    if (jobId && item.element.closest(`[data-id="${jobId}"], [data-job-id="${jobId}"]`)) score += 30;
    if (item.text.length > 180) score -= 50;

    if (score > bestScore) {
      best = item.element;
      bestScore = score;
    }
  }

  return best;
}

function plausibleCompany(value, role = '') {
  const text = metadataText(value);
  if (!text || text.length > 100 || text.split(' ').length > 12) return '';
  if (isGenericCompany(text) || normalizeTitleForMatch(text) === normalizeTitleForMatch(role)) return '';
  if (/^(apply|share|save|sign in|join now|show more|see who|mid|early|advanced|director\+?)\b/i.test(text)) return '';
  if (/\b(applicants?|days? ago|hours? ago|remote eligible)\b/i.test(text)) return '';
  return text;
}

function plausibleRole(value) {
  const text = metadataText(value);
  if (!text || text.length > 180 || isGenericRole(text)) return '';
  return text;
}

function extractCompanyNearHeading(heading, role = '') {
  let container = heading?.parentElement || null;
  const selectors = [
    '[itemprop="hiringOrganization"] [itemprop="name"]',
    '[itemprop="hiringOrganization"]',
    '[data-company-name]',
    '[class*="company-name"]',
    '[class*="companyName"]',
    '[class*="org-name"]',
    'a[href*="/company/"]'
  ];

  for (let depth = 0; container && depth < 7; depth += 1, container = container.parentElement) {
    for (const selector of selectors) {
      for (const element of container.querySelectorAll(selector)) {
        if (!isElementVisible(element)) continue;
        const company = plausibleCompany(element.innerText || element.getAttribute('content'), role);
        if (company) return company;
      }
    }

    for (const icon of container.querySelectorAll('i, [aria-label]')) {
      const marker = normalizeTitleForMatch(`${icon.textContent || ''} ${icon.getAttribute('aria-label') || ''}`);
      if (!/\b(corporate fare|business|company|organization)\b/.test(marker)) continue;
      const company = plausibleCompany(icon.nextElementSibling?.innerText, role);
      if (company) return company;
    }
  }

  return '';
}

function parseLinkedInPageTitle(value) {
  const title = metadataText(value);
  let match = title.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+.+?\s*\|\s*LinkedIn$/i);
  if (match) return { company: metadataText(match[1]), role: metadataText(match[2]) };

  match = title.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[|\-–—].*)?$/i);
  if (match) return { company: metadataText(match[2]), role: metadataText(match[1]) };

  const parts = title.split('|').map(metadataText).filter(Boolean);
  if (parts.length >= 3 && /^linkedin$/i.test(parts[parts.length - 1])) {
    return { role: parts[0], company: parts[1] };
  }
  return null;
}

function extractLinkedInJobCandidate() {
  if (!window.location.hostname.includes('linkedin.com') ||
      !window.location.pathname.includes('/jobs/') ||
      isLinkedInProfilePage()) return null;

  const parsed = parseLinkedInPageTitle(metaContent('meta[property="og:title"]') || document.title);
  const heading = findBestRoleHeading(parsed?.role || '');
  const role = plausibleRole(heading?.innerText) || plausibleRole(parsed?.role);
  const company = extractCompanyNearHeading(heading, role) || metadataText(parsed?.company);

  return { source: 'linkedin', score: 105, role, company, heading };
}

function extractGoogleCareersCandidate() {
  const isGoogleCareers = window.location.hostname === 'www.google.com' &&
    /\/about\/careers\/applications\/jobs\/results\/\d+/.test(window.location.pathname);
  if (!isGoogleCareers) return null;

  const roleHint = metaContent('meta[property="og:title"]') ||
    metaContent('meta[name="twitter:title"]');
  const heading = findBestRoleHeading(roleHint);
  const role = metadataText(heading?.innerText) || roleHint;
  const company = extractCompanyNearHeading(heading, role);

  return { source: 'google-careers', score: 100, role, company, heading };
}

function extractKnownBoardCandidate() {
  const hostname = window.location.hostname;
  const title = document.title;
  const heading = findBestRoleHeading();
  let role = metadataText(heading?.innerText);
  let company = extractCompanyNearHeading(heading, role);

  if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse') || title.toLowerCase().includes('greenhouse')) {
    const match = title.match(/\bat\s+(.+?)(?:\s*[|\-–—]|$)/i);
    company = company || metadataText(match?.[1]) || metaContent('meta[property="og:site_name"]');
    return { source: 'greenhouse', score: 80, role, company, heading };
  }

  if (hostname.includes('lever.co')) {
    const match = title.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s*[|\-–—]|$)/);
    return { source: 'lever', score: 80, company: company || metadataText(match?.[1]), role: role || metadataText(match?.[2]), heading };
  }

  if (hostname.includes('myworkdayjobs.com')) {
    const subdomain = hostname.match(/^([^.]+)\./)?.[1]?.replace(/-/g, ' ');
    return { source: 'workday', score: 75, company: company || metadataText(subdomain), role, heading };
  }

  if (hostname.includes('indeed.com')) {
    const match = title.match(/^(.+?)\s*[-–—|]\s*(.+?)(?:\s*[-–—|]|$)/);
    return { source: 'indeed', score: 75, role: role || metadataText(match?.[1]), company: company || metadataText(match?.[2]), heading };
  }

  return null;
}

function extractGenericCandidate() {
  const metaTitle = metaContent('meta[property="og:title"]') ||
    metaContent('meta[name="twitter:title"]');
  const heading = findBestRoleHeading(!isGenericRole(metaTitle) ? metaTitle : '');
  let role = metadataText(heading?.innerText);
  let company = extractCompanyNearHeading(heading, role);

  const metaCompany = metaContent('meta[property="og:site_name"]') ||
    metaContent('meta[name="author"]');
  if (!company && !isGenericCompany(metaCompany)) company = metaCompany;

  const atMatch = document.title.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[|\-–—].*)?$/i);
  if (atMatch) {
    role = role || metadataText(atMatch[1]);
    company = company || metadataText(atMatch[2]);
  }

  // A dash is ambiguous (sites use both "Company — Role" and "Role —
  // Company"), so only use it when a visible heading identifies which part is
  // the role. This avoids the old shorter-side/first-side guess.
  if (role && !company) {
    const titleParts = document.title.split(/\s+[|\-–—]\s+/).map(metadataText).filter(Boolean);
    const roleIndex = titleParts.findIndex(part => titlesMatch(part, role));
    if (roleIndex !== -1) {
      const nearby = [titleParts[roleIndex - 1], titleParts[roleIndex + 1]]
        .map(value => plausibleCompany(value, role))
        .find(Boolean);
      if (nearby) company = nearby;
    }
  }

  if (!role && !isGenericRole(metaTitle) && metaTitle.length <= 180) role = metaTitle;
  return { source: 'generic-dom', score: 55, role, company, heading };
}

function selectBestMetadataCandidate(candidates) {
  return candidates
    .filter(Boolean)
    .map(candidate => {
      const role = isGenericRole(candidate.role) ? '' : normalizeMetadata(candidate.role);
      const company = plausibleCompany(candidate.company, role);
      const completeness = (role ? 20 : 0) + (company ? 20 : 0);
      return { ...candidate, role, company, resolvedScore: candidate.score + completeness };
    })
    .filter(candidate => candidate.role || candidate.company)
    .sort((left, right) => right.resolvedScore - left.resolvedScore)[0] || null;
}

function extractCompanyAndRole() {
  const jobs = extractJobPostings();
  const headings = visibleHeadings().map(item => item.text);
  const structured = chooseStructuredJob(jobs, headings, window.location.href);
  const structuredCandidate = structured ? {
    source: 'json-ld',
    score: (structured.matched || jobs.length === 1) ? 110 : 45,
    role: structured.heading || structured.job.title,
    company: companyNameFromJob(structured.job),
    job: structured.job,
    heading: findBestRoleHeading(structured.heading || structured.job.title)
  } : null;

  const best = selectBestMetadataCandidate([
    structuredCandidate,
    extractLinkedInJobCandidate(),
    extractGoogleCareersCandidate(),
    extractKnownBoardCandidate(),
    extractGenericCandidate()
  ]);

  const role = best?.role || 'Unknown-Role';
  const company = best?.company || 'Unknown-Company';
  const matchedJob = best?.job || jobs.find(job => titlesMatch(job?.title, role)) || null;

  return { company, role, jobs, job: matchedJob, source: best?.source || 'none' };
}

function htmlToMarkdown(el) {
  let md = '';

  function processList(listNode, depth) {
    const lines = [];
    const ordered = listNode.tagName.toLowerCase() === 'ol';
    let itemNumber = 0;

    for (const child of Array.from(listNode.children)) {
      const childTag = child.tagName.toLowerCase();

      if (childTag === 'li') {
        itemNumber += 1;
        const itemText = Array.from(child.childNodes)
          .filter(node => !(
            node.nodeType === Node.ELEMENT_NODE &&
            ['ul', 'ol'].includes(node.tagName.toLowerCase())
          ))
          .map(node => processNode(node, depth + 1))
          .join('')
          .replace(/\s+/g, ' ')
          .trim();

        if (itemText) {
          const marker = ordered ? `${itemNumber}.` : '-';
          lines.push(`${'  '.repeat(depth)}${marker} ${itemText}`);
        }

        // Handle valid nested lists placed inside an li.
        for (const nestedList of child.querySelectorAll(':scope > ul, :scope > ol')) {
          const nested = processList(nestedList, depth + 1);
          if (nested) lines.push(nested);
        }
      } else if (childTag === 'ul' || childTag === 'ol') {
        // Also handle malformed but common ATS markup where a nested list is a
        // sibling of its parent li (Deloitte's job data uses this structure).
        const nested = processList(child, depth + 1);
        if (nested) lines.push(nested);
      }
    }

    return lines.join('\n');
  }

  function processNode(node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/\n{3,}/g, '\n\n');
      return text;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const children = () => Array.from(node.childNodes).map(n => processNode(n, depth)).join('');

    switch (tag) {
      case 'h1': return `\n# ${node.innerText.trim()}\n\n`;
      case 'h2': return `\n## ${node.innerText.trim()}\n\n`;
      case 'h3': return `\n### ${node.innerText.trim()}\n\n`;
      case 'h4': return `\n#### ${node.innerText.trim()}\n\n`;
      case 'h5': return `\n##### ${node.innerText.trim()}\n\n`;
      case 'h6': return `\n###### ${node.innerText.trim()}\n\n`;
      case 'p': return `\n${children()}\n`;
      case 'br': return '\n';
      case 'hr': return '\n---\n';
      case 'strong':
      case 'b': return `**${children()}**`;
      case 'em':
      case 'i': return `*${children()}*`;
      case 'code': return `\`${children()}\``;
      case 'pre': return `\n\`\`\`\n${node.innerText}\n\`\`\`\n`;
      case 'a': {
        const href = node.getAttribute('href');
        const text = children().trim();
        return href ? `[${text}](${href})` : text;
      }
      case 'ul':
      case 'ol': return `\n${processList(node, depth)}\n`;
      case 'li': return children(); // normally handled by the parent list
      case 'dl': {
        const rows = [];
        const groups = Array.from(node.children);
        for (let i = 0; i < groups.length; i += 1) {
          const group = groups[i];
          const term = group.matches('dt') ? group : group.querySelector('dt');
          const detail = group.matches('dd')
            ? group
            : group.querySelector('dd');
          if (!term || !detail) continue;
          const label = metadataText(term.innerText);
          const value = metadataText(detail.innerText);
          if (label && value) rows.push(`- **${label}:** ${value}`);
        }
        return rows.length ? `\n${rows.join('\n')}\n` : children();
      }
      case 'dt': return `\n**${children().trim()}:** `;
      case 'dd': return `${children().trim()}\n`;
      case 'table': {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (!rows.length) return '';
        const header = Array.from(rows[0].querySelectorAll('th,td')).map(c => c.innerText.trim());
        const separator = header.map(() => '---');
        const body = rows.slice(1).map(row =>
          Array.from(row.querySelectorAll('td')).map(c => c.innerText.trim())
        );
        const toRow = cols => `| ${cols.join(' | ')} |`;
        return '\n' + [toRow(header), toRow(separator), ...body.map(toRow)].join('\n') + '\n';
      }
      case 'blockquote': return `\n> ${children().trim().replace(/\n/g, '\n> ')}\n`;
      case 'div':
      case 'section':
      case 'article':
      case 'main':
      case 'span':
      default:
        return children();
    }
  }

  md = processNode(el);

  // Cleanup
  md = md
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/^\s+/, '')
    .trim();

  return md;
}

// ── LinkedIn profile scraper ──────────────────────────────────────────────────
//
// Triggered only when the popup sends an 'extractOutreach' message.
// Targets LinkedIn profile pages: linkedin.com/in/username
//
// Name is parsed from the page title which LinkedIn formats consistently as
// "(3) First Last | LinkedIn" (notification count optional).
// URL is cleaned to the canonical profile format.
// Role and company are left blank for manual entry — LinkedIn lazy-loads the
// experience section below the fold making it unreliable to scrape.

function parseLinkedInProfileName(title) {
  return title.split('|')[0].trim().replace(/^\(\d+\)\s*/, '').trim();
}

function extractLinkedInProfile() {
  const url = cleanLinkedInUrl(window.location.href);

  // ── Name — parse from page title ──
  const name = parseLinkedInProfileName(document.title);

  return {
    url,
    name,
    role:    '',
    company: '',
  };
}

// Normalize LinkedIn URL to the canonical profile format
// e.g. strips query params, overlays, locale prefixes
function cleanLinkedInUrl(href) {
  try {
    const url = new URL(href);
    // Keep only the /in/username path, drop everything else
    const match = url.pathname.match(/^\/(in\/[^/]+)\/?/);
    if (match) return `https://www.linkedin.com/${match[1]}`;
  } catch (e) {}
  return href;
}

// Check if current page is a LinkedIn profile page
function isLinkedInProfilePage() {
  return /linkedin\.com\/in\//.test(window.location.href);
}

// ── Message listener ──────────────────────────────────────────────────────────

// Listen for messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'extract') {
      try {
        const data = extractPageContent();
        sendResponse({ success: true, data });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }

    if (msg.action === 'extractOutreach') {
      try {
        if (!isLinkedInProfilePage()) {
          // Not a LinkedIn profile page — return empty fields for manual entry
          sendResponse({ success: true, data: { url: '', name: '', role: '', company: '' }, isLinkedIn: false });
          return true;
        }
        const data = extractLinkedInProfile();
        sendResponse({ success: true, data, isLinkedIn: true });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }

    return true;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    chooseBestDescription,
    chooseBestDomCandidate,
    chooseStructuredJob,
    companyNameFromJob,
    descriptionSignals,
    hasJobMetadata,
    isGenericCompany,
    isGenericRole,
    normalizeMetadata,
    normalizeTitleForMatch,
    parseLinkedInPageTitle,
    parseLinkedInProfileName,
    plausibleCompany,
    plausibleRole,
    mainContentSelectors,
    prependJobMetadata,
    renderJobMetadata,
    scoreDomCandidate,
    selectBestMetadataRows,
    selectBestMetadataCandidate,
    titlesMatch,
  };
}
