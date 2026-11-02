import { describe, expect, test } from 'vitest';
import { fuzzyFilter, fuzzyScore } from './fuzzy';

describe('fuzzyScore', () => {
  test('matches subsequences and rejects missing characters', () => {
    expect(fuzzyScore('rdm', 'README.md')).not.toBeNull();
    expect(fuzzyScore('xyz', 'README.md')).toBeNull();
  });

  test('scores an empty query as zero and matches accents insensitively', () => {
    expect(fuzzyScore('', 'a')).toBe(0);
    expect(fuzzyScore('intro', 'Introducción.md')).not.toBeNull();
  });

  test('prefers matches in the filename over matches in a directory', () => {
    const items = ['src/render-module.md', 'docs/readme.md'];
    expect(fuzzyFilter(items, 'rdm', (item) => item)).toEqual([
      'docs/readme.md',
      'src/render-module.md',
    ]);
  });
});
