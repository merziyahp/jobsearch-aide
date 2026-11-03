// Run from the repo root: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../Code/content.js');

test('LinkedIn contact names exclude leading notification counts', () => {
  assert.equal(E.parseLinkedInProfileName('(3) Jane Smith | LinkedIn'), 'Jane Smith');
  assert.equal(E.parseLinkedInProfileName(' (123)Jane Smith | LinkedIn'), 'Jane Smith');
  assert.equal(E.parseLinkedInProfileName('Jane Smith | LinkedIn'), 'Jane Smith');
  assert.equal(E.parseLinkedInProfileName('Jane (Jay) Smith | LinkedIn'), 'Jane (Jay) Smith');
  assert.equal(E.parseLinkedInProfileName('(Jay) Smith | LinkedIn'), '(Jay) Smith');
});

test('parses LinkedIn current public job title format', () => {
  assert.deepEqual(
    E.parseLinkedInPageTitle(
      'Google hiring Senior Product Manager, Agentic Applications in New York, United States | LinkedIn'
    ),
    {
      company: 'Google',
      role: 'Senior Product Manager, Agentic Applications',
    }
  );
});

test('parses LinkedIn legacy role-at-company title format', () => {
  assert.deepEqual(
    E.parseLinkedInPageTitle('Product Manager at Acme Corp | LinkedIn'),
    { company: 'Acme Corp', role: 'Product Manager' }
  );
});

test('rejects generic page headings as job titles', () => {
  for (const heading of ['Job Details', 'Jobs Search Results', 'Search Jobs', 'Similar jobs']) {
    assert.equal(E.isGenericRole(heading), true, heading);
  }
  assert.equal(E.isGenericRole('Product Manager, AI Developer Platform, Google Search'), false);
});

test('title matching tolerates close variants but not one-word coincidences', () => {
  assert.equal(E.titlesMatch('Senior Product Manager, Platform', 'Senior Product Manager, Platform (Remote)'), true);
  assert.equal(E.titlesMatch('Google', 'Product Manager, AI Developer Platform, Google Search'), false);
});

test('chooses the structured posting that matches the visible job title', () => {
  const jobs = [
    {
      '@type': 'JobPosting',
      title: 'Internal Product Manager Requisition',
      hiringOrganization: { name: 'Wrong Company' },
      description: 'A'.repeat(5000),
    },
    {
      '@type': 'JobPosting',
      title: 'Product Manager, AI Developer Platform, Google Search',
      hiringOrganization: { name: 'Google' },
      description: 'Correct description',
    },
  ];

  const selected = E.chooseStructuredJob(
    jobs,
    ['Product Manager, AI Developer Platform, Google Search'],
    'https://example.com/jobs/product-manager-ai-developer-platform-google-search'
  );

  assert.equal(selected.job, jobs[1]);
  assert.equal(selected.heading, 'Product Manager, AI Developer Platform, Google Search');
});

test('prefers a complete scoped candidate over a higher-priority incomplete guess', () => {
  const selected = E.selectBestMetadataCandidate([
    { source: 'structured', score: 110, role: 'Product Manager', company: '' },
    { source: 'linkedin', score: 105, role: 'Product Manager', company: 'Google' },
  ]);

  assert.equal(selected.source, 'linkedin');
  assert.equal(selected.company, 'Google');
});

test('keeps human-readable metadata instead of filename formatting it', () => {
  assert.equal(
    E.normalizeMetadata('  Senior Product Manager,  Agentic Applications  '),
    'Senior Product Manager, Agentic Applications'
  );
});

test('accepts a company whose name also appears inside the role title', () => {
  assert.equal(
    E.plausibleCompany('Google', 'Product Manager, AI Developer Platform, Google Search'),
    'Google'
  );
});

test('reads organization names from common structured-data shapes', () => {
  assert.equal(E.companyNameFromJob({ hiringOrganization: { name: 'Google' } }), 'Google');
  assert.equal(E.companyNameFromJob({ hiringOrganization: 'Acme Corp' }), 'Acme Corp');
  assert.equal(E.companyNameFromJob({ hiringOrganization: [{ name: 'Example, Inc.' }] }), 'Example, Inc.');
});

