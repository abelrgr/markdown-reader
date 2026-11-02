import { describe, expect, it } from 'vitest';
import { addRecent, normalizeRecents, sortRecents, type RecentEntry } from './recents';

describe('recents', () => {
  it('moves reopened entries to the front without duplicates', () => {
    let entries: RecentEntry[] = [];
    entries = addRecent(entries, 'A', 1);
    entries = addRecent(entries, 'B', 2);
    entries = addRecent(entries, 'A', 3);
    expect(entries.map(({ path }) => path)).toEqual(['A', 'B']);
  });

  it('defaults legacy recents to files and preserves folder kinds', () => {
    expect(
      normalizeRecents([
        { path: 'legacy.md', pinned: false, openedAt: 1 },
        { path: 'notes', pinned: true, openedAt: 2, kind: 'folder' },
      ]),
    ).toEqual([
      { path: 'notes', pinned: true, openedAt: 2, kind: 'folder' },
      { path: 'legacy.md', pinned: false, openedAt: 1, kind: 'file' },
    ]);
    expect(addRecent([], 'workspace', 3, 'folder')[0]?.kind).toBe('folder');
  });

  it('trims unpinned entries to 20 but keeps pins', () => {
    let entries: RecentEntry[] = [{ path: 'pinned', pinned: true, openedAt: 0, kind: 'file' }];
    for (let i = 0; i < 25; i++) entries = addRecent(entries, `file-${i}`, i + 1);
    expect(entries).toHaveLength(21);
    expect(entries.some(({ path }) => path === 'pinned')).toBe(true);
  });

  it('sorts pinned first, normalizes corrupt input to empty', () => {
    expect(
      sortRecents([
        { path: 'new', pinned: false, openedAt: 2, kind: 'file' },
        { path: 'pin', pinned: true, openedAt: 1, kind: 'file' },
      ]).map(({ path }) => path),
    ).toEqual(['pin', 'new']);
    expect(normalizeRecents('basura')).toEqual([]);
    expect(normalizeRecents([{ path: 1 }])).toEqual([]);
    expect(normalizeRecents([{ path: '', pinned: true, openedAt: 1 }])).toEqual([]);
  });

  it('sorts by most recently opened within pinned and unpinned groups', () => {
    expect(
      sortRecents([
        { path: 'old-pin', pinned: true, openedAt: 1, kind: 'file' },
        { path: 'new-file', pinned: false, openedAt: 4, kind: 'file' },
        { path: 'new-pin', pinned: true, openedAt: 3, kind: 'file' },
        { path: 'old-file', pinned: false, openedAt: 2, kind: 'file' },
      ]).map(({ path }) => path),
    ).toEqual(['new-pin', 'old-pin', 'new-file', 'old-file']);
  });
});
