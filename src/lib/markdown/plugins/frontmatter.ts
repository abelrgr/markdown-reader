import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { parse } from 'yaml';

interface FrontmatterFile {
  data: { frontmatter?: Record<string, unknown> | null };
}

export const remarkFrontmatterData: Plugin<[], Root> = () => (tree, file) => {
  const data = file as typeof file & FrontmatterFile;
  visit(tree, 'yaml', (node, index, parent) => {
    let parsed: unknown;
    try {
      parsed = parse(node.value);
    } catch {
      parsed = null;
    }
    data.data.frontmatter =
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    if (parent && typeof index === 'number') parent.children.splice(index, 1);
  });
};
