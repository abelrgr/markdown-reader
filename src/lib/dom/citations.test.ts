import { describe, expect, it, vi } from 'vitest';
import { linkCitations } from './citations';

describe('linkCitations', () => {
  it('links matching headings accent-insensitively and leaves misses as text', () => {
    const root = document.createElement('p');
    root.textContent = 'Ver [§ Introduccion] y [§ Nada]';
    const jump = vi.fn();
    linkCitations(root, [{ text: 'Introducción', id: 'introducción', depth: 1 }], jump);
    const button = root.querySelector<HTMLButtonElement>('.citation');
    expect(button?.dataset.target).toBe('introducción');
    expect(root.textContent).toBe('Ver [§ Introduccion] y [§ Nada]');
    button?.click();
    expect(jump).toHaveBeenCalledWith('introducción');
  });
});
