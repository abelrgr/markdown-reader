import type { FileEntry } from '../native/types';

export interface TreeNode {
  name: string;
  path: string;
  relPath: string;
  children?: TreeNode[];
}

function compareNodes(a: TreeNode, b: TreeNode): number {
  const aIsFolder = a.children !== undefined;
  const bIsFolder = b.children !== undefined;
  if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
}

export function buildTree(entries: FileEntry[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const folders = new Map<string, TreeNode>();

  for (const entry of entries) {
    const segments = entry.relPath.split('/').filter(Boolean);
    if (!segments.length) continue;
    const rootPath = entry.path
      .slice(0, Math.max(0, entry.path.length - entry.relPath.length))
      .replace(/[\\/]$/, '');
    const separator = entry.path.includes('\\') ? '\\' : '/';
    let parent: TreeNode | undefined;
    let prefix = '';

    for (const [index, name] of segments.entries()) {
      prefix = prefix ? `${prefix}/${name}` : name;
      const isFile = index === segments.length - 1;
      const key = prefix;
      let node = folders.get(key);

      if (!node) {
        node = {
          name,
          path: isFile ? entry.path : `${rootPath}${separator}${prefix.split('/').join(separator)}`,
          relPath: prefix,
          ...(!isFile ? { children: [] } : {}),
        };
        if (parent) parent.children?.push(node);
        else roots.push(node);
        if (!isFile) folders.set(key, node);
      }
      parent = node;
    }
  }

  const sort = (nodes: TreeNode[]): void => {
    nodes.sort(compareNodes);
    for (const node of nodes) if (node.children) sort(node.children);
  };
  sort(roots);
  return roots;
}
