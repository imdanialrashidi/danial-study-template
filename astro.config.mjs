import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { remarkBaseLinks } from './src/lib/remark-base-links.mjs';

/**
 * Deployment configuration.
 *
 * - Base path (project sites like GitHub Pages under `/repo/`) comes from
 *   BASE_PATH / SITE_URL environment variables so the same source deploys to
 *   root hosts (Cloudflare Pages custom domain) and project hosts without any
 *   provider-specific code.
 */
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
const site = process.env.SITE_URL ?? 'https://imdanialrashidi.github.io';

export default defineConfig({
  site,
  base: basePath || '/',
  trailingSlash: 'ignore',
  build: {
    // Static by default: no adapter is configured anywhere in this template.
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  markdown: {
    gfm: true,
    // Authors always write clean `/lessons/...` links in content; the deployment
    // base is applied here so project-site builds never 404 on them.
    remarkPlugins: [[remarkBaseLinks, { base: basePath }]],
  },
  integrations: [
    tailwind({ applyBaseStyles: false }),
    react(),
    // MDX goes through the MDX integration's own pipeline, so the base-link
    // plugin must be registered there as well as on `markdown`.
    mdx({ remarkPlugins: [[remarkBaseLinks, { base: basePath }]] }),
    sitemap(),
  ],
  vite: {
    resolve: {
      alias: {
        '@lib': '/src/lib',
        '@components': '/src/components',
        '@layouts': '/src/layouts',
        '@config': '/src/config',
        '@islands': '/src/islands',
      },
    },
  },
});