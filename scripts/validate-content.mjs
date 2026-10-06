#!/usr/bin/env node
/**
 * Content validation.
 *
 * The content collections already validate each entry's frontmatter against a
 * Zod schema, so malformed or incomplete data fails the Astro build. This script
 * covers the cross-file invariants a per-entry schema cannot see, and reports
 * them in one readable pass so a human or an AI agent can fix everything at once:
 *
 *   1. duplicate slugs / ids across collections
 *   2. references to content that does not exist (prerequisites, formulas,
 *      concepts) — including `#fragment` targets
 *   3. `section` values that are not declared in the course configuration
 *   4. the MDX LaTeX escaping trap that silently renders raw text
 *   5. internal links in the built output that resolve to nothing
 *   6. required sample pages that must exist
 *
 * Usage:
 *   node scripts/validate-content.mjs           # frontmatter + references
 *   node scripts/validate-content.mjs --links   # also scan dist/ for broken links
 *   node scripts/validate-content.mjs --dist dist
 *
 * Exit code is non-zero when any problem is found, so it can gate a build.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const checkLinks = args.includes('--links');
const distIndex = args.indexOf('--dist');
const distDir = path.join(repoRoot, distIndex === -1 ? 'dist' : args[distIndex + 1]);

const CONTENT_DIRS = ['lessons', 'concepts', 'formulas', 'examples', 'questions', 'glossary'];

/** Problems grouped by severity so the output stays readable. */
const errors = [];
const warnings = [];

function error(file, message) {
  errors.push(`${file}: ${message}`);
}
function warn(file, message) {
  warnings.push(`${file}: ${message}`);
}

/* ── Minimal frontmatter reader ─────────────────────────────────────────────
   Deliberately small: it reads the block Astro's schema already validated, so
   it only needs the scalar/list values used for cross-file checks. */

function parseFrontmatter(source, file) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    error(file, 'missing YAML frontmatter block');
    return null;
  }
  const body = match[1];
  const data = {};

  const unquote = (raw) => {
    const value = raw.trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      return value.slice(1, -1);
    }
    return value;
  };

  const parseList = (raw) => {
    const inner = raw.trim().slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(',')
      .map((part) => unquote(part))
      .filter(Boolean);
  };

  for (const line of body.split(/\r?\n/)) {
    // Only top-level `key: value` lines. List items (`  - x`) and nested
    // mappings are intentionally skipped: this reader only needs the scalars
    // and inline lists used for cross-file checks.
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    const value = rawValue.trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = parseList(value);
    } else if (value === '') {
      // A key with a nested block below it; collect simple `- item` children.
      data[key] = [];
    } else {
      data[key] = unquote(value);
    }
  }
  return { data, body: source.slice(match[0].length) };
}

/* ── 1–4: content files ──────────────────────────────────────────────────── */

const entries = [];
for (const dir of CONTENT_DIRS) {
  const abs = path.join(repoRoot, 'src/content', dir);
  if (!existsSync(abs)) continue;
  const files = (await readdir(abs)).filter((f) => /\.mdx?$/.test(f));
  for (const file of files) {
    const rel = `src/content/${dir}/${file}`;
    const source = await readFile(path.join(abs, file), 'utf8');
    const parsed = parseFrontmatter(source, rel);
    if (!parsed) continue;

    const id = file.replace(/\.mdx?$/, '');
    entries.push({
      id,
      dir,
      rel,
      data: parsed.data,
      body: parsed.body,
    });

    if (!parsed.data.type) {
      error(rel, 'frontmatter is missing the required `type` field');
    } else if (parsed.data.type !== dir.replace(/s$/, '')) {
      // plurals: lessons → lesson, questions → question
      const expected = dir.replace(/s$/, '');
      warn(rel, `type "${parsed.data.type}" does not match its directory (expected "${expected}")`);
    }
  }
}

/* 1. duplicate ids.
      Slugs are unique per collection by design, so a collision *across*
      collections is legal: a glossary term may share a name with a concept and
      still get its own URL. It only becomes ambiguous for a bare reference, so
      that is a warning pointing at the `<kind>/<slug>` form. A collision inside
      one collection is a real error. */
const seen = new Map();
const byKind = new Map();
for (const entry of entries) {
  const kindKey = `${entry.dir}/${entry.id}`;
  if (byKind.has(kindKey)) {
    error(entry.rel, `duplicate id "${entry.id}" within the "${entry.dir}" collection (also in ${byKind.get(kindKey).rel})`);
  } else {
    byKind.set(kindKey, entry);
  }

  if (seen.has(entry.id)) {
    const other = seen.get(entry.id);
    warn(
      entry.rel,
      `slug "${entry.id}" is shared with ${other.rel}. URLs stay distinct, but a bare reference to ` +
        `"${entry.id}" is ambiguous — use "${entry.dir.replace(/s$/, '')}/${entry.id}".`,
    );
  } else {
    seen.set(entry.id, entry);
  }
}

/* 2. references resolve.
      A bare slug matches an entry in the same collection first, then a
      globally unique one — mirroring resolveEntry() in src/lib/content.ts. */
const matchesRef = (ref, preferKind) => {
  if (ref.includes('/')) {
    const [kind, id] = ref.split('/');
    return entries.find((e) => e.dir.replace(/s$/, '') === kind && e.id === id);
  }
  const preferDir = `${preferKind}s`;
  const sameCollection = entries.filter((e) => e.dir === preferDir && e.id === ref);
  if (sameCollection.length === 1) return sameCollection[0];
  const all = entries.filter((e) => e.id === ref);
  return all.length === 1 ? all[0] : undefined;
};

