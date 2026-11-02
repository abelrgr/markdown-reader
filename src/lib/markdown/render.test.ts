import { describe, expect, test, vi } from 'vitest';
import { renderMarkdown } from './render';
import { renderMarkdownCore } from './render-core';

describe('renderMarkdownCore', () => {
  test('falls back to the core renderer when Web Workers are unavailable', async () => {
    vi.stubGlobal('Worker', undefined);
    try {
      expect((await renderMarkdown('# fallback')).html).toContain('<h1');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('GFM table', async () => {
    const r = await renderMarkdownCore('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(r.html).toContain('<table data-line="1">');
    expect(r.html).toContain('<td>1</td>');
  });
  test('renders inline math with KaTeX', async () => {
    expect((await renderMarkdownCore('$a^2$')).html).toContain('class="katex"');
  });
  test('renders display math with KaTeX', async () => {
    expect((await renderMarkdownCore('$$\n\\frac{1}{2}\n$$')).html).toContain('katex-display');
  });
  test('keeps malformed math as a KaTeX error instead of throwing', async () => {
    const result = await renderMarkdownCore('$\\frac{$');
    expect(result.html).toContain('katex-error');
  });
  test('does not parse an escaped dollar as math', async () => {
    const result = await renderMarkdownCore('cuesta \\$5');
    expect(result.html).not.toContain('katex');
    expect(result.html).toContain('$5');
  });
  test('preserves Mermaid source for main-thread rendering instead of highlighting it', async () => {
    const result = await renderMarkdownCore('```mermaid\ngraph TD\n  A-->B\n```');
    expect(result.html).toContain('class="mermaid-block"');
    expect(result.html).toContain('data-source="graph TD');
    expect(result.html).not.toContain('class="shiki"');
  });
  test('adds original Markdown source lines to searchable rendered blocks', async () => {
    const result = await renderMarkdownCore('# A\n\nparagraph\n\n- item');
    expect(result.html).toContain('data-line="1"');
    expect(result.html).toContain('data-line="3"');
    expect(result.html).toContain('data-line="5"');
  });
  test('task list is disabled checkbox', async () => {
    const r = await renderMarkdownCore('- [x] hecho');
    expect(r.html).toMatch(
      /<input[^>]*type="checkbox"[^>]*checked[^>]*disabled|disabled[^>]*checked/,
    );
  });
  test('removes script tags', async () => {
    expect((await renderMarkdownCore('<script>alert(1)</script>')).html).not.toContain('<script');
  });
  test('removes event handlers', async () => {
    expect((await renderMarkdownCore('<img src="x.png" onerror="alert(1)">')).html).not.toContain(
      'onerror',
    );
  });
  test('removes javascript links', async () => {
    expect((await renderMarkdownCore('[x](javascript:alert(1))')).html).not.toContain(
      'javascript:',
    );
  });
  test('removes iframes and styles', async () => {
    const r = await renderMarkdownCore(
      '<iframe src="https://e.com"></iframe><p style="color:red">t</p>',
    );
    expect(r.html).not.toContain('<iframe');
    expect(r.html).not.toContain('style="color');
  });
  test('toc with accents and duplicates', async () => {
    const r = await renderMarkdownCore('# Introducción\n## Uso\n## Uso');
    expect(r.toc).toEqual([
      { depth: 1, text: 'Introducción', id: 'introducción' },
      { depth: 2, text: 'Uso', id: 'uso' },
      { depth: 2, text: 'Uso', id: 'uso-1' },
    ]);
    expect(r.html).toContain('id="uso-1"');
  });
  test('footnote links point to existing ids', async () => {
    const { html } = await renderMarkdownCore('Texto[^1]\n\n[^1]: Nota');
    const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const id of hrefs) expect(html).toContain(`id="${id}"`);
  });
  test('prefixes untrusted HTML ids to prevent DOM clobbering', async () => {
    const { html } = await renderMarkdownCore('<a id="__proto__">unsafe id</a>');
    expect(html).toContain('id="user-content-__proto__"');
  });
  test('frontmatter parsed and hidden', async () => {
    const r = await renderMarkdownCore('---\ntitle: Hola\ntags: [a, b]\n---\n# T');
    expect(r.frontmatter).toEqual({ title: 'Hola', tags: ['a', 'b'] });
    expect(r.html).not.toContain('title: Hola');
  });
  test('invalid frontmatter does not throw', async () => {
    const r = await renderMarkdownCore('---\ntitle: [roto\n---\n# T');
    expect(r.frontmatter).toBeNull();
    expect(r.html).toContain('<h1');
  });
  test('shiki highlights known language', async () => {
    expect((await renderMarkdownCore('```ts\nconst a = 1\n```')).html).toContain('class="shiki');
  });
  test.each(['sh', 'yml'])('shiki resolves the %s language alias', async (lang) => {
    expect((await renderMarkdownCore(`\`\`\`${lang}\nhola_mundo\n\`\`\``)).html).toContain(
      'class="shiki',
    );
  });
  test.each(['foobar', 'sh', 'yml', ''])(
    'code block lang "%s" renders without error',
    async (lang) => {
      const r = await renderMarkdownCore('```' + lang + '\nhola_mundo\n```');
      expect(r.html).toContain('<pre');
      expect(r.html).toContain('hola_mundo');
    },
  );
  test('relative images are marked, remote kept', async () => {
    const r = await renderMarkdownCore('![a](img/mi%20foto.png) ![b](https://x.org/y.png)');
    expect(r.html).toContain('data-local-src="img/mi%20foto.png"');
    expect(r.html).not.toMatch(/(?:^|\s)src="img\//);
    expect(r.html).toContain('src="https://x.org/y.png"');
  });
  test('stats', async () => {
    expect((await renderMarkdownCore('uno dos tres')).stats).toEqual({
      words: 3,
      readingMinutes: 1,
    });
  });
  test('1 MB document renders under 3 s', async () => {
    const src = Array.from(
      { length: 4000 },
      (_, i) => `## Sección ${i}\n\n${'palabra '.repeat(30)}\n`,
    ).join('\n');
    const t0 = performance.now();
    await renderMarkdownCore(src);
    expect(performance.now() - t0).toBeLessThan(3000);
  });
});
