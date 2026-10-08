#!/usr/bin/env node
/**
 * Regenerate raster favicons from the live vector mark.
 *
 * The SVG favicon (`src/pages/favicon.svg.ts`) is the single source of truth
 * and always tracks `logo` in `src/config/course.ts`. iOS home-screen icons
 * and legacy PNG fallbacks cannot use SVG, so this script rasterizes the
 * built `dist/favicon.svg` into:
 *   - public/favicon-48.png      (browser PNG fallback, Google's 48px multiple)
 *   - public/apple-touch-icon.png (180x180, iOS home screen)
 *
 * Run after changing the course logo (requires a build first so the SVG is
 * current, then rebuild once more so the PNGs ship):
 *   npm run build && node scripts/make-favicons.mjs && npm run build
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(repoRoot, 'dist/favicon.svg');
const targets = [
  { out: 'public/favicon-48.png', size: 48 },
  { out: 'public/apple-touch-icon.png', size: 180 },
];

let svg;
try {
  svg = readFileSync(svgPath);
} catch {
  console.error(`missing ${svgPath} — run "npm run build" first.`);
  process.exit(1);
}

for (const { out, size } of targets) {
  const png = await sharp(svg, { density: 300 }).resize(size, size).png().toBuffer();
  writeFileSync(path.join(repoRoot, out), png);
  console.log(`wrote ${out} (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}
