import type { Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

export const rehypeMarkLocalImages: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'img') return;
    const src = node.properties.src;
    if (typeof src !== 'string' || /^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return;
    node.properties['data-local-src'] = src;
    delete node.properties.src;
  });
};
