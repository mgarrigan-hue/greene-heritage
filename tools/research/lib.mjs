// Shared Playwright helpers for the Greene Heritage research harness.
// Drives the user's installed Microsoft Edge (channel: 'msedge') so we
// don't need to download an extra browser.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, '..', '..');
export const RESULTS_DIR = join(REPO_ROOT, 'research-results');

export async function launchEdge({ headed = true, slowMo = 0 } = {}) {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: !headed,
    slowMo,
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  });
  const page = await context.newPage();
  return { browser, context, page };
}

export async function ensureSlugDir(slug) {
  const dir = join(RESULTS_DIR, slug);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveResultPage(page, slug, label = 'page') {
  const dir = await ensureSlugDir(slug);
  const png = join(dir, `${label}.png`);
  const html = join(dir, `${label}.html`);
  await page.screenshot({ path: png, fullPage: true });
  await writeFile(html, await page.content(), 'utf8');
  return { png, html };
}

export async function saveText(slug, filename, text) {
  const dir = await ensureSlugDir(slug);
  const p = join(dir, filename);
  await writeFile(p, text, 'utf8');
  return p;
}

export function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function logStep(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}
