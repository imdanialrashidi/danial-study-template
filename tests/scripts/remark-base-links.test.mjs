import test from 'node:test';
import assert from 'node:assert/strict';

import { remarkBaseLinks } from '../../src/lib/remark-base-links.mjs';

/** Run the transformer over a minimal mdast tree. */
function transform(tree, options = { base: '/base' }) {
  remarkBaseLinks(options)(tree, {});
  return tree;
}

test('prefixes Markdown image destinations', () => {
  const tree = {
    type: 'root',
    children: [{ type: 'image', url: '/i/x.png', alt: 'a', title: null }],
  };
  transform(tree);
  assert.equal(tree.children[0].url, '/base/i/x.png');
  assert.equal(tree.children[0].alt, 'a');
  assert.equal(tree.children[0].title, null);
});

test('prefixes reference definition destinations', () => {
  const tree = {
    type: 'root',
    children: [{ type: 'definition', url: '/target', identifier: 'x', title: 't' }],
  };
  transform(tree);
  assert.equal(tree.children[0].url, '/base/target');
  assert.equal(tree.children[0].title, 't');
});

test('leaves anchors and relative image paths alone', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'image', url: '#f' },
      { type: 'image', url: 'i/x.png' },
      { type: 'definition', url: '/target' },
    ],
  };
  transform(tree);
  assert.equal(tree.children[0].url, '#f');
  assert.equal(tree.children[1].url, 'i/x.png');
  assert.equal(tree.children[2].url, '/base/target');
});

test('does not double-prefix protocol-relative URLs', () => {
  const tree = { type: 'root', children: [{ type: 'image', url: '//cdn.example/i.png' }] };
  transform(tree);
  assert.equal(tree.children[0].url, '//cdn.example/i.png');
});

test('walks nested children', () => {
  const tree = {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'image', url: '/i/nested.png' }],
      },
    ],
  };
  transform(tree);
  assert.equal(tree.children[0].children[0].url, '/base/i/nested.png');
});

test('regression: links and JSX hrefs still get the base', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'link', url: '/concepts/derivative', children: [] },
      {
        type: 'mdxJsxFlowElement',
        name: 'Formula',
        attributes: [{ type: 'mdxJsxAttribute', name: 'href', value: '/formulas/x' }],
      },
    ],
  };
  transform(tree);
  assert.equal(tree.children[0].url, '/base/concepts/derivative');
  assert.equal(tree.children[1].attributes[0].value, '/base/formulas/x');
});

test('empty base is a no-op', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'image', url: '/i/x.png' },
      { type: 'definition', url: '/target' },
      { type: 'link', url: '/concepts/derivative' },
    ],
  };
  transform(tree, { base: '' });
  assert.equal(tree.children[0].url, '/i/x.png');
  assert.equal(tree.children[1].url, '/target');
  assert.equal(tree.children[2].url, '/concepts/derivative');
});
