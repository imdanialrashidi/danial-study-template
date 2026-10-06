import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressStore, STORAGE_KEY, __resetProgressStore } from '../../src/lib/progress.ts';

/**
 * Progress is the only piece of learner state the product stores, and its
 * contract has two independent failure modes worth pinning:
 *
 *  1. idempotency — marking done twice must not duplicate the record;
 *  2. graceful degradation — when storage throws (private mode, quota, a
 *     locked-down kiosk) the store must report that honestly instead of
 *     pretending to save.
 */

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
}

function install(storage: unknown) {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
}

describe('ProgressStore', () => {
  beforeEach(() => {
    __resetProgressStore();
    install(new MemoryStorage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    __resetProgressStore();
  });

  it('round-trips completed entries through storage', () => {
    const store = new ProgressStore();
    store.toggleCompleted('lesson-a');
    expect(store.isCompleted('lesson-a')).toBe(true);

    const reloaded = new ProgressStore();
    expect(reloaded.isCompleted('lesson-a')).toBe(true);
  });

  it('is idempotent: toggling twice returns to the original state', () => {
    const store = new ProgressStore();
    expect(store.toggleCompleted('lesson-a')).toBe(true);
    expect(store.toggleCompleted('lesson-a')).toBe(false);
    expect(store.snapshot().completed).toEqual([]);
  });

  it('never duplicates an entry when marked complete twice', () => {
    const store = new ProgressStore();
    store.toggleCompleted('lesson-a');
    store.toggleCompleted('lesson-a');
    store.toggleCompleted('lesson-a');
    expect(store.snapshot().completed).toEqual(['lesson-a']);
  });

  it('bookmarks independently of completion', () => {
    const store = new ProgressStore();
    store.toggleBookmarked('formula-a');
    expect(store.isBookmarked('formula-a')).toBe(true);
    expect(store.isCompleted('formula-a')).toBe(false);
  });

  it('keeps the highest quiz score rather than the latest', () => {
    const store = new ProgressStore();
    store.recordQuiz('quiz-a', 3, 4);
    store.recordQuiz('quiz-a', 1, 4); // a worse retry must not overwrite
    expect(store.quizScore('quiz-a')).toMatchObject({ score: 3, total: 4 });
  });

  it('records an improved quiz score', () => {
    const store = new ProgressStore();
    store.recordQuiz('quiz-a', 1, 4);
    store.recordQuiz('quiz-a', 4, 4);
    expect(store.quizScore('quiz-a')).toMatchObject({ score: 4, total: 4 });
  });

  it('ignores ids outside the known course when computing progress', () => {
    const store = new ProgressStore();
    store.toggleCompleted('lesson-a');
    store.toggleCompleted('stale-id-from-an-old-course');
    // Only the known id counts toward the denominator-aware ratio.
    expect(store.completionRatio(['lesson-a', 'lesson-b'])).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it('returns 0% rather than dividing by zero for an empty course', () => {
    expect(new ProgressStore().completionRatio([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it('recovers from a corrupt payload instead of throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, '{not valid json');
    install(storage);
    const store = new ProgressStore();
    expect(store.snapshot()).toEqual({ completed: [], bookmarks: [], quizzes: {}, lastVisit: {} });
  });

  it('drops malformed values from an otherwise valid payload', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completed: ['ok', 42, null], bookmarks: 'nope', quizzes: { q: { score: 'x' } } }),
    );
    install(storage);
    const store = new ProgressStore();
    expect(store.snapshot().completed).toEqual([]);
    expect(store.snapshot().bookmarks).toEqual([]);
  });

  it('reports unavailable storage and still allows in-memory use', () => {
    install(undefined);
    const store = new ProgressStore();
    expect(store.status).toBe('unavailable');
    // The toggle must still return a usable answer rather than throwing.
    expect(store.toggleCompleted('lesson-a')).toBe(true);
    expect(store.isCompleted('lesson-a')).toBe(true);
  });

  it('reports unavailable storage when the quota is exceeded on write', () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    install(storage);
    const store = new ProgressStore();
    store.toggleCompleted('lesson-a');
    expect(store.status).toBe('unavailable');
  });

  it('notifies subscribers on change', () => {
    const store = new ProgressStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.toggleCompleted('lesson-a');
    expect(calls).toBe(1);
    unsubscribe();
    store.toggleCompleted('lesson-b');
    expect(calls).toBe(1);
  });

  it('clears all state', () => {
    const store = new ProgressStore();
    store.toggleCompleted('a');
    store.toggleBookmarked('b');
    store.recordQuiz('q', 1, 1);
    store.clear();
    expect(store.snapshot()).toEqual({ completed: [], bookmarks: [], quizzes: {}, lastVisit: {} });
  });
});