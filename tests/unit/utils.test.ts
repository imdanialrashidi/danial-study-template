import { describe, it, expect } from 'vitest';
import {
  toPersianDigits,
  toLatinDigits,
  toPersianNumeral,
  normalizePersian,
  tokenize,
  slugify,
  formatMinutes,
  percent,
} from '../../src/lib/utils.ts';

/**
 * These tests target the pure helpers that the whole engine depends on.
 * They are the cheapest layer that can observe real failure modes: Persian
 * search normalisation and digit handling are exactly where a silent
 * regression would break search without breaking the build.
 */

describe('toPersianDigits', () => {
  it('converts every Latin digit', () => {
    expect(toPersianDigits('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
  });

  it('accepts a number', () => {
    expect(toPersianDigits(1400)).toBe('۱۴۰۰');
  });

  it('leaves non-digits untouched', () => {
    expect(toPersianDigits('سال ۲۰۲۴')).toBe('سال ۲۰۲۴');
  });
});

describe('toLatinDigits', () => {
  it('round-trips Persian digits back to Latin', () => {
    expect(toLatinDigits('۱۲۳۴۵')).toBe('12345');
  });

  it('handles Arabic-Indic digits', () => {
    expect(toLatinDigits('١٢٣٤٥')).toBe('12345');
  });
});

describe('toPersianNumeral', () => {
  it('zero-pads to two digits, as a book section number would be', () => {
    expect(toPersianNumeral(1)).toBe('۰۱');
    expect(toPersianNumeral(12)).toBe('۱۲');
  });

  it('leaves three-digit numbers unpadded', () => {
    expect(toPersianNumeral(120)).toBe('۱۲۰');
  });
});

describe('normalizePersian', () => {
  it('unifies Arabic letter variants so either keyboard matches', () => {
    // Arabic yeh/kaf vs Persian yeh/kaf
    expect(normalizePersian('كتاب')).toBe(normalizePersian('کتاب'));
    // Arabic alef forms vs Persian alef
    expect(normalizePersian('أحمد')).toBe(normalizePersian('احمد'));
    // alef maksura vs Persian yeh
    expect(normalizePersian('مصطفى')).toBe(normalizePersian('مصطفی'));
  });

  it('normalises Arabic-Indic digits to Latin', () => {
    expect(normalizePersian('فصل ٣')).toBe(normalizePersian('فصل 3'));
  });

  it('strips diacritics and tatweel', () => {
    expect(normalizePersian('مُحاسِب')).toBe('محاسب');
    expect(normalizePersian('کـــتاب')).toBe('کتاب');
  });

  it('normalises Arabic punctuation', () => {
    expect(normalizePersian('سلام، خوبی؟')).toBe(normalizePersian('سلام, خوبی?'));
  });

  it('is idempotent, so search can normalise twice safely', () => {
    const once = normalizePersian('كِتاب');
    expect(normalizePersian(once)).toBe(once);
  });

  it('is case-insensitive', () => {
    expect(normalizePersian('Math')).toBe(normalizePersian('math'));
  });

  it('collapses whitespace', () => {
    expect(normalizePersian('a   b\n c')).toBe('a b c');
  });
});

describe('tokenize', () => {
  it('splits on non-letters while keeping Persian words intact', () => {
    expect(tokenize('قاعدهٔ زنجیره‌ای')).toEqual(['قاعدهٔ', 'زنجیره‌ای']);
  });

  it('returns an empty list for blank input', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('slugify', () => {
  it('produces kebab-case from Latin text', () => {
    expect(slugify('Chain Rule')).toBe('chain-rule');
  });

  it('keeps Persian letters rather than dropping them', () => {
    expect(slugify('قاعده زنجیره')).toBe('قاعده-زنجیره');
  });

  it('never returns leading or trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });
});

describe('formatMinutes', () => {
  it('uses minutes below an hour', () => {
    expect(formatMinutes(45)).toBe('۴۵ دقیقه');
  });

  it('drops the minutes part on a whole hour', () => {
    expect(formatMinutes(60)).toBe('۱ ساعت');
  });

  it('combines hours and minutes', () => {
    expect(formatMinutes(135)).toBe('۲ ساعت و ۱۵ دقیقه');
  });
});

describe('percent', () => {
  it('computes a rounded percentage', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
  });

  it('returns 0 rather than NaN for an empty course', () => {
    expect(percent(0, 0)).toBe(0);
  });
});