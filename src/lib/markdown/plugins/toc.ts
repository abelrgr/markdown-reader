import type { Element, Root } from 'hast';
import GithubSlugger from 'github-slugger';
import { toString } from 'hast-util-to-string';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { TocItem } from '../types';

interface TocFile {
  data: { toc?: TocItem[] };
}

export const rehypeHeadings: Plugin<[], Root> = () => (tree, file) => {
  const toc: TocItem[] = [];
  const slugger = new GithubSlugger();

  visit(tree, 'element', (node: Element) => {
    const match = /^h([1-6])$/.exec(node.tagName);
    if (!match) return;

    const text = toString(node);
    if (!node.properties.id) node.properties.id = slugger.slug(text);
    const id = node.properties.id;
    if (typeof id !== 'string') return;

    toc.push({ depth: Number(match[1]) as TocItem['depth'], text, id });
    node.children.push({
      type: 'element',
      tagName: 'a',
      properties: {
        href: `#${id}`,
        className: ['heading-anchor'],
        ariaHidden: 'true',
        tabIndex: -1,
      },
      children: [{ type: 'text', value: '#' }],
    });
  });

  (file as typeof file & TocFile).data.toc = toc;
};
