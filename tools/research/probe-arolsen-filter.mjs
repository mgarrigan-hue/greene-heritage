// Quick interactive probe: see what API call is made when we use the
// per-column LastName filter.
import { launchEdge, saveText, logStep } from './lib.mjs';

const { browser, page } = await launchEdge({ headed: false });
const apiCalls = [];
page.on('request', req => {
  if (/ITS-WS\.asmx/i.test(req.url())) apiCalls.push({ stage: 'pending', url: req.url(), postData: req.postData() });
});
function snapshotApi(stage) {
  apiCalls.push({ stage, marker: true });
}
try {
  await page.goto('https://collections.arolsen-archives.org/en/search/?s=Harris', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(3000);
  for (const sel of ['button[aria-label="Accept all"]', 'button:has-text("Accept all")']) {
    try { const b = page.locator(sel).first(); if (await b.isVisible({timeout:1500})) { await b.click(); break; } } catch {}
  }
  await page.waitForTimeout(3000);
  await page.waitForFunction(() => /records found/i.test(document.body.innerText||''), { timeout: 60_000 }).catch(()=>{});
  await page.waitForTimeout(2000);

  // Accept "I agree" terms-of-use disclaimer if present (it puts up a backdrop that blocks clicks)
  try {
    const ag = page.locator('button:has-text("I agree")').first();
    if (await ag.isVisible({timeout:1500})) {
      await page.locator('#itsAgree-input').check({ force: true }).catch(()=>{});
      await ag.click({ force: true });
      logStep('Accepted disclaimer');
      await page.waitForTimeout(1500);
    }
  } catch {}

  // After disclaimer dismissal the table may re-render. Re-wait for results.
  await page.waitForFunction(() => /records found/i.test(document.body.innerText||'') && document.querySelector('yv-its-filter-column-button'), { timeout: 30_000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  snapshotApi('--- after initial load ---');
  logStep('Results loaded. Click LastName filter icon');

  const filterIcon = page.locator('yv-its-filter-column-button[fieldname="LastName"]').first();
  if (!(await filterIcon.count())) { logStep('NO LastName filter icon'); throw new Error('no filter icon'); }
  await filterIcon.click({ force: true });
  await page.waitForTimeout(1500);
  snapshotApi('--- after filter icon click ---');

  // Dump everything visible
  const popupInputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input:not([type="hidden"]), button')).map(el => ({
      tag: el.tagName, id: el.id, type: el.type, placeholder: el.placeholder, name: el.name,
      classes: (el.className||'').toString().slice(0,150),
      text: (el.innerText||'').trim().slice(0,80),
      visible: !!(el.offsetWidth || el.offsetHeight)
    })).filter(x => x.visible);
  });
  await saveText('probe-arolsen', 'after-filter-click.json', JSON.stringify(popupInputs, null, 2));
  logStep(`Visible elements after popup: ${popupInputs.length}`);

  // Try to find a fresh input in a dialog/overlay and type
  const candidates = [
    '.cdk-overlay-container input',
    '[role="dialog"] input',
    'mat-dialog-container input',
    '.filter-popup input',
  ];
  let typed = false;
  for (const sel of candidates) {
    const inp = page.locator(sel).first();
    if (await inp.count()) {
      await inp.fill('HARRIS');
      await page.waitForTimeout(500);
      await inp.press('Enter');
      logStep(`Filled & Entered via "${sel}"`);
      typed = true;
      break;
    }
  }
  if (!typed) logStep('Could not find filter popup input');
  await page.waitForTimeout(5000);
  snapshotApi('--- after Enter ---');

  // Try clicking any apply / OK button
  for (const sel of ['button:has-text("Apply")', 'button:has-text("OK")', 'button:has-text("Filter")', '.cdk-overlay-container button']) {
    const b = page.locator(sel).first();
    if (await b.isVisible({timeout:500}).catch(()=>false)) {
      await b.click().catch(()=>{});
      logStep(`Clicked "${sel}"`);
      await page.waitForTimeout(3000);
      snapshotApi(`--- after click ${sel} ---`);
      break;
    }
  }

  await saveText('probe-arolsen', 'filter-api-calls.json', JSON.stringify(apiCalls, null, 2));
  logStep(`Captured ${apiCalls.length} API events`);
} catch (e) {
  logStep(`ERROR ${e.message}`);
  await saveText('probe-arolsen', 'filter-api-calls.json', JSON.stringify(apiCalls, null, 2));
} finally {
  await browser.close();
}

