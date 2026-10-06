/**
 * The shared icon family name union.
 *
 * Kept in a .ts module (not inline in the .astro component) so the Astro
 * compiler never has to handle a multi-line union type inside frontmatter.
 */
export type IconName =
  | 'search'
  | 'book'
  | 'formula'
  | 'beaker'
  | 'question'
  | 'glossary'
  | 'menu'
  | 'close'
  | 'chevron-start'
  | 'chevron-end'
  | 'chevron-down'
  | 'check'
  | 'cross'
  | 'alert'
  | 'info'
  | 'bulb'
  | 'target'
  | 'clock'
  | 'layers'
  | 'telegram'
  | 'github'
  | 'instagram'
  | 'globe'
  | 'sun'
  | 'moon'
  | 'bookmark'
  | 'external';