import { courseConfig } from '../config/course';
import { creator } from '../config/site';
import type { PageCopyKey } from './types';

/**
 * Meta descriptions for shared engine routes.
 *
 * A course may override any key in `src/config/course.ts` → `pageCopy`.
 * The fallback derives from course config + creator identity, so a new course
 * never inherits another subject's copy.
 */
const fallback: Record<PageCopyKey, string> = {
  lessons: `درس‌های ${courseConfig.title}: ${courseConfig.description}`,
  concepts: `مفاهیم ${courseConfig.title}: ${courseConfig.description}`,
  formulas: `فرمول‌های ${courseConfig.title}: معنی نمادها، شرایط اعتبار و کاربرد.`,
  examples: `مثال‌های حل‌شدهٔ ${courseConfig.title}: گام‌به‌گام، از صورت مسئله تا پاسخ.`,
  practice: `تمرین‌های ${courseConfig.title}: فهم خود را بسنجید و پاسخ‌ها را در همین مرورگر نگه دارید.`,
  glossary: `واژه‌نامهٔ ${courseConfig.title}: تعریف کوتاه و دقیق اصطلاح‌های دوره.`,
  map: `نقشهٔ کامل ${courseConfig.title}: همهٔ بخش‌ها و مطالب به‌ترتیب خواندن.`,
  about: `دربارهٔ ${courseConfig.title} از ${creator.name}: روش مطالعه، ساختار بخش‌ها و راه ارتباط.`,
};

export function pageDescription(key: PageCopyKey): string {
  const override = courseConfig.pageCopy?.[key]?.trim();
  return override && override.length > 0 ? override : fallback[key];
}
