// Arolsen Archives online collections search driver.
//
// Site: https://collections.arolsen-archives.org/en/search/
// SPA (Angular Material). The visible form is just one freetext input
// ("Enter your search term...") plus optional filter panels for People
// (Last Name / First Name / Maiden Name / Place of Birth / Date of Birth
//  / Prisoner #) and Topics (Signature/Title).
//
// Results are populated by POSTs to:
//   https://collections-server.arolsen-archives.org/ITS-WS.asmx/
//     BuildQueryGlobalForAngular   (kick-off / search context)
//     GetArchiveList               (archival "Topics" hits)
//     GetPersonList                (people / individual document hits)
//     GetCount                     (counts per searchType)
//
// We navigate to /en/search?s=<query>, intercept those POST responses to
// capture structured JSON, and ALSO scrape the rendered DOM as a
// belt-and-braces fallback.
//
// CLI:
//   node tools/research/arolsen.mjs \
//        --slug a4-harris-elizabeth \
//        --surname Harris --forename Elizabeth \
//        --keyword Biberach \
//        [--year-from 1900 --year-to 1925]   (applied as Date-of-Birth filter)
//        [--headed false] [--hold 30]
//
// Notes:
// * The site is German-hosted and can be slow — give it generous timeouts.
// * The `--year-from/--year-to` flags are applied to the People panel's
//   "Date of Birth" filter. For document-date sweeps (e.g. Channel Islands
//   1942-1945) they'll often produce no hits — captured anyway.

import { launchEdge, saveResultPage, saveText, ensureSlugDir, logStep } from './lib.mjs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SEARCH_URL = 'https://collections.arolsen-archives.org/en/search/';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[key] = val;
    }
  }
  return out;
}

function buildQuery(args) {
  // Arolsen's freetext search is AND-style and over-restricts when given
  // forename + surname + keyword together. Use the most specific token
  // (surname if present, else keyword, else forename), and rely on
  // client-side filtering of the returned person list for the rest.
  if (args.surname) return String(args.surname).trim();
  if (args.keyword) return String(args.keyword).trim();
  if (args.forename) return String(args.forename).trim();
  return '';
}

function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function recordMatchesFilters(record, args) {
  const blob = normalise(JSON.stringify(record));
  if (args.forename && !blob.includes(normalise(args.forename))) return false;
  if (args.keyword && !blob.includes(normalise(args.keyword))) return false;
  if (args['year-from'] || args['year-to']) {
    const years = (blob.match(/\b(18|19|20)\d{2}\b/g) || []).map(Number);
    const yf = args['year-from'] ? Number(args['year-from']) : -Infinity;
    const yt = args['year-to'] ? Number(args['year-to']) : Infinity;
    if (!years.some(y => y >= yf && y <= yt)) return false;
  }
  return true;
}

async function dismissCookies(page) {
  const tries = [
    'button[aria-label="Accept all"]',
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button:has-text("Agree")',
    '#CybotCookiebotDialogBodyButtonAccept',
    '.ccm--save-settings.ccm--button-primary',
  ];
  for (const sel of tries) {
    try {
      const b = page.locator(sel).first();
      if (await b.isVisible({ timeout: 1500 })) {
        await b.click();
        logStep(`Dismissed cookie banner via "${sel}"`);
        await page.waitForTimeout(700);
        return;
      }
    } catch {}
  }
}

async function acceptDisclaimer(page) {
  // The Arolsen site presents an "I agree" / terms-of-use checkbox
  // (id=itsAgree-input) before letting users actually open documents.
  // Doesn't block the result list, but click it if present so screenshots
  // aren't covered by the modal.
  try {
    const cb = page.locator('#itsAgree-input').first();
    if (await cb.count()) {
      await cb.check({ force: true }).catch(() => {});
      const btn = page.locator('button:has-text("I agree")').first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click().catch(() => {});
        logStep('Accepted terms-of-use disclaimer');
        await page.waitForTimeout(500);
      }
    }
  } catch {}
}

