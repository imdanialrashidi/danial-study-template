import { describe, it, expect, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { courseConfig } from '../../src/config/course';

/**
 * Deployment base-path regression guard.
 *
 * Astro prefixes the asset URLs it emits, but it does NOT rewrite `<a href>`
 * strings written by hand. A site that builds green can therefore be entirely
 * broken on a project-site deployment (GitHub Pages under /<repo>/) where every
 * unprefixed link points outside the deployed directory.
 *
 * These checks read the actual built output rather than re-testing the helper,
 * because the failure mode is "some link somewhere was written literally".
 */

const distDir = path.resolve(import.meta.dirname, '../../dist');

/** Only meaningful after a build; skipped with a clear message otherwise. */
const describeIfBuilt = existsSync(path.join(distDir, 'index.html')) ? describe : describe.skip;

/**
 * The deployment base, when built for a project site (GitHub Pages).
 * Both link assertions need it: one resolves paths on disk, the other asserts
 * that nothing escapes the base.
 */
const BASE = (process.env.BASE_PATH ?? '').replace(/\/$/, '');

/** Strip the deployment base from a built href so it can be resolved on disk. */
function stripBase(href: string): string {
  if (!BASE) return href;
  if (href === BASE) return '/';
  return href.startsWith(`${BASE}/`) ? href.slice(BASE.length) : href;
}

function collectHtml(dir: string): string[] {
  const out: string[] = [];
  for (const item of readdirSync(dir)) {
    const full = path.join(dir, item);
    if (statSync(full).isDirectory()) out.push(...collectHtml(full));
    else if (item.endsWith('.html')) out.push(full);
  }
  return out;
}

describeIfBuilt('built output', () => {
  const htmlFiles = collectHtml(distDir);

  it('produced HTML pages', () => {
    expect(htmlFiles.length).toBeGreaterThan(0);
  });

  it('declares Persian RTL on every page', () => {
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      expect(html, file).toMatch(/<html[^>]*dir="rtl"/);
      expect(html, file).toMatch(/<html[^>]*lang="fa"/);
    }
  });

  it('emits exactly one <h1> per page', () => {
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      const count = (html.match(/<h1[\s>]/g) ?? []).length;
      expect(count, `${file} has ${count} <h1> elements`).toBe(1);
    }
  });

  it('never leaks an unrendered TeX command into page text', () => {
    // KaTeX embeds the source in <annotation>, so only visible text matters.
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      const stripped = html.replace(/<annotation[\s\S]*?<\/annotation>/g, '').replace(/<[^>]+>/g, ' ');
      expect(stripped, file).not.toMatch(/(^|[^\\a-zA-Z])(frac|sqrt|cdot|infty|partial)(?![a-zA-Z])/);
    }
  });

  it('renders KaTeX markup rather than shipping a KaTeX runtime', () => {
    const html = readFileSync(path.join(distDir, 'lessons/01-intro-to-calculus/index.html'), 'utf8');
    expect(html).toContain('class="katex');
    expect(html).toContain('mfrac');
  });

  it('references creator identity consistently', () => {
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      expect(html, file).toContain('imdanialrashidi.github.io');
      expect(html, file).toContain('t.me/imdanialrashidi');
    }
  });

  it('points the Telegram popup and announcements at the projects channel', () => {
    // Accepted announcements channel for new projects/study websites
    // (TELEGRAM_CHANNEL_URL in src/config/site.ts). The discovery popup
    // ships on every page, so the channel URL must be present everywhere
    // and must be the popup join target — not the personal contact URL
    // asserted above.
    const channel = 'https://t.me/danialrashidi_projects';
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      expect(html, `${file} never mentions the projects channel`).toContain(channel);
      expect(html, `${file} popup join button is missing`).toContain('data-telegram-join');
      expect(html, `${file} popup join does not target the channel`).toContain(`href="${channel}"`);
    }
  });

  it('serves a favicon derived from the course logo', () => {
    // A new topic reuses this template by changing `logo` in
    // src/config/course.ts; the served favicon must follow that variable.
    const monogram = courseConfig.logo?.monogram;
    expect(monogram, 'course logo monogram is not configured').toBeTruthy();
    const favicon = path.join(distDir, 'favicon.svg');
    expect(existsSync(favicon), 'dist/favicon.svg missing').toBe(true);
    const svg = readFileSync(favicon, 'utf8');
    expect(svg, 'favicon does not carry the course monogram').toContain(monogram as string);
  });

  it('contains no institutional branding', () => {
    // The template must be usable for any subject and any learner. Rather than
    // banning common Persian words (a legitimate disclaimer mentions "استاد"),
    // this checks for signals that only institutional pages carry:
    // staff/student identifiers and institutional domains or names.
    const signals = [
      /[^\s"']+@(?:[\w-]+\.)*(?:ac\.ir|edu\.ir|edu)\b/i, // institutional email
      /شمارهٔ\s*دانشجویی|کد\s*پرسنلی|شمارهٔ\s*پرسنلی|دانشکده|گروه\s*آموزشی/, // staff/student ids
      /دانشگاه\s+امیرکبیر|دانشگاه\s+تهران|دانشگاه\s+شریف|دانشگاه\s+فدرال/,
    ];
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      for (const signal of signals) {
        expect(html.match(signal), `${file} matched ${signal}`).toBeNull();
      }
    }
  });
  it('ships no server, API, or analytics runtime', () => {
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      expect(html, file).not.toMatch(/fetch\(['"`]https?:\/\/(?!t\.me|imdanialrashidi)/);
      expect(html, file).not.toMatch(/googletagmanager|google-analytics|gtag\(/);
    }
  });

  it('resolves every internal link to something on disk', () => {
    const known = new Set(
      htmlFiles.map((f) => '/' + path.relative(distDir, f).replace(/\\/g, '/').replace(/index\.html$/, '')),
    );
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const raw = m[1];
        const href = stripBase(raw);
        if (href === '/' || known.has(href)) continue;
        const clean = href.replace(/\/$/, '');
        const found =
          existsSync(path.join(distDir, clean)) ||
          existsSync(path.join(distDir, clean, 'index.html')) ||
          existsSync(path.join(distDir, `${clean}.html`));
        expect(found, `${file} → ${raw}`).toBe(true);
      }
    }
  });

  it('prefixes every internal link with the deployment base', () => {
    // Skipped for a root deployment, where there is no base to apply.
    const base = BASE;
    if (!base) return;

    const allowed = new Set([`${base}/`]);
    for (const file of htmlFiles) {
      const html = readFileSync(file, 'utf8');
      for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = m[1];
        if (allowed.has(href) || href.startsWith(`${base}/`)) continue;
        // A link that escapes the deployment base is a 404 on GitHub Pages.
        expect(href, `${file} → ${href} is missing the "${base}" base`).toMatch(/^\/(favicon\.svg|sitemap)/);
      }
    }
  });
});

/** Files Astro serves from the site root rather than under the course base. */
function knownAssetPrefixes(base: string): string[] {
  return [`${base}/_astro/`, `${base}/favicon.svg`, `${base}/sitemap-index.xml`];
}