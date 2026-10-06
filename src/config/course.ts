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
    'یک درس‌نامهٔ آزاد و قدم‌به‌قدم برای فهم حساب دیفرانسیل: هر مفهوم با یک مثال حل‌شده، هر فرمول با توضیح دقیق، و در پایان هر بخش با تمرین همراه است. از مبانی شروع کنید و به‌ترتیب پیش بروید.',
  shortDescription: 'درس‌نامهٔ قدم‌به‌قدم حساب دیفرانسیل',
  locale: 'fa',
  direction: 'rtl',

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
  theme: {
    name: 'default',
    colors: {
      primary: '#2563eb', // blue-600
      primaryHover: '#1d4ed8', // blue-700
      secondary: '#7c3aed', // violet-600
      accent: '#ea580c', // orange-600
    },
    typography: 'traditional',
    motif: 'geometric',
  },
};
