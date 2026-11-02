import { describe, expect, test } from 'vitest';
import { buildTree } from './tree';

describe('buildTree', () => {
  test('groups paths and sorts folders first with numeric, case-insensitive names', () => {
    const entries = ['z.md', 'docs/b.md', 'Assets/c.md', 'B.md', '10.md', '9.md'].map(
      (relPath) => ({
        path: `/root/${relPath}`,
        relPath,
        name: relPath.split('/').at(-1)!,
        modifiedMs: 1,
      }),
    );

    const tree = buildTree(entries);
    expect(tree.map((node) => `${node.name}${node.children ? '/' : ''}`)).toEqual([
      'Assets/',
      'docs/',
      '9.md',
      '10.md',
      'B.md',
      'z.md',
    ]);
    expect(tree[1]?.children?.map((node) => node.name)).toEqual(['b.md']);
  });
});
