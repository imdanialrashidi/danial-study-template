import type { ThemePresetName } from './types';
import { courseConfig } from '../config/course';

/**
 * Shared theme presets.
 *
 * The core design language (paper canvas, hairlines, type, radius, motion)
 * never changes per course. A preset only moves the two luminous roles —
 * `--color-primary` and `--color-accent` — so Physics feels like Physics and
 * Programming feels like Programming while every course stays recognisably
 * part of the same shelf.
 *
 * A course selects a preset with `themePreset` in `src/config/course.ts` and
 * may still override a single role through `theme.colors`. Forking
 * `src/styles/theme.css` for one course is a defect (see docs/QUALITY.md).
 */

export interface ThemePreset {
  name: Exclude<ThemePresetName, 'custom'>;
  /** Persian label shown on the course-map / about page. */
  label: string;
  primary: string;
  primaryDeep: string;
  accent: string;
  primaryWash: string;
}

export const THEME_PRESETS: Record<Exclude<ThemePresetName, 'custom'>, ThemePreset> = {
  default: {
    name: 'default',
    label: 'پیش‌فرض روشن',
    primary: '#0E7C7B',
    primaryDeep: '#0A5C5B',
    accent: '#9A5B00',
    primaryWash: '#E8F3F1',
  },
  physics: {
    name: 'physics',
    label: 'فیزیک',
    primary: '#1D4ED8',
    primaryDeep: '#1E40AF',
    accent: '#B45309',
    primaryWash: '#E3EBFB',
  },
  calculus: {
    name: 'calculus',
    label: 'حساب دیفرانسیل',
    primary: '#0E7C7B',
    primaryDeep: '#0A5C5B',
    accent: '#9A5B00',
    primaryWash: '#E8F3F1',
  },
  programming: {
    name: 'programming',
    label: 'برنامه‌نویسی',
    primary: '#15803D',
    primaryDeep: '#166534',
    accent: '#92400E',
    primaryWash: '#E2F2E7',
  },
  statistics: {
    name: 'statistics',
    label: 'آمار',
    primary: '#7A3E9D',
    primaryDeep: '#5F2E7D',
    accent: '#B45309',
    primaryWash: '#EFE6F6',
  },
};

/** Hex → `r g b` channel triplet for the `--rgb-*` token format. */
function hexToChannels(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Resolved theme roles for the active course: preset first, then the inline
 * `theme.colors` override wins per role.
 */
export function resolvedTheme(): { primary: string; primaryDeep: string; accent: string; primaryWash: string } {
  const presetName = courseConfig.themePreset ?? 'default';
  const preset = presetName === 'custom' ? THEME_PRESETS.default : (THEME_PRESETS[presetName] ?? THEME_PRESETS.default);
  const colors = courseConfig.theme.colors ?? {};
  return {
    primary: colors.primary ?? preset.primary,
    primaryDeep: colors.primaryHover ?? preset.primaryDeep,
    accent: colors.accent ?? preset.accent,
    primaryWash: preset.primaryWash,
  };
}

/** Inline `style` attribute value applied on `<html>` by BaseLayout. */
export function themeStyleAttribute(): string {
  const t = resolvedTheme();
  return (
    `--course-rgb-primary:${hexToChannels(t.primary)};` +
    `--course-rgb-primary-deep:${hexToChannels(t.primaryDeep)};` +
    `--course-rgb-accent:${hexToChannels(t.accent)};` +
    `--course-rgb-primary-wash:${hexToChannels(t.primaryWash)};`
  );
}
