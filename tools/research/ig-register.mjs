// IrishGenealogy.ie register-page detail + image capture.
//
// Usage:
//   node tools/research/ig-register.mjs --record-id cima-1271568 --slug r1-tg-bc-marriage-1922
//
// Captures:
//   01-detail.png/.html   metadata view at /view?record_id=<id>
//   02-register-image.png full-page screenshot of the register scan
//   register.jpg          direct download of the scan image (best effort)
//   metadata.json         extracted key/value pairs
//   summary.md            human-readable summary
//
// The IG site gates register scans behind a Section 61 declaration. We fill
// those fields (and any consent checkbox) automatically as Mark Garrigan.

import { launchEdge, ensureSlugDir, saveResultPage, saveText, logStep } from './lib.mjs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

async function fillSection61(page, { firstname = 'Mark', surname = 'Garrigan' } = {}) {
  let touched = false;
  try {
    const f = page.locator('#your-firstname').first();
    if (await f.count()) { await f.fill(firstname).catch(() => {}); touched = true; }
  } catch {}
  try {
    const s = page.locator('#your-surname').first();
    if (await s.count()) { await s.fill(surname).catch(() => {}); touched = true; }
  } catch {}
  try {
    const c = page.locator('#section-61-checkbox').first();
    if (await c.count()) { await c.check().catch(() => {}); touched = true; }
  } catch {}
  // Some pages use a dedicated "View Image" Section 61 form. Generic fallbacks:
  for (const sel of [
    'input[name="firstname"]',
    'input[name="surname"]',
    'input[type="checkbox"][name*="61"]',
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() && !(await el.getAttribute('id'))?.includes('search')) {
        if (sel.includes('checkbox')) await el.check().catch(() => {});
        else if (sel.includes('firstname')) await el.fill(firstname).catch(() => {});
        else if (sel.includes('surname')) await el.fill(surname).catch(() => {});
        touched = true;
      }
    } catch {}
  }
  if (touched) logStep(`  filled Section 61 declaration as ${firstname} ${surname}`);
  return touched;
}

