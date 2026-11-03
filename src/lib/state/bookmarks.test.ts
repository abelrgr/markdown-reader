import { describe, expect, it } from 'vitest';
import { bookmarksFor, normalizeBookmarks, toggleBookmark } from './bookmarks';

describe('bookmarks', () => {
  it('toggles an item and filters by document', () => {
    const entry = { path: '/a.md', headingId: 'intro', label: 'Intro' };
    const added = toggleBookmark([], entry, 123);
    expect(added[0]?.createdAt).toBe(123);
    expect(bookmarksFor(added, '/a.md')).toHaveLength(1);
    expect(toggleBookmark(added, entry, 124)).toEqual([]);
  });
  it('normalizes corrupt persisted data to an empty list', () => {
    expect(normalizeBookmarks({ bad: true })).toEqual([]);
    expect(normalizeBookmarks([{ path: 1 }])).toEqual([]);
  });
});
