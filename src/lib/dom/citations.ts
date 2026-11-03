import type { TocItem } from '../markdown/types';

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

export function linkCitations(
  root: HTMLElement,
  toc: TocItem[],
  onJump: (id: string) => void,
): void {
  const byHeading = new Map(toc.map((item) => [normalize(item.text), item]));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode())
    if (walker.currentNode.textContent?.includes('[§')) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    const text = node.textContent ?? '';
    const pattern = /\[§\s*([^\]]+)\]/g;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      fragment.append(text.slice(cursor, index));
      const item = byHeading.get(normalize(match[1]!));
      if (item) {
        const button = document.createElement('button');
        button.className = 'citation';
        button.type = 'button';
        button.dataset.target = item.id;
        button.textContent = match[0];
        button.addEventListener('click', () => onJump(item.id));
        fragment.append(button);
      } else fragment.append(match[0]);
      cursor = index + match[0].length;
    }
    fragment.append(text.slice(cursor));
    node.replaceWith(fragment);
  }
}
