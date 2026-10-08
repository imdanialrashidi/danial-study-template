/**
 * Course configuration for the template.
 *
 * When a new course is created from this template, the course author edits this
 * single file to configure title, description, sections, difficulty, tags, and
 * theming. All UI, layout, and interactive components read from this config.
 *
 * DO NOT add university-specific, professor-specific, or institutional branding.
 * The only permanent identity is Danial Rashidi.
 */

import type { CourseConfig } from '../lib/types';

export const courseConfig: CourseConfig = {
  // --- Identity (course-specific) ---
  title: 'حساب دیفرانسیل، قدم‌به‌قدم',
  tagline: 'از حد تا قاعدهٔ زنجیره‌ای — با مثال حل‌شده، فرمول دقیق و تمرین',
  description:
    'درس‌نامهٔ آزاد و قدم‌به‌قدم حساب دیفرانسیل: هر مفهوم با مثال حل‌شده، هر فرمول با توضیح دقیق. از حد شروع کنید و تا قاعدهٔ زنجیره‌ای پیش بروید.',
  shortDescription: 'درس‌نامهٔ قدم‌به‌قدم حساب دیفرانسیل',
  locale: 'fa',
  direction: 'rtl',

  // --- Brand (per-topic logo) ---
  // When this template powers a site on another subject, change these two
  // values and the header mark + SVG favicon follow — no component edits
  // needed. Then regenerate the raster favicons from the new mark:
  // npm run build && node scripts/make-favicons.mjs && npm run build
  logo: {
    monogram: 'ح',
    icon: 'formula',
  },

  // --- Course metadata ---
  difficulty: 'beginner',
  estimatedDuration: 'خودآموز',
  difficultyLevel: 3, // 1–5 scale
  tags: ['ریاضی', 'حساب دیفرانسیل', 'حد و مشتق'],
  category: 'آموزشی',

  // --- Sections (navigation groups) ---
  sections: [
    {
      id: 'foundations',
      title: 'مبانی',
      description: 'مفاهیم اولیه و پیش‌نیازها',
      order: 1,
    },
    {
      id: 'calculus',
      title: 'حساب دیفرانسیل و انتگرال',
      description: 'مشتق، انتگرال و کاربردهایشان',
      order: 2,
    },
    {
      id: 'physics',
      title: 'فیزیک',
      description: 'مکانیک، الکتریسیته و مغناطیس‌گری',
      order: 3,
    },
    {
      id: 'practice',
      title: 'تمرین',
      description: 'سوالات و مسائل تمرینی',
      order: 4,
    },
  ],

  // --- Course-specific theming ---
  // `themePreset` selects a shared preset from `src/lib/themes.ts`; inline
  // `theme.colors` still wins when both are set, so a course can start from a
  // preset and adjust one role. Never fork `src/styles/theme.css` per course.
  themePreset: 'calculus',
  theme: {
    name: 'calculus',
    // Roles come from the `calculus` preset in src/lib/themes.ts (the
    // documented paper/teal/ochre palette). Override a single role here only
    // when the course genuinely needs it — never fork theme.css.
    colors: {},
    typography: 'traditional',
    motif: 'geometric',
  },

  // --- Feature flags ---
  // Every capability defaults to enabled when omitted. Turn a flag off to
  // hide its UI (nav item, island, section) without editing components.
  features: {
    search: true,
    commandPalette: true,
    formulas: true,
    glossary: true,
    practice: true,
    progress: true,
    simulations: true,
    toc: true,
    related: true,
    courseMap: true,
  },
};
