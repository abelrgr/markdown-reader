import { mount, unmount } from 'svelte';
import { afterEach, expect, test, vi } from 'vitest';
vi.mock('./lib/state/app.svelte', () => ({
  applyTheme: vi.fn(),
  initApp: vi.fn(() => Promise.resolve()),
  disposeApp: vi.fn(),
  appStatus: { ready: false },
  syncFileWatchers: vi.fn(),
  isDropInside: () => false,
  openFromDialog: vi.fn(),
  openPaths: vi.fn(),
  pinRecent: vi.fn(),
  recents: { items: [] },
  removeRecent: vi.fn(),
  sortRecents: () => [],
  tabs: { active: null, tabs: [], activeId: null },
}));
vi.mock('./lib/native', () => ({
  native: {
    setWindowTitle: vi.fn(),
    setZoom: vi.fn(),
    setMenu: vi.fn(() => Promise.resolve()),
    store: { set: vi.fn(() => Promise.resolve()) },
  },
}));
import App from './App.svelte';

let mounted: ReturnType<typeof mount> | undefined;

afterEach(() => {
  if (mounted) unmount(mounted);
  mounted = undefined;
  document.body.innerHTML = '';
});

test('shows the Markdown Reader app name', () => {
  const target = document.createElement('div');
  document.body.append(target);
  mounted = mount(App, { target });

  expect(target.querySelector('main')?.textContent).toContain('Markdown Reader');
});
