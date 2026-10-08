/**
 * Ambient declarations for build-asset URL imports.
 *
 * `import url from './font.woff2?url'` is resolved by Vite at build time to
 * the final hashed asset URL (base-path aware). TypeScript needs this
 * declaration because tsconfig does not include `astro/client` types.
 */
declare module '*.woff2?url' {
  const src: string;
  export default src;
}
