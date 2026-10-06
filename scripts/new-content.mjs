#!/usr/bin/env node
/**
 * Scaffold starter content that follows the repository's content contract.
 *
 * Usage:
 *   npm run new:lesson -- <slug> [--title "…"] [--section foundations]
 *   npm run new:concept -- <slug> [--title "…"] [--section foundations]
 *   npm run new:formula -- <slug> [--title "…"] [--section foundations]
 *   npm run new:question -- <slug> [--title "…"] [--section practice]
 *   npm run new:example -- <slug> [--title "…"] [--section foundations]
 *   npm run new:glossary -- <slug> [--title "…"]
 *
 * Before writing course content — by hand or with an AI agent — read
 * `docs/AI-CONTENT-PROMPT.md` first. It is the canonical content contract;
 * this generator only produces the file skeleton, not the pedagogy.
 *
 * Exit code is non-zero on invalid input or when the target file exists, so a
 * typo never silently overwrites a real lesson.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const KIND = process.argv[2];
const SLUG = process.argv[3];

const KINDS = {
  lesson: { dir: 'lessons', label: 'درس' },
  concept: { dir: 'concepts', label: 'مفهوم' },
  formula: { dir: 'formulas', label: 'فرمول' },
  example: { dir: 'examples', label: 'مثال حل‌شده' },
  question: { dir: 'questions', label: 'تمرین' },
  glossary: { dir: 'glossary', label: 'واژه' },
};

function fail(message) {
  console.error(`new:content — ${message}`);
  process.exit(1);
}

function flag(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

if (!KIND || !KINDS[KIND]) {
  fail(`unknown kind "${KIND ?? ''}". Use: ${Object.keys(KINDS).join(', ')}.`);
}
if (!SLUG || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(SLUG)) {
  fail(`slug must be lowercase kebab-case (a-z, 0-9, hyphens). Got: "${SLUG ?? ''}".`);
}

const title = flag('--title') ?? 'عنوان تازه';
const section = flag('--section') ?? 'foundations';

if (title.length < 2) fail('title must be at least 2 characters.');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section)) fail(`section must be kebab-case. Got: "${section}".`);

// The section must exist in the course config, or the build will reject it.
const courseSource = await readFile(path.join(repoRoot, 'src/config/course.ts'), 'utf8');
if (KIND !== 'glossary' && !courseSource.includes(`id: '${section}'`)) {
  fail(`section "${section}" is not declared in src/config/course.ts. Add it there first.`);
}

const target = path.join(repoRoot, 'src/content', KINDS[KIND].dir, `${SLUG}.mdx`);
if (existsSync(target)) fail(`${target} already exists — refusing to overwrite.`);

/* ── Frontmatter per collection (mirrors src/content.config.ts) ─────────── */

const shared = `type: ${KIND}
title: "${title}"
description: "یک جملهٔ یک‌خطی دربارهٔ این ${KINDS[KIND].label}: چه چیزی یاد می‌گیرید و چرا مهم است."
section: ${section}
difficulty: beginner
order: 1
estimatedMinutes: 10`;

const frontmatter = {
  lesson: `${shared}
objective: بتوانید ایدهٔ اصلی این درس را با یک مثال توضیح دهید.`,
  concept: `${shared}
short: تعریف یک‌خطی این مفهوم در حد یک جمله.`,
  // YAML keeps single backslashes literally — MDX bodies need doubled ones.
  formula: `${shared}
name: "${title}"
latex: "f(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h) - f(x)}{h}"
units: بدون واحد
conditions:
  - تابع باید در نقطهٔ موردنظر پیوسته باشد.`,
  example: `${shared}
problem: صورت کامل مسئله را اینجا بنویسید؛ راه‌حل قدم‌به‌قدم در بدنه می‌آید.`,
  question: `${shared}
points: 1
instructions: به هر پرسش پاسخ دهید، بعد «بررسی پاسخ‌ها» را بزنید.`,
  glossary: `type: glossary
term: "${title}"
short: تعریف یک‌جمله‌ای این واژه برای فهرست واژه‌نامه.`,
}[KIND];

/* ── Starter bodies: valid MDX, correct LaTeX escaping, real components ─── */

