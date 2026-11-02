import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';
import { toString } from 'hast-util-to-string';

const TITLES: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

export const rehypeAlerts: Plugin<[], Root> = () => (tree) => {
  const transform = (parent: Root | Element): void => {
    parent.children.forEach((child, index) => {
      if (child.type !== 'element') return;
      const firstIndex = child.children.findIndex(
        (item) => item.type === 'element' && item.tagName === 'p',
      );
      if (child.tagName === 'blockquote' && firstIndex >= 0) {
        const first = child.children[firstIndex] as Element;
        const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.exec(toString(first));
        if (match) {
          const kind = match[1].toLowerCase();
          const markerNode = first.children.find(
            (node) => node.type === 'text' && node.value.includes(match[0]),
          );
          if (markerNode?.type === 'text') {
            markerNode.value = markerNode.value.replace(match[0], '').trimStart();
            if (!markerNode.value) first.children.splice(first.children.indexOf(markerNode), 1);
          }
          const title: Element = {
            type: 'element',
            tagName: 'p',
            properties: { className: ['markdown-alert-title'] },
            children: [{ type: 'text', value: TITLES[kind] }],
          };
          const replacement: Element = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['markdown-alert', `markdown-alert-${kind}`] },
            children: [
              title,
              ...child.children.filter((item) => item.type !== 'text' || item.value.trim()),
            ],
          };
          parent.children[index] = replacement;
          return;
        }
      }
      transform(child);
    });
  };
  transform(tree);
};
