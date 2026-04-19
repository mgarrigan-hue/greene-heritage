// IrishGenealogy.ie unified search driver (civil + church records).
//
// Real form lives at https://www.irishgenealogy.ie/search/
// Selectors discovered via tools/research/probe-ig.mjs
//
// Usage:
//   node tools/research/ig-civil.mjs --slug a2-bridget-birth \
//        --type birth --firstname Bridget --lastname Clarke \
//        --year-from 1888 --year-to 1893 --location Meath
//
//   node tools/research/ig-civil.mjs --slug a1-tg-bc-marriage \
//        --type marriage --firstname Thomas --lastname Greene \
//        --year-from 1915 --year-to 1925 --location Dublin \
//        --rel-type spouse --rel-first Bridget --rel-last Clarke
//
// Type values: birth | marriage | death | baptism | burial
// First run is headed so the user can solve any cookie banner / CAPTCHA.

import { launchEdge, saveResultPage, saveText, logStep } from './lib.mjs';

const HOME_URL = 'https://www.irishgenealogy.ie/';
const SEARCH_URL = 'https://www.irishgenealogy.ie/search/';

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

async function dismissCookies(page) {
  const tries = [
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept',
    'button:has-text("Allow all")',
    'button:has-text("Accept")',
  ];
  for (const sel of tries) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click();
        logStep(`Dismissed cookie banner via "${sel}"`);
        await page.waitForTimeout(500);
        return;
      }
    } catch {}
  }
}

