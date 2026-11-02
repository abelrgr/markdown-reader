export const MARKDOWN_EXTENSIONS: readonly string[] = [
  'md', 'mkd', 'mdwn', 'mdown', 'mdtxt', 'mdtext', 'markdown', 'text', 'txt',
];

export const IS_WINDOWS = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

export function normalizePath(path: string): string {
  let input = path.replace(/\\/g, '/');
  const unc = input.startsWith('//');
  input = unc
    ? `//${input.slice(2).replace(/\/{2,}/g, '/')}`
    : input.replace(/\/{2,}/g, '/');
  const drive = /^([A-Za-z]:)(\/|$)/.exec(input);
  const prefix = unc ? '//' : drive ? `${drive[1]}/` : input.startsWith('/') ? '/' : '';
  const body = unc
    ? input.slice(2)
    : drive
      ? input.slice(drive[0].length)
      : input.replace(/^\/+/, '');
  const parts: string[] = [];
  for (const part of body.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..' && parts.length && parts[parts.length - 1] !== '..') parts.pop();
    else if (part !== '..' || !prefix) parts.push(part);
  }
  const result = prefix + parts.join('/');
  return result || (prefix || '.');
}

export function isMarkdownPath(path: string): boolean {
  const name = basename(path);
  const dot = name.lastIndexOf('.');
  return dot >= 0 && MARKDOWN_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
}

export function basename(path: string): string {
  const normalized = normalizePath(path).replace(/\/$/, '');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function dirname(path: string): string {
  const normalized = normalizePath(path).replace(/\/$/, '');
  const slash = normalized.lastIndexOf('/');
  if (slash < 0) return '.';
  if (slash === 0) return '/';
  if (slash === 2 && /^[A-Za-z]:\//.test(normalized)) return normalized.slice(0, 3);
  return normalized.slice(0, slash);
}

export function joinPath(dir: string, relative: string): string {
  let decoded = relative;
  try {
    decoded = decodeURIComponent(relative);
  } catch {
    // Keep malformed percent escapes literal.
  }
  return normalizePath(`${dir.replace(/[\\/]$/, '')}/${decoded}`);
}

export function samePath(a: string, b: string, caseInsensitive = IS_WINDOWS): boolean {
  const left = normalizePath(a);
  const right = normalizePath(b);
  return caseInsensitive ? left.toLocaleLowerCase() === right.toLocaleLowerCase() : left === right;
}
