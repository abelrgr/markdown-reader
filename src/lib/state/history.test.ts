import { describe, expect, it } from 'vitest';
import { NavHistory } from './history';

describe('NavHistory', () => {
  it('navigates backward/forward and clears forward entries after a new push', () => {
    const history = new NavHistory();
    const loc = (path: string) => ({ path, anchor: null, scrollTop: 0 });
    history.push(loc('A'));
    history.push(loc('B'));
    history.push(loc('C'));
    expect(history.back()?.path).toBe('B');
    expect(history.back()?.path).toBe('A');
    expect(history.back()).toBeNull();
    expect(history.forward()?.path).toBe('B');
    history.push(loc('D'));
    expect(history.forward()).toBeNull();
    expect(history.back()?.path).toBe('B');
  });
  it('keeps at most 100 entries', () => {
    const history = new NavHistory();
    for (let n = 0; n < 120; n++) history.push({ path: String(n), anchor: null, scrollTop: 0 });
    let count = 0;
    while (history.back()) count++;
    expect(count).toBe(99);
  });
});
