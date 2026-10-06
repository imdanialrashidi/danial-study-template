import { render } from 'astro:content';
import { mdxComponents } from './mdx';
import type { AnyEntry } from './content';

/**
 * Render a content entry.
 *
 * With Astro's Content Layer API, `render()` takes no options — global MDX
 * components are supplied as a **prop on the rendered `Content` component**:
 *
 *     const { Content } = await renderContent(entry);
 *     <Content components={mdxComponents} />
 *
 * The shared wrappers in `src/layouts/ContentLayout.astro` already do this,
 * which is why pages should prefer the layouts over calling this directly.
 */
export async function renderContent(entry: AnyEntry) {
  return render(entry);
}

export { mdxComponents };