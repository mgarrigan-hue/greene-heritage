// Probe the Arolsen Archives search SPA to discover the form / API.
import { launchEdge, saveResultPage, saveText, logStep } from './lib.mjs';

const URL = 'https://collections.arolsen-archives.org/en/search/';

const { browser, page } = await launchEdge({ headed: true });
const apiCalls = [];
page.on('request', (req) => {
  const u = req.url();
  if (/arolsen/i.test(u) && (req.method() === 'POST' || /search|api|graphql|elastic/i.test(u))) {
    apiCalls.push({ method: req.method(), url: u, postData: req.postData() || null });
  }
});
page.on('response', async (res) => {
  const u = res.url();
  if (/search|api|graphql|elastic/i.test(u) && res.request().method() !== 'GET') {
    try {
      const ct = res.headers()['content-type'] || '';
      if (/json/i.test(ct)) {
        const body = await res.text();
        apiCalls.push({ kind: 'response', url: u, status: res.status(), bodySnippet: body.slice(0, 800) });
      }
    } catch {}
  }
});

try {
  logStep(`Goto ${URL}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2500);

  // Try cookie banners
  for (const sel of [
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button:has-text("Agree")',
    'button:has-text("Alle akzeptieren")',
    'button:has-text("Allow all")',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonAccept',
    '[id*="cookie"] button',
  ]) {
    try {
      const b = page.locator(sel).first();
      if (await b.isVisible({ timeout: 800 })) {
        await b.click();
        logStep(`cookie clicked: ${sel}`);
        await page.waitForTimeout(800);
        break;
      }
    } catch {}
  }

  await page.waitForTimeout(2500);
  await saveResultPage(page, 'probe-arolsen', '01-landing');

  // Dump form structure
  const dump = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
      tag: el.tagName,
      type: el.type || null,
      id: el.id || null,
      name: el.name || null,
      placeholder: el.placeholder || null,
      ariaLabel: el.getAttribute('aria-label'),
      text: (el.innerText || '').trim().slice(0, 80),
      classes: el.className && typeof el.className === 'string' ? el.className.slice(0, 200) : null,
    }));
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action, method: f.method, id: f.id, classes: f.className,
    }));
    return { url: location.href, title: document.title, forms, inputs };
  });

  await saveText('probe-arolsen', 'form-dump.json', JSON.stringify(dump, null, 2));
  logStep(`Form fields: ${dump.inputs.length}; forms: ${dump.forms.length}`);

  // Try a quick search to see how it submits
  const searchInput = page.locator('input[type="search"], input[name="q"], input[placeholder*="Search" i], input[placeholder*="search" i]').first();
  if (await searchInput.count()) {
    logStep('Found search input — typing "Harris"');
    await searchInput.fill('Harris');
    await page.waitForTimeout(400);
    await searchInput.press('Enter');
    await page.waitForTimeout(6000);
    logStep(`After-submit URL: ${page.url()}`);
    await saveResultPage(page, 'probe-arolsen', '02-after-search');

    const postSearch = await page.evaluate(() => {
      // Try to find result containers
      const candidates = ['.result', '.search-result', '.result-item', 'article', 'li[class*="result" i]', '[data-testid*="result" i]', 'h2 a', 'h3 a'];
      const found = {};
      for (const c of candidates) {
        const els = document.querySelectorAll(c);
        if (els.length) found[c] = els.length;
      }
      return { url: location.href, found, bodySnippet: document.body.innerText.slice(0, 2000) };
    });
    await saveText('probe-arolsen', 'after-search.json', JSON.stringify(postSearch, null, 2));
    logStep(`Result candidates: ${JSON.stringify(postSearch.found)}`);
  } else {
    logStep('NO search input found via common selectors');
  }

  await saveText('probe-arolsen', 'api-calls.json', JSON.stringify(apiCalls, null, 2));
  logStep(`Captured ${apiCalls.length} API calls`);

  logStep('Holding 20s for visual inspection');
  await page.waitForTimeout(20_000);
} catch (err) {
  logStep(`ERROR: ${err.message}`);
  try { await saveResultPage(page, 'probe-arolsen', 'error'); } catch {}
} finally {
  await browser.close();
}