test('prefers a richer specific DOM job description over a flattened JSON-LD summary', () => {
  const json = 'A flattened responsibility and qualification summary. '.repeat(20);
  const dom = [
    '**Overview**',
    'A detailed overview of the team and role. '.repeat(60),
    '**Responsibilities**',
    '- Own the product strategy.',
    '- Lead delivery across teams.',
    '- Measure adoption and outcomes.',
    '**Qualifications**',
    '- Eight years of product experience.',
    '- Experience shipping enterprise platforms.',
  ].join('\n\n');

  assert.equal(
    E.chooseBestDescription(json, { markdown: dom, selector: '[id*="job-description"]' }),
    dom
  );
});

test('keeps structured data when a larger DOM candidate contains surrounding job-board noise', () => {
  const json = ['## Responsibilities', '- Own strategy.', '## Qualifications', '- Eight years experience.'].join('\n');
  const dom = `${json.repeat(10)}\nSimilar jobs\nPeople also viewed\nPowered by Example ATS`;

  assert.equal(
    E.chooseBestDescription(json, { markdown: dom, selector: 'main' }),
    json
  );
});

test('LinkedIn content selectors target the description before the surrounding main panel', () => {
  const selectors = E.mainContentSelectors('www.linkedin.com');
  assert.equal(selectors[0], '.jobs-description-content__text');
  assert.ok(selectors.indexOf('.show-more-less-html__markup') < selectors.indexOf('main'));
});

test('recognizes a compact requisition metadata block adjacent to a job description', () => {
  assert.equal(E.hasJobMetadata([
    'Job number', '200061841',
    'Date posted', 'Oct 21, 2026',
    'Work site', '0 days / week in-office – remote',
    'Travel', 'Less than 25%',
    'Employment type', 'Full-Time',
  ].join('\n')), true);
  assert.equal(E.hasJobMetadata('Similar jobs\nProduct Manager\nSenior Product Manager'), false);
});

test('recognizes common general-information labels as requisition metadata', () => {
  assert.equal(E.hasJobMetadata([
    'Locations', 'New York, NY',
    'Business Function', 'Product engineering',
    'Date posted', 'Thursday, October 22, 2026',
    'Ref #', '2429',
  ].join('\n')), true);
});

test('ranks a split description panel above metadata and a noisy page wrapper', () => {
  const metadata = [
    'General Information',
    'Locations New York, NY',
    'Business Function Product engineering',
    'Date posted Thursday, October 22, 2026',
    'Ref # 2429',
  ].join('\n');
  const description = [
    'Job Description',
    'A detailed overview of the role and its intended business impact. '.repeat(20),
    'What You’ll Do',
    '- Own solution and project outcomes.',
    '- Translate strategy into delivery roadmaps.',
    '- Lead cross-capability engineering teams.',
    '- Establish outcome-based metrics.',
    'What You’ll Bring',
    '- Extensive product delivery experience.',
    '- Strong executive communication skills.',
    '- Experience with Agile delivery frameworks.',
  ].join('\n');
  const noisyWrapper = `${metadata}\n${description}\nSimilar jobs\nView all jobs`;

  const selected = E.chooseBestDomCandidate([
    { selector: 'article', label: 'General Information', markdown: metadata },
    { selector: '[aria-labelledby]', label: 'Description and Requirements section1__content', markdown: description },
    { selector: 'main', label: 'main', markdown: noisyWrapper },
  ]);

  assert.equal(selected.selector, '[aria-labelledby]');
  assert.equal(selected.markdown, description);
});

test('recognizes salary, benefits, location, and requisition header metadata', () => {
  const rows = [
    { label: 'Locations', value: 'Chicago, Illinois; New York, New York' },
    { label: 'Region', value: 'United States' },
    { label: 'Category', value: 'Consulting' },
    { label: 'Subcategory', value: 'Technology' },
    { label: 'Salary Range', value: '$160,000.00 - $170,250.00' },
    { label: 'Benefits', value: 'Salary, leave, bonus, insurance, and retirement benefits.' },
    { label: 'Req ID', value: '63340' },
  ];

  assert.deepEqual(E.selectBestMetadataRows([rows]), rows);
  assert.match(E.renderJobMetadata(rows), /\*\*Salary Range:\*\* \$160,000\.00 - \$170,250\.00/);
  assert.match(E.renderJobMetadata(rows), /\*\*Req ID:\*\* 63340/);
});

test('prepends visible metadata to a structured description without duplicating it', () => {
  const metadata = '## Job details\n\n- **Salary Range:** $160,000 - $170,250';
  const description = '## What you’ll do\n\nBuild excellent products.';
  const combined = E.prependJobMetadata(description, metadata);

  assert.equal(combined, `${metadata}\n\n${description}`);
  assert.equal(E.prependJobMetadata(combined, metadata), combined);
});
