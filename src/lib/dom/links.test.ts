import { describe, expect, test } from 'vitest';
import { classifyLink } from './links';

const D = 'C:/Mis Notas';

describe('classifyLink', () => {
  test('decodes anchors', () => {
    expect(classifyLink('#introducci%C3%B3n', D)).toEqual({ kind: 'anchor', id: 'introducción' });
  });

  test('allows exactly the supported external schemes', () => {
    expect(classifyLink('https://a.org/x', D)).toEqual({ kind: 'external', url: 'https://a.org/x' });
    expect(classifyLink('mailto:a@b.c', D)).toEqual({ kind: 'external', url: 'mailto:a@b.c' });
  });

  test('ignores dangerous and unsupported schemes', () => {
    for (const href of ['javascript:alert(1)', 'file:///C:/x.exe', 'vbscript:x', 'data:text/html,x', '', 'ftp://a.org']) {
      expect(classifyLink(href, D)).toEqual({ kind: 'ignore' });
    }
  });

  test('resolves a relative markdown document and anchor', () => {
    expect(classifyLink('otra%20nota.md#uso', D)).toEqual({
      kind: 'document', path: 'C:/Mis Notas/otra nota.md', anchor: 'uso',
    });
  });

  test('reveals local non-markdown files rather than opening them', () => {
    expect(classifyLink('../bin/setup.exe', D)).toEqual({ kind: 'reveal', path: 'C:/bin/setup.exe' });
  });
});
