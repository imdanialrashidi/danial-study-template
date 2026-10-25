/**
 * Local learning progress: completed entries, bookmarks, and best quiz scores.
 *
 * Everything lives in the learner's own browser (`localStorage`). There is no
 * account, no server, and no analytics. If storage is unavailable — private
 * browsing, a locked-down kiosk, or a full quota — the store degrades to a
 * no-op that reports `persistence: 'unavailable'` so the UI can tell the truth
 * instead of pretending to save.
 */

export const STORAGE_KEY = 'dr-study-progress:v1';

export interface QuizScore {
  score: number;
  total: number;
  completedAt: string;
}

export interface ProgressData {
  completed: string[];
  bookmarks: string[];
  quizzes: Record<string, QuizScore>;
  lastVisit: Record<string, string>;
}

export type StorageAvailability = 'unknown' | 'available' | 'unavailable';

/**
 * A fresh empty record.
 *
 * This must be a factory, not a shared constant: `toggleCompleted` mutates
 * `this.data` in place, so a shared object would leak one learner's state into
 * every other store in the process.
 */
function emptyData(): ProgressData {
  return { completed: [], bookmarks: [], quizzes: {}, lastVisit: {} };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function sanitize(raw: unknown): ProgressData {
  if (!raw || typeof raw !== 'object') return emptyData();
  const input = raw as Partial<ProgressData>;
  return {
    completed: isStringArray(input.completed) ? [...new Set(input.completed)] : [],
    bookmarks: isStringArray(input.bookmarks) ? [...new Set(input.bookmarks)] : [],
    quizzes:
      input.quizzes && typeof input.quizzes === 'object'
        ? Object.fromEntries(
            Object.entries(input.quizzes).filter(
              ([, v]) =>
                !!v &&
                typeof v === 'object' &&
                Number.isFinite((v as QuizScore).score) &&
                Number.isFinite((v as QuizScore).total) &&
                (v as QuizScore).total > 0,
            ),
          )
        : {},
    lastVisit:
      input.lastVisit && typeof input.lastVisit === 'object'
        ? Object.fromEntries(Object.entries(input.lastVisit).filter(([, v]) => typeof v === 'string'))
        : {},
  };
}

export class ProgressStore {
  private data: ProgressData = emptyData();
  private availability: StorageAvailability = 'unknown';
  private listeners = new Set<() => void>();

  constructor(private readonly key: string = STORAGE_KEY) {
    this.data = emptyData();
    this.availability = this.probe();
    this.read();
  }

  private get storage(): Storage | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      // Touch the API so a SecurityError surfaces here, not mid-write.
      localStorage.getItem(this.key);
      return localStorage;
    } catch {
      return null;
    }
  }

  private probe(): StorageAvailability {
    return this.storage ? 'available' : 'unavailable';
  }

  private read(): void {
    const store = this.storage;
    if (!store) return;
    try {
      const raw = store.getItem(this.key);
      if (raw) this.data = sanitize(JSON.parse(raw));
    } catch {
      // Corrupt payload: start clean rather than crash the page.
      this.data = emptyData();
    }
  }

  private write(): boolean {
    const store = this.storage;
    if (!store) return false;
    try {
      store.setItem(this.key, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }

  private commit(): void {
    const ok = this.write();
    if (!ok) this.availability = 'unavailable';
    this.listeners.forEach((listener) => listener());
    // Cross-island notification: other islands on the page (e.g. the course
    // progress readout) subscribe to this so a lesson toggle updates them.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dr-progress'));
    }
  }

  /** Re-read storage and notify listeners (cross-tab `storage` handler path). */
  refresh(): void {
    this.read();
    this.listeners.forEach((listener) => listener());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('dr-progress'));
    }
  }

  get status(): StorageAvailability {
    return this.availability;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): ProgressData {
    return {
      completed: [...this.data.completed],
      bookmarks: [...this.data.bookmarks],
      quizzes: { ...this.data.quizzes },
      lastVisit: { ...this.data.lastVisit },
    };
  }

  isCompleted(id: string): boolean {
    return this.data.completed.includes(id);
  }

  isBookmarked(id: string): boolean {
    return this.data.bookmarks.includes(id);
  }

  /** Idempotent: completing twice does not duplicate the entry. */
  toggleCompleted(id: string): boolean {
    const next = !this.isCompleted(id);
    this.data.completed = next
      ? [...this.data.completed, id]
      : this.data.completed.filter((value) => value !== id);
    this.data.lastVisit[id] = new Date().toISOString();
    this.commit();
    return next;
  }

  toggleBookmarked(id: string): boolean {
    const next = !this.isBookmarked(id);
    this.data.bookmarks = next
      ? [...this.data.bookmarks, id]
      : this.data.bookmarks.filter((value) => value !== id);
    this.commit();
    return next;
  }

  /**
   * Keeps the highest score, so a retry can only improve the record.
   * A changed question count means a different quiz, so its result replaces
   * the old record instead of competing with an incomparable raw score.
   */
  recordQuiz(id: string, score: number, total: number): void {
    const previous = this.data.quizzes[id];
    if (previous && previous.total === total && previous.score >= score) return;
    this.data.quizzes[id] = { score, total, completedAt: new Date().toISOString() };
    this.commit();
  }

  quizScore(id: string): QuizScore | undefined {
    return this.data.quizzes[id];
  }

  /** Progress over a known list of ids, so unknown/stale ids never skew it. */
  completionRatio(ids: string[]): { done: number; total: number; percent: number } {
    const known = new Set(ids);
    const done = new Set(this.data.completed.filter((id) => known.has(id))).size;
    const total = ids.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { done, total, percent: Math.min(100, Math.max(0, percent)) };
  }

  clear(): void {
    this.data = emptyData();
    this.commit();
  }
}

let singleton: ProgressStore | null = null;

/** Shared instance so every island on a page shares one source of truth. */
export function getProgressStore(): ProgressStore {
  if (!singleton) singleton = new ProgressStore();
  return singleton;
}

/** Test seam. */
export function __resetProgressStore(): void {
  singleton = null;
}

/**
 * Subscribe to progress changes: same-tab writes (via the store's own
 * `dr-progress` dispatch) and cross-tab writes (via `storage`, refreshed
 * from `localStorage` first since another tab mutated it, not the
 * singleton). Returns a cleanup function.
 *
 * The four progress islands shared one pasted effect for this; the rule now
 * lives here so a storage-path fix lands once.
 */
export function subscribeProgress(listener: () => void): () => void {
  const store = getProgressStore();
  const onProgress = () => listener();
  const onStorage = () => {
    store.refresh();
    listener();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('dr-progress', onProgress);
    window.addEventListener('storage', onStorage);
  }
  const unsubscribeStore = store.subscribe(listener);
  return () => {
    unsubscribeStore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('dr-progress', onProgress);
      window.removeEventListener('storage', onStorage);
    }
  };
}

/**
 * Client-only access to the shared progress store for React islands.
 *
 * `progress.ts` touches `localStorage` lazily, so importing it during SSR is
 * safe — nothing is read until a method is actually called in the browser.
 * Prefer this over `getProgressStore()` at island call sites so a future
 * store-shape change lands here, not in five islands.
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
  refresh(): void {
    getProgressStore().refresh();
  },
  get persistent(): boolean {
    return getProgressStore().status !== 'unavailable';
  },
};