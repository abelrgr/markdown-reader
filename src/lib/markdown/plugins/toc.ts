import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';
import type { TocItem } from '../types';

interface TocFile {
  data: { toc?: TocItem[] };
}

export const rehypeCollectToc: Plugin<[], Root> = () => (tree, file) => {
  const toc: TocItem[] = [];
  visit(tree, 'element', (node: Element) => {
    if (!/^h[1-6]$/.test(node.tagName)) return;
    const id = node.properties.id;
    if (typeof id !== 'string') return;
    toc.push({ depth: Number(node.tagName[1]) as TocItem['depth'], text: toString(node), id });
  });
  (file as typeof file & TocFile).data.toc = toc;
};
