import { describe, expect, it } from 'vitest';
import { selectContext, splitSections } from './context';

describe('AI document context', () => {
  it('splits ATX headings outside fenced code blocks', () => {
    expect(
      splitSections('intro\n# A\ntexto a\n```\n# no es encabezado\n```\n## B\ntexto b'),
    ).toEqual([
      { heading: '', level: 0, text: 'intro' },
      { heading: 'A', level: 1, text: 'texto a\n```\n# no es encabezado\n```' },
      { heading: 'B', level: 2, text: 'texto b' },
    ]);
  });
  it('retrieves relevant sections within the character budget', () => {
    const sections = [
      { heading: 'one', level: 1, text: `${'x'.repeat(30_000)} one` },
      { heading: 'two', level: 1, text: `${'y'.repeat(30_000)} two` },
      { heading: 'login', level: 1, text: `${'z'.repeat(30_000)} configurar login` },
    ];
    expect(selectContext(sections, 'configurar login')).toEqual([sections[2]]);
    expect(selectContext(sections, null)).toEqual([sections[0]]);
  });
});
