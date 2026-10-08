import type { APIRoute } from 'astro';
import { courseConfig } from '../config/course';
import { resolvedTheme } from '../lib/themes';

export const prerender = true;

/**
 * Dynamic favicon — the mark always tracks `logo` in `src/config/course.ts`,
 * so a site on another subject gets its own monogram + accent without
 * touching components or static assets. Replaces `public/favicon.svg`
 * (a route and a public file must never share the same path).
 */
export const GET: APIRoute = () => {
  const monogram = courseConfig.logo?.monogram ?? 'در';
  const { primary } = resolvedTheme();
  const safe = monogram.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const size = safe.length > 1 ? 15 : 17;
  const body =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="7" fill="${primary}"/>` +
    `<text x="16" y="22" font-family="Tahoma, system-ui, sans-serif" font-size="${size}" font-weight="bold" fill="#FFFFFF" text-anchor="middle" direction="rtl">${safe}</text>` +
    `</svg>`;
  return new Response(body, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' },
  });
};
