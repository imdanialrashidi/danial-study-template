#!/usr/bin/env node
/**
 * Visual QA harness.
 *
 * Drives the real built site with the Playwright-bundled Chromium, captures
 * screenshots at the viewports the product brief requires, and reports
 * deterministic measurements (console errors, failed requests, horizontal
 * overflow, contrast-independent geometry) alongside the images.
 *
 * Usage:
 *   node scripts/visual-qa.mjs                      # all routes, all viewports
 *   node scripts/visual-qa.mjs --route /lessons     # one route
 *   node scripts/visual-qa.mjs --viewport 360x800   # one viewport
 *   node scripts/visual-qa.mjs --base http://localhost:4321
 */

import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Resolve a usable Chromium binary.
 *
 * Priority: PLAYWRIGHT_CHROMIUM env override → the newest Playwright-managed
 * browser in the local cache → a system Chromium. This keeps the script
 * runnable on machines that have a browser installed but not the exact
 * revision playwright-core expects.
 */
function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM && existsSync(process.env.PLAYWRIGHT_CHROMIUM)) {
    return process.env.PLAYWRIGHT_CHROMIUM;
  }

  const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  if (existsSync(cacheRoot)) {
    const candidates = readdirSync(cacheRoot)
      .filter((entry) => entry.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const dir of candidates) {
      for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome', 'chrome-linux/headless_shell']) {
        const full = path.join(cacheRoot, dir, rel);
        if (existsSync(full)) return full;
      }
    }
  }

  for (const system of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (existsSync(system)) return system;
  }

  throw new Error(
    'No Chromium binary found. Set PLAYWRIGHT_CHROMIUM=/path/to/chrome or run `npx playwright install chromium`.',
  );
}

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 900 },
  { name: '1360', width: 1360, height: 900 },
];

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'lessons', path: '/lessons' },
  { name: 'lesson', path: '/lessons/01-intro-to-calculus' },
  { name: 'concepts', path: '/concepts' },
  { name: 'concept', path: '/concepts/derivative' },
  { name: 'formulas', path: '/formulas' },
  { name: 'formula', path: '/formulas/chain-rule' },
  { name: 'example', path: '/examples/chain-rule-example' },
  { name: 'practice', path: '/practice/practice-foundations' },
  { name: 'glossary', path: '/glossary' },
  { name: 'search', path: '/search' },
  { name: 'map', path: '/map' },
  { name: '404', path: '/404' },
];

/**
 * A TeX command appearing as literal page text means an escaping step ate its
 * backslash. Scoped to rendered text; KaTeX's accessibility <annotation> is
 * removed before this runs.
 */
const STRIPPED_TEX_RE = /(^|[^\\a-zA-Z])(frac|sqrt|cdot|neq|infty|partial)(?![a-zA-Z])/;

function parseArgs(argv) {
  const options = { base: 'http://localhost:4321', route: null, viewport: null, outDir: '.artifacts/visual', theme: 'light' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base') options.base = argv[++i];
    else if (token === '--route') options.route = argv[++i];
    else if (token === '--viewport') {
      const [w, h] = argv[++i].split('x').map(Number);
      options.viewport = { name: `${w}`, width: w, height: h };
    } else if (token === '--out') options.outDir = argv[++i];
    else if (token === '--theme') options.theme = argv[++i];
  }
  return options;
}

