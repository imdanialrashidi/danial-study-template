/**
 * Shared helpers used by both the Astro (server) side and React islands.
 *
 * These modules are intentionally dependency-free so they can be imported from
 * a build-time page, a React island, or a Vitest test without pulling the DOM.
 */

/** Convert Latin digits to Persian (Eastern Arabic) digits. */
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/** Convert Persian/Arabic-Indic digits back to Latin, for parsing user input. */
export function toLatinDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** Zero-padded section number in Persian digits, e.g. toPersianNumeral(3) → «۰۳». */
export function toPersianNumeral(value: number): string {
  return toPersianDigits(String(value).padStart(2, '0'));
}

/**
 * Normalize Persian text for search: unify Arabic/Persian letter variants,
 * strip diacritics, convert Arabic-Indic digits, and collapse whitespace.
 *
 * Returns a lowercase, comparable form. Used for both the index build and the
 * client-side query, so a learner typing with a Persian keyboard, an Arabic
 * keyboard, or Latin input still matches.
 */
export function normalizePersian(input: string): string {
  return toLatinDigits(input)
    .toLowerCase()
    // Persian/Arabic letter unification.
    .replace(/[يى]/g, 'ی') // ي, ى → ی
    .replace(/[كک]/g, 'ک') // ك, ک → ک
    .replace(/[أإآٱ]/g, 'ا') // أ, إ, آ, ٱ → ا
    .replace(/[ؤئ]/g, '') // ؤ, ئ dropped like a diacritic
    .replace(/ة/g, 'ه') // ة → ه
    // Diacritics and tatweel.
    .replace(/[ً-ْٰـ]/g, '')
    // Arabic punctuation → ASCII so query punctuation behaves predictably.
    .replace(/[،؛؟٪-]/g, (c) =>
      ({ '،': ',', '؛': ';', '؟': '?', '٪': '%', '-': '-' })[c] ?? c,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split Persian text into comparable tokens.
 *
 * Combining marks and the zero-width non-joiner (U+200C) stay inside words:
 * Persian writes "زنجیره‌ای" as one word joined by ZWNJ, and "قاعدهٔ" carries a
 * hamza mark. Splitting on them would make a whole word unsearchable.
 */
export function tokenize(text: string): string[] {
  const normalized = normalizePersian(text);
  if (!normalized) return [];
  return normalized.split(/[^\p{L}\p{N}\p{M}\u200C+-]+/u).filter(Boolean);
}

/** URL-safe slug from Persian or Latin text. Falls back to a hash-free id. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Human-readable estimate, e.g. 45 → «۴۵ دقیقه». */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${toPersianDigits(hours)} ساعت`;
  return `${toPersianDigits(hours)} ساعت و ${toPersianDigits(rest)} دقیقه`;
}

export const DIFFICULTY_LABELS: Record<'beginner' | 'intermediate' | 'advanced', string> = {
  beginner: 'مقدماتی',
  intermediate: 'متوسط',
  advanced: 'پیشرفته',
};

/** Total weighted progress across a list of "done" flags. */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/** Escape a string for safe interpolation into generated HTML/JSON. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Serialise data for embedding inside a <script type="application/json"> tag. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}