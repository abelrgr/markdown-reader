import { describe, expect, test } from 'vitest';
import { addCopyButtons, resolveLocalImages } from './enhance';

describe('DOM enhancement', () => {
  test('resolves local images and blocks remote images when requested', () => {
    const root = document.createElement('div');
    root.innerHTML = '<img data-local-src="img/a%20b.png"><img src="https://x.org/y.png" alt="y">';
    resolveLocalImages(root, '/d', (path) => `asset://${path}`, {
      blockRemote: true,
      blockedLabel: 'Image blocked',
    });
    const [local, remote] = root.querySelectorAll('img');
    expect(local.getAttribute('src')).toBe('asset:///d/img/a b.png');
    expect(remote.hasAttribute('src')).toBe(false);
    expect(remote.dataset.blockedSrc).toBe('https://x.org/y.png');
    expect(remote.getAttribute('alt')).toBe('Image blocked: y');
  });

  test('adds exactly one copy button per code block on repeated calls', () => {
    const root = document.createElement('div');
    root.innerHTML = '<pre class="shiki"><code>x</code></pre><pre class="shiki"><code>y</code></pre>';
    addCopyButtons(root, { copy: 'Copy', copied: 'Copied' });
    addCopyButtons(root, { copy: 'Copy', copied: 'Copied' });
    expect(root.querySelectorAll('button.copy-code')).toHaveLength(2);
  });
});
