import { describe, expect, it } from 'vitest';
import { clearFindHighlights, findRanges, highlightRanges } from './find';

describe('findRanges', () => {
  it('finds case-insensitive text across elements and ignores controls', () => {
    const root = document.createElement('article');
    root.innerHTML =
      '<p>Introducción y <b>uso</b> del uso<a class="heading-anchor">uso</a><button class="copy-code">uso</button></p>';
    expect(findRanges(root, 'uso')).toHaveLength(2);
    expect(findRanges(root, 'introduccion')).toHaveLength(1);
    expect(findRanges(root, 'Uso', { caseSensitive: true })).toHaveLength(0);
  });

  it('matches text split across nodes and returns none for an empty query', () => {
    const root = document.createElement('article');
    root.innerHTML = '<p>ho<b>la</b></p>';
    expect(findRanges(root, 'hola')).toHaveLength(1);
    expect(findRanges(root, '')).toHaveLength(0);
  });

  it('finds matching headings with generated anchor links', () => {
    const root = document.createElement('article');
    root.innerHTML =
      '<h2>Uso<a class="heading-anchor">#</a></h2><h2>Uso<a class="heading-anchor">#</a></h2>';
    expect(findRanges(root, 'Uso')).toHaveLength(2);
  });
});

describe('CSS highlight API', () => {
  it('gracefully clears and applies ranges when the API is unavailable', () => {
    expect(() => {
      highlightRanges([], 0);
      clearFindHighlights();
    }).not.toThrow();
  });
});
