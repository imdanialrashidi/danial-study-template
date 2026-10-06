import { describe, it, expect } from 'vitest';
import { gradeChoice, gradeNumeric, gradeQuiz, isNumericQuestion } from '../../src/lib/quiz.ts';
import { activeFeatures } from '../../src/lib/features.ts';
import { THEME_PRESETS, resolvedTheme } from '../../src/lib/themes.ts';
import type { QuizQuestion } from '../../src/lib/types.ts';

/**
 * Regression evidence for the template slice's new pure logic.
 *
 * - Numeric grading must accept Persian digits and honour tolerance; a naive
 *   `Number(input) === answer` check fails both, silently mis-scoring learners.
 * - Choice grading must reject partial multi-select answers.
 * - Feature flags default to enabled so existing courses keep working, and the
 *   theme resolver must honour the active course preset.
 */

const mcq: QuizQuestion = {
  id: 'q1',
  type: 'multiple-choice',
  text: 'سوال؟',
  options: [
    { id: 'a', text: 'درست' },
    { id: 'b', text: 'نادرست' },
  ],
  correctAnswer: 'a',
};

const multi: QuizQuestion = {
  id: 'qm',
  type: 'multiple-choice',
  text: 'چندگزینه‌ای؟',
  options: [
    { id: 'a', text: 'یک' },
    { id: 'b', text: 'دو' },
    { id: 'c', text: 'سه' },
  ],
  correctAnswer: ['a', 'c'],
};

const numeric: QuizQuestion = {
  id: 'qn',
  type: 'numeric',
  text: 'حاصل؟',
  numericAnswer: 42,
};

describe('gradeChoice', () => {
  it('accepts the correct single option', () => {
    expect(gradeChoice(mcq, ['a'])).toBe(true);
  });

  it('rejects a wrong option and an empty answer', () => {
    expect(gradeChoice(mcq, ['b'])).toBe(false);
    expect(gradeChoice(mcq, [])).toBe(false);
  });

  it('requires the full set for multi-select', () => {
    expect(gradeChoice(multi, ['a', 'c'])).toBe(true);
    expect(gradeChoice(multi, ['a'])).toBe(false);
    expect(gradeChoice(multi, ['a', 'b', 'c'])).toBe(false);
  });
});

describe('gradeNumeric', () => {
  it('accepts exact Latin and Persian digits', () => {
    expect(gradeNumeric(numeric, '42')).toBe(true);
    expect(gradeNumeric(numeric, '۴۲')).toBe(true);
  });

  it('honours tolerance', () => {
    const close: QuizQuestion = { ...numeric, tolerance: 0.5 };
    expect(gradeNumeric(close, '42.4')).toBe(true);
    expect(gradeNumeric(close, '43')).toBe(false);
  });

  it('rejects empty and non-numeric input', () => {
    expect(gradeNumeric(numeric, '')).toBe(false);
    expect(gradeNumeric(numeric, 'زیاد')).toBe(false);
  });
});

describe('isNumericQuestion', () => {
  it('detects numeric questions with and without an explicit type', () => {
    expect(isNumericQuestion(numeric)).toBe(true);
    expect(isNumericQuestion(mcq)).toBe(false);
    expect(isNumericQuestion({ ...numeric, type: 'short-answer' })).toBe(true);
  });
});

describe('gradeQuiz', () => {
  it('counts mixed correct answers', () => {
    expect(gradeQuiz([mcq, numeric], { q1: ['a'], qn: ['42'] })).toBe(2);
    expect(gradeQuiz([mcq, numeric], { q1: ['b'], qn: ['42'] })).toBe(1);
  });
});

describe('activeFeatures', () => {
  it('enables every capability by default', () => {
    const flags = activeFeatures();
    for (const value of Object.values(flags)) expect(value).toBe(true);
  });
});

describe('resolvedTheme', () => {
  it('exposes every documented preset with distinct primaries', () => {
    const names = Object.keys(THEME_PRESETS);
    expect(names).toEqual(expect.arrayContaining(['default', 'physics', 'calculus', 'programming', 'statistics']));
    const primaries = new Set(names.map((n) => THEME_PRESETS[n as keyof typeof THEME_PRESETS].primary));
    expect(primaries.size).toBeGreaterThan(1);
  });

  it('resolves the active course theme to real hex roles', () => {
    const theme = resolvedTheme();
    for (const value of Object.values(theme)) expect(value).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