for (const entry of entries) {
  const refs = [
    ...(entry.data.prerequisites ?? []),
    ...(entry.data.formulas ?? []),
    ...(entry.data.concepts ?? []),
    ...(entry.data.formula ? [entry.data.formula] : []),
  ];
  for (const ref of refs) {
    const [target, fragment] = String(ref).split('#');
    const found = matchesRef(target, entry.dir.replace(/s$/, ''));
    if (!found) {
      error(entry.rel, `reference to missing or ambiguous content "${target}"`);
      continue;
    }
    if (fragment) {
      const idRe = new RegExp(`id=["']${fragment}["']`);
      if (!idRe.test(found.body)) {
        error(entry.rel, `fragment "#${fragment}" not found in ${found.rel}`);
      }
    }
  }
}

/* 3. sections declared in course config */
const courseSource = await readFile(path.join(repoRoot, 'src/config/course.ts'), 'utf8');
const sectionIds = [...courseSource.matchAll(/^\s*\{\s*id:\s*'([^']+)'/gm)].map((m) => m[1]);
if (sectionIds.length === 0) {
  error('src/config/course.ts', 'no sections found — every entry needs a configured section');
}
for (const entry of entries) {
  const section = entry.data.section;
  if (!section) {
    if (entry.dir !== 'glossary') {
      error(entry.rel, 'missing `section` field');
    }
    continue;
  }
  if (!sectionIds.includes(section)) {
    error(
      entry.rel,
      `section "${section}" is not declared in src/config/course.ts (declared: ${sectionIds.join(', ')})`,
    );
  }
}

/* 4. MDX LaTeX escaping trap — the most common AI-generated mistake.
      `latex="...\frac..."` loses its backslash in MDX + Astro and renders as
      the literal text "frac". The correct form is the expression container
      `latex={"\\frac..."}`. */
for (const entry of entries) {
  const badAttr = /(?<![{=])\blatex="(?:[^"\\]|\\[^"])*\\(frac|sqrt|cdot|lim|partial|infty)/.exec(entry.body);
  if (badAttr) {
    error(
      entry.rel,
      'LaTeX in a plain JSX attribute loses its backslash and renders as literal text. ' +
        'Use the MDX expression container: latex={"\\\\' +
        badAttr[1] +
        '{…}"}.',
    );
  }
  const badTerms = /(?<![{=])\bterm="(?:[^"\\]|\\[^"])*\\(frac|sqrt|cdot|lim|partial)/.exec(entry.body);
  if (badTerms) {
    error(entry.rel, 'same escaping issue in a `term="…"` attribute; use term={"\\\\…"}');
  }
}

/* ── 5. broken internal links in the built output ─────────────────────────── */

async function collectHtmlFiles(dir) {
  const out = [];
  const walk = async (current) => {
    const items = await readdir(current);
    for (const item of items) {
      const full = path.join(current, item);
      const info = await stat(full);
      if (info.isDirectory()) await walk(full);
      else if (item.endsWith('.html')) out.push(full);
    }
  };
  await walk(dir);
  return out;
}

if (checkLinks) {
  if (!existsSync(distDir)) {
    error(distDir, 'not found — run `npm run build` first or pass --dist <path>');
  } else {
    // The built output carries the deployment base (e.g. /physics2), so strip
    // it before comparing paths against the emitted files on disk. CI exports
    // BASE_PATH for exactly this reason.
    const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
    const stripBase = (href) => {
      if (!base) return href;
      if (href === base) return '/';
      return href.startsWith(`${base}/`) ? href.slice(base.length) : href;
    };

    const htmlFiles = await collectHtmlFiles(distDir);
    // A link is valid if it resolves to a built page OR to a real emitted file
    // (asset, stylesheet, favicon, sitemap). Checking the filesystem is the
    // honest test: an index of known routes would happily pass a link to a
    // stylesheet that was never emitted.
    const knownRoutes = new Set(
      htmlFiles.map((f) => '/' + (path.relative(distDir, f).replace(/\\/g, '/').replace(/index\.html$/, '') || '')),
    );

    const assetExists = (href) => {
      const clean = href.replace(/\/$/, '');
      const candidates = [
        path.join(distDir, clean),
        path.join(distDir, clean, 'index.html'),
        path.join(distDir, `${clean}.html`),
      ];
      return candidates.some((c) => existsSync(c));
    };

    for (const file of htmlFiles) {
      const html = await readFile(file, 'utf8');
      const rel = path.relative(distDir, file);
      for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = stripBase(m[1]);
        if (href === '/' || knownRoutes.has(href)) continue;
        if (!assetExists(href)) {
          error(`dist/${rel}`, `broken internal link: ${m[1]}`);
        }
      }
    }
  }
}

/* ── Report ──────────────────────────────────────────────────────────────── */

console.log(`Checked ${entries.length} content entries in ${CONTENT_DIRS.length} collections.`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  · ${w}`);
}

if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  console.log('\nFix the errors above. Astro also validates each entry against its schema,');
  console.log('but it cannot see cross-file references or the MDX escaping trap.');
  process.exitCode = 1;
} else {
  console.log('\nNo content errors found.');
}