export interface Bookmark {
  path: string;
  headingId: string;
  label: string;
  createdAt: number;
}

export function toggleBookmark(
  list: Bookmark[],
  bookmark: Omit<Bookmark, 'createdAt'>,
  now: number,
): Bookmark[] {
  const exists = list.some(
    (item) => item.path === bookmark.path && item.headingId === bookmark.headingId,
  );
  if (exists)
    return list.filter(
      (item) => item.path !== bookmark.path || item.headingId !== bookmark.headingId,
    );
  return [...list, { ...bookmark, createdAt: now }];
}

export function bookmarksFor(list: Bookmark[], path: string): Bookmark[] {
  return list.filter((bookmark) => bookmark.path === path);
}

export function normalizeBookmarks(raw: unknown): Bookmark[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Bookmark => {
      if (typeof item !== 'object' || item === null) return false;
      const bookmark = item as Record<string, unknown>;
      return (
        typeof bookmark.path === 'string' &&
        typeof bookmark.headingId === 'string' &&
        typeof bookmark.label === 'string' &&
        typeof bookmark.createdAt === 'number' &&
        Number.isFinite(bookmark.createdAt)
      );
    })
    .slice(0, 500);
}
