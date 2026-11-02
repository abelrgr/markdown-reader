import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'pre', 'blockquote', 'table']);

export const rehypeSourceLines: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node: Element) => {
    if (
      !TAGS.has(node.tagName) &&
      !(node.tagName === 'div' && node.properties.className?.toString().includes('markdown-alert'))
    )
      return;
    const line = node.position?.start.line;
    if (line !== undefined) node.properties.dataLine = line;
  });
};
