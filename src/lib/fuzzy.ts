function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

const WORD_SEPARATORS = new Set(['/', '-', '_', ' ', '.']);

export function fuzzyScore(query: string, candidate: string): number | null {
  const needle = normalize(query);
  if (!needle) return 0;

  const haystack = normalize(candidate);
  const filenameStart = haystack.lastIndexOf('/') + 1;
  let score = 0;
  let previous = -2;
  let cursor = 0;

  for (const character of needle) {
    const index = haystack.indexOf(character, cursor);
    if (index < 0) return null;

    score += 10;
    if (index === previous + 1) score += 10;
    else if (previous >= 0) score -= index - previous - 1;
    if (index === 0 || WORD_SEPARATORS.has(haystack[index - 1] ?? '')) score += 15;
    if (index >= filenameStart) score += 20;

    previous = index;
    cursor = index + 1;
  }

  return score;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  key: (item: T) => string,
  limit = 50,
): T[] {
  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, key(item)) }))
    .filter((entry): entry is { item: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ item }) => item);
}
