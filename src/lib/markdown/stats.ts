import type { DocStats } from './types';

export function computeStats(plainText: string): DocStats {
  const words = plainText.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return { words, readingMinutes: Math.max(1, Math.ceil(words / 200)) };
}
