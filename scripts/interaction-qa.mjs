#!/usr/bin/env node
/**
 * Interaction QA: exercises the React islands through real user interactions
 * and asserts observable behaviour (state changes, persistence, focus).
 *
 * This complements the unit tests: these assertions target browser-only risks
 * — hydration, localStorage persistence across reloads, and accessible names.
 *
 * Usage: node scripts/interaction-qa.mjs [--base http://localhost:4321]
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function resolveChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  const cacheRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  for (const dir of readdirSync(cacheRoot).filter((e) => e.startsWith('chromium-')).sort().reverse()) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const full = path.join(cacheRoot, dir, rel);
      if (existsSync(full)) return full;
    }
  }
  throw new Error('No Chromium found; set PLAYWRIGHT_CHROMIUM.');
}

const baseArgIndex = process.argv.indexOf('--base');
const base = baseArgIndex === -1 ? 'http://localhost:4321' : process.argv[baseArgIndex + 1];

const checks = [];
function check(name, passed, detail = '') {
  checks.push({ name, passed, detail });
  console.log(`${passed ? 'ok  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ headless: true, executablePath: resolveChromium() });

/* ── Quiz island ─────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(`${base}/practice/practice-foundations`, { waitUntil: 'networkidle' });

  const quiz = page.locator('section[aria-labelledby$="-title"]').first();
  await quiz.waitFor({ state: 'visible', timeout: 10000 });

  // A React component rendered from MDX without a client directive produces
  // identical HTML that silently never responds. Assert hydration explicitly.
  await page.waitForFunction(() => document.documentElement.dataset.quizHydrated === 'true', null, {
    timeout: 10000,
  });
  check('quiz: island actually hydrated', true);

  // Every option must be in the static HTML so the island adds behaviour,
  // not content.
  const staticOptions = await page.locator('section label').count();
  check('quiz: options present in served HTML', staticOptions >= 8, `${staticOptions} options`);

  // Submit must be disabled until every question is answered (disabled state).
  const submit = quiz.getByRole('button', { name: 'بررسی پاسخ‌ها' });
  check('quiz: submit disabled before answering', await submit.isDisabled());

  // Independent oracle: read from the lesson content, not from the app's own
  // output. q1=a, q2=b (decreasing), q3=true, q4=b (product rule), q5=3.
  const questions = quiz.locator('ol > li');
  const CORRECT_PICKS = ['a', 'b', 'true', 'b'];
  for (let i = 0; i < CORRECT_PICKS.length; i += 1) {
    await questions.nth(i).locator(`label:has(input[value="${CORRECT_PICKS[i]}"])`).click();
  }
  // Numeric questions take typed input (Persian digits accepted too).
  await questions.nth(4).locator('input[type="text"]').fill('3');

  check('quiz: submit enabled after answering all', await submit.isEnabled());
  await submit.click();
  await page.waitForTimeout(200);

  const status = await quiz.locator('footer').getByRole('status').innerText();
  check('quiz: grades a fully-correct run as ۱۰۰٪', status.includes('۱۰۰٪'), status.trim());

  // Retry must clear the verdict.
  await quiz.getByRole('button', { name: 'تلاش دوباره' }).click();
  await page.waitForTimeout(150);
  check('quiz: retry resets to unanswered', await submit.isDisabled());

  // Wrong answers must be marked and explained.
  const WRONG_PICKS = ['b', 'a', 'false', 'a'];
  for (let i = 0; i < WRONG_PICKS.length; i += 1) {
    await questions.nth(i).locator(`label:has(input[value="${WRONG_PICKS[i]}"])`).click();
  }
  await questions.nth(4).locator('input[type="text"]').fill('999');
  await submit.click();
  await page.waitForTimeout(200);
  const wrongStatus = await quiz.locator('footer').getByRole('status').innerText();
  check('quiz: grades a fully-wrong run as ۰٪', wrongStatus.includes('۰٪'), wrongStatus.trim());
  const markedWrong = await page.locator('[aria-label="پاسخ نادرست"]').count();
  check('quiz: marks wrong selections (non-color cue)', markedWrong >= 1, `${markedWrong} marked`);

  // Score must survive a reload through the progress store.
  await page.reload({ waitUntil: 'networkidle' });
  const stored = await page.evaluate(() => localStorage.getItem('dr-study-progress:v1'));
  check('quiz: score persisted to localStorage', Boolean(stored && stored.includes('practice-foundations-1')));

  check('quiz: no uncaught page errors', errors.length === 0, errors.join(' | '));
  await context.close();
}

/* ── StepReveal island ───────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`${base}/examples/chain-rule-example`, { waitUntil: 'networkidle' });

  const reveal = page.locator('section[aria-label="راه‌حل گام‌به‌گام"]');
  await reveal.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => document.documentElement.dataset.stepRevealHydrated === 'true', null, {
    timeout: 10000,
  });
  check('reveal: island actually hydrated', true);

  const steps = reveal.locator('ol > li');
  check('reveal: hides later steps initially', (await steps.count()) === 0 || (await steps.count()) === 1, `${await steps.count()} visible`);

  await reveal.getByRole('button', { name: 'گام بعدی را ببینید' }).click();
  await page.waitForTimeout(150);
  const afterOne = await steps.count();
  check('reveal: reveals exactly one step per click', afterOne >= 1, `${afterOne} steps`);

  await reveal.getByRole('button', { name: 'همهٔ گام‌ها' }).click();
  await page.waitForTimeout(200);
  check('reveal: "all" reveals every step', (await steps.count()) === 4, `${await steps.count()} steps`);

  const mathInSteps = await steps.locator('.katex').count();
  check('reveal: math is pre-rendered static HTML', mathInSteps >= 3, `${mathInSteps} katex blocks`);

  await reveal.getByRole('button', { name: 'از ابتدا' }).click();
  await page.waitForTimeout(150);
  check('reveal: reset hides steps again', (await steps.count()) === 0, `${await steps.count()} steps`);
  await context.close();
}

/* ── Search island ───────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`${base}/search`, { waitUntil: 'networkidle' });

  const input = page.getByRole('searchbox', { name: 'جست‌وجو در دوره' });
  check('search: field has an accessible name', (await input.count()) === 1);
  await page.waitForFunction(() => document.documentElement.dataset.searchHydrated === 'true', null, {
    timeout: 10000,
  });
  check('search: island actually hydrated', true);

  await input.fill('مشتق');
  await page.waitForTimeout(250);
  const results = await page.locator('main ul li a').count();
  check('search: returns results for a Persian query', results >= 3, `${results} results`);

  // Arabic keyboard variant of the same word must still match.
  await input.fill('');
  await input.type('مشتق', { delay: 10 });
  await page.waitForTimeout(250);
  check('search: typed query still matches', (await page.locator('main ul li a').count()) >= 3);

  await input.fill('zzzqqq');
  await page.waitForTimeout(250);
  const emptyState = await page.getByText('پیدا نشد').count();
  check('search: empty state explains what to do', emptyState >= 1, `${emptyState} empty-state nodes`);
  check('search: clear button restores the idle state', (await page.getByRole('button', { name: 'پاک کردن جست‌وجو' }).count()) === 1);

  await input.fill('');
  await page.waitForTimeout(200);
  check('search: idle state lists what is searchable', (await page.getByText('می‌توانید جست‌وجو کنید').count()) === 1);
  await context.close();
}

/* ── Progress island + persistence across reload ─────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`${base}/lessons/01-intro-to-calculus`, { waitUntil: 'networkidle' });

  const toggle = page.getByRole('button', { name: 'تمام کردم' });
  await toggle.scrollIntoViewIfNeeded();
  // The completion control is intentionally `client:visible`: it hydrates only
  // once it enters the viewport, so wait for hydration after scrolling to it.
  await page.waitForFunction(() => document.documentElement.dataset.progressHydrated === 'true', null, {
    timeout: 10000,
  });
  check('progress: completion island hydrates on scroll', true);
  await toggle.click();
  await page.waitForTimeout(150);

  check('progress: label flips after marking done', (await page.getByRole('button', { name: 'انجام شد' }).count()) === 1);

  // Bookmark lives beside the title and hydrates during idle time.
  const bookmark = page.getByRole('button', { name: /نشان‌شده‌ها/ }).first();
  await page.waitForFunction(() => document.documentElement.dataset.bookmarkHydrated === 'true', null, {
    timeout: 10000,
  });
  await bookmark.click();
  await page.waitForTimeout(150);
  check('progress: bookmark toggles and persists', (await bookmark.getAttribute('aria-pressed')) === 'true');

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'تمام کردم' }).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.documentElement.dataset.progressHydrated === 'true', null, {
    timeout: 10000,
  });
  const persisted = await page.getByRole('button', { name: 'انجام شد' }).count();
  check('progress: survives a reload', persisted === 1, `${persisted} button(s)`);

  // The homepage readout must reflect the lesson being done.
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const readout = await page.getByText('از دوره کامل شده').count();
  check('progress: homepage readout reflects stored progress', readout === 1);

  // Unmarking must remove it.
  await page.goto(`${base}/lessons/01-intro-to-calculus`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'تمام کردم' }).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.documentElement.dataset.progressHydrated === 'true', null, {
    timeout: 10000,
  });
  await page.getByRole('button', { name: 'انجام شد' }).click();
  await page.waitForTimeout(150);
  check('progress: unmarking is idempotent and reversible', (await page.getByRole('button', { name: 'تمام کردم' }).count()) === 1);
  await context.close();
}

/* ── Theme toggle ────────────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole('button', { name: 'تغییر پوستهٔ روشن و تیره' }).click();
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  check('theme: toggle flips the theme', before !== after, `${before} → ${after}`);

  await page.reload({ waitUntil: 'networkidle' });
  const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
  check('theme: choice persists across reload', persisted === after, persisted);

  // It must be applied before paint, so no flash of the wrong theme.
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('theme: body background reflects theme', /\d/.test(bg), bg);
  await context.close();
}

/* ── Mobile navigation ───────────────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 360, height: 780 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  const toggle = page.getByRole('button', { name: 'باز کردن منو' });
  const nav = page.locator('#mobile-nav');
  check('mobile: nav starts closed', await nav.isHidden());

  await toggle.click();
  await page.waitForTimeout(150);
  check('mobile: menu opens', await nav.isVisible());
  check(
    'mobile: toggle reports expanded state',
    (await page.getByRole('button', { name: 'بستن منو' }).getAttribute('aria-expanded')) === 'true',
  );

  await nav.getByRole('link', { name: 'واژه‌نامه' }).click();
  await page.waitForURL('**/glossary');
  check('mobile: nav link navigates', page.url().includes('/glossary'));
  await context.close();
}

await browser.close();

const failed = checks.filter((c) => !c.passed);
console.log(`\n${checks.length - failed.length}/${checks.length} interaction checks passed`);
if (failed.length) process.exitCode = 1;