import { describe, expect, it } from 'vitest';
import { matchShortcut } from './commands';

describe('matchShortcut', () => {
  it('maps Mod to Ctrl or Meta by platform', () => {
    expect(
      matchShortcut(new KeyboardEvent('keydown', { key: 'o', ctrlKey: true }), 'Mod+O', false),
    ).toBe(true);
    expect(
      matchShortcut(new KeyboardEvent('keydown', { key: 'o', metaKey: true }), 'Mod+O', true),
    ).toBe(true);
  });
  it('distinguishes modifiers and supports shifted punctuation', () => {
    expect(
      matchShortcut(
        new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true, shiftKey: true }),
        'Ctrl+Tab',
        false,
      ),
    ).toBe(false);
    expect(
      matchShortcut(new KeyboardEvent('keydown', { key: '?', shiftKey: true }), 'Shift+?', false),
    ).toBe(true);
  });
});
