import { describe, expect, test } from 'vitest';
import { buildStandaloneHtml, inlineImages } from './export';

describe('HTML export', () => {
  test('builds a standalone safe document with escaped title and local styles', () => {
    const html = buildStandaloneHtml({
      title: '<b>Report</b>',
      lang: 'es',
      bodyHtml: '<h1>Hola</h1><script>alert(1)</script>',
      css: 'h1 { color: red }',
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<html lang="es">');
    expect(html).toContain('&lt;b&gt;Report&lt;/b&gt;');
    expect(html).toContain('<style>h1 { color: red }</style>');
    expect(html).not.toContain('<script');
  });

  test('inlines asset images but leaves HTTPS images alone', async () => {
    document.body.innerHTML =
      '<img id="local" src="asset://localhost/x.png"><img id="remote" src="https://example.test/x.png">';
    const fakeFetch: typeof fetch = async () =>
      ({
        ok: true,
        blob: async () =>
          ({
            type: 'image/png',
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          }) as Blob,
      }) as Response;
    await inlineImages(document.body, fakeFetch);
    expect(document.querySelector('#local')?.getAttribute('src')).toBe(
      'data:image/png;base64,AQID',
    );
    expect(document.querySelector('#remote')?.getAttribute('src')).toBe(
      'https://example.test/x.png',
    );
  });
});
