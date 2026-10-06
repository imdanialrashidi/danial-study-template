import { getProgressStore } from '../../lib/progress';

/**
 * Thin, client-only bridge between React islands and the progress store.
 *
 * `progress.ts` touches `localStorage` lazily, so importing it during SSR is
 * safe — nothing is read until a method is actually called in the browser.
 */
export const ProgressBridge = {
  toggleCompleted(id: string): boolean {
    return getProgressStore().toggleCompleted(id);
  },
  toggleBookmarked(id: string): boolean {
    return getProgressStore().toggleBookmarked(id);
  },
  isCompleted(id: string): boolean {
    return getProgressStore().isCompleted(id);
  },
  isBookmarked(id: string): boolean {
    return getProgressStore().isBookmarked(id);
  },
  recordQuiz(id: string, score: number, total: number): void {
    getProgressStore().recordQuiz(id, score, total);
  },
  snapshot() {
    return getProgressStore().snapshot();
  },
  completionRatio(ids: string[]): { done: number; total: number; percent: number } {
    return getProgressStore().completionRatio(ids);
  },
  get persistent(): boolean {
    return getProgressStore().status !== 'unavailable';
  },
};