async function extractMetadata(page) {
  return await page.evaluate(() => {
    const out = { url: location.href, title: document.title, fields: {}, raw: '' };

    const main = document.querySelector('#result-details, #content, #main-content, main, .container') || document.body;
    out.raw = (main.innerText || '').trim().slice(0, 8000);

    // Try IG's typical detail layout: definition lists, label/value pairs in
    // .row / .col structures, or table rows.
    for (const dl of document.querySelectorAll('dl')) {
      const dts = dl.querySelectorAll('dt');
      const dds = dl.querySelectorAll('dd');
      const n = Math.min(dts.length, dds.length);
      for (let i = 0; i < n; i++) {
        const k = (dts[i].innerText || '').trim().replace(/[:\s]+$/, '');
        const v = (dds[i].innerText || '').trim();
        if (k) out.fields[k] = v;
      }
    }
    for (const tr of document.querySelectorAll('table tr')) {
      const cells = tr.querySelectorAll('th,td');
      if (cells.length === 2) {
        const k = (cells[0].innerText || '').trim().replace(/[:\s]+$/, '');
        const v = (cells[1].innerText || '').trim();
        if (k && v && !out.fields[k]) out.fields[k] = v;
      }
    }
    // IG also sometimes uses divs with class "label" and adjacent value spans.
    for (const lab of document.querySelectorAll('.label, .field-label, .meta-label')) {
      const k = (lab.innerText || '').trim().replace(/[:\s]+$/, '');
      const sib = lab.nextElementSibling;
      if (k && sib) {
        const v = (sib.innerText || '').trim();
        if (v && !out.fields[k]) out.fields[k] = v;
      }
    }
    // Heuristic: any "Label: value" text in the main content.
    const lines = (main.innerText || '').split('\n').map(l => l.trim()).filter(Boolean);
    for (const ln of lines) {
      const m = ln.match(/^([A-Z][A-Za-z' /-]{1,40}):\s+(.+)$/);
      if (m) {
        const k = m[1].trim();
        const v = m[2].trim();
        if (!out.fields[k]) out.fields[k] = v;
      }
    }

    // Image link discovery
    out.imageLinks = Array.from(document.querySelectorAll('a'))
      .filter(a => /view record image|view image|register|\.pdf|\.jpg|\.jpeg|\.tif|\.png|\/files\//i.test(((a.innerText || '') + ' ' + (a.getAttribute('href') || ''))))
      .map(a => ({ text: (a.innerText || '').trim().slice(0, 80), href: a.href }));

    return out;
  });
}

async function findImageOnPage(page) {
  return await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const big = imgs
      .map(i => ({ src: i.currentSrc || i.src, w: i.naturalWidth || i.width, h: i.naturalHeight || i.height, alt: i.alt }))
      .filter(i => i.src && (i.w > 400 || /image|register|civil|church|scan|jpeg|jpg|png/i.test(i.src)))
      .sort((a, b) => (b.w * b.h) - (a.w * a.h));
    const canvas = Array.from(document.querySelectorAll('canvas')).map(c => ({ w: c.width, h: c.height }));
    return { imgs: big, canvasCount: canvas.length, canvases: canvas };
  });
}

async function downloadImage(context, url, outPath) {
  try {
    const resp = await context.request.get(url, { timeout: 60_000 });
    if (!resp.ok()) {
      logStep(`  image download HTTP ${resp.status()} for ${url}`);
      return false;
    }
    const buf = await resp.body();
    await writeFile(outPath, buf);
    logStep(`  saved register image: ${outPath} (${buf.length} bytes)`);
    return true;
  } catch (err) {
    logStep(`  image download failed: ${err.message}`);
    return false;
  }
}

async function clickViewImage(page) {
  const candidates = [
    'a:has-text("View Image")',
    'a:has-text("View image")',
    'button:has-text("View Image")',
    'button:has-text("View image")',
    'a:has-text("Image")',
    'a[href*="/image/"]',
    'a[href*="image"][href*="record"]',
  ];
  for (const sel of candidates) {
    try {
      const el = page.locator(sel).first();
      if (await el.count() && await el.isVisible({ timeout: 1500 })) {
        logStep(`  clicking "${sel}"`);
        // Image may open in same tab or new tab
        const newPagePromise = page.context().waitForEvent('page', { timeout: 5_000 }).catch(() => null);
        await el.click().catch(() => {});
        const newPage = await newPagePromise;
        await page.waitForTimeout(2000);
        return newPage || page;
      }
    } catch {}
  }
  logStep('  no "View Image" affordance found');
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const recordId = args['record-id'];
  const slug = args.slug;
  if (!recordId || !slug) {
    console.error('Usage: ig-register.mjs --record-id <id> --slug <slug>');
    process.exit(2);
  }
  const headed = args.headed !== 'false';
  const holdSeconds = parseInt(args.hold || '5', 10);

  logStep(`Slug: ${slug}  Record: ${recordId}`);
  const dir = await ensureSlugDir(slug);

  const { browser, context, page } = await launchEdge({ headed });

  try {
    // Warm cookies on home page first
    await page.goto('https://www.irishgenealogy.ie/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(800);
    await dismissCookies(page);

    // Try multiple URL prefixes if the supplied one 404s. IG uses a few
    // record_id schemes: cima-* (civil marriage), civbi-* (civil birth, older
    // search index), and the new e<hash>-* IDs returned by the modern search
    // (which are used as-is with NO prefix replacement).
    const knownPrefixMatch = recordId.match(/^(cima|civbi|civmarr|civbir|civde|civdth)-/);
    const candidates = [];
    candidates.push(recordId); // always try the literal ID first
    if (knownPrefixMatch) {
      const idTrimmed = recordId.slice(knownPrefixMatch[0].length);
      for (const px of ['cima', 'civbi', 'civmarr', 'civbir', 'civde']) {
        if (px !== knownPrefixMatch[1]) candidates.push(`${px}-${idTrimmed}`);
      }
    }

    let detailLoaded = false;
    for (const id of candidates) {
      const url = `https://www.irishgenealogy.ie/view?record_id=${id}`;
      logStep(`Trying detail URL: ${url}`);
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(e => { logStep(`  nav error: ${e.message}`); return null; });
      await page.waitForTimeout(1500);
      await dismissCookies(page);
      const status = resp?.status() ?? 0;
      const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 500);
      logStep(`  status=${status}; body starts: ${bodyText.slice(0, 120).replace(/\s+/g, ' ')}`);
      if (status && status < 400 && !/not found|no record|^error/i.test(bodyText.slice(0, 200))) {
        detailLoaded = true;
        break;
      }
    }
    if (!detailLoaded) logStep('WARNING: no candidate yielded a clean detail page; saving whatever loaded');

    // The detail page itself may show a Section 61 prompt before metadata.
    await fillSection61(page);
    // Some IG forms then need a submit click
    for (const sel of [
      'button:has-text("View Record")',
      'button:has-text("View record")',
      'button:has-text("Continue")',
      'input[type="submit"][value*="View"]',
      'input[type="submit"][value*="Continue"]',
    ]) {
      try {
        const b = page.locator(sel).first();
        if (await b.count() && await b.isVisible({ timeout: 800 })) {
          logStep(`  submitting Section 61 via "${sel}"`);
          await b.click().catch(() => {});
          await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
          await page.waitForTimeout(1500);
          break;
        }
      } catch {}
    }

    await saveResultPage(page, slug, '01-detail');

    const meta = await extractMetadata(page);
    await writeFile(join(dir, 'metadata.json'), JSON.stringify(meta, null, 2));
    logStep(`Captured ${Object.keys(meta.fields).length} metadata fields; ${meta.imageLinks.length} candidate image links`);

    // Prefer direct download of the file linked from the metadata page.
    // IG marriage/birth/death civil records expose the register scan as a PDF
    // at /files/civil/.../*.pdf which we can fetch with the same cookie jar.
    const directFile = (meta.imageLinks || []).find(l => /\.(pdf|jpe?g|png|tif)$/i.test(l.href));
    if (directFile) {
      logStep(`Direct file link found: ${directFile.href}`);
      const ext = (directFile.href.match(/\.(pdf|jpe?g|png|tif)$/i)?.[1] || 'bin').toLowerCase();
      const outName = ext === 'pdf' ? 'register.pdf' : (ext === 'tif' ? 'register.tif' : 'register.jpg');
      await downloadImage(context, directFile.href, join(dir, outName));
    }

    // Also click into the image viewer for a screenshot fallback.
    const imagePage = await clickViewImage(page) || page;
    await imagePage.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await imagePage.waitForTimeout(2000);
    await fillSection61(imagePage);
    for (const sel of [
      'button:has-text("View Image")',
      'button:has-text("View image")',
      'input[type="submit"][value*="Image"]',
      'button:has-text("Continue")',
    ]) {
      try {
        const b = imagePage.locator(sel).first();
        if (await b.count() && await b.isVisible({ timeout: 800 })) {
          logStep(`  submitting image gate via "${sel}"`);
          await b.click().catch(() => {});
          await imagePage.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
          await imagePage.waitForTimeout(2500);
          break;
        }
      } catch {}
    }

    // Wait for images to render
    await imagePage.waitForTimeout(2500);

    const found = await findImageOnPage(imagePage);
    logStep(`  found ${found.imgs.length} candidate <img>; ${found.canvasCount} <canvas>`);
    if (found.imgs.length) {
      const top = found.imgs.slice(0, 5).map(i => `${i.w}x${i.h} ${i.src}`).join('\n  ');
      logStep(`  top images:\n  ${top}`);
    }

    // Full-page screenshot of the register view
    const regPng = join(dir, '02-register-image.png');
    await imagePage.screenshot({ path: regPng, fullPage: true }).catch(e => logStep(`  screenshot failed: ${e.message}`));
    await writeFile(join(dir, '02-register-image.html'), await imagePage.content().catch(() => '<empty/>'));

    // Try to download the largest plausible register image (only if we
    // didn't already grab the direct PDF/JPG link from the metadata page).
    if (!directFile && found.imgs.length) {
      const best = found.imgs[0];
      await downloadImage(imagePage.context(), best.src, join(dir, 'register.jpg'));
    } else if (!directFile) {
      logStep('  no <img> URL to download; relying on screenshot only');
    }

    // Build summary.md
    const f = meta.fields;
    const pick = (...keys) => {
      for (const k of keys) {
        for (const fk of Object.keys(f)) {
          if (fk.toLowerCase() === k.toLowerCase()) return f[fk];
        }
      }
      return null;
    };
    const lines = [
      `# ${slug}`,
      ``,
      `- Record ID: ${recordId}`,
      `- Detail URL: ${meta.url}`,
      `- Page title: ${meta.title}`,
      ``,
      `## Key fields`,
      ...Object.entries(f).map(([k, v]) => `- **${k}**: ${v}`),
      ``,
      `## Highlights`,
      `- Father (groom/child): ${pick("Father's Name", 'Father', "Groom's Father", "Child's Father") || '(not extracted)'}`,
      `- Father (bride): ${pick("Bride's Father") || '(not extracted)'}`,
      `- Mother / maiden: ${pick("Mother's Maiden Name", "Mother's Name", 'Mother') || '(not extracted)'}`,
      `- Address(es): ${pick('Address', 'Residence', "Bride's Residence", "Groom's Residence") || '(not extracted)'}`,
      `- Witnesses: ${pick('Witnesses', 'Witness') || '(not extracted)'}`,
      ``,
      `## Raw text excerpt`,
      '```',
      meta.raw.slice(0, 3000),
      '```',
    ];
    await writeFile(join(dir, 'summary.md'), lines.join('\n'));
    logStep('  wrote summary.md');

    if (headed) {
      logStep(`Holding ${holdSeconds}s...`);
      await page.waitForTimeout(holdSeconds * 1000);
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