async function applyColumnFilter(page, fieldName, value, label) {
  if (!value) return false;
  try {
    const icon = page.locator(`yv-its-filter-column-button[fieldname="${fieldName}"]`).first();
    if (!(await icon.count())) {
      logStep(`  no filter icon for ${fieldName}`);
      return false;
    }
    await icon.click({ force: true });
    await page.waitForTimeout(800);
    const inp = page.locator('.cdk-overlay-container input.filter-input, .cdk-overlay-container input[type="text"]').first();
    if (!(await inp.count())) {
      logStep(`  no filter popup input visible after clicking ${fieldName}`);
      return false;
    }
    await inp.fill(String(value));
    await page.waitForTimeout(300);
    const apply = page.locator('.cdk-overlay-container button.apply-btn, .cdk-overlay-container button:has-text("Apply")').first();
    if (await apply.count()) {
      await apply.click();
      logStep(`  applied column filter ${fieldName}="${value}" (${label || ''})`);
    } else {
      await inp.press('Enter');
      logStep(`  applied column filter ${fieldName}="${value}" via Enter`);
    }
    // Wait for the BuildGridFilter + GetPersonList round-trip
    await page.waitForTimeout(3500);
    return true;
  } catch (err) {
    logStep(`  WARN column filter ${fieldName}="${value}" failed: ${err.message}`);
    return false;
  }
}

async function extractDom(page) {
  return await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const countMatches = [...bodyText.matchAll(/(\d[\d,\.]*)\s+records found/gi)].map(m => m[1]);

    // Result rows live inside Angular Material tables. Capture every
    // visible <tr> inside the People + Archive lists, plus all anchors.
    const rows = [];
    const tables = document.querySelectorAll('table, mat-table, .mat-table, .result-list, .person-list, .archive-list');
    tables.forEach(t => {
      t.querySelectorAll('tr, mat-row').forEach(r => {
        const cells = Array.from(r.querySelectorAll('td, mat-cell, th, mat-header-cell'))
          .map(c => (c.innerText || '').trim().replace(/\s+/g, ' '))
          .filter(Boolean);
        if (cells.length) rows.push(cells);
      });
    });

    // Articles / cards used by the SPA
    const cards = [];
    document.querySelectorAll('article, .result-card, .person-card, .archive-card, .mat-card').forEach(el => {
      const t = (el.innerText || '').trim().replace(/\s+/g, ' ');
      if (t) cards.push(t.slice(0, 600));
    });

    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: (a.innerText || '').trim().slice(0, 160), href: a.href }))
      .filter(l => l.href && /arolsen-archives\.org/i.test(l.href) && !/^#/.test(l.href));

    return {
      url: location.href,
      title: document.title,
      countMatches,
      rows,
      cards,
      links,
      bodySnippet: bodyText.slice(0, 6000),
    };
  });
}

function summariseApi(apiResponses) {
  const summary = { personHits: null, archiveHits: null, persons: [], archives: [], counts: [] };
  for (const r of apiResponses) {
    const u = r.url;
    let parsed;
    try { parsed = JSON.parse(r.body); } catch { continue; }
    let d = parsed && Object.prototype.hasOwnProperty.call(parsed, 'd') ? parsed.d : parsed;
    if (typeof d === 'string') {
      const trimmed = d.trim();
      if (/^[\d\.]+$/.test(trimmed)) {
        d = Number(trimmed);
      } else {
        try { d = JSON.parse(d); } catch {}
      }
    }
    if (/GetPersonList/i.test(u)) {
      const list = Array.isArray(d) ? d : (d && Array.isArray(d.list) ? d.list : []);
      if (list.length) summary.persons = summary.persons.concat(list);
    } else if (/GetArchiveList/i.test(u)) {
      const list = Array.isArray(d) ? d : (d && Array.isArray(d.list) ? d.list : []);
      if (list.length) summary.archives = summary.archives.concat(list);
    } else if (/GetCount/i.test(u)) {
      const n = typeof d === 'number' ? d : (d && typeof d.count === 'number' ? d.count : null);
      summary.counts.push({ url: u, value: d, postData: r.requestPostData });
      if (n != null) {
        if (/"searchType":"person"/i.test(r.requestPostData || '')) summary.personHits = n;
        if (/"searchType":"archive"/i.test(r.requestPostData || '')) summary.archiveHits = n;
      }
    }
  }
  return summary;
}

