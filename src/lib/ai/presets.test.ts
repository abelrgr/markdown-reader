import { describe, expect, it } from 'vitest';
import { isRemote } from './presets';

describe('isRemote', () => {
  it('recognizes loopback providers and remote hosts', () => {
    expect(isRemote('http://localhost:11434/v1')).toBe(false);
    expect(isRemote('http://127.0.0.1:1234')).toBe(false);
    expect(isRemote('http://[::1]:8080')).toBe(false);
    expect(isRemote('https://api.anthropic.com')).toBe(true);
  });
});
