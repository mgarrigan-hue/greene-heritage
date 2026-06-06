#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const START_PORT = 18_080;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function htmlFiles() {
  return (await readdir(ROOT))
    .filter(file => file.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b));
}

function findPort(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(findPort(port + 1)));
    server.once('listening', () => server.close(() => resolve(port)));
    server.listen(port, '127.0.0.1');
  });
}

function startServer(port) {
  const command = `npx --yes http-server -p ${port} -c-1 -s`;
  const child = process.platform === 'win32'
    ? spawn(command, { cwd: ROOT, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn('npx', ['--yes', 'http-server', '-p', String(port), '-c-1', '-s'], {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe']
      });

  let output = '';
  child.stdout.on('data', chunk => { output += chunk.toString(); });
  child.stderr.on('data', chunk => { output += chunk.toString(); });
  return { child, getOutput: () => output.trim() };
}

async function waitForServer(port, serverInfo) {
  const url = `http://127.0.0.1:${port}/index.html`;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (serverInfo.child.exitCode !== null) {
      throw new Error(`http-server exited early. ${serverInfo.getOutput()}`);
    }
    try {
      const response = await fetch(url, { cache: 'no-store' });
      await response.body?.cancel();
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for http-server on port ${port}. ${serverInfo.getOutput()}`);
}

function statusWithCurl(url) {
  const curl = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const result = spawnSync(curl, ['-L', '--silent', '--show-error', '--output', nullDevice, '--write-out', '%{http_code}', url], {
    encoding: 'utf8'
  });
  const status = Number(result.stdout?.trim());
  return result.status === 0 && Number.isInteger(status) ? status : null;
}

async function statusWithFetch(url) {
  const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
  await response.body?.cancel();
  return response.status;
}

async function getStatus(url) {
  return statusWithCurl(url) ?? await statusWithFetch(url);
}

async function collectConsoleErrors(pages, port) {
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const errorsByPage = new Map();

    for (const pageName of pages) {
      const page = await browser.newPage();
      const errors = [];
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.goto(`http://127.0.0.1:${port}/${pageName}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15_000
        });
        await page.waitForTimeout(300);
      } catch (error) {
        errors.push(`navigation: ${error.message}`);
      } finally {
        await page.close();
      }
      errorsByPage.set(pageName, errors);
    }

    await browser.close();
    return { available: true, errorsByPage };
  } catch (error) {
    return { available: false, reason: error.message, errorsByPage: new Map() };
  }
}

const pages = await htmlFiles();
if (!pages.length) {
  console.error('❌ No top-level HTML pages found.');
  process.exit(1);
}

const port = await findPort(START_PORT);
const serverInfo = startServer(port);

const shutdown = () => {
  if (serverInfo.child.exitCode === null) serverInfo.child.kill();
};
process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(130); });
process.on('SIGTERM', () => { shutdown(); process.exit(143); });

try {
  await waitForServer(port, serverInfo);

  const statusRows = [];
  for (const page of pages) {
    statusRows.push({ page, status: await getStatus(`http://127.0.0.1:${port}/${page}`) });
  }

  const consoleCheck = await collectConsoleErrors(pages, port);
  if (!consoleCheck.available) {
    console.warn(`⚠️ Playwright unavailable; status-code coverage only. ${consoleCheck.reason}`);
  }

  const rows = statusRows.map(row => {
    const errors = consoleCheck.errorsByPage.get(row.page) ?? [];
    return {
      page: row.page,
      status: row.status,
      consoleErrors: errors.length ? errors.join(' | ').slice(0, 220) : '—'
    };
  });

  console.table(rows);

  const failures = rows.filter(row => row.status !== 200);
  if (failures.length) {
    console.error(`❌ ${failures.length} page(s) returned non-200 status codes.`);
    shutdown();
    process.exit(1);
  }

  const consoleErrorCount = rows.filter(row => row.consoleErrors !== '—').length;
  if (consoleErrorCount) {
    console.warn(`⚠️ ${consoleErrorCount} page(s) reported console errors; status-code coverage passed.`);
  }

  console.log(`✅ ${rows.length} top-level HTML page(s) returned 200${consoleCheck.available ? '' : ' (console check skipped)'}.`);
  shutdown();
  process.exit(0);
} catch (error) {
  console.error(`❌ ${error.message}`);
  shutdown();
  process.exit(1);
}