async function writeFindings(slug, args, query, dom, apiSummary, filtered) {
  const dir = await ensureSlugDir(slug);
  const lines = [];
  lines.push(`# Arolsen Archives — ${slug}`);
  lines.push('');
  lines.push(`**Composed query (sent to Arolsen):** \`${query}\``);
  lines.push(`**Args:** \`${JSON.stringify(args)}\``);
  lines.push(`**Result page URL:** ${dom.url}`);
  lines.push('');
  lines.push('## Hit counts');
  if (apiSummary.personHits != null) lines.push(`- API personHits: **${apiSummary.personHits}**`);
  if (apiSummary.archiveHits != null) lines.push(`- API archiveHits: **${apiSummary.archiveHits}**`);
  if (dom.countMatches.length) lines.push(`- DOM "records found": ${dom.countMatches.join(', ')}`);
  lines.push(`- Persons returned in first API page: ${apiSummary.persons.length}`);
  lines.push(`- Archives returned in first API page: ${apiSummary.archives.length}`);
  lines.push('');
  lines.push('## Client-side filtered candidates');
  lines.push(`Filter applied: forename=${args.forename || '-'} keyword=${args.keyword || '-'} years=${args['year-from'] || '-'}..${args['year-to'] || '-'}`);
  lines.push('');
  lines.push(`**Matching persons: ${filtered.persons.length}**`);
  filtered.persons.slice(0, 20).forEach((p, i) => {
    const last = p.LastName || p.lastName || '';
    const first = p.FirstName || p.firstName || '';
    const maiden = p.MaidenName || p.maidenName || '';
    const dob = p.DateOfBirth || p.dateOfBirth || '';
    const pob = p.PlaceOfBirth || p.placeOfBirth || '';
    const sig = p.Signature || p.signature || '';
    lines.push(`${i + 1}. **${last}, ${first}** ${maiden ? `(née ${maiden}) ` : ''}— DOB ${dob || '?'} — ${pob || '?'} — sig ${sig}`);
  });
  if (!filtered.persons.length) lines.push('_(none of the returned API persons matched the filters)_');
  lines.push('');
  lines.push(`**Matching archives: ${filtered.archives.length}**`);
  filtered.archives.slice(0, 20).forEach((a, i) => {
    const sig = a.Signature || a.signature || '';
    const title = a.Title || a.title || JSON.stringify(a).slice(0, 200);
    lines.push(`${i + 1}. **${sig}** — ${title}`);
  });
  if (!filtered.archives.length) lines.push('_(none of the returned API archives matched the filters)_');
  lines.push('');
  lines.push('## Caveats');
  lines.push('- Arolsen freetext search is AND-style, so we only sent the most specific token (surname or keyword). Forename / keyword are applied as a client-side substring filter on the captured records.');
  lines.push('- Person/archive lists are paginated; only the first page (~5–25 records, sorted by LastName) is captured here. Hit counts above show the true totals.');
  lines.push('- For very common surnames the first page is unlikely to contain the target — follow up by visiting the result URL in a browser and using the column-header filters.');
  lines.push('');
  lines.push('## Body snippet (first ~3 KB of rendered page)');
  lines.push('```');
  lines.push(dom.bodySnippet.slice(0, 3000));
  lines.push('```');
  await writeFile(join(dir, 'findings.md'), lines.join('\n'), 'utf8');
}

