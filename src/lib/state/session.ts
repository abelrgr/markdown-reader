export interface SessionSnapshot {
  tabs: { path: string; scrollTop: number }[];
  activePath: string | null;
}

const EMPTY_SESSION: SessionSnapshot = { tabs: [], activePath: null };

export function normalizeSession(raw: unknown): SessionSnapshot {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { ...EMPTY_SESSION, tabs: [] };
  const input = raw as Record<string, unknown>;
  if (!Array.isArray(input.tabs)) return { ...EMPTY_SESSION, tabs: [] };
  const tabs: SessionSnapshot['tabs'] = [];
  for (const value of input.tabs) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const tab = value as Record<string, unknown>;
    if (typeof tab.path !== 'string' || !tab.path.trim()) continue;
    const scrollTop = typeof tab.scrollTop === 'number' && Number.isFinite(tab.scrollTop)
      ? Math.max(0, tab.scrollTop) : 0;
    if (!tabs.some((candidate) => candidate.path === tab.path)) tabs.push({ path: tab.path, scrollTop });
  }
  return {
    tabs,
    activePath: typeof input.activePath === 'string' && tabs.some((tab) => tab.path === input.activePath)
      ? input.activePath : null,
  };
}
