import { launchEdge, logStep } from './lib.mjs';

const { browser, page } = await launchEdge({ headed: true });
const calls = [];
page.on('response', async (resp) => {
  const url = resp.url();
  if (/\/(api|ajax|search|results|civil|records)/i.test(url) && !url.includes('/wp-content/') && !url.includes('.css') && !url.includes('.js') && !url.includes('analytics') && !url.includes('cookiebot')) {
    let bodySnippet = '';
    try {
      const ct = resp.headers()['content-type'] || '';
      if (/json|xml|text/i.test(ct)) {
        const txt = await resp.text();
        bodySnippet = txt.slice(0, 300);
      }
    } catch {}
    calls.push({ url, status: resp.status(), method: resp.request().method(), bodySnippet });
  }
});

try {
  await page.goto('https://www.irishgenealogy.ie/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  for (const sel of ['#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll']) {
    try { const b = page.locator(sel).first(); if (await b.isVisible({timeout:1500})) await b.click(); } catch {}
  }
  // Direct GET of a search URL — see what AJAX it triggers
  await page.goto('https://www.irishgenealogy.ie/search?church-or-civil=civil&firstname=John&lastname=Murphy&yearStart=1900&yearEnd=1900&event-birth=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000); // let AJAX run
  console.log('--- Captured calls ---');
  for (const c of calls) console.log(JSON.stringify(c));
} finally {
  await browser.close();
}
