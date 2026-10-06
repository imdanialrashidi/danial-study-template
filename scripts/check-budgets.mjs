#!/usr/bin/env node
/**
 * Performance budget gate.
 *
 * This template sells a static, fast reading experience, so the budgets are
 * part of the product contract rather than a nice-to-have. The check runs
 * against the real `dist/` output and fails the build when a limit is exceeded.
 *
 * Budgets (from docs/DESIGN.md):
 *   - first-party JS on a content page  ≤ 120 KB gzip
 *   - CSS                              ≤ 90 KB gzip
 *   - KaTeX JavaScript                 0 bytes (math is rendered at build time)
 *   - HTML for any single page         ≤ 200 KB
 *   - no layout-shifting fonts (FOUT): every webfont must declare font-display
 *
 * Usage: node scripts/check-budgets.mjs [--dist dist]
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = process.argv.indexOf('--dist');
const distDir = path.join(repoRoot, distIndex === -1 ? 'dist' : process.argv[distIndex + 1]);

const BUDGETS = {
  /** First-party JS loaded by a typical content page. */
  firstPartyJsGzip: 120 * 1024,
  cssGzip: 90 * 1024,
  /** One page's HTML, uncompressed. */
  htmlBytes: 200 * 1024,
};

const problems = [];
const notes = [];

async function walk(dir) {
  const out = [];
  for (const item of await readdir(dir)) {
    const full = path.join(dir, item);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const files = await walk(distDir);
const assets = files.filter((f) => f.includes(`${path.sep}_astro${path.sep}`));

// ── JavaScript ─────────────────────────────────────────────────────────────
const js = assets.filter((f) => f.endsWith('.js'));
let jsGzip = 0;
const jsFiles = [];
for (const file of js) {
  const buf = await readFile(file);
  const gz = gzipSync(buf).length;
  jsGzip += gz;
  jsFiles.push({ name: path.basename(file), gz });
}
jsFiles.sort((a, b) => b.gz - a.gz);

if (jsGzip > BUDGETS.firstPartyJsGzip) {
  problems.push(
    `first-party JS is ${(jsGzip / 1024).toFixed(1)} KB gzip, over the ${(
      BUDGETS.firstPartyJsGzip / 1024
    ).toFixed(0)} KB budget`,
  );
}

// KaTeX must not ship as runtime JavaScript: it is rendered at build time.
if (js.some((f) => /katex/i.test(path.basename(f)))) {
  problems.push('a KaTeX runtime JavaScript file was emitted; math must be pre-rendered');
}

// ── CSS ────────────────────────────────────────────────────────────────────
const css = assets.filter((f) => f.endsWith('.css'));
let cssGzip = 0;
for (const file of css) {
  cssGzip += gzipSync(await readFile(file)).length;
}
if (cssGzip > BUDGETS.cssGzip) {
  problems.push(`CSS is ${(cssGzip / 1024).toFixed(1)} KB gzip, over the ${(BUDGETS.cssGzip / 1024).toFixed(0)} KB budget`);
}

// ── HTML ───────────────────────────────────────────────────────────────────
const html = files.filter((f) => f.endsWith('.html'));
let largest = { file: '', size: 0 };
for (const file of html) {
  const buf = await readFile(file);
  if (buf.length > largest.size) largest = { file: path.relative(distDir, file), size: buf.length };
  if (buf.length > BUDGETS.htmlBytes) {
    problems.push(
      `${path.relative(distDir, file)} is ${(buf.length / 1024).toFixed(0)} KB HTML, over the ${(
        BUDGETS.htmlBytes / 1024
      ).toFixed(0)} KB budget`,
    );
  }
}

// ── Fonts ──────────────────────────────────────────────────────────────────
const fonts = assets.filter((f) => /\.(woff2?|ttf|otf)$/.test(f));
if (fonts.length > 0) {
  // Self-hosted fonts must be served from the same origin; no CDN is allowed.
  for (const file of html) {
    const content = await readFile(file, 'utf8');
    const remote = content.match(/(?:href|src)="https?:\/\/[^"]+\.(?:woff2?|ttf|otf)/i);
    if (remote) problems.push(`${path.relative(distDir, file)} loads a font from a third-party origin: ${remote[0]}`);
  }
  notes.push(`${fonts.length} self-hosted font files (no third-party origin).`);
} else {
  problems.push('no fonts were emitted; Persian text would fall back to system fonts');
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log('Performance budget report');
console.log(`  pages            ${html.length}`);
console.log(`  first-party JS   ${(jsGzip / 1024).toFixed(1)} KB gzip  (budget ${(BUDGETS.firstPartyJsGzip / 1024).toFixed(0)} KB)`);
console.log(`  CSS              ${(cssGzip / 1024).toFixed(1)} KB gzip  (budget ${(BUDGETS.cssGzip / 1024).toFixed(0)} KB)`);
console.log(`  largest HTML     ${(largest.size / 1024).toFixed(1)} KB (${largest.file})`);
console.log(`  fonts            ${fonts.length} files, self-hosted`);
console.log('');
console.log('  JS by chunk (gzip):');
for (const f of jsFiles.slice(0, 8)) console.log(`    ${f.gz.toString().padStart(7)} B  ${f.name}`);

for (const n of notes) console.log(`\n  note: ${n}`);

if (problems.length) {
  console.error('\nBudget violations:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nAll performance budgets met.');
}