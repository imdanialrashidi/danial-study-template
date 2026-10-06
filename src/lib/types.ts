/**
 * Core type definitions for the educational template.
 *
 * These types define the content contract for course authors and AI agents.
 * All content collections validate against these schemas.
 */

// ─── Creator Identity (single source lives in src/config/site.ts) ───────────
//
// This interface is intentionally generic (plain strings): a new course site
// changes the *values* in `src/config/site.ts`, never this type. The constant
// below is the default value; components must import `creator` from
// `src/config/site.ts` instead of using this constant or hard-coding URLs.

export interface CreatorIdentity {
  name: string;
  /** Canonical handle with leading @, e.g. `@imdanialrashidi`. */
  handle: string;
  /** Personal website, e.g. `https://imdanialrashidi.github.io`. */
  website: string;
  /** Telegram channel/group URL. */
  telegram: string;
  /** Telegram username without @. */
  telegramUsername: string;
  /** GitHub profile URL. */
  github: string;
  /** GitHub username without @. */
  githubUsername: string;
  /** Instagram profile URL. */
  instagram: string;
  /** Instagram username without @. */
  instagramUsername: string;
  /** Hub listing every study site, e.g. `https://study.danialrashidi.ir`. */
  studyHub: string;
  /** Support / donation URL (defaults to Telegram; override per course). */
  supportUrl: string;
  /** Persian label for the support link. */
  supportLabel: string;
}

/** One social/external link rendered by shared UI. */
export interface SocialLink {
  label: string;
  href: string;
  kind: 'github' | 'instagram' | 'telegram' | 'website' | 'studyHub' | 'support';
  /** Username or short host shown beside the label, without hard-coding. */
  detail?: string;
}

// ─── Course Configuration ────────────────────────────────────────────────────

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ContentDirection = 'ltr' | 'rtl';
export type ContentLocale = 'fa' | 'en';

export interface SectionConfig {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    primaryHover?: string;
    secondary?: string;
    accent?: string;
  };
  typography?: 'traditional' | 'modern';
  motif?: 'geometric' | 'organic' | 'technical' | 'none';
}

export interface CourseConfig {
  title: string;
  /** One-line promise shown under the hero title (configurable per course). */
  tagline?: string;
  description: string;
  shortDescription?: string;
  locale: ContentLocale;
  direction: ContentDirection;
  difficulty: Difficulty;
  difficultyLevel?: number; // 1–5 scale
  estimatedDuration?: string;
  tags: string[];
  category?: string;
  sections: SectionConfig[];
  theme: ThemeConfig;
}

// ─── Shared Content Metadata ─────────────────────────────────────────────────

export interface ContentMeta {
  title: string;
  slug: string;
  description?: string;
  order?: number;
  section?: string;
  difficulty: Difficulty;
  difficultyLevel?: number;
  estimatedTime?: string; // e.g. "5 min read"
  prerequisites?: string[]; // slugs of prerequisite content
  tags?: string[];
  date?: string;
  lastModified?: string;
}

// ─── Content Types ───────────────────────────────────────────────────────────

export type ContentType = 'lesson' | 'concept' | 'formula' | 'example' | 'question' | 'glossary';

export interface NavigationItem {
  id: string;
  title: string;
  href: string;
  type: ContentType;
  section?: string;
  order?: number;
  icon?: string;
}

// ─── Quiz / Practice Types ───────────────────────────────────────────────────

export type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer' | 'calculation';

export interface QuizOption {
  id: string;
  text: string;
  explanation?: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options: QuizOption[];
  correctAnswer: string | string[];
  explanation?: string;
  difficulty?: Difficulty;
}

export interface QuizConfig {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  allowRetry?: boolean;
  showCorrectOnFail?: boolean;
  timeLimit?: number; // seconds
}

// ─── Progress / Bookmarks ────────────────────────────────────────────────────

export interface ProgressState {
  completedSlugs: string[];
  bookmarkedSlugs: string[];
  quizScores: Record<string, { score: number; total: number; completedAt: string }>;
  lastVisit: Record<string, string>;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchableItem {
  id: string;
  title: string;
  slug: string;
  type: ContentType;
  section?: string;
  excerpt?: string;
  tags?: string[];
  href: string;
}
