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

    // JSON-LD commonly wraps entities in an @graph array.
    if (value['@graph']) collect(value['@graph']);
  }

  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collect(JSON.parse(script.textContent));
    } catch (e) {}
  }

  return jobs;
}

function extractJsonLdContent(jobs = extractJobPostings()) {
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

  // --- Try JSON-LD description first (server-rendered, works on JS-heavy ATS sites) ---
  const jsonLdMarkdown = extractJsonLdContent(extracted.jobs);
  if (jsonLdMarkdown && jsonLdMarkdown.length > 100) {
    return { url, title, company: extracted.company, role: extracted.role, markdown: jsonLdMarkdown.trim() };
  }

  // --- Fall back to DOM extraction ---
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

  // Try to find the main content area
  const mainSelectors = [
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
    'article',
    'main',
    '[role="main"]',
    '.content',
    '#content',
    '.container'
  ];

  let mainEl = null;
  for (const sel of mainSelectors) {
    const el = cloned.querySelector(sel);
    if (el && el.innerText && el.innerText.trim().length > 200) {
      mainEl = el;
      break;
    }
  }

  if (!mainEl) mainEl = cloned;

  const markdown = htmlToMarkdown(mainEl);

  return {
    url,
    title,
    company: extracted.company,
    role: extracted.role,
    markdown: markdown.trim()
  };
}

function extractCompanyAndRole() {
  const title = document.title;
  const h1 = document.querySelector('h1');
  const jobs = extractJobPostings();

  let company = '';
  let role = '';

  // Try meta tags first
  const metaCompany =
    document.querySelector('meta[property="og:site_name"]')?.content ||
    document.querySelector('meta[name="author"]')?.content || '';

  // Prefer the structured posting whose title matches the visible page heading.
  // Sites sometimes publish an internal requisition title before the public one.
  const headingCandidates = Array.from(document.querySelectorAll('h1, h2'))
    .map(heading => heading.innerText.trim())
    .filter(Boolean);
  const normalizeTitle = value => (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  let matchingJob = null;
  let visibleRole = '';

  for (const heading of headingCandidates) {
    const normalizedHeading = normalizeTitle(heading);
    matchingJob = jobs.find(job => {
      const structuredTitle = normalizeTitle(job.title);
      return structuredTitle && (
        structuredTitle === normalizedHeading ||
        structuredTitle.includes(normalizedHeading) ||
        normalizedHeading.includes(structuredTitle)
      );
    }) || null;

    if (matchingJob) {
      visibleRole = heading;
      break;
    }
  }

  const preferredJob = matchingJob || jobs[0];

  if (preferredJob) {
    role = matchingJob ? visibleRole : (preferredJob.title || '');
    company = preferredJob.hiringOrganization?.name || '';
  }

  // Known ATS patterns
  if (!role || !company) {
    const hostname = window.location.hostname;

    // Greenhouse: prefer h1 for role (page title often says "Job Application for X")
    if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse') || title.toLowerCase().includes('greenhouse')) {
      // Role: use h1 directly, it always has the clean job title
      if (h1) role = h1.innerText.trim();
      // Company: try "at Company" pattern in title, or og:site_name
      const atMatch = title.match(/\bat\s+(.+?)(?:\s*[|\-–]|$)/i);
      if (atMatch) company = atMatch[1].trim();
      if (!company) company = metaCompany;
    }

    // Lever: "Company - Role"
    if (hostname.includes('lever.co')) {
      const match = title.match(/^(.+?)\s*[-–]\s*(.+?)(?:\s*[|\-–]|$)/);
      if (match) { company = match[1].trim(); role = match[2].trim(); }
    }

    // LinkedIn: "Role at Company | LinkedIn"
    if (hostname.includes('linkedin.com')) {
      const match = title.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[|\-–]|$)/i);
      if (match) { role = match[1].trim(); company = match[2].trim(); }
    }

    // Workday: usually has company in subdomain
    if (hostname.includes('myworkdayjobs.com')) {
      const subMatch = hostname.match(/^([^.]+)\./);
      if (subMatch) company = subMatch[1].replace(/-/g, ' ');
    }

    // Indeed
    if (hostname.includes('indeed.com')) {
      const match = title.match(/^(.+?)\s*[-–|]\s*(.+?)(?:\s*[-–|]|$)/);
      if (match) { role = match[1].trim(); company = match[2].trim(); }
    }
  }

  // Generic fallback: parse page title
  if (!role || !company) {
    // "Role at Company | Site"
    const atMatch = title.match(/^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[|\-–].*)?$/i);
    if (atMatch) {
      role = atMatch[1].trim();
      company = atMatch[2].trim();
    } else {
      // "Company - Role | Site" or "Role - Company | Site"
      const dashMatch = title.match(/^(.+?)\s*[-–]\s*(.+?)(?:\s*[|\-–].*)?$/);
      if (dashMatch) {
        // Heuristic: shorter string is often the company
        company = dashMatch[1].trim();
        role = dashMatch[2].trim();
      }
    }
  }

  // Use h1 as role fallback
  if (!role && h1) role = h1.innerText.trim();
  if (!company && metaCompany) company = metaCompany;

  // Final sanitize
  company = sanitizeFilename(company || 'Unknown-Company');
  role = sanitizeFilename(role || 'Unknown-Role');

  return { company, role, jobs };
}

function sanitizeFilename(str) {
  return str
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60)
    .trim();
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
// "First Last | LinkedIn". URL is cleaned to the canonical profile format.
// Role and company are left blank for manual entry — LinkedIn lazy-loads the
// experience section below the fold making it unreliable to scrape.

function extractLinkedInProfile() {
  const url = cleanLinkedInUrl(window.location.href);

  // ── Name — parse from page title ──
  // LinkedIn title format: "First Last | LinkedIn"
  const name = document.title.split('|')[0].trim();

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