/** Deterministic in-page measurements that a screenshot cannot prove. */
const PROBE = () => {
  const doc = document.documentElement;
  const overflowing = [];
  const vw = doc.clientWidth;
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right > vw + 1 || rect.left < -1) {
      const style = getComputedStyle(el);
      // Elements that scroll internally are fine; only page-level overflow is not.
      const scrolls = /auto|scroll|hidden/.test(style.overflowX);
      if (!scrolls) {
        overflowing.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className?.baseVal ?? el.className ?? '').toString().slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }
    }
  }

  // Touch targets smaller than the 44px baseline used across the design.
  const smallTargets = [];
  for (const el of Array.from(document.querySelectorAll('a[href], button, input, select'))) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (getComputedStyle(el).display === 'inline') continue;
    if (r.height < 40 || r.width < 24) {
      smallTargets.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
  }

  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    pageOverflowX: doc.scrollWidth > doc.clientWidth + 1,
    overflowing: overflowing.slice(0, 12),
    smallTargets: smallTargets.slice(0, 12),
    lang: doc.lang,
    dir: doc.dir,
    theme: doc.dataset.theme,
    title: document.title,
    h1: document.querySelectorAll('h1').length,
    katexNodes: document.querySelectorAll('.katex').length,
    // A real rendered fraction / limit, not a stripped-backslash text fallback.
    mfrac: document.querySelectorAll('.mfrac').length,
    // KaTeX embeds the original TeX in an <annotation> for screen readers, so
    // the raw-text check must run on rendered text only.
    renderedText: (() => {
      const root = (document.querySelector('.prose-lesson') ?? document.body).cloneNode(true);
      root.querySelectorAll('annotation, script, style, .katex-mathml').forEach((n) => n.remove());
      return root.textContent ?? '';
    })(),
    langLinks: Array.from(document.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && !h.startsWith('/') && !h.startsWith('#')).length,
  };
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const routes = options.route ? ROUTES.filter((r) => r.path === options.route) : ROUTES;
  const viewports = options.viewport ? [options.viewport] : VIEWPORTS;

  if (routes.length === 0) {
    throw new Error(`No route matched --route ${options.route}. Known: ${ROUTES.map((r) => r.path).join(', ')}`);
  }

  await mkdir(options.outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, executablePath: resolveChromium() });
  const report = { base: options.base, generatedAt: new Date().toISOString(), results: [] };

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
      locale: 'fa-IR',
      colorScheme: options.theme === 'dark' ? 'dark' : 'light',
      reducedMotion: 'reduce',
    });
    await context.addInitScript((theme) => {
      try {
        localStorage.setItem('dr-theme', theme);
      } catch {}
    }, options.theme);

    for (const route of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      const failedRequests = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
      });
      page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 200)}`));
      page.on('requestfailed', (req) =>
        failedRequests.push(`${req.url().slice(0, 140)} — ${req.failure()?.errorText ?? 'unknown'}`),
      );

      const url = `${options.base}${route.path}`;
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(150);

      const probe = await page.evaluate(PROBE);
      const file = path.join(options.outDir, `${route.name}-${viewport.name}${options.theme === 'dark' ? '-dark' : ''}.png`);
      await page.screenshot({ path: file, fullPage: true });

      report.results.push({
        route: route.path,
        name: route.name,
        viewport: viewport.name,
        width: viewport.width,
        status: response?.status() ?? 0,
        file,
        ...probe,
        consoleErrors,
        failedRequests,
      });

      await page.close();
    }
    await context.close();
  }

  await browser.close();

  const summaryFile = path.join(options.outDir, 'report.json');
  await writeFile(summaryFile, JSON.stringify(report, null, 2));

  // Console summary; full detail stays in report.json.
  let failures = 0;
  for (const r of report.results) {
    const problems = [];
    if (r.status !== 200 && r.status !== 404) problems.push(`status=${r.status}`);
    if (r.pageOverflowX) problems.push(`overflowX ${r.scrollWidth}>${r.clientWidth}`);
    if (r.overflowing.length) problems.push(`${r.overflowing.length} overflowing el`);
    if (r.consoleErrors.length) problems.push(`${r.consoleErrors.length} console errors`);
    if (r.failedRequests.length) problems.push(`${r.failedRequests.length} failed requests`);
    if (r.dir !== 'rtl') problems.push(`dir=${r.dir}`);
    if (r.h1 !== 1) problems.push(`h1 count=${r.h1}`);
    if (STRIPPED_TEX_RE.test(r.renderedText ?? '')) problems.push('raw TeX leaked as page text');
    if (problems.length) failures += 1;
    console.log(
      `${problems.length ? 'FAIL' : 'ok  '}  ${String(r.name).padEnd(10)} @${r.viewport.padEnd(5)} ${r.status}  ${problems.join('; ')}`,
    );
  }
  console.log(`\n${report.results.length} captures, ${failures} with findings → ${summaryFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});