const body = {
  lesson: `
این درس با یک پرسش شروع می‌شود: **«ایدهٔ اصلی چیست و کجا به کار می‌آید؟»**

<Callout type="info" title="نکتهٔ کلیدی">
  اول شهود را بگویید، بعد تعریف رسمی را بیاورید. جمله‌های کوتاه بنویسید.
</Callout>

## تعریف

<Definition term="${title}" id="${SLUG}-def">
  تعریف دقیق و کوتاه این مفهوم در یک جمله.
</Definition>

<Formula
  id="${SLUG}-main"
  latex={"f(x) = \\\\frac{a}{b}"}
  caption="فرمول اصلی این درس"
  usage="هر جا که بخواهید رابطهٔ a و b را خلاصه کنید."
/>

<Confused prerequisites={[]} retry="از تعریف بالا دوباره شروع کنید">
  اگر نمادها اذیت‌تان می‌کند، هر نماد را با یک عدد ساده جایگزین کنید و دوباره بخوانید.
</Confused>

## خودتان را بسنجید

<Quiz
  id="quiz-${SLUG}-1"
  title="سنجش فهم"
  questions={[
    {
      id: 'q1',
      type: 'multiple-choice',
      text: 'کدام گزینه ایدهٔ اصلی این درس را بهتر توصیف می‌کند؟',
      options: [
        { id: 'a', text: 'گزینهٔ درست' },
        { id: 'b', text: 'گزینهٔ نادرست' },
      ],
      correctAnswer: 'a',
      explanation: 'توضیح کوتاه: چرا گزینهٔ الف درست است.',
    },
  ]}
/>
`,
  concept: `
<Definition term="${title}" id="${SLUG}-def">
  تعریف دقیق و کوتاه این مفهوم در یک جمله.
</Definition>

این مفهوم را با یک مثال ملموس توضیح دهید. بعد از تعریف، یک فرمول یا یک مثال
حل‌شده بیاورید تا انتزاعی نماند.

<Formula
  id="${SLUG}-main"
  inline
  latex={"f(x)"}
/>

<Confused retry="تعریف بالا را با صدای بلند برای خودتان تکرار کنید">
  اگر تعریف گنگ است، یک مثال عددی ساده بزنید و ببینید تعریف روی آن چه می‌گوید.
</Confused>
`,
  formula: `
این فرمول چه چیزی را خلاصه می‌کند؟ اول شهود، بعد شرایط اعتبار.

<Formula
  id="${SLUG}-main"
  latex={"f(x) = \\\\frac{a}{b}"}
  caption="${title}"
  usage="هر جا که بخواهید رابطهٔ a و b را خلاصه کنید."
  showSource
/>

<FormulaBreakdown
  terms={[
    { term: 'f(x)', label: 'خروجی', detail: 'مقداری که از فرمول به دست می‌آید.' },
    { term: 'a', label: 'صورت', detail: 'کمیت اصلی مسئله.' },
  ]}
/>
`,
  example: `
<WorkedExample
  title="${title}"
  problem="صورت کامل مسئله را اینجا بنویسید."
  difficulty="beginner"
  steps={[
    { title: 'گام ۱', content: 'مسئله را لایه‌لایه باز کنید: داده‌ها چیست؟' },
    { title: 'گام ۲', content: 'فرمول مناسب را انتخاب کنید.', latex: "f(x) = \\\\frac{a}{b}" },
    { title: 'گام ۳', content: 'عددگذاری کنید و پاسخ را بررسی کنید.' },
  ]}
/>
`,
  question: `
به هر پرسش پاسخ دهید. توضیح هر پاسخ نادرست، خودش یک درس کوتاه است.

<Quiz
  id="quiz-${SLUG}-1"
  title="${title}"
  questions={[
    {
      id: 'q1',
      type: 'multiple-choice',
      text: 'متن پرسش اول؟',
      options: [
        { id: 'a', text: 'پاسخ درست' },
        { id: 'b', text: 'پاسخ نادرست' },
      ],
      correctAnswer: 'a',
      explanation: 'چرا این گزینه درست است؟',
    },
    {
      id: 'q2',
      type: 'numeric',
      text: 'حاصل ۶ × ۷ چقدر است؟',
      numericAnswer: 42,
      tolerance: 0,
      explanation: 'ضرب سادهٔ دو عدد یک‌رقمی.',
    },
    {
      id: 'q3',
      type: 'true-false',
      text: 'مشتق تابع ثابت صفر است.',
      options: [
        { id: 'true', text: 'درست' },
        { id: 'false', text: 'نادرست' },
      ],
      correctAnswer: 'true',
      explanation: 'تابع ثابت تغییری ندارد، پس نرخ تغییرش صفر است.',
    },
  ]}
/>
`,
  glossary: `
این واژه در کدام درس‌ها به کار رفته؟ یک جملهٔ زمینه به تعریف بالا اضافه کنید
و در صورت نیاز به همان درس پیوند دهید.
`,
}[KIND];

await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, `---\n${frontmatter}\n---\n${body}`, 'utf8');

console.log(`created ${path.relative(repoRoot, target)}`);
console.log('next: npm run validate && npm run test');
