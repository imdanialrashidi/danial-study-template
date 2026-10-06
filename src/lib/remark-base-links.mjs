/**
 * Rewrite root-absolute internal links in Markdown/MDX to carry the deployment
 * base path.
 *
 * Astro prefixes the asset URLs it emits, and `withBase()` covers links written
 * by hand in `.astro` components — but neither touches link destinations that an
 * author types inside an `.mdx` file:
 *
 *     مرتبط: [مشتق](/concepts/derivative)
 *
 * On a GitHub Pages project site that link escapes the deployed directory and
 * 404s. Making every content author remember `import.meta.env.BASE_URL` would
 * be an unusable contract, so it is handled here instead: authors always write
 * clean `/lessons/...` paths.
 *
 * Also normalises inline JSX `href="..."` attributes in MDX, since MDX allows
 * both Markdown links and JSX in the same file.
 */

const PREFIXABLE = /^\/(?!\/)/;

/** @param {string} value */
function prefix(value, base) {
  if (!base) return value;
  // Leave anchors, query-only links, and non-root paths alone.
  if (!PREFIXABLE.test(value)) return value;
  return `${base}${value}`;
}

/**
 * @param {{ base?: string }} options
 * @returns {(tree: unknown, file: unknown) => void}
 */
export function remarkBaseLinks(options = {}) {
  const base = (options.base ?? '').replace(/\/$/, '');

  return function transformer(tree) {
    if (!base || !tree || typeof tree !== 'object') return;

    walk(tree, base);
  };
}

function walk(node, base) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'link' && typeof node.url === 'string') {
    node.url = prefix(node.url, base);
  }

  // MDX JSX attributes: <a href="/x">, <Formula href="/x" />
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
    for (const attribute of node.attributes ?? []) {
      if (attribute.type === 'mdxJsxAttribute' && attribute.name === 'href' && typeof attribute.value === 'string') {
        attribute.value = prefix(attribute.value, base);
      }
    }
  }

  for (const child of node.children ?? []) walk(child, base);
}