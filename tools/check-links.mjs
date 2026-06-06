#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;
const USER_AGENT = 'greene-heritage-link-check/1.0';

// Domains that legitimately exist for human visitors but block automated
// HEAD/GET requests from generic user agents (anti-bot protection). A 4xx
// or TIMEOUT from these is expected — surface it as a warning but do not
// fail CI. Most aggressive in CI from US-data-center IPs.
const EXPECTED_4XX_DOMAINS = new Set([
  'catalogue.nli.ie',
  'maps.nls.uk',
  'museumandarchives.redcross.org.uk',
  'www.iwm.org.uk',
  'www.nationalarchives.gov.uk'
]);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function htmlFiles() {
  return (await readdir(ROOT))
    .filter(file => file.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b));
}

function extractExternalLinks(fileName, html) {
  const links = [];
  const hrefPattern = /\bhref\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi;
  for (const match of html.matchAll(hrefPattern)) {
    links.push({
      url: match[2].replaceAll('&amp;', '&').split('#')[0],
      file: fileName
    });
  }
  return links;
}

async function collectLinks() {
  const byUrl = new Map();
  for (const file of await htmlFiles()) {
    const html = await readFile(path.join(ROOT, file), 'utf8');
    for (const link of extractExternalLinks(file, html)) {
      if (!byUrl.has(link.url)) byUrl.set(link.url, new Set());
      byUrl.get(link.url).add(link.file);
    }
  }

  return [...byUrl.entries()]
    .map(([url, files]) => ({ url, files: [...files].sort() }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

async function request(url, method = 'HEAD') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': USER_AGENT,
        accept: '*/*'
      }
    });
    await response.body?.cancel();
    return { status: response.status, statusText: response.statusText, finalUrl: response.url };
  } catch (error) {
    const code = error.name === 'AbortError'
      ? 'TIMEOUT'
      : error.cause?.code ?? error.code ?? error.message;
    return { error: code };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkUrl(item) {
  let result = await request(item.url, 'HEAD');

  if ([403, 405, 501].includes(result.status)) {
    result = await request(item.url, 'GET');
  }

  if (result.status === 429) {
    await delay(5_000);
    result = await request(item.url, 'HEAD');
    if (result.status === 429) {
      return { ...item, status: '429', issue: 'rate limited after retry; skipped', fail: false };
    }
  }

  if (result.error) {
    const dnsFailure = ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'].includes(result.error);
    let isExpectedAntiBot = false;
    try {
      const host = new URL(item.url).hostname;
      isExpectedAntiBot = EXPECTED_4XX_DOMAINS.has(host) && result.error === 'TIMEOUT';
    } catch { /* invalid URL → still treat normally */ }
    return { ...item, status: 'ERR', issue: result.error, fail: dnsFailure && !isExpectedAntiBot };
  }

  if (result.status >= 400) {
    let isExpectedAntiBot = false;
    try {
      const host = new URL(item.url).hostname;
      isExpectedAntiBot = EXPECTED_4XX_DOMAINS.has(host) && result.status >= 400 && result.status < 500;
    } catch { /* invalid URL → still treat normally */ }

    return {
      ...item,
      status: String(result.status),
      issue: result.statusText || `HTTP ${result.status}`,
      fail: result.status >= 400 && result.status < 500 && !isExpectedAntiBot
    };
  }

  return { ...item, status: String(result.status), issue: '', fail: false };
}

async function mapLimit(items, limit, worker) {
  const results = [];
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      results.push(await worker(current));
    }
  }));
  return results;
}

const links = await collectLinks();
if (!links.length) {
  console.log('✅ No external href links found.');
  process.exit(0);
}

const results = (await mapLimit(links, CONCURRENCY, checkUrl))
  .sort((a, b) => a.url.localeCompare(b.url));
const report = results.filter(result => result.issue);

if (report.length) {
  console.table(report.map(result => ({
    status: result.status,
    issue: result.issue,
    url: result.url,
    files: result.files.join(', ')
  })));
} else {
  console.log(`✅ ${results.length} external link(s) checked; no 4xx/5xx/DNS failures reported.`);
}

if (report.some(result => result.fail)) {
  process.exit(1);
}
