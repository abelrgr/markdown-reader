import { describe, expect, it, vi } from 'vitest';
import { NativeError, type OpenedDocument } from '../native/types';
import type { RenderResult } from '../markdown/types';
import { TabsState } from './tabs.svelte';

const renderResult: RenderResult = {
  html: '',
  toc: [],
  frontmatter: null,
  stats: { words: 0, readingMinutes: 1 },
};
function doc(path: string): OpenedDocument {
  return {
    path,
    name: path.split('/').at(-1) ?? path,
    dir: 'C:/a',
    content: '# x',
    modifiedMs: 1,
    encoding: 'utf-8',
  };
}
function fixture() {
  const openDocument = vi.fn(async (path: string) => doc(path));
  const tabs = new TabsState({
    openDocument,
    render: async () => renderResult,
    caseInsensitive: true,
  });
  return { tabs, openDocument };
}

describe('TabsState', () => {
  it('treats case variants as the same path and activates existing tabs', async () => {
    const { tabs, openDocument } = fixture();
    await tabs.open('C:/A/b.md');
    const duplicate = await tabs.open('c:/a/B.md');
    expect(tabs.tabs).toHaveLength(1);
    expect(tabs.active).toBe(duplicate);
    expect(openDocument).toHaveBeenCalledTimes(1);
  });

  it('activates the tab to the right, or left when closing the last one', async () => {
    const { tabs } = fixture();
    const a = await tabs.open('a.md');
    const b = await tabs.open('b.md');
    const c = await tabs.open('c.md');
    tabs.activate(b.id);
    tabs.close(b.id);
    expect(tabs.activeId).toBe(c.id);
    tabs.close(c.id);
    expect(tabs.activeId).toBe(a.id);
  });

  it('coalesces concurrent opens of the same path', async () => {
    let resolveDocument!: (document: OpenedDocument) => void;
    const openDocument = vi.fn(
      () =>
        new Promise<OpenedDocument>((resolve) => {
          resolveDocument = resolve;
        }),
    );
    const tabs = new TabsState({
      openDocument,
      render: async () => renderResult,
      caseInsensitive: true,
    });
    const first = tabs.open('C:/A/b.md');
    const second = tabs.open('c:/a/B.md');
    resolveDocument(doc('C:/A/b.md'));

    const [firstTab, secondTab] = await Promise.all([first, second]);
    expect(firstTab).toBe(secondTab);
    expect(tabs.tabs).toHaveLength(1);
    expect(openDocument).toHaveBeenCalledTimes(1);
  });

  it('opens virtual documents without reading a filesystem path', async () => {
    const { tabs, openDocument } = fixture();
    const tab = await tabs.openVirtual('translation.md', '# translated');
    expect(tab.path).toMatch(/^virtual:/);
    expect(tab.content).toBe('# translated');
    expect(tabs.active?.id).toBe(tab.id);
    expect(openDocument).not.toHaveBeenCalled();
  });

  it('preserves scroll on reload and keeps a tab marked missing on NOT_FOUND', async () => {
    const { tabs, openDocument } = fixture();
    const opened = await tabs.open('a.md', { scrollTop: 42 });
    const tab = tabs.tabs[0]!;
    await tabs.reload(opened.id);
    expect(tab.scrollTop).toBe(42);
    openDocument.mockRejectedValueOnce(new NativeError('NOT_FOUND', 'gone'));
    await tabs.reload(opened.id);
    expect(tab.status).toBe('missing');
    expect(tabs.tabs).toContain(tab);
  });

  it('does not create a tab on failed open and cycles next/prev', async () => {
    const { tabs, openDocument } = fixture();
    openDocument.mockRejectedValueOnce(new NativeError('NOT_FOUND', 'gone'));
    await expect(tabs.open('missing.md')).rejects.toThrow();
    expect(tabs.tabs).toHaveLength(0);
    const a = await tabs.open('a.md');
    const b = await tabs.open('b.md');
    tabs.next();
    expect(tabs.activeId).toBe(a.id);
    tabs.prev();
    expect(tabs.activeId).toBe(b.id);
  });
});
