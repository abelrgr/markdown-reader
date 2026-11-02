import { describe, expect, test } from 'vitest';
import { renderMarkdownCore } from './render-core';

describe('GitHub alerts', () => {
  test.each(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'])('alert %s', async (kind) => {
    const r = await renderMarkdownCore(`> [!${kind}]\n> cuidado`);
    expect(r.html).toContain(`class="markdown-alert markdown-alert-${kind.toLowerCase()}"`);
    expect(r.html).toContain('<p class="markdown-alert-title">');
    expect(r.html).not.toContain(`[!${kind}]`);
    expect(r.html).toContain('cuidado');
  });
  test('normal blockquote untouched', async () => {
    expect((await renderMarkdownCore('> cita')).html).toContain('<blockquote data-line="1">');
  });
});
