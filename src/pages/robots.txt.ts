import type { APIRoute } from 'astro';
import { siteUrl, basePath } from '../config/site';

export const prerender = true;

/**
 * Dynamic robots.txt — the sitemap URL always tracks the build's `SITE_URL`
 * and `BASE_PATH`, so project-site and custom-domain deployments can never
 * advertise a stale sitemap. Only indexable routes belong in the sitemap;
 * `noindex` pages (search, 404) are excluded by the sitemap filter in
 * `astro.config.mjs`, not here.
 */
export const GET: APIRoute = () => {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/$/, '')}${basePath}/sitemap-index.xml\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
