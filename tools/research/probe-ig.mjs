import { launchEdge, saveResultPage, logStep } from './lib.mjs';

const { browser, page } = await launchEdge({ headed: true });
try {
  await page.goto('https://civilrecords.irishgenealogy.ie/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Dismiss cookie banner
  for (const sel of ['#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', 'button:has-text("Accept")', 'button:has-text("Allow all")']) {
    try { const b = page.locator(sel).first(); if (await b.isVisible({timeout:1000})) { await b.click(); logStep(`cookie: ${sel}`); break; } } catch {}
  }
  await page.waitForTimeout(800);
  logStep(`Home URL: ${page.url()}`);
  // Click "Search Records"
  const link = page.locator('a:has-text("Search Records")').first();
  if (await link.count()) {
    await Promise.all([page.waitForLoadState('networkidle').catch(()=>{}), link.click()]);
    await page.waitForTimeout(2000);
    logStep(`After click URL: ${page.url()}`);
  }
  await saveResultPage(page, 'probe', 'search-landing');
  // Find any links / forms that lead to actual record search
  const linksAndForms = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a')).map(a => ({text: (a.innerText||'').trim().slice(0,60), href: a.href})).filter(x => x.href && x.text);
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({action: f.action, id: f.id, fields: Array.from(f.elements).map(e => `${e.tagName}#${e.id||''}[name=${e.name||''},type=${e.type||''}]`)}));
    return { links, forms, url: location.href };
  });
  console.log(JSON.stringify(linksAndForms, null, 2));
} finally {
  await browser.close();
}
