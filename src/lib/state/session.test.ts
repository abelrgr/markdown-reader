import { describe, expect, it } from 'vitest';
import { normalizeSession } from './session';

describe('normalizeSession', () => {
  it('normalizes corrupt data to an empty snapshot', () => {
    expect(normalizeSession('basura')).toEqual({ tabs: [], activePath: null });
  });
});
