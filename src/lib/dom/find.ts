interface CharacterPosition {
  node: Text;
  start: number;
  end: number;
}

function normalize(value: string, caseSensitive: boolean): string {
  const withoutMarks = value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return caseSensitive ? withoutMarks : withoutMarks.toLocaleLowerCase();
}

export function findRanges(
  root: HTMLElement,
  query: string,
  opts: { caseSensitive?: boolean } = {},
): Range[] {
  if (!query) return [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent?.closest('.heading-anchor, .copy-code, script, style')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });
  let text = '';
  const positions: CharacterPosition[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    for (let offset = 0; offset < textNode.data.length;) {
      const codePoint = textNode.data.codePointAt(offset);
      if (codePoint === undefined) break;
      const original = String.fromCodePoint(codePoint);
      const normalized = normalize(original, opts.caseSensitive ?? false);
      for (let index = 0; index < normalized.length; index++) {
        text += normalized[index];
        positions.push({ node: textNode, start: offset, end: offset + original.length });
      }
      offset += original.length;
    }
  }
  const needle = normalize(query, opts.caseSensitive ?? false);
  if (!needle) return [];
  const ranges: Range[] = [];
  let from = 0;
  while (from <= text.length - needle.length) {
    const index = text.indexOf(needle, from);
    if (index < 0) break;
    const first = positions[index];
    const last = positions[index + needle.length - 1];
    if (first && last) {
      const range = document.createRange();
      range.setStart(first.node, first.start);
      range.setEnd(last.node, last.end);
      ranges.push(range);
    }
    from = index + needle.length;
  }
  return ranges;
}

export function highlightRanges(ranges: Range[], current: number): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS) || typeof Highlight === 'undefined')
    return;
  CSS.highlights.set('find', new Highlight(...ranges));
  const active = ranges[current];
  if (active) CSS.highlights.set('find-current', new Highlight(active));
  else CSS.highlights.delete('find-current');
}

export function clearFindHighlights(): void {
  if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
  CSS.highlights.delete('find');
  CSS.highlights.delete('find-current');
}