async function fillSearchForm(page, args) {
  await page.locator('#radio-civil').check().catch(() => {});

  if (args.firstname) await page.locator('#firstname').fill(args.firstname);
  if (args.lastname) await page.locator('#lastname').fill(args.lastname);

  if (args['year-from']) await page.locator('#yearStart').fill(String(args['year-from']));
  if (args['year-to']) await page.locator('#yearEnd').fill(String(args['year-to']));

  if (args.location) await page.locator('#location').fill(args.location);

  const types = (args.type || 'birth').toLowerCase().split(',').map(s => s.trim());
  const evMap = {
    birth: '#event-birth',
    marriage: '#event-marriage',
    death: '#event-death',
    baptism: '#event-baptism',
    burial: '#event-burial',
  };
  for (const sel of Object.values(evMap)) {
    try { await page.locator(sel).uncheck({ timeout: 500 }); } catch {}
  }
  for (const t of types) {
    if (evMap[t]) {
      await page.locator(evMap[t]).check();
      logStep(`  checked ${evMap[t]}`);
    }
  }

  if (args['mothers-surname']) await page.locator('#mothers-surname').fill(args['mothers-surname']);
  if (args['age-at-death']) await page.locator('#age-at-death').fill(args['age-at-death']);

  if (args['rel-type']) {
    // Wait for the spouse option to become enabled (depends on marriage checkbox handler)
    await page.waitForFunction((val) => {
      const opt = document.querySelector(`#relation-0 option[value="${val}"]`);
      return opt && !opt.disabled;
    }, args['rel-type'], { timeout: 5000 }).catch(() => {});
    try { await page.locator('#relation-0').selectOption({ value: args['rel-type'] }); }
    catch { try { await page.locator('#relation-0').selectOption({ label: args['rel-type'] }); } catch {} }
    // Force-set value via JS too (selectOption doesn't always stick when option was just enabled)
    await page.evaluate((val) => {
      const sel = document.querySelector('#relation-0');
      if (sel) {
        const opt = sel.querySelector(`option[value="${val}"]`);
        if (opt) opt.disabled = false;
        sel.value = val;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, args['rel-type']);
    await page.locator('#relation-first-0:not([disabled])').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
  if (args['rel-first']) {
    await page.evaluate((v) => {
      const el = document.querySelector('#relation-first-0');
      if (el) {
        el.disabled = false;
        el.removeAttribute('disabled');
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, args['rel-first']);
  }
  if (args['rel-last']) {
    await page.evaluate((v) => {
      const el = document.querySelector('#relation-last-0');
      if (el) {
        el.disabled = false;
        el.removeAttribute('disabled');
        el.classList.remove('disabled');
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, args['rel-last']);
  }

  // Section 61 consent — required by the form's validateSearch() before it
  // will submit any civil birth/marriage/death query.
  const yourFirst = args['your-firstname'] || 'Mark';
  const yourLast = args['your-surname'] || 'Garrigan';
  await page.locator('#your-firstname').fill(yourFirst).catch(() => {});
  await page.locator('#your-surname').fill(yourLast).catch(() => {});
  await page.locator('#section-61-checkbox').check().catch(() => {});
  logStep(`  filled section 61 consent as ${yourFirst} ${yourLast}`);
}

async function extractResults(page) {
  return await page.evaluate(() => {
    const out = { rows: [], totalText: null, links: [], resultsText: null };

    const totalEl = document.querySelector('#search-results-total, .results-total, .total-results, #results-string');
    if (totalEl) out.totalText = totalEl.innerText.trim();

    const resultsEl = document.querySelector('#results');
    if (resultsEl) out.resultsText = resultsEl.innerText.trim().slice(0, 4000);

    // Try result list items first (the new IG layout uses <li>)
    const items = Array.from(document.querySelectorAll('#results li, #results .result, .search-result'));
    for (const it of items) {
      const txt = (it.innerText || '').trim().replace(/\s+/g, ' ');
      if (txt) out.rows.push([txt]);
    }

    // Also harvest any tables for completeness
    const tables = Array.from(document.querySelectorAll('#results table, table.results'));
    for (const t of tables) {
      const trs = Array.from(t.querySelectorAll('tr'));
      for (const tr of trs) {
        const cells = Array.from(tr.querySelectorAll('th,td')).map(c => c.innerText.trim());
        if (cells.length) out.rows.push(cells);
      }
    }

    out.links = Array.from(document.querySelectorAll('#results a, a[href*="/details/"], a[href*="/image/"]'))
      .map(a => ({ text: (a.innerText || '').trim().slice(0, 120), href: a.href }))
      .filter(x => x.href);

    return out;
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const slug = args.slug || `ig-${args.type || 'birth'}-${args.lastname || 'unknown'}-${Date.now()}`.toLowerCase();
  const headed = args.headed !== 'false';
  const holdSeconds = parseInt(args.hold || '45', 10);

  logStep(`Slug: ${slug}`);
  logStep(`Args: ${JSON.stringify(args)}`);

  const { browser, page } = await launchEdge({ headed });

  try {
    logStep(`Navigating to ${HOME_URL}`);
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(1500);
    await dismissCookies(page);

    logStep(`Going to ${SEARCH_URL}`);
    await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(1500);
    await dismissCookies(page);

    await saveResultPage(page, slug, '01-search-form');

    logStep('Filling form');
    await fillSearchForm(page, args);
    await saveResultPage(page, slug, '02-filled-form');

    logStep('Submitting');
    const submitSelectors = [
      '#searchform input[type="submit"]',
      '#searchform button[type="submit"]',
      'form#searchform button:has-text("Search")',
      'button:has-text("Search")',
    ];
    let clicked = false;
    for (const s of submitSelectors) {
      const b = page.locator(s).first();
      if (await b.count()) {
        await b.click().catch(() => {});
        clicked = true;
        logStep(`  clicked ${s}`);
        break;
      }
    }
    if (!clicked) logStep('  WARNING: no submit button matched');

    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    // Wait for results AJAX to populate #results (it starts empty and fills async)
    await page.waitForFunction(() => {
      const el = document.querySelector('#results');
      if (!el) return false;
      const t = (el.innerText || '').trim();
      return t.length > 0 && !/^Loading/i.test(t);
    }, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    logStep(`After-submit URL: ${page.url()}`);

    await saveResultPage(page, slug, '03-results');

    const results = await extractResults(page);
    await saveText(slug, 'results.json', JSON.stringify(results, null, 2));
    if (results.rows.length) {
      const tsv = results.rows.map(r => r.join('\t')).join('\n');
      await saveText(slug, 'results.tsv', tsv);
    }
    logStep(`Captured ${results.rows.length} result rows; ${results.links.length} record links${results.totalText ? `; total: ${results.totalText}` : ''}`);

    if (headed) {
      logStep(`Headed mode: holding Edge open ${holdSeconds}s — click any record to load details so we can capture them`);
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
