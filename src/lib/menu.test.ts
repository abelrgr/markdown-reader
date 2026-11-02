import { describe, expect, it } from 'vitest';
import { buildMenuModel } from './menu';

describe('buildMenuModel', () => {
  it('limits recent files to ten followed by separator and clear action', () => {
    const recents = Array.from({ length: 12 }, (_, index) => ({
      path: `/docs/${index}.md`,
      pinned: false,
      openedAt: index,
      kind: 'file' as const,
    }));
    const model = buildMenuModel(recents, { isMac: false });
    const recent = model.menus
      .find((menu) => menu.label === 'File')
      ?.items.find((item) => item.kind === 'submenu');
    expect(recent?.kind).toBe('submenu');
    if (recent?.kind !== 'submenu') return;
    expect(recent.items.filter((item) => item.kind === 'action')).toHaveLength(11);
    expect(recent.items.at(-2)).toEqual({ kind: 'separator' });
    expect(recent.items.at(-1)).toMatchObject({ kind: 'action', id: 'file.clearRecents' });
  });

  it('shows a disabled empty recent entry', () => {
    const model = buildMenuModel([], { isMac: false });
    const recent = model.menus
      .find((menu) => menu.label === 'File')
      ?.items.find((item) => item.kind === 'submenu');
    expect(recent?.kind === 'submenu' && recent.items).toEqual([
      { kind: 'action', id: 'recent:none', label: 'No recent files', enabled: false },
    ]);
  });

  it('puts About and Quit in the macOS app menu only', () => {
    const model = buildMenuModel([], { isMac: true });
    expect(model.menus[0]?.items).toContainEqual({ kind: 'predefined', item: 'quit' });
    expect(model.menus.find((menu) => menu.label === 'File')?.items).not.toContainEqual(
      expect.objectContaining({ id: 'app.quit' }),
    );
  });
});
