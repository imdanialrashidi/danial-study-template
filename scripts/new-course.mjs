#!/usr/bin/env node
/**
 * Scaffold a new course site from this template.
 *
 * A course in this repository is configuration + content: this command writes
 * `src/config/course.ts` (identity, sections, theme preset, feature flags)
 * and one starter lesson, so a new subject feels like a finished product
 * immediately after adding content.
 *
 * Usage:
 *   npm run new:course -- --title "فیزیک مکانیک" --preset physics --sections foundations,mechanics [--force]
 *
 *   --title     Course title (required, ≥ 2 chars)
 *   --preset    Theme preset: default | physics | calculus | programming | statistics (default: default)
 *   --sections  Comma-separated kebab-case section ids (required, ≥ 1)
 *   --force     Overwrite src/config/course.ts if it was already customised
 *
 * Before writing course content — by hand or with an AI agent — read
 * `docs/AI-CONTENT-PROMPT.md` first. It is the canonical content contract.
 *
 * The command never touches layouts, components, or styles: if a new course
 * seems to need that, something is misconfigured instead.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`new:course — ${message}`);
  process.exit(1);
}

function flag(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const title = flag('--title');
const preset = flag('--preset') ?? 'default';
const sectionsRaw = flag('--sections');
const force = process.argv.includes('--force');

if (!title || title.length < 2) fail('pass --title "نام دوره" (at least 2 characters).');
if (!['default', 'physics', 'calculus', 'programming', 'statistics'].includes(preset)) {
  fail(`unknown preset "${preset}". Use: default, physics, calculus, programming, statistics.`);
}
if (!sectionsRaw) fail('pass --sections with comma-separated ids, e.g. --sections foundations,mechanics.');

const sectionIds = sectionsRaw.split(',').map((s) => s.trim()).filter(Boolean);
if (sectionIds.length === 0) fail('at least one section id is required.');
for (const id of sectionIds) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`section id must be kebab-case. Got: "${id}".`);
}
if (new Set(sectionIds).size !== sectionIds.length) fail('section ids must be unique.');

const coursePath = path.join(repoRoot, 'src/config/course.ts');
if (existsSync(coursePath) && !force) {
  const current = await readFile(coursePath, 'utf8');
  if (!current.includes('حساب دیفرانسیل، قدم‌به‌قدم')) {
    fail('src/config/course.ts looks customised already. Re-run with --force to overwrite.');
  }
}

const sections = sectionIds
  .map((id, i) => `    {\n      id: '${id}',\n      title: 'بخش ${id}',\n      description: 'توضیح کوتاه این بخش را اینجا بنویسید.',\n      order: ${i + 1},\n    },`)
  .join('\n');

const courseTs = `/**
 * Course configuration for the template.
 *
 * When a new course is created from this template, the course author edits this
 * single file to configure title, description, sections, difficulty, tags, and
 * theming. All UI, layout, and interactive components read from this config.
 *
 * DO NOT add university-specific, professor-specific, or institutional branding.
 * The only permanent identity is Danial Rashidi.
 *
 * Content contract for authors and AI agents: read docs/AI-CONTENT-PROMPT.md
 * FIRST before creating or editing any file under src/content/.
 */

import type { CourseConfig } from '../lib/types';

export const courseConfig: CourseConfig = {
  // --- Identity (course-specific) ---
  title: '${title.replace(/'/g, '’')}',
  tagline: 'یک‌خطی بنویسید: این دوره چه چیزی می‌دهد و به چه کسی؟',
  description:
    'دو تا سه جمله دربارهٔ این دوره: برای چه کسی است، چه چیزی یاد می‌دهد و قدم بعدی learner چیست.',
  shortDescription: '${title.replace(/'/g, '’')}',
  locale: 'fa',
  direction: 'rtl',

  // --- Course metadata ---
  difficulty: 'beginner',
  estimatedDuration: 'خودآموز',
  difficultyLevel: 3, // 1–5 scale
  tags: ['موضوع ۱', 'موضوع ۲'],
  category: 'آموزشی',

  // --- Sections (navigation groups) ---
  sections: [
${sections}
  ],

  // --- Course-specific theming ---
  // Presets live in src/lib/themes.ts. 'custom' keeps the inline colors below.
  themePreset: '${preset}',
  theme: {
    name: '${preset}',
    colors: {},
    typography: 'traditional',
    motif: 'geometric',
  },

  // --- Feature flags ---
  // Every capability defaults to enabled when omitted. Turn a flag off to
  // hide its UI without editing components.
  features: {
    search: true,
    commandPalette: true,
    formulas: true,
    glossary: true,
    practice: true,
    progress: true,
    simulations: true,
    toc: true,
    related: true,
    courseMap: true,
  },
};
`;

await writeFile(coursePath, courseTs, 'utf8');

// One starter lesson in the first section, so the homepage index, roadmap,
// course map, and search all have something real to render immediately.
const firstSection = sectionIds[0];
const lessonPath = path.join(repoRoot, 'src/content/lessons/01-start-here.mdx');
if (!existsSync(lessonPath)) {
  const lesson = `---
type: lesson
title: "از کجا شروع کنیم؟"
description: "نقشهٔ راه این دوره: چه چیزی یاد می‌گیرید و قدم‌به‌قدم چطور پیش می‌روید."
section: ${firstSection}
difficulty: beginner
order: 1
estimatedMinutes: 5
objective: بتوانید توضیح دهید این دوره چه می‌دهد و قدم اول شما چیست.
tags: [شروع]
---

این دوره قدم‌به‌قدم پیش می‌رود. هر درس یک ایدهٔ اصلی دارد، هر ایده با یک مثال
همراه است و پایان هر بخش تمرین دارد.

<Callout type="info" title="چطور از این دوره استفاده کنید">
  به‌ترتیب بخش‌ها پیش بروید، مثال‌ها را خودتان حل کنید و هر مطلبی را که
  خواندید علامت بزنید تا پیشرفت‌تان ذخیره شود.
</Callout>

## قدم بعدی

وارد [نقشهٔ دوره](/map) شوید و اولین مطلب بخش اول را باز کنید. عنوان و توضیح
این فایل نمونه را با محتوای واقعی جایگزین کنید — قرارداد کامل در
\`docs/AI-CONTENT-PROMPT.md\` آمده است.
`;
  await mkdir(path.dirname(lessonPath), { recursive: true });
  await writeFile(lessonPath, lesson, 'utf8');
  console.log(`created ${path.relative(repoRoot, lessonPath)}`);
}

console.log(`configured course "${title}" (preset: ${preset}, sections: ${sectionIds.join(', ')})`);
console.log('next: npm run validate && npm run test');
