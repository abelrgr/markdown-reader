import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

export const rehypeMermaidBlocks: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'pre' || !parent || index === undefined) return;
    const code = node.children.find(
      (child): child is Element =>
        child.type === 'element' &&
        child.tagName === 'code' &&
        Array.isArray(child.properties.className) &&
        child.properties.className.includes('language-mermaid'),
    );
    if (!code) return;

    const source = toString(code).replace(/\n$/, '');
    parent.children[index] = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['mermaid-block'], dataSource: source },
      children: [],
    };
  });
};