async function main() {
  const args = parseArgs(process.argv);
  const slug = args.slug || `a4-arolsen-${Date.now()}`;
  const headed = args.headed !== 'false';
  const holdSeconds = parseInt(args.hold || '30', 10);

  const query = buildQuery(args);
  if (!query) {
    console.error('ERROR: must supply at least --surname or --keyword');
    process.exit(2);
  }

  logStep(`Slug: ${slug}`);
  logStep(`Args: ${JSON.stringify(args)}`);
  logStep(`Composed query: "${query}"`);

  const { browser, page } = await launchEdge({ headed });

  // Capture POST responses from the ITS-WS.asmx API.
  const apiResponses = [];
  const apiRequests = new Map();
  page.on('request', (req) => {
    if (/collections-server\.arolsen-archives\.org\/ITS-WS\.asmx/i.test(req.url())) {
      apiRequests.set(req, req.postData() || '');
    }
  });
  page.on('response', async (res) => {
    const u = res.url();
    if (!/collections-server\.arolsen-archives\.org\/ITS-WS\.asmx/i.test(u)) return;
    try {
      const body = await res.text();
      const requestPostData = apiRequests.get(res.request()) || '';
      apiResponses.push({ url: u, status: res.status(), body, requestPostData });
    } catch {}
  });

  try {
    const targetUrl = SEARCH_URL + '?s=' + encodeURIComponent(query);
    logStep(`Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(3000);
    await dismissCookies(page);
    await acceptDisclaimer(page);
    await page.waitForTimeout(1500);

    await saveResultPage(page, slug, '01-search-form');

    // Make sure the search input contains our query (sometimes the URL
    // param is read by the SPA; if not, type it in and hit Enter).
    try {
      const input = page.locator('input[placeholder*="search term" i], input[type="search"]').first();
      if (await input.count()) {
        const cur = await input.inputValue().catch(() => '');
        if (cur.trim() !== query.trim()) {
          await input.fill(query);
          await page.waitForTimeout(300);
          await input.press('Enter');
          logStep('  re-submitted query via search input');
          await page.waitForTimeout(2500);
        }
      }
    } catch {}

    await saveResultPage(page, slug, '02-filled-form');

    // Wait for either a "records found" text or for one of the API
    // responses to come back, AND for the column filter icons to render.
    logStep('Waiting for results to render...');
    await page.waitForFunction(() => {
      const t = document.body.innerText || '';
      const hasResults = /records found/i.test(t) || /no result/i.test(t);
      const hasFilters = !!document.querySelector('yv-its-filter-column-button');
      return hasResults && hasFilters;
    }, { timeout: 60_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Dismiss the disclaimer once more — it sometimes re-appears after the
    // result table mounts, and its backdrop blocks column-filter clicks.
    await acceptDisclaimer(page);
    await page.waitForTimeout(800);

    // Apply column filters in the People panel for surname / forename to
    // narrow the API response (otherwise sorted-LastName-asc page 1 of
    // thousands of fuzzy matches won't include the target).
    let appliedAny = false;
    if (args.surname) {
      appliedAny = (await applyColumnFilter(page, 'LastName', args.surname, 'surname')) || appliedAny;
    }
    if (args.forename) {
      appliedAny = (await applyColumnFilter(page, 'FirstName', args.forename, 'forename')) || appliedAny;
    }
    if (appliedAny) {
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(2500);
    }

    await saveResultPage(page, slug, '03-results');

    const dom = await extractDom(page);
    const apiSummary = summariseApi(apiResponses);

    const filtered = {
      persons: apiSummary.persons.filter(p => recordMatchesFilters(p, args)),
      archives: apiSummary.archives.filter(a => recordMatchesFilters(a, args)),
    };

    const out = {
      slug,
      query,
      args,
      finalUrl: dom.url,
      countMatches: dom.countMatches,
      apiSummary,
      filtered,
      domRows: dom.rows.slice(0, 100),
      domCards: dom.cards.slice(0, 50),
      links: dom.links.slice(0, 200),
      apiResponses: apiResponses.map(r => ({
        url: r.url,
        status: r.status,
        requestPostData: r.requestPostData,
        body: r.body.length > 50_000 ? r.body.slice(0, 50_000) + '...[truncated]' : r.body,
      })),
    };

    await saveText(slug, 'results.json', JSON.stringify(out, null, 2));
    await writeFindings(slug, args, query, dom, apiSummary, filtered);

    logStep(`DONE ${slug}: API personHits=${apiSummary.personHits} archiveHits=${apiSummary.archiveHits}; captured ${apiSummary.persons.length}p/${apiSummary.archives.length}a; filtered ${filtered.persons.length}p/${filtered.archives.length}a`);

    if (headed) {
      logStep(`Holding browser open ${holdSeconds}s`);
      await page.waitForTimeout(holdSeconds * 1000);
      await saveResultPage(page, slug, '04-final-state');
    }
  } catch (err) {
    logStep(`ERROR: ${err.message}`);
    try { await saveResultPage(page, slug, 'error'); } catch {}
    throw err;
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
