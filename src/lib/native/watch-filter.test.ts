import { describe, expect, test } from 'vitest';
import { isEventForFile } from './watch-filter';

describe('isEventForFile', () => {
  test('matches direct, renamed-into and case variants', () => {
    expect(isEventForFile(['/d/nota.md'], '/d/nota.md')).toBe(true);
    expect(isEventForFile(['/d/.nota.md.tmp', '/d/nota.md'], '/d/nota.md')).toBe(true);
    expect(isEventForFile(['/d/otra.md'], '/d/nota.md')).toBe(false);
    expect(isEventForFile(['C:\\D\\Nota.md'], 'c:/d/nota.md', true)).toBe(true);
  });
});
