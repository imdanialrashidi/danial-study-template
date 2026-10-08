/**
 * SINGLE SOURCE OF TRUTH — site / creator / external links.
 *
 * Convention for agents and course authors (read this before editing):
 *
 * - To start a new course site, edit `src/config/course.ts` (title, tagline,
 *   description, sections, theme) and add content under `src/content/`.
 * - To change who the site belongs to — names, usernames, URLs — edit ONLY the
 *   `EDIT HERE` block below. Every shared component (header, footer, homepage
 *   hero, creator block, Telegram popup, about page, SEO) imports from this
 *   file, so changing a username here updates the whole site. Never hard-code
 *   a username, handle, or external URL in a component; import it from here.
 * - Values that can be derived from course content (entry counts, reading
 *   minutes, first-lesson link, roadmap order) are NOT stored here — pages
 *   derive them with `getAllEntries()` / `getSectionGroups()`.
 * - `siteUrl` / `basePath` are build inputs (env `SITE_URL` / `BASE_PATH`);
 *   they are not edited per course.
 */

import type { CreatorIdentity, SocialLink } from '../lib/types';
import { courseConfig } from './course';

// ─── EDIT HERE: change identity in one place ────────────────────────────────
// Change these usernames + URLs and the entire site follows. The contact URLs
// below are derived from the usernames so they cannot drift out of sync.
// TELEGRAM_CHANNEL_URL is the announcements channel shown in the Telegram
// popup and wherever new projects/study websites are announced — change it
// once here and every surface follows.

const GITHUB_USERNAME = 'imdanialrashidi';
const INSTAGRAM_USERNAME = 'imdanialrashidi';
const TELEGRAM_USERNAME = 'imdanialrashidi';

const PERSONAL_WEBSITE = 'https://imdanialrashidi.github.io';
const STUDY_HUB = 'https://study.danialrashidi.ir';
const TELEGRAM_CHANNEL_URL = 'https://t.me/danialrashidi_projects';

// ─── Derived creator identity (do not edit below) ───────────────────────────

function shortHost(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** Channel username derived from the URL so the two cannot drift out of sync. */
function channelUsername(url: string): string {
  return url.replace(/\/$/, '').split('/').pop() ?? '';
}

export const creator: CreatorIdentity = {
  name: 'دانیال رشیدی',
  handle: `@${GITHUB_USERNAME}`,
  website: PERSONAL_WEBSITE,
  telegram: `https://t.me/${TELEGRAM_USERNAME}`,
  telegramUsername: TELEGRAM_USERNAME,
  telegramChannel: TELEGRAM_CHANNEL_URL,
  telegramChannelUsername: channelUsername(TELEGRAM_CHANNEL_URL),
  github: `https://github.com/${GITHUB_USERNAME}`,
  githubUsername: GITHUB_USERNAME,
  instagram: `https://www.instagram.com/${INSTAGRAM_USERNAME}`,
  instagramUsername: INSTAGRAM_USERNAME,
  studyHub: STUDY_HUB,
  supportUrl: `https://t.me/${TELEGRAM_USERNAME}`,
  supportLabel: 'حمایت از ادامهٔ آموزش',
};

/** Full social/external identity, in display order. Components map over this. */
export const socialLinks: SocialLink[] = [
  {
    label: 'گیت‌هاب',
    href: creator.github,
    kind: 'github',
    detail: `@${creator.githubUsername}`,
  },
  {
    label: 'اینستاگرام',
    href: creator.instagram,
    kind: 'instagram',
    detail: `@${creator.instagramUsername}`,
  },
  {
    label: 'تلگرام',
    href: creator.telegram,
    kind: 'telegram',
    detail: `@${creator.telegramUsername}`,
  },
  {
    label: 'وب‌سایت',
    href: creator.website,
    kind: 'website',
    detail: shortHost(creator.website),
  },
];

/** Creator links kept for backward compatibility (footer / mobile sheet). */
export const creatorLinks = [
  { label: 'گیت‌هاب', href: creator.github, kind: 'github' as const },
  { label: 'اینستاگرام', href: creator.instagram, kind: 'instagram' as const },
  { label: 'تلگرام', href: creator.telegram, kind: 'telegram' as const },
  { label: 'وب‌سایت', href: creator.website, kind: 'website' as const },
];

/**
 * Primary / secondary calls to action for the homepage hero.
 *
 * Labels live here (configurable per course); the primary *target* is derived
 * from content at build time (first entry of the first non-empty section), so
 * it is not stored as a static URL.
 */
export const heroCtas = {
  primaryLabel: 'شروع یادگیری',
  secondaryLabel: 'جست‌وجو در دوره',
  secondaryHref: '/search',
  roadmapLabel: 'مشاهدهٔ نقشهٔ راه',
  roadmapHref: '/#roadmap',
} as const;

/** Telegram discovery popup copy + behaviour. All tunable in one place.
 *  `channelUrl` is the announcements channel (new projects/study websites);
 *  it defaults to the TELEGRAM_CHANNEL_URL identity above and can be
 *  overridden per course without touching components. */
export const telegramPopup = {
  channelUrl: creator.telegramChannel,
  title: 'در تلگرام همراه شوید',
  body: 'پروژه‌ها، وب‌سایت‌های آموزشی تازه و خبرهای دوره را در کانال تلگرام اعلام می‌کنم. اگر دوست دارید گم‌شان نکنید، عضو شوید.',
  joinLabel: 'عضویت در تلگرام',
  dismissLabel: 'فعلاً نه',
  note: 'هر ۳۰ روز حداکثر یک‌بار نشان داده می‌شود.',
  storageKey: 'dr-telegram-popup:v1',
  cooldownDays: 30,
  delayMs: 12000,
  scrollDepth: 0.45,
} as const;

/**
 * Public base URL. Overridden by the SITE_URL environment variable at build
 * time so CI can set the real origin without editing code.
 */
export const siteUrl: string = process.env.SITE_URL ?? PERSONAL_WEBSITE;

/**
 * Deployment base path. Empty for a root deployment (Cloudflare Pages with a
 * custom domain, Netlify, or a user/organization GitHub Pages site). Set to
 * `/<repo-name>` for a GitHub Pages *project* site. CI derives it from the
 * repository name, so it is normally not edited by hand.
 */
export const basePath: string = (process.env.BASE_PATH ?? '').replace(/\/$/, '');

/** Canonical absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl.replace(/\/$/, '')}${basePath}${clean}` || '/';
}

/**
 * Default social share image (brand-level PNG in `public/`).
 *
 * Individual pages may override it per page; courses that want titled artwork
 * replace `public/og-image.png` (keep 1200×630) instead of touching code.
 */
export const defaultOgImage: string = absoluteUrl('/og-image.png');

export const SEO = {
  defaultTitleSuffix: creator.name,
  locale: 'fa_IR',
  language: 'fa',
  dir: 'rtl' as const,
  twitter: creator.handle,
  themeColor: '#FAF7F0',
  themeColorDark: '#14120F',
} as const;

/** Course display values re-exported so UI imports identity from one module. */
export const siteCourse = {
  title: courseConfig.title,
  tagline: courseConfig.tagline ?? courseConfig.shortDescription ?? '',
  description: courseConfig.description,
} as const;
