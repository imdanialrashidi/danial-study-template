#!/usr/bin/env node
/**
 * Focused capture: viewport-sized frames and element crops, sized so detail is
 * actually readable on inspection instead of being shrunk into a long strip.
 *
 * Usage:
 *   node scripts/capture.mjs --url http://localhost:4321/lessons/01-intro --w 360 --h 800 --name mobile-lesson
 *   node scripts/capture.mjs --url ... --w 360 --h 800 --selector ".formula-plate" --name formula-crop
 *   node scripts/capture.mjs --url ... --w 360 --h 800 --scroll 1200 --name mobile-mid
 */
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const cacheRoot = path.join(os.homedir(), '.cache', 'ms-playwright');
  const dir = readdirSync(cacheRoot)
    .filter((e) => e.startsWith('chromium-'))
    .sort()
    .reverse()[0];
  return path.join(cacheRoot, dir, 'chrome-linux64', 'chrome');
}

const args = {};
for (let i = 0; i < process.argv.length; i += 1) {
  const t = process.argv[i];
  if (t.startsWith('--')) args[t.slice(2)] = process.argv[i + 1];
}

const url = args.url ?? 'http://localhost:4321/';
const width = Number(args.w ?? 390);
const height = Number(args.h ?? 844);
const name = args.name ?? 'capture';
const outDir = args.out ?? '.artifacts/visual';
const scroll = Number(args.scroll ?? 0);
const theme = args.theme ?? 'light';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: resolveChromium() });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
  locale: 'fa-IR',
  reducedMotion: 'reduce',
  colorScheme: theme === 'dark' ? 'dark' : 'light',
});
await context.addInitScript((t) => {
  // Best effort: the theme simply falls back to the OS preference if storage
  // is unavailable, which is the same behaviour as the site itself.
  try {
    localStorage.setItem('dr-theme', t);
  } catch {
    /* storage unavailable */
  }
}, theme);

const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
if (scroll) {
  await page.evaluate((y) => window.scrollTo(0, y), scroll);
  await page.waitForTimeout(200);
}

const suffix = theme === 'dark' ? '-dark' : '';
const file = path.join(outDir, `${name}${suffix}.png`);

if (args.selector) {
  const el = page.locator(args.selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await el.screenshot({ path: file });
} else {
  await page.screenshot({ path: file });
}

console.log(file);
await browser.close();