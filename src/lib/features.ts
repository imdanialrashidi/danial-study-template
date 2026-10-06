import { courseConfig } from '../config/course';
import type { CourseFeatures } from './types';

/**
 * Feature flags — one read path for every conditional capability.
 *
 * A flag that is absent from `course.ts` counts as enabled, so existing
 * courses keep working after this module was introduced. A course disables a
 * capability by setting it to `false`; no component is edited.
 */
export function isEnabled(name: keyof CourseFeatures): boolean {
  const features = courseConfig.features ?? {};
  return features[name] ?? true;
}

/** All flags with defaults applied — useful for SEO/nav decisions. */
export function activeFeatures(): Required<CourseFeatures> {
  const f = courseConfig.features ?? {};
  return {
    search: f.search ?? true,
    commandPalette: f.commandPalette ?? true,
    formulas: f.formulas ?? true,
    glossary: f.glossary ?? true,
    practice: f.practice ?? true,
    progress: f.progress ?? true,
    simulations: f.simulations ?? true,
    toc: f.toc ?? true,
    related: f.related ?? true,
    courseMap: f.courseMap ?? true,
  };
}
