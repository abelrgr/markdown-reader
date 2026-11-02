import type { Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const PREFIX = 'user-content-';

export const rehypeFixClobberedFragments: Plugin<[], Root> = () => (tree) => {
  const ids = new Set<string>();
  visit(tree, 'element', (node) => {
    if (typeof node.properties.id === 'string') ids.add(node.properties.id);
  });

  visit(tree, 'element', (node) => {
    const href = node.properties.href;
    if (typeof href !== 'string' || !href.startsWith('#')) return;
    const id = href.slice(1);
    const prefixedId = `${PREFIX}${id}`;
    if (ids.has(prefixedId)) node.properties.href = `#${prefixedId}`;
  });
};
