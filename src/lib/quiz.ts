import type { QuizQuestion } from './types';
import { toLatinDigits } from './utils';

/**
 * Course-agnostic quiz grading — the single oracle for choice and numeric
 * questions. Used by the Quiz island and covered by unit tests, so a grading
 * regression fails `npm run test` instead of silently mis-scoring learners.
 */

export function gradeChoice(question: QuizQuestion, answer: string[]): boolean {
  if (question.numericAnswer !== undefined) return gradeNumeric(question, answer[0] ?? '');
  const expected = Array.isArray(question.correctAnswer)
    ? question.correctAnswer
    : question.correctAnswer !== undefined
      ? [question.correctAnswer]
      : [];
  if (answer.length !== expected.length) return false;
  const a = [...answer].sort();
  const b = [...expected].sort();
  return a.every((value, index) => value === b[index]);
}

/** Numeric grading with Persian-digit support and an absolute tolerance. */
export function gradeNumeric(question: QuizQuestion, raw: string): boolean {
  if (question.numericAnswer === undefined) return false;
  const cleaned = toLatinDigits(raw.trim()).replace(/,/g, '.');
  if (!cleaned) return false;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return false;
  const tolerance = question.tolerance ?? 0;
  return Math.abs(value - question.numericAnswer) <= tolerance + Number.EPSILON;
}

/** True when the question expects a typed number rather than an option. */
export function isNumericQuestion(question: QuizQuestion): boolean {
  return question.type === 'numeric' || (question.numericAnswer !== undefined && (question.options ?? []).length === 0);
}

export function gradeQuiz(questions: QuizQuestion[], answers: Record<string, string[]>): number {
  return questions.filter((q) => gradeChoice(q, answers[q.id] ?? [])).length;
}
