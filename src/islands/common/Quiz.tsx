import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QuizQuestion } from '../../lib/types';
import { ProgressBridge } from './ProgressBridge';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersian(value: number | string): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export interface QuizProps {
  /** Stable id used to store the best score in the learner's progress. */
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  allowRetry?: boolean;
}

type AnswerState = Record<string, string[]>;

function isCorrect(question: QuizQuestion, answer: string[]): boolean {
  const expected = Array.isArray(question.correctAnswer)
    ? question.correctAnswer
    : [question.correctAnswer];
  if (answer.length !== expected.length) return false;
  const a = [...answer].sort();
  const b = [...expected].sort();
  return a.every((value, index) => value === b[index]);
}

/**
 * Quiz island.
 *
 * Grading is derived from the question data rendered into the island, so the
 * static HTML already contains every option and explanation — the island adds
 * interaction, not content. Scores are recorded through ProgressBridge into
 * localStorage; if storage is unavailable (private mode) the quiz still works
 * and simply does not persist.
 */
export default function Quiz({ id, title, description, questions, allowRetry = true }: QuizProps) {
  const [answers, setAnswers] = useState<AnswerState>({});
  const [checked, setChecked] = useState(false);

  // Marks the island as hydrated. Visual QA asserts this, because a React
  // component rendered from MDX without a client directive produces identical
  // HTML that silently never responds to interaction.
  useEffect(() => {
    document.documentElement.dataset.quizHydrated = 'true';
  }, []);

  const answeredCount = useMemo(
    () => questions.filter((q) => (answers[q.id] ?? []).length > 0).length,
    [answers, questions],
  );

  const allAnswered = answeredCount === questions.length;

  const score = useMemo(() => {
    if (!checked) return 0;
    return questions.filter((q) => isCorrect(q, answers[q.id] ?? [])).length;
  }, [answers, checked, questions]);

  const select = useCallback((questionId: string, optionId: string, single: boolean) => {
    setAnswers((current) => {
      const existing = current[questionId] ?? [];
      if (single) return { ...current, [questionId]: [optionId] };
      return {
        ...current,
        [questionId]: existing.includes(optionId)
          ? existing.filter((o) => o !== optionId)
          : [...existing, optionId],
      };
    });
    // Changing an answer after checking invalidates the previous verdict.
    setChecked(false);
  }, []);

  const submit = useCallback(() => {
    if (!allAnswered) return;
    setChecked(true);
    const correct = questions.filter((q) => isCorrect(q, answers[q.id] ?? [])).length;
    ProgressBridge.recordQuiz(id, correct, questions.length);
  }, [allAnswered, answers, id, questions]);

  const retry = useCallback(() => {
    setAnswers({});
    setChecked(false);
  }, []);

  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <section className="my-8 rounded-lg border border-line bg-surface" aria-labelledby={`${id}-title`}>
      <header className="border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-deep"
            aria-hidden="true"
          >
            <circle cx="10" cy="10" r="7.5" />
            <path d="M7 8.2a3 3 0 1 1 3.2 2.8c-.8.4-1.2.9-1.2 1.7" />
            <path d="M10 15.4h.01" />
          </svg>
          <h3 id={`${id}-title`} className="font-display text-base font-bold text-ink">
            {title}
          </h3>
        </div>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>}
        <p className="mt-2 text-xs text-ink-faint" aria-live="polite">
          {checked
            ? `نتیجه: ${toPersian(score)} از ${toPersian(questions.length)} پاسخ درست`
            : `${toPersian(answeredCount)} از ${toPersian(questions.length)} پاسخ داده شده`}
        </p>
      </header>

      <ol className="divide-y divide-line" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {questions.map((question, index) => {
          const selected = answers[question.id] ?? [];
          const multi = Array.isArray(question.correctAnswer);
          const correct = isCorrect(question, selected);
          return (
            <li key={question.id} className="px-5 py-5">
              <fieldset disabled={checked}>
                <legend className="mb-3 flex gap-2 text-sm leading-relaxed text-ink">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-2xs font-bold text-ink-muted"
                    aria-hidden="true"
                  >
                    {toPersian(index + 1)}
                  </span>
                  <span>
                    {question.text}
                    {multi && <span className="ms-1 text-xs text-ink-faint">(چندگزینه‌ای)</span>}
                  </span>
                </legend>

                <div className="flex flex-col gap-2 ps-7">
                  {question.options.map((option) => {
                    const isSelected = selected.includes(option.id);
                    const showCorrectOption =
                      checked &&
                      (Array.isArray(question.correctAnswer)
                        ? question.correctAnswer.includes(option.id)
                        : question.correctAnswer === option.id);
                    const showWrongSelection = checked && isSelected && !showCorrectOption;

                    return (
                      <label
                        key={option.id}
                        className={`flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm leading-relaxed transition-colors duration-fast ${
                          showCorrectOption
                            ? 'border-success bg-success-soft text-ink'
                            : showWrongSelection
                              ? 'border-danger bg-danger-soft text-ink'
                              : isSelected
                                ? 'border-primary bg-primary-wash text-ink'
                                : 'border-line bg-surface hover:border-line-control hover:bg-surface-sunken/60'
                        } ${checked ? 'cursor-default' : ''}`}
                      >
                        <input
                          type={multi ? 'checkbox' : 'radio'}
                          name={`${question.id}`}
                          value={option.id}
                          checked={isSelected}
                          onChange={() => select(question.id, option.id, !multi)}
                          className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--rgb-primary))]"
                        />
                        <span className="min-w-0 flex-1">{option.text}</span>
                        {checked && showCorrectOption && (
                          <span className="shrink-0 text-success" aria-label="پاسخ درست">
                            <CheckIcon />
                          </span>
                        )}
                        {checked && showWrongSelection && (
                          <span className="shrink-0 text-danger" aria-label="پاسخ نادرست">
                            <CrossIcon />
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {checked && !correct && question.explanation && (
                <p className="mt-3 rounded-md border-s-2 border-accent bg-accent-wash px-3 py-2 text-sm leading-relaxed text-ink/90">
                  <span className="font-bold">چرا؟ </span>
                  {question.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <footer className="border-t border-line bg-surface-sunken/40 px-5 py-4">
        {checked ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-sm font-bold ${percentage >= 60 ? 'text-success' : 'text-danger'}`}
              role="status"
            >
              {percentage >= 60
                ? `آفرین! ${toPersian(percentage)}٪ پاسخ درست.`
                : `${toPersian(percentage)}٪ پاسخ درست — پاسخ‌های نادرست را مرور کنید.`}
            </p>
            {allowRetry && (
              <button
                type="button"
                onClick={retry}
                className="inline-flex min-h-[44px] items-center rounded-md border border-line-control px-4 py-2 text-sm font-bold text-ink transition-colors duration-fast hover:bg-surface"
              >
                تلاش دوباره
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered}
            className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-on transition-colors duration-fast hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-primary"
          >
            بررسی پاسخ‌ها
          </button>
        )}
      </footer>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </svg>
  );
}