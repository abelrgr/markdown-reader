import { samePath } from '../fs/paths';

export interface RecentEntry {
  path: string;
  pinned: boolean;
  openedAt: number;
  kind: 'file' | 'folder';
}

export const MAX_RECENTS = 20;

export function sortRecents(list: RecentEntry[]): RecentEntry[] {
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.openedAt - a.openedAt);
}

export function addRecent(
  list: RecentEntry[],
  path: string,
  now: number,
  kind: RecentEntry['kind'] = 'file',
): RecentEntry[] {
  const existing = list.find((entry) => samePath(entry.path, path));
  const updated: RecentEntry = { path, pinned: existing?.pinned ?? false, openedAt: now, kind };
  const entries = [updated, ...list.filter((entry) => !samePath(entry.path, path))];
  let unpinned = 0;
  return entries.filter((entry) => entry.pinned || ++unpinned <= MAX_RECENTS);
}

export function togglePin(list: RecentEntry[], path: string): RecentEntry[] {
  return list.map((entry) =>
    samePath(entry.path, path) ? { ...entry, pinned: !entry.pinned } : entry,
  );
}

export function removeRecents(list: RecentEntry[], paths: string[]): RecentEntry[] {
  return list.filter((entry) => !paths.some((path) => samePath(path, entry.path)));
}

export function normalizeRecents(raw: unknown): RecentEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: RecentEntry[] = [];
  for (const value of raw as unknown[]) {
    if (typeof value !== 'object' || value === null) continue;
    const entry = value as Record<string, unknown>;
    if (
      typeof entry.path !== 'string' ||
      !entry.path.trim() ||
      typeof entry.pinned !== 'boolean' ||
      typeof entry.openedAt !== 'number' ||
      !Number.isFinite(entry.openedAt)
    )
      continue;
    if (entries.some((candidate) => samePath(candidate.path, entry.path as string))) continue;
    const kind = entry.kind === 'folder' ? 'folder' : 'file';
    entries.push({ path: entry.path, pinned: entry.pinned, openedAt: entry.openedAt, kind });
  }
  return sortRecents(entries).filter(
    (entry, _, all) =>
      entry.pinned || all.filter((candidate) => !candidate.pinned).indexOf(entry) < MAX_RECENTS,
  );
